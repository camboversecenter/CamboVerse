/**
 * 🎋 **Ceremonies** — the format behind virtual events.
 *
 * Cambodia has two quite different kinds of event, and conflating them is the
 * mistake this format exists to avoid:
 *
 * | | **Calendar** | **Life event** |
 * |---|---|---|
 * | Example | Pchum Ben, Bon Om Touk | a wedding, a housewarming, an ordination |
 * | How often | once a year, nationally | thousands a day, everywhere |
 * | Who authors it | the CamboVerse Center | **the family** |
 *
 * Both are the same shape underneath: an ordered **sequence of moments**, each
 * with a name, a meaning, and something to look at. What differs is who fills
 * it in.
 *
 * ## Template and instance
 *
 * A {@link CeremonyTemplate} is the canonical sequence — authored once, by
 * people who know the tradition. A {@link Ceremony} is one family's actual
 * event, referencing a template and supplying their own photographs.
 *
 * That split is the whole point of the format. Ten thousand families get the
 * explanation of *why* the blessing candles pass clockwise without a single one
 * of them having to write it, and the explanation stays consistent and
 * correctable in one place.
 *
 * ## Nothing here is a server
 *
 * A ceremony is a **file**, following the same two-path pattern as Grove: it
 * lives on the phone, exports as a bundle, and shares as a link. Publishing to
 * the `/v1` rails is an optional second path for later. A family in a village
 * with no reliable connection can still record a grandparent's ordination, and
 * they own the result outright.
 *
 * ## Privacy is not a feature here, it is the schema
 *
 * Every other thing CamboVerse models — organs, buildings, molecules, plants —
 * contains no people. A wedding is full of identifiable people, including
 * children. So consent, visibility and location precision are **required
 * fields**, `visibility` defaults to private, and {@link canPublish} refuses
 * anything that has not answered them. See `docs/CEREMONIES.md`.
 */

/* ------------------------------------------------------------------ text --- */

/**
 * Bilingual text.
 *
 * Same rule as the Learning Lab: `km` is `null` when no Khmer speaker has
 * confirmed the wording, and the interface says so rather than showing a guess.
 * A wrong term for a ritual is worse than a missing one — more so here, because
 * these are people's own traditions being described back to them.
 */
export interface Text {
  en: string;
  km: string | null;
}

export const t = (en: string, km: string | null = null): Text => ({ en, km });

/* ----------------------------------------------------------------- media --- */

/**
 * Where a photo or video actually lives.
 *
 * Three sources, deliberately separated, because they have very different
 * privacy consequences:
 *
 * - `local` — inside the bundle. Nothing leaves the device unless the family
 *   shares the file. This is the default and the only one that works offline.
 * - `url` — a plain image or video on a URL the family controls.
 * - `embed` — a third-party service: a video host, a photo album, a social
 *   platform.
 *
 * **An `embed` means the viewer's device contacts that company**, which hands
 * them the viewer's IP address and whatever else they collect, and breaks
 * CamboVerse's no-external-runtime-assets rule. It is supported because
 * families already keep their wedding videos on those services and asking them
 * to re-upload is unrealistic — but it must never load without being asked.
 * See {@link EmbedPolicy}.
 */
export type MediaRef =
  | {
    kind: "local";
    /** Content hash — the bundle addresses media by hash, as Grove does. */
    sha256: string;
    mime: string;
    bytes: number;
    /** Longest edge in pixels, so a client can pick a size before fetching. */
    px?: number;
    caption?: Text;
  }
  | {
    kind: "url";
    url: string;
    mime: string;
    bytes?: number;
    caption?: Text;
  }
  | {
    kind: "embed";
    /** `youtube`, `facebook`, `google-photos`, `vimeo`, … — free-form on
     *  purpose: a provider list in a type would need a release to extend. */
    provider: string;
    /** The provider's own id for the item. */
    ref: string;
    /**
     * A still frame stored locally, so the moment can be shown — and the
     * ceremony can be read end to end — without ever contacting the provider.
     * Strongly encouraged, and required to publish.
     */
    poster?: { sha256: string; mime: string; bytes: number };
    caption?: Text;
  };

/**
 * How a client must treat third-party embeds.
 *
 * `facade` is the only default that respects a viewer who did not choose to be
 * tracked: show the local poster, name the provider, and contact it only when
 * the viewer taps. `never` is for a client that will not phone out at all —
 * which is the right setting for a school deployment.
 */
export type EmbedPolicy = "facade" | "never" | "auto";

export const DEFAULT_EMBED_POLICY: EmbedPolicy = "facade";

/* ----------------------------------------------------------------- venue --- */

/**
 * Where the ceremony happens.
 *
 * Most Cambodian ceremonies are **not** in a building. A wedding is usually
 * under a marquee in the yard in front of the house; an ordination is on pagoda
 * ground; a boat blessing is at the water. So the default is a **scene theme** —
 * a named outdoor setting the renderer knows how to build procedurally — and a
 * building is one option among several rather than the assumption.
 */
export type SceneTheme =
  /** A marquee in the yard in front of a house. The commonest wedding setting. */
  | "home-yard"
  /** Pagoda grounds, under the trees, near the vihear. */
  | "pagoda-ground"
  /** Laid-out garden, clipped hedges, flowers. */
  | "garden"
  /** Beside water — a river, a lake, a pond. */
  | "riverside"
  /** Standing rice, dry season or wet. */
  | "paddy"
  /** A procession along a road, moving rather than fixed. */
  | "street"
  /** Indoors, a hired function hall. */
  | "hall"
  /** Inside a vihear or sala. */
  | "temple-interior";

export type TimeOfDay = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";

export interface Venue {
  /**
   * A procedural setting, always present — even when a building is named, so a
   * client that does not have that building can still stage the ceremony.
   */
  theme: SceneTheme;
  timeOfDay: TimeOfDay;
  /** Wet or dry season changes the light, the ground and the greenery. */
  season?: "dry" | "wet";
  /** A marquee/pavilion the app supplies. Most yard ceremonies have one. */
  pavilion?: boolean;
  /**
   * Optionally, a real place from the Buildings registry — a specific pagoda,
   * a hall. Additive: the theme still describes the setting around it.
   */
  buildingId?: string;
  siteName?: string;
}

/* ----------------------------------------------------------------- props --- */

/**
 * Items the app supplies procedurally, so a family only has to bring
 * photographs.
 *
 * These recur across almost every Khmer ceremony, which is why they are a
 * shared kit rather than per-event geometry: the same offering trays appear at
 * a wedding, a housewarming and a robe-offering.
 */
export type PropKind =
  | "pavilion"
  | "offering-tray"
  | "banana-stem"
  | "flower-garland"
  | "candle"
  | "incense"
  | "monk-seating"
  | "floor-mat"
  | "low-table"
  | "parasol"
  | "drum"
  | "gift-box"
  | "water-vessel";

export interface PropPlacement {
  kind: PropKind;
  /** Metres, in the venue's own frame; the renderer decides the rest. */
  at: [number, number, number];
  rotation?: number;
  count?: number;
}

/* --------------------------------------------------------------- moments --- */

/**
 * One step of the ceremony.
 *
 * A Khmer wedding is not a single event — it is a sequence of distinct rituals
 * over one to three days, each with its own name and meaning. Modelling the
 * sequence rather than the day is what lets the app explain what is happening
 * at each point instead of showing an undifferentiated album.
 */
export interface Moment {
  id: string;
  name: Text;
  /** What it means, and why it is done. Comes from the template. */
  meaning: Text;
  /** Which day of a multi-day ceremony, from 1. */
  day?: number;
  timeOfDay?: TimeOfDay;
  /** The family's own photographs and video of this moment. */
  media: MediaRef[];
  /** What the app should stage around them. */
  staging?: PropPlacement[];
  /**
   * True when the moment is not universal — regional variation, or a family
   * choice. A template marks these so an instance that skips them is not
   * treated as incomplete.
   */
  optional?: boolean;
}

/* -------------------------------------------------------------- template --- */

export type CeremonyKind =
  /** Happens continuously, all over the country, to individual families. */
  | "life-event"
  /** Once a year, nationally, on a date. */
  | "calendar";

/**
 * The canonical sequence for a kind of ceremony, authored once by people who
 * know it, and reused by every family who records one.
 */
export interface CeremonyTemplate {
  id: string;
  kind: CeremonyKind;
  name: Text;
  /** One line under the title. */
  summary: Text;
  /** A paragraph or two of background. */
  about: Text[];
  /** The venues this ceremony is normally held in, commonest first. */
  venues: SceneTheme[];
  /** The canonical order. An instance may skip `optional` ones. */
  moments: Omit<Moment, "media">[];
  /** Roughly how long, in days. */
  days: number;
  /**
   * For `calendar` ceremonies: roughly when, described rather than dated,
   * because most follow the lunar calendar and move each year.
   */
  whenDescribed?: Text;
  /**
   * **Set until a cultural authority has signed the sequence off.** There is
   * real regional variation in these ceremonies, and a template that is wrong
   * is worse than no template — it teaches ten thousand families a version of
   * their own tradition that nobody performs. Clients should show a plain
   * "under review" note while this is true.
   */
  needsReview: boolean;
  /** Who authored or reviewed it, for the record. */
  source?: string;
}

/* -------------------------------------------------------------- instance --- */

/**
 * What the family answered about the people in their photographs.
 *
 * Required, not optional, and {@link canPublish} refuses anything that has not
 * answered. This is the single most consequential block in the file: getting it
 * wrong once would cost the project its standing as a government-sanctioned
 * public good, and it is close to impossible to retrofit.
 */
export interface Consent {
  /**
   * Who recorded it — a **pseudonym or handle**, never a legal name. The point
   * is a stable owner for takedown requests, not identification.
   */
  recordedBy: string;
  /** ISO date. */
  recordedAt: string;
  /**
   * Who can see it. **Private by default**, and it takes a deliberate act to
   * change — a family recording a funeral should never find it public because
   * a default said so.
   */
  visibility: "private" | "link" | "public";
  /** Whether recognisable people appear, and whether they agreed. */
  peopleDepicted:
  | "none"
  | "adults-consented"
  /** Children appear and a parent or guardian has agreed for each of them. */
  | "includes-minors-guardian-consented";
  /**
   * How precisely the location may be shown. Never finer than a commune, ever —
   * the same coarsening rule Grove applies to garden coordinates, for the same
   * reason: a precise location is a person's home address.
   */
  locationPrecision: "none" | "country" | "province" | "commune";
  /** Free-text note from the family about what they are and are not happy with. */
  note?: string;
}

export interface Ceremony {
  id: string;
  /** The template this follows, by id. */
  templateId: string;
  /** The family's own title, if they gave one. */
  title?: Text;
  /** ISO date the ceremony took place. */
  heldOn?: string;
  /** Never finer than a commune. See {@link Consent.locationPrecision}. */
  place?: { commune?: string; district?: string; province?: string };
  venue: Venue;
  /** The moments they actually recorded, in order. */
  moments: Moment[];
  consent: Consent;
  /** How this client should treat any third-party embeds inside. */
  embedPolicy?: EmbedPolicy;
  /** Set by the exporter; see {@link canonicalize}. */
  contentHash?: string;
}

/* ---------------------------------------------------------------- bundle --- */

export const BUNDLE_FORMAT = "camboverse.ceremony" as const;
export const BUNDLE_VERSION = 1 as const;

/**
 * A ceremony as a shareable file.
 *
 * The manifest is JSON; the photographs sit beside it, addressed by content
 * hash. Same shape as a Grove bundle, and for the same reasons: it can be
 * verified without trusting whoever passed it on, and it works with no server
 * at all.
 */
export interface CeremonyBundle {
  format: typeof BUNDLE_FORMAT;
  version: typeof BUNDLE_VERSION;
  ceremony: Ceremony;
  /** hash → what that file is. The files themselves travel alongside. */
  media: Record<string, { mime: string; bytes: number; px?: number }>;
}

/**
 * Recursively key-sorted JSON, so the same ceremony always hashes the same.
 *
 * Keys whose value is `undefined` are dropped, exactly as `JSON.stringify`
 * drops them. Almost every field on a {@link Ceremony} is optional, and a UI
 * that clears one by assigning `undefined` must not produce a different hash
 * from the same ceremony after a round trip through a file.
 */
export function canonicalize(v: unknown): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalize(o[k])}`).join(",")}}`;
}

/** The content hash of a ceremony, ignoring any hash already on it. */
export async function ceremonyHash(c: Ceremony): Promise<string> {
  const { contentHash: _drop, ...rest } = c;
  const bytes = new TextEncoder().encode(canonicalize(rest));
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------ validation --- */

export interface Check { ok: boolean; errors: string[]; warnings: string[] }

/** Every local media hash a ceremony refers to. */
export function mediaHashes(c: Ceremony): string[] {
  const out: string[] = [];
  for (const m of c.moments) {
    for (const item of m.media) {
      if (item.kind === "local") out.push(item.sha256);
      if (item.kind === "embed" && item.poster) out.push(item.poster.sha256);
    }
  }
  return out;
}

/**
 * Is this a well-formed ceremony?
 *
 * Structural only — it cannot tell whether the consent answers are *true*, and
 * says so. No validator ever could; that is what the takedown route is for.
 */
export function validateCeremony(c: Ceremony, template?: CeremonyTemplate): Check {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!c.id) errors.push("ceremony needs an id");
  if (!c.templateId) errors.push("ceremony needs a templateId");
  if (!c.moments?.length) errors.push("a ceremony with no moments is an empty album");
  if (!c.venue?.theme) errors.push("venue.theme is required — a ceremony happens somewhere");

  const consent = c.consent;
  if (!consent) {
    errors.push("consent is required, not optional");
  } else {
    if (!consent.recordedBy) errors.push("consent.recordedBy is required (a pseudonym, not a name)");
    if (!consent.recordedAt) errors.push("consent.recordedAt is required");
    if (!consent.visibility) errors.push("consent.visibility is required");
    if (!consent.peopleDepicted) errors.push("consent.peopleDepicted is required");
    if (!consent.locationPrecision) errors.push("consent.locationPrecision is required");
  }

  // A house number is a person's address. Grove coarsens garden coordinates for
  // exactly this reason, and a ceremony is held at somebody's home.
  if (c.place && consent?.locationPrecision === "none" &&
    (c.place.commune || c.place.district || c.place.province)) {
    errors.push("locationPrecision is 'none' but a place is set — remove one or the other");
  }
  if (c.place && "lat" in (c.place as object)) {
    errors.push("ceremonies never carry coordinates; commune is the finest allowed");
  }

  const seen = new Set<string>();
  for (const m of c.moments) {
    if (!m.id) errors.push("every moment needs an id");
    else if (seen.has(m.id)) errors.push(`duplicate moment id: ${m.id}`);
    else seen.add(m.id);
    if (!m.name?.en) errors.push(`moment ${m.id} needs a name`);
    if (!m.media?.length) warnings.push(`moment ${m.id} has nothing to show`);
    for (const item of m.media) {
      if (item.kind === "embed" && !item.poster) {
        warnings.push(
          `moment ${m.id} embeds ${item.provider} with no local poster — it cannot be read offline, ` +
          "and it cannot be published",
        );
      }
    }
  }

  if (template) {
    if (template.id !== c.templateId) {
      errors.push(`template ${template.id} does not match templateId ${c.templateId}`);
    }
    const required = template.moments.filter((m) => !m.optional).map((m) => m.id);
    const missing = required.filter((id) => !seen.has(id));
    if (missing.length) {
      warnings.push(`no photographs for: ${missing.join(", ")} — the sequence will have gaps`);
    }
    if (template.needsReview) {
      warnings.push(
        `template ${template.id} has not been reviewed by a cultural authority; ` +
        "show that plainly rather than presenting it as canonical",
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * May this ceremony leave the device?
 *
 * Deliberately stricter than {@link validateCeremony}. Publishing is the
 * irreversible step — once a photograph of somebody's wedding is public it is
 * public — so anything unanswered is a refusal rather than a warning.
 */
export function canPublish(c: Ceremony): Check {
  const base = validateCeremony(c);
  const errors = [...base.errors];
  const warnings = [...base.warnings];
  const consent = c.consent;

  if (!consent) return { ok: false, errors: ["no consent block"], warnings };
  if (consent.visibility === "private") {
    errors.push("visibility is private — publishing needs a deliberate change, not a default");
  }
  if (!consent.peopleDepicted) {
    errors.push("who appears in these photographs has not been answered");
  }
  if (consent.locationPrecision === "commune" && !c.place?.commune) {
    warnings.push("locationPrecision says commune but no commune is set");
  }
  for (const m of c.moments) {
    for (const item of m.media) {
      if (item.kind === "embed" && !item.poster) {
        errors.push(
          `moment ${m.id} embeds ${item.provider} with no local poster: a published ceremony must be ` +
          "readable without contacting a third party",
        );
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * A private, empty ceremony against a template — the state "create" starts in.
 *
 * The venue is **copied**, not referenced. A picker naturally hands the same
 * preset object to every ceremony it creates, and one of them later editing the
 * time of day must not silently change all the others.
 */
export function newCeremony(templateId: string, recordedBy: string, venue: Venue): Ceremony {
  return {
    id: `ceremony-${Date.now().toString(36)}`,
    templateId,
    venue: { ...venue },
    moments: [],
    embedPolicy: DEFAULT_EMBED_POLICY,
    consent: {
      recordedBy,
      recordedAt: new Date().toISOString().slice(0, 10),
      visibility: "private",
      peopleDepicted: "none",
      locationPrecision: "none",
    },
  };
}

export const templateById = (id: string) => TEMPLATES.find((x) => x.id === id) ?? null;
export const templatesOfKind = (k: CeremonyKind) => TEMPLATES.filter((x) => x.kind === k);

/* ------------------------------------------------------------- templates --- */

/**
 * The sequences, as far as they can be written down without a cultural
 * authority in the room.
 *
 * **Every one of these carries `needsReview: true`, and that is not modesty.**
 * Khmer ceremonies vary by region and by family; the ordering below is the
 * commonly described one, the English names are descriptive rather than
 * canonical, and the Khmer names are deliberately `null` because guessing at
 * the name of somebody's own ritual is worse than leaving a gap. Replacing
 * these with an authored version is the first real task in
 * `docs/CEREMONIES.md`.
 */
export const TEMPLATES: CeremonyTemplate[] = [
  {
    id: "wedding",
    kind: "life-event",
    name: t("Khmer wedding", null),
    summary: t("A sequence of rituals over one to three days, usually at the bride's family home"),
    about: [
      t("A Khmer wedding is not one ceremony but a series of them, traditionally spread over three days and now more often compressed into one or two. Each has its own name, its own meaning, and its own place in the order."),
      t("Almost all of it happens at home rather than in a building: a marquee goes up in the yard, the family cooks, and neighbours come and go for two days."),
      t("The sequence below is the commonly described one. Families and regions differ, and this template is waiting on review by someone who can speak for the tradition."),
    ],
    venues: ["home-yard", "garden", "hall", "pagoda-ground"],
    days: 2,
    needsReview: true,
    moments: [
      {
        id: "procession",
        name: t("Procession of gifts", null),
        meaning: t("The groom's family walks to the bride's home carrying food and gifts, in pairs, in a line. It is a public announcement as much as a delivery — the whole street sees it arrive."),
        day: 1,
        timeOfDay: "morning",
        staging: [
          { kind: "gift-box", at: [0, 0, 0], count: 8 },
          { kind: "parasol", at: [-2, 0, 1] },
          { kind: "drum", at: [2, 0, 1] },
        ],
      },
      {
        id: "ancestors",
        name: t("Honouring the ancestors", null),
        meaning: t("Offerings are made and permission asked of the family's ancestors before anything else proceeds. The marriage is understood as joining two lines, not two individuals."),
        day: 1,
        timeOfDay: "morning",
        staging: [
          { kind: "offering-tray", at: [0, 0.8, 0], count: 3 },
          { kind: "incense", at: [0, 0.9, 0.3] },
          { kind: "candle", at: [0, 0.9, -0.3], count: 2 },
        ],
      },
      {
        id: "monks",
        name: t("Blessing by monks", null),
        meaning: t("Monks chant a blessing and the couple receive it. Not every family includes this at the same point in the sequence."),
        day: 1,
        optional: true,
        staging: [
          { kind: "monk-seating", at: [0, 0, -2] },
          { kind: "floor-mat", at: [0, 0, 0] },
          { kind: "water-vessel", at: [0.8, 0.4, -1.4] },
        ],
      },
      {
        id: "hair-cutting",
        name: t("Symbolic hair cutting", null),
        meaning: t("A ceremonial trimming of the couple's hair, done with real scissors and no real cutting. It marks leaving one stage of life for the next, and it is usually the part everybody laughs at."),
        day: 2,
        timeOfDay: "morning",
        staging: [
          { kind: "low-table", at: [0, 0, 0] },
          { kind: "flower-garland", at: [0, 0.7, 0], count: 2 },
        ],
      },
      {
        id: "candles",
        name: t("Passing the blessing candles", null),
        meaning: t("Married elders sit in a circle and pass lit candles around the couple, always in the same direction, sending the smoke toward them. Each pass is a blessing from a marriage that lasted."),
        day: 2,
        timeOfDay: "morning",
        staging: [
          { kind: "candle", at: [0, 0.5, 0], count: 7 },
          { kind: "floor-mat", at: [0, 0, 0] },
        ],
      },
      {
        id: "knot-tying",
        name: t("Tying the wrists", null),
        meaning: t("Guests tie red thread around the couple's wrists, one at a time, each with a wish spoken aloud. By the end both wrists are covered, and the threads are left on for days afterwards."),
        day: 2,
        timeOfDay: "midday",
        staging: [
          { kind: "low-table", at: [0, 0, 0] },
          { kind: "offering-tray", at: [0, 0.75, 0], count: 2 },
          { kind: "flower-garland", at: [0.5, 0.75, 0] },
        ],
      },
      {
        id: "reception",
        name: t("The reception", null),
        meaning: t("The public part: several hundred guests, long tables, music, and an envelope at the door that helps the family cover what the day cost."),
        day: 2,
        timeOfDay: "dusk",
        optional: true,
        staging: [
          { kind: "pavilion", at: [0, 0, 0] },
          { kind: "low-table", at: [0, 0, 3], count: 10 },
        ],
      },
    ],
  },
  {
    id: "housewarming",
    kind: "life-event",
    name: t("Blessing a new house", null),
    summary: t("Monks, offerings and a meal, before a family moves in"),
    about: [
      t("A new house is blessed before it is lived in. Monks chant, offerings are made, and the household's first meal is cooked and shared with everyone who helped build it."),
      t("Held in the yard or on the ground floor, almost never in a finished room."),
    ],
    venues: ["home-yard", "garden"],
    days: 1,
    needsReview: true,
    moments: [
      {
        id: "offerings",
        name: t("Setting out the offerings", null),
        meaning: t("Trays of food, flowers, incense and candles are arranged before anything begins."),
        staging: [
          { kind: "offering-tray", at: [0, 0.8, 0], count: 4 },
          { kind: "banana-stem", at: [-1, 0, 0.5] },
          { kind: "incense", at: [0, 0.9, 0.2] },
        ],
      },
      {
        id: "chanting",
        name: t("Chanting and blessing", null),
        meaning: t("Monks chant, and blessed water is sprinkled through the house."),
        staging: [
          { kind: "monk-seating", at: [0, 0, -2] },
          { kind: "water-vessel", at: [0.7, 0.4, -1.5] },
        ],
      },
      {
        id: "meal",
        name: t("The first meal", null),
        meaning: t("Everyone who helped build the house eats in it. In practice this is the part that matters most to the neighbours."),
        optional: true,
        staging: [{ kind: "low-table", at: [0, 0, 2], count: 4 }],
      },
    ],
  },
  {
    id: "pchum-ben",
    kind: "calendar",
    name: t("Pchum Ben", "បុណ្យភ្ជុំបិណ្ឌ"),
    summary: t("Fifteen days of offerings for the ancestors, ending on the largest day"),
    about: [
      t("For fifteen days, families rise before dawn and bring food to the pagoda for their ancestors. Many visit several different pagodas over the period rather than the same one each time."),
      t("It is the most widely observed ceremony in the country, and for Khmer families living abroad it is the one they most often cannot get home for."),
      t("The dates follow the lunar calendar and move each year."),
    ],
    venues: ["pagoda-ground", "temple-interior"],
    days: 15,
    whenDescribed: t("Fifteen days ending on the fifteenth day of the tenth lunar month — late September or early October"),
    needsReview: true,
    moments: [
      {
        id: "before-dawn",
        name: t("Before dawn", null),
        meaning: t("Food is prepared and brought to the pagoda while it is still dark."),
        timeOfDay: "dawn",
        staging: [{ kind: "offering-tray", at: [0, 0.8, 0], count: 3 }],
      },
      {
        id: "offering",
        name: t("The offering", null),
        meaning: t("Food is offered to the monks, and through them to ancestors who may have no living relatives left to remember them."),
        timeOfDay: "morning",
        staging: [
          { kind: "monk-seating", at: [0, 0, -2] },
          { kind: "offering-tray", at: [0, 0.8, -0.6], count: 5 },
        ],
      },
      {
        id: "ben-thom",
        name: t("Ben Thom — the last day", null),
        meaning: t("The largest day, when the whole family attends together. Everything closes."),
        timeOfDay: "morning",
      },
    ],
  },
];
