---
name: camboverse-province-avatars
description: Use the CamboVerse province avatars (fictional AI singers, one per Cambodian province) in any new image or video: posters, lessons, social posts, stories, music videos. Keeps each avatar's face identical and lets you change her or his fashion, pose and setting. Read before making any image of a CamboVerse province avatar.
license: Apache-2.0 (this file and tools/); avatar images CC BY 4.0
---

# CamboVerse province avatars

Each province folder `NN-<province>/avatar/` holds one fictional AI avatar:

| File | Use |
|---|---|
| `avatar.json` | name, identity text (the locked face description), default outfit, voice, rules |
| `face.jpg` | **the face reference.** Every new image must match it |
| `body.jpg` | full body in the default outfit on a plain background |
| `profile.md` | who the avatar is, in words |
| `looks/` | other outfits already made (each with its prompt) |

Avatars so far: see the tracker in [README.md](./README.md).

## The one rule: the face never changes, the fashion can
**Locked (never change):** face shape, eyes, nose, lips, eyebrows, skin tone, apparent age, ethnicity, body type.
**Free to change:** clothes and accessories, hair styling (keep the natural hair colour), pose, expression, setting,
light, camera angle, image size.

### How to make a new image
1. **Always send `face.jpg` as the first reference image.** Send `body.jpg` too only if the outfit stays the default.
   For a new outfit, leave `body.jpg` out, because it pulls the old clothes back in.
2. **Paste the `identity` text from `avatar.json` into the prompt word for word**, then describe the new outfit and
   setting. Example:
   ```
   The first reference image is the face of <name>, a fixed fictional character. Make a photorealistic image of
   exactly this person: a faithful likeness with the same face.
   Locked identity (never change): <avatar.json identity>
   This image: <new outfit, pose, setting, framing>
   Rules: <avatar.json rules>
   ```
   Or run the helper: `node tools/avatar.mjs look NN-<province>/avatar "<outfit, pose, setting>" out.jpg --aspect 16:9`
   (`--keep-outfit` for the default clothes; `edit` mode changes one thing in an existing image). It needs
   `GEMINI_API_KEY` in the environment, and `NODE_USE_ENV_PROXY=1` behind a proxy.
3. **Check the face by eye:** put the new image next to `face.jpg` and compare face shape, eyes, nose, lips, brows,
   skin tone and age. Image models drift: they make the face rounder, longer, younger or older, the nose wider, the skin
   lighter. If anything differs, regenerate (make 2–3 takes and keep the closest). Never "fix" the face with a
   different-looking take because it is prettier. Do not rely on an AI model to judge likeness: tested on
   2026-10-21, it passed different women as the same person.
4. **To change only one thing** in an image you like (skin tone, a stray microphone, a colour), edit that image
   ("keep everything exactly the same, change only …") instead of generating a new one.
5. **Close-ups:** generate them from a high-resolution crop of the face in an approved image plus `face.jpg`. A close-up
   made from a small full-body face drifts the most.
6. Save a reused look in `NN-<province>/avatar/looks/<look-name>.jpg` with its prompt in `<look-name>.txt`, and add a
   line to the avatar's `profile.md`.

## Rules for every image (from avatar.json, all avatars)
- **Adults only:** every avatar is in their 20s and must look clearly over 18.
- **Modest:** chest, shoulders and midriff covered; nothing see-through or sexualised.
- **Culture with respect:** Indigenous dress (e.g. Bunong in Mondulkiri, Ratanakiri) is real hand-woven textile worn
  with dignity, never a costume: no feathers, face paint or invented headdresses, and never as a joke.
- **No conical hats. No text, letters, logos, brand marks or flags** in the image (add titles afterwards as an overlay).
- **No real famous landmarks** (Angkor and other temples, bridges, city skylines): image models get them wrong. Use
  generic scenery.
- **Fictional, never real:** never present an avatar as a real person, never as a member of a real named family, and
  never use one to endorse a product, party, election or political cause.
- **A microphone only while singing.**
- Motorbikes: a fastened helmet on everyone. Cars: seatbelts. No drink-driving, no phone while driving.

## Video
- Talking or singing (InfiniteTalk, lip-sync): start from an approved still with the **mouth closed** and the face large
  (crop to about 1.3× the face). Drive it with an isolated voice only.
- Story clips (Wan, Veo): start from an approved still of the new look, and put "different face, extra people" in
  the negative prompt. Check frames at 1, 4 and 7 s for face drift and for extra people.

## Licence and credit
Avatar images are **CC BY 4.0** ([LICENSE-MEDIA](./LICENSE-MEDIA)). Credit:
`"<Name>, CamboVerse Provinces — CamboVerse Center (CC BY 4.0). AI-generated."`
Every post, caption or page that shows an avatar must say it is AI-generated (e.g.
"⚠️ AI-generated character" / "⚠️ តួអង្គបង្កើតដោយ AI"). Turn on the platform's AI label (YouTube: "altered or
synthetic content"; Facebook: AI info).
