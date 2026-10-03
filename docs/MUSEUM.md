# Personal Museum — design notes and handoff

**Status: design agreed, no code yet.** This document records everything
decided about the *personal museum* (a virtual room where a person shows their
achievements) so that an AI agent or a contributor working on **both this repo
and `Actik-Cam/ACTIK`** can build it without the original conversation.

Discussed 14 September 2026; written up 3 October 2026. ACTIK could not be
read when this was written (a session cannot hold repos from two GitHub
owners), so **everything said here about ACTIK is an assumption to check
against its code** — those points are marked **[CHECK IN ACTIK]**.

---

## 1. What the owner of the idea asked for

In their words, the starting point was:

1. People can select a virtual room and decorate it.
2. They can publish it private, by invitation, or public.
3. (Originally) a new way of looking for a job or recruiting.

Then three corrections that define the project:

- **"This is not for only NUM. And can use both digital and paper."** Any
  institution may issue; certificates exist as files *and* as printed paper.
- **"Currently, all certificates and portfolios are hidden in house or on text
  CV that not many can see physically and digitally. I want to let people show
  their achievements virtually. That is the important part. Job seeking or
  recruiting are not priority."**
- **"Data will be handled by the ACTIK project. CamboVerse uses those data to
  display."**

And the roadmap:

1. **Let people enjoy a virtual portfolio.**
2. **Verify, when a user needs it for serious things.**

## 2. The idea in one paragraph

Cambodians already frame certificates and hang them on the living-room wall,
where only people who enter the house can see them; online, the alternative is
a photo posted to Facebook that scrolls away in a day. The museum is that wall,
made visible from a shared link: a room that persists, holds a life's
achievements in one place, and can be sent to family, teachers and friends.
**The audience is people who care about the owner, not recruiters.**

## 3. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Display first, verification later** (phase 1, then phase 2) | Phase 1 is useful to one person sharing one link; verification is expensive and only matters when a stranger must rely on a claim |
| D2 | **Recruiting is not a goal.** Do not build job search, recruiter accounts or a job board | Not the purpose (§1); and see §11 for why it is risky |
| D3 | **ACTIK owns the data; CamboVerse displays it** | Keeps people's documents and personal data out of CamboVerse |
| D4 | **The seam is a portable format, not a live API call** | A room must not stop working when ACTIK is down, and ACTIK must not learn who views whose room. Same principle as Grove: nothing is trusted from a server |
| D5 | **A room is owned by an ACTIK identity.** CamboVerse does not create a second identity system | Two identities on one screen confuse people and need a mapping. *(This replaces earlier advice to give each room its own device key — see §10)* |
| D6 | **Verification belongs to each exhibit, never to the account** | A room is a mix: one degree that matters, a dozen things that don't. Nobody waits at a gate |
| D7 | **Many issuers, not only NUM** | Owner's instruction |
| D8 | **QRSeal (KH-SQR Profile B) is the phase-2 credential format** | Same crypto CamboVerse already uses, offline verification, works on paper and digitally — see §8 |

## 4. Who owns what

| | Owns |
|---|---|
| **ACTIK** | identity; issuing; the document files; what may be published (redaction); verification state; revocation |
| **CamboVerse** | the room; the layout; which exhibit hangs where; how it renders in Normal / Ultra / VR; the flat page |
| **The join** | an *exhibit reference*: the credential (if any) plus the file's SHA-256, never an embedded copy of the document |

ACTIK has no opinion about where a certificate hangs. CamboVerse has no opinion
about whether it is genuine — it checks the bytes it is given and shows the
result honestly.

## 5. Rules that must hold (both repos)

1. **Every phase-1 exhibit says plainly that the owner added it.** No badge,
   tick, seal or styling that looks official. If phase 1 looks authoritative,
   the phase-2 verified mark will mean nothing.
2. **Self-added exhibits are not second-class.** "Added by the owner" is a
   plain statement, not a warning. Most of a young person's portfolio is
   legitimately self-added.
3. **Stricter visibility wins.** If ACTIK marks a document private and the room
   is public, the document is not shown — CamboVerse must *refuse to render*
   it, not merely hide it in the UI.
4. **Private by default.** A new room is private; publishing is a deliberate
   act. Visibility levels: `private` · `link` (invitation) · `public`.
5. **Redaction is a normal step.** Cambodian certificates carry full name, date
   of birth, place of birth, ID or student number and sometimes a photograph.
   Cropping and covering are part of *adding* an exhibit, not a buried setting.
   Public views show a reduced-resolution image by default; full resolution
   needs a deliberate act. Warn plainly when a public exhibit appears to carry
   a birth date or ID number.
6. **The file, what is shown publicly, and the credential are separate fields
   from day one.** Impossible to retrofit once people have uploaded.
7. **Keep the original file's SHA-256 from day one.** Phase 2 matches it
   against the credential's `dh` claim; without it every owner must re-upload.
8. **Never a boolean "verified".** Show **who issued it** as the headline, then
   the verification state. A two-week course and a four-year degree verify
   with the same cryptography; one green tick would make them look equal.
9. **A revoked certificate disappears from the room.**
10. **CamboVerse's standing rules apply**: runs on a ~$150 Android over 4G;
    zero install; Normal is the baseline and Ultra/VR are enhancements; no CDN
    or third-party runtime fetches; open licences; Khmer text is never guessed
    (`khmer: null` until a native speaker confirms). See `AGENTS.md`.

## 6. One document, two views

The same exhibit data renders two ways:

- **The flat page** — loads fast, text and images, every exhibit with its
  issuer and verification state, printable. The way in on a slow phone, and
  for anyone who does not want to walk around.
- **The room** — the same data, walkable and decorated, in the three view
  modes (Normal / Ultra / VR, as every CamboVerse scene).

If the room were the only way in, a slow phone would lock people out.

**Rooms arrive already furnished** and look good with zero effort.
Decorating is a reward for people who enjoy it, never a requirement for
someone who just wants their certificate on a wall.

## 7. Phase 1 — the room (build this first)

- Choose a room template; it arrives furnished.
- Add exhibits: certificates, photos of work, awards. Each hangs in a slot.
- Crop and redact while adding (§5.5).
- Arrange and decorate (optional).
- Publish: private / link / public (§5.4).
- Share the link (Telegram, Facebook, email).
- Every exhibit: `verification: "self-asserted"`, shown as "added by the owner".

### Indicative exhibit shape (to reconcile with ACTIK)

Illustrative only — the real shape comes from what ACTIK can provide
**[CHECK IN ACTIK]**.

```ts
interface Exhibit {
  id: string;
  kind: "certificate" | "award" | "work" | "photo" | "other";
  title: string;
  khmerTitle: string | null;          // never guessed
  issuerName: string | null;          // as the owner typed it in phase 1
  date: string | null;                // ISO date
  // From ACTIK — a reference, never a copy:
  source: {
    actikDocumentId: string;          // [CHECK IN ACTIK]
    fileSha256: string;               // of the ORIGINAL issued file (rule 7)
    publicImage: string;              // the cropped, redacted, reduced image
    actikVisibility: "private" | "link" | "public"; // [CHECK IN ACTIK]
  };
  verification: "self-asserted";      // phase 2 adds "issued" | "witnessed"
  credential?: string;                // phase 2: QRSeal "KH1:…" string
}

interface Room {
  id: string;
  ownerActikId: string;               // D5 — [CHECK IN ACTIK]
  template: string;
  visibility: "private" | "link" | "public"; // default "private"
  slots: { slot: string; exhibitId: string }[];
  decor: Record<string, unknown>;
}
```

Effective visibility of an exhibit = the stricter of `room.visibility` and
`source.actikVisibility` (rule 3).

## 8. Phase 2 — verification with QRSeal

Source: [`sengtha/qrseal`](https://github.com/sengtha/qrseal), spec `SPEC.md`,
read at commit `0762ea1`. MIT licence; `@kh-sqr/core` has no runtime assets.

**Why it fits.** ECDSA P-256 / SHA-256 (COSE `ES256`), Web Crypto only — the
same as Grove (`src/grove/grove.ts`). Verification is offline (§6). Trust list
with per-credential revocation (§4.2, §4.5). An issuer cannot issue in another
organisation's name (`ISSUER_KEY_MISMATCH`, §3.1). The payload must not be a URL
(§3.2), so a QR cannot open a phishing page. Paper: a `KH1:` base45 string in a
QR printed on the certificate.

**Paper and digital: one credential, two carriers.**

| Carrier | How the "compare with the document" rule (§3.3) is met |
|---|---|
| Paper — QR on the printed certificate | The person holding the paper compares the signed name, document id, issuer and date with what is printed |
| Digital — `KH1:` string beside the file | Nothing is printed, so the check is mechanical: the SHA-256 of the stored file must equal the `dh` claim |

**Findings that shape the build:**

1. **No boolean.** §3.3 forbids `isValid` or any equivalent, because a genuine
   QR copied onto a forged certificate verifies perfectly. A screen has no
   printed document in front of the viewer, so **`dh` must be mandatory for any
   museum exhibit** (the spec says SHOULD). Without `dh`, the room may only show
   the signed claims beside the image for a person to compare — and must not
   draw a verified mark.
2. **Degrees are outside the profile as written.** §3.1a: an issuer must not
   issue a Profile B credential for a document whose verification life exceeds
   the signing key's `notAfter`, and names degrees as outside. The spec's way
   through is **cohort keys**: one key per graduating year or faculty, long
   `notAfter`, private key destroyed once the cohort is signed. That is an
   institutional discipline each issuer must commit to.
3. **The signed name is a string, not a person.** QRSeal proves "this issuer
   issued it to *Sok Dara*", not that the room's owner *is* Sok Dara. Binding
   the certificate to the room owner is ACTIK's job, as owner of identity (D5)
   **[CHECK IN ACTIK: how ACTIK binds a credential to a person]**.
4. **The trust list is the real cost.** §4.4 requires publication at three
   mirrors under distinct operational control; a verifier stops at
   `TRUSTLIST_STALE` when its cached list is older than 30 days. With
   documents that must verify for decades, someone must keep republishing it
   for decades. The QRSeal README says the reference deployment does not yet
   conform.
5. **Enrolment is the product.** With many issuers, a viewer is really
   trusting whoever decided an issuer belongs on the trust list. Decide early
   whether the list is **tiered** (e.g. MoEYS-accredited institutions vs
   self-registered training providers) — cheap now, very expensive later.

Phase-2 exhibit states: **issued** (signed by a named issuer and checked on
this device), **witnessed** (another person vouched with their own signature —
Grove attestations are the pattern), **self-asserted**.

## 9. Existing CamboVerse code to reuse

| Need | Reuse | Where |
|---|---|---|
| Visibility levels and a publish check that refuses unanswered consent | `Consent.visibility: "private" \| "link" \| "public"`, `canPublish` | `src/ceremony.ts` |
| Format-first discipline (format + tests + docs before UI) | how ceremonies were built | `src/ceremony.ts`, `docs/CEREMONIES.md` |
| P-256 signing/verification, content hashing | `sha256Hex`, `canonicalize`, `verifyObservation`, `verifyAttestation` | `src/grove/grove.ts` |
| Room-building props and scenes | the ceremony prop kit | `src/components/CeremonyProps.tsx`, `CeremonyScene.tsx` |
| Normal / Ultra / VR mode detection and toggle | reference implementation | `src/components/GroveGardenView.tsx` |

**Existing identity, to reconcile with D5.** `src/lib/identity.ts` mints a
server-side id plus a bearer token kept in `localStorage`, and its
`Credential` (`{ id, achievement, evidence, issuedAt }`) is a learning record
fetched from the server — no issuer, no signature. It is fine for "finished the
alphabet quiz" and must **not** be reused for certificates. Decide how an ACTIK
identity and this CamboVerse identity appear together; one must be clearly
subordinate.

## 10. Advice given earlier and since replaced

So that nobody follows it by mistake:

| Earlier advice | Replaced by |
|---|---|
| Build around NUM signing diplomas | Many issuers (D7) |
| CamboVerse mints a device keypair per room for holder binding | ACTIK owns identity (D5) |
| Recruiter-facing flat page as the main view | Family and friends are the audience; the flat page stays as the light, printable view |
| Measure weekly revisits and updates | Occasion-driven use — see §12 |
| CamboVerse stores the files | ACTIK holds the files; CamboVerse holds the hash and the arrangement |

## 11. Out of scope, and why

- **Job search, recruiter accounts, a job board.** Not the purpose. Also:
  recruiter filters become a discrimination tool (job ads in Cambodia often
  specify age, sex and marital status); if search is ever added, filter on
  skills and credentials only. And a paid job board would breach the charter's
  money-neutral core (`PLATFORM_CHARTER.md` §3) — it belongs to an ecosystem
  company on the open rails.
- **Collecting date of birth, address, marital status or ID numbers** in
  CamboVerse.
- **Selling phase 1 to employers.** Unverified rooms shown to recruiters would
  spend the credibility phase 2 needs.

## 12. How to tell whether it works

A wall of achievements is **occasion-driven**: graduate, add a certificate,
send the link. Two or three times a year is the natural rhythm, not failure.

- Do the links get opened by the people the owner sent them to?
- Do owners come back on the next occasion?

Do not judge it by daily engagement or signups.

## 13. Open questions

**For ACTIK [CHECK IN ACTIK]**

1. What does ACTIK hand CamboVerse for one document? A sample object is the
   first thing to get.
2. Does ACTIK store the original file's SHA-256, and a separate redacted
   public image?
3. How does a CamboVerse room prove it belongs to an ACTIK identity (sign-in
   flow, token, signed claim)?
4. Does ACTIK already issue or plan to issue QRSeal credentials, and does it
   include `dh`?
5. How does a room learn that a credential was revoked, and how fresh must its
   copy of the revocation list be before it stops showing an exhibit?
6. Can a person show a document without exposing ID numbers on it (selective
   disclosure, or redaction only)?

**For governance (people, not code)**

7. Who runs the trust list (the "ceremony authority"), and what are the
   admission rules? Tiered or flat?
8. Who hosts the three independent mirrors, for decades?
9. Will issuers of long-lived documents adopt cohort keys?

## 14. Suggested build order for the agent

1. **Read ACTIK** and answer §13 questions 1–3. Write the answers into this
   file.
2. **`src/museum.ts` + tests** — the format (Room, Exhibit, visibility rule,
   publish check, effective-visibility function), written first like
   `src/ceremony.ts`. No UI.
3. **ACTIK adapter** — turns ACTIK's object into an `Exhibit` reference;
   refuses anything ACTIK marks private.
4. **The flat page** — fast, printable, "added by the owner" on every exhibit.
5. **The room** — templates arriving furnished, slots, decoration, Normal /
   Ultra / VR.
6. **Publishing and sharing** — private / link / public.
7. **Phase 2 (later)** — QRSeal verification per exhibit, `dh` mandatory,
   issuer-first display, revocation.

Follow `AGENTS.md` for branch, commit and pull-request rules.
