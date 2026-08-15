import { describe, it, expect } from "vitest";
import {
  TEMPLATES, templateById, templatesOfKind, newCeremony, validateCeremony, canPublish,
  canonicalize, ceremonyHash, mediaHashes, DEFAULT_EMBED_POLICY,
  type Ceremony, type Venue, type MediaRef,
} from "./ceremony";

/**
 * The ceremony format's load-bearing promises, held down by tests.
 *
 * Two of these matter more than the rest, because they are the ones that would
 * hurt real people if they quietly regressed:
 *
 * 1. **Nothing publishes by accident.** A new ceremony starts private, and
 *    `canPublish` refuses until a family has deliberately said otherwise.
 * 2. **A published ceremony can be read without contacting a third party.**
 *    An embed with no local poster is a hard refusal, not a warning.
 */

const YARD: Venue = { theme: "home-yard", timeOfDay: "morning", pavilion: true };

const photo = (sha256: string): MediaRef =>
  ({ kind: "local", sha256, mime: "image/jpeg", bytes: 240_000, px: 1600 });

/** A ceremony that is complete enough to publish, as a base to break. */
function publishable(): Ceremony {
  const c = newCeremony("wedding", "neak-srae", YARD);
  c.consent.visibility = "public";
  c.consent.peopleDepicted = "adults-consented";
  c.consent.locationPrecision = "province";
  c.place = { province: "Kampong Cham" };
  c.moments = [
    {
      id: "procession",
      name: { en: "Procession of gifts", km: null },
      meaning: { en: "Gifts carried to the bride's home.", km: null },
      media: [photo("a".repeat(64))],
    },
    {
      id: "candles",
      name: { en: "Passing the blessing candles", km: null },
      meaning: { en: "Elders pass candles around the couple.", km: null },
      media: [photo("b".repeat(64))],
    },
  ];
  return c;
}

/* ------------------------------------------------------------ the default --- */

describe("a new ceremony", () => {
  const c = newCeremony("wedding", "neak-srae", YARD);

  it("starts private", () => {
    expect(c.consent.visibility).toBe("private");
  });

  it("starts with no location at all", () => {
    expect(c.consent.locationPrecision).toBe("none");
    expect(c.place).toBeUndefined();
  });

  it("does not phone out to embed providers by default", () => {
    expect(c.embedPolicy).toBe(DEFAULT_EMBED_POLICY);
    expect(DEFAULT_EMBED_POLICY).toBe("facade");
  });

  it("copies the venue rather than aliasing the caller's", () => {
    // A picker hands the same preset object to every ceremony it creates.
    const preset: Venue = { theme: "pagoda-ground", timeOfDay: "dawn" };
    const one = newCeremony("pchum-ben", "a", preset);
    const two = newCeremony("pchum-ben", "b", preset);
    one.venue.timeOfDay = "dusk";
    expect(two.venue.timeOfDay).toBe("dawn");
    expect(preset.timeOfDay).toBe("dawn");
  });

  it("cannot be published as-is — the family has to choose", () => {
    const r = canPublish(c);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/private/);
  });
});

/* ------------------------------------------------------------- validation --- */

describe("validateCeremony", () => {
  it("passes a well-formed ceremony", () => {
    const r = validateCeremony(publishable());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("requires a venue theme even when a building is named", () => {
    const c = publishable();
    // Requirement: a ceremony is usually *not* in a building, so the procedural
    // theme is what every client can fall back on.
    (c.venue as { theme?: string }).theme = undefined;
    c.venue.buildingId = "num-great-hall";
    expect(validateCeremony(c).errors.join(" ")).toMatch(/venue\.theme/);
  });

  it("refuses a ceremony with no consent block", () => {
    const c = publishable();
    (c as { consent?: unknown }).consent = undefined;
    const r = validateCeremony(c);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/consent is required/);
  });

  it("names each missing consent answer", () => {
    const c = publishable();
    (c.consent as { recordedBy?: string }).recordedBy = "";
    (c.consent as { locationPrecision?: string }).locationPrecision = undefined;
    const joined = validateCeremony(c).errors.join(" ");
    expect(joined).toMatch(/recordedBy/);
    expect(joined).toMatch(/locationPrecision/);
  });

  it("catches a place set while location precision says none", () => {
    const c = publishable();
    c.consent.locationPrecision = "none";
    expect(validateCeremony(c).errors.join(" ")).toMatch(/locationPrecision is 'none'/);
  });

  it("refuses raw coordinates outright", () => {
    const c = publishable();
    (c.place as Record<string, unknown>).lat = 11.55;
    expect(validateCeremony(c).errors.join(" ")).toMatch(/never carry coordinates/);
  });

  it("catches duplicate moment ids", () => {
    const c = publishable();
    c.moments[1].id = "procession";
    expect(validateCeremony(c).errors.join(" ")).toMatch(/duplicate moment id: procession/);
  });

  it("refuses a ceremony with no moments", () => {
    const c = publishable();
    c.moments = [];
    expect(validateCeremony(c).ok).toBe(false);
  });

  it("warns, but does not fail, on a posterless embed", () => {
    const c = publishable();
    c.moments[0].media = [{ kind: "embed", provider: "youtube", ref: "xyz" }];
    const r = validateCeremony(c);
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/no local poster/);
  });

  it("warns when the template it is checked against is unreviewed", () => {
    const wedding = templateById("wedding")!;
    const r = validateCeremony(publishable(), wedding);
    expect(r.warnings.join(" ")).toMatch(/not been reviewed by a cultural authority/);
  });

  it("warns about required template moments with nothing recorded", () => {
    const wedding = templateById("wedding")!;
    const r = validateCeremony(publishable(), wedding);
    // 'ancestors' is required in the template and absent from the instance.
    expect(r.warnings.join(" ")).toMatch(/ancestors/);
  });

  it("does not nag about optional template moments", () => {
    const wedding = templateById("wedding")!;
    const r = validateCeremony(publishable(), wedding);
    // 'reception' is marked optional, so skipping it is a family's choice.
    expect(r.warnings.join(" ")).not.toMatch(/reception/);
  });

  it("catches a template that does not match the instance", () => {
    const r = validateCeremony(publishable(), templateById("pchum-ben")!);
    expect(r.errors.join(" ")).toMatch(/does not match templateId/);
  });
});

/* ---------------------------------------------------------------- publish --- */

describe("canPublish is stricter than validate", () => {
  it("lets a fully answered ceremony through", () => {
    const r = canPublish(publishable());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("refuses a private ceremony", () => {
    const c = publishable();
    c.consent.visibility = "private";
    expect(canPublish(c).ok).toBe(false);
  });

  it("refuses an embed with no local poster", () => {
    const c = publishable();
    c.moments[0].media = [{ kind: "embed", provider: "facebook", ref: "1234" }];
    const r = canPublish(c);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/without contacting a third party/);
  });

  it("allows an embed that carries a local poster", () => {
    const c = publishable();
    c.moments[0].media = [{
      kind: "embed", provider: "youtube", ref: "xyz",
      poster: { sha256: "c".repeat(64), mime: "image/jpeg", bytes: 90_000 },
    }];
    expect(canPublish(c).ok).toBe(true);
  });

  it("carries the structural errors through as well", () => {
    const c = publishable();
    c.moments = [];
    expect(canPublish(c).ok).toBe(false);
  });
});

/* ----------------------------------------------------------------- media --- */

describe("mediaHashes", () => {
  it("collects local files and embed posters, and nothing else", () => {
    const c = publishable();
    c.moments[1].media = [
      { kind: "url", url: "https://example.org/a.jpg", mime: "image/jpeg" },
      {
        kind: "embed", provider: "vimeo", ref: "99",
        poster: { sha256: "d".repeat(64), mime: "image/jpeg", bytes: 40_000 },
      },
    ];
    expect(mediaHashes(c)).toEqual(["a".repeat(64), "d".repeat(64)]);
  });
});

/* ----------------------------------------------------------- canonical id --- */

describe("canonicalize and ceremonyHash", () => {
  it("sorts keys at every depth", () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } }))
      .toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("keeps array order — a ceremony is a sequence", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("drops undefined keys, so clearing a field matches a file round trip", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalize({ a: 1 })).toBe(canonicalize({ a: 1, heldOn: undefined }));
  });

  it("produces parseable JSON even with holes in an array", () => {
    expect(() => JSON.parse(canonicalize({ m: [undefined, 1] }))).not.toThrow();
  });

  it("hashes the same ceremony to the same digest whatever the key order", () => {
    const a = publishable();
    const b: Ceremony = JSON.parse(JSON.stringify({
      consent: a.consent, venue: a.venue, moments: a.moments,
      templateId: a.templateId, id: a.id, place: a.place, embedPolicy: a.embedPolicy,
    }));
    return Promise.all([ceremonyHash(a), ceremonyHash(b)])
      .then(([ha, hb]) => {
        expect(ha).toHaveLength(64);
        expect(ha).toBe(hb);
      });
  });

  it("ignores any hash already stamped on the ceremony", async () => {
    const c = publishable();
    const bare = await ceremonyHash(c);
    c.contentHash = bare;
    expect(await ceremonyHash(c)).toBe(bare);
  });

  it("changes when a moment changes", async () => {
    const a = publishable();
    const b = publishable();
    b.moments[0].media = [photo("f".repeat(64))];
    expect(await ceremonyHash(a)).not.toBe(await ceremonyHash(b));
  });
});

/* ------------------------------------------------------------- templates --- */

describe("the shipped templates", () => {
  it("are all structurally sound", () => {
    const ids = new Set<string>();
    for (const tpl of TEMPLATES) {
      expect(tpl.id, "template id").toBeTruthy();
      expect(ids.has(tpl.id), `duplicate template ${tpl.id}`).toBe(false);
      ids.add(tpl.id);
      expect(tpl.name.en).toBeTruthy();
      expect(tpl.moments.length, `${tpl.id} has moments`).toBeGreaterThan(0);
      expect(tpl.venues.length, `${tpl.id} names a venue`).toBeGreaterThan(0);

      const seen = new Set<string>();
      for (const m of tpl.moments) {
        expect(seen.has(m.id), `duplicate moment ${tpl.id}/${m.id}`).toBe(false);
        seen.add(m.id);
        expect(m.name.en, `${tpl.id}/${m.id} name`).toBeTruthy();
        expect(m.meaning.en, `${tpl.id}/${m.id} meaning`).toBeTruthy();
      }
    }
  });

  it("are all still awaiting cultural review, and say so", () => {
    // When this fails, someone has signed a template off — good. Update the
    // reviewer list in docs/CEREMONIES.md at the same time.
    for (const tpl of TEMPLATES) expect(tpl.needsReview, tpl.id).toBe(true);
  });

  it("leave a ritual's Khmer name null rather than guessing at it", () => {
    for (const tpl of TEMPLATES) {
      for (const m of tpl.moments) {
        expect(m.name.km, `${tpl.id}/${m.id}`).toBeNull();
      }
    }
  });

  it("offer at least one non-building setting for every life event", () => {
    const indoor = new Set(["hall", "temple-interior"]);
    for (const tpl of templatesOfKind("life-event")) {
      expect(tpl.venues.some((v) => !indoor.has(v)), tpl.id).toBe(true);
    }
  });

  it("looks up by id, and returns null rather than throwing", () => {
    expect(templateById("wedding")?.kind).toBe("life-event");
    expect(templateById("no-such-thing")).toBeNull();
  });

  it("splits calendar events from life events", () => {
    expect(templatesOfKind("calendar").map((x) => x.id)).toContain("pchum-ben");
    expect(templatesOfKind("life-event").map((x) => x.id)).not.toContain("pchum-ben");
  });
});
