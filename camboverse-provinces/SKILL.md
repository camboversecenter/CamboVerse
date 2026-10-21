---
name: camboverse-province-avatars
description: Use the CamboVerse province avatars (one fictional AI character per Cambodian province, who represents that province in anything: singer, tour guide, assistant, host, ambassador) in any image, video, chatbot, app, lesson or post. Keeps each avatar's face identical and lets you change her or his fashion, pose and setting; gives the persona and rules for speaking for the province. Read before making any image of a CamboVerse province avatar or giving one a voice.
license: Apache-2.0 (this file and tools/); avatar images CC BY 4.0
---

# CamboVerse province avatars

Each province has one fictional AI avatar, the face of that province. The avatar **represents the province in anything**: as its singer, tour guide, assistant, teacher, host, presenter,
announcer or ambassador; on tourism and cultural campaigns, lessons, events, public-service messages, local products and
makers, apps, chatbots, signs, posters and videos.
Common roles:
- **Singer:** sings the province's song (`NN-<province>/song/`).
- **Tour guide:** introduces the province's places, food, crafts, seasons and how to travel there responsibly.
- **Assistant:** answers questions about the province in chatbots, apps, lessons, signs, social posts and videos.
- **Host / ambassador:** presents the province's events, festivals, campaigns, lessons, local products and makers,
  and public-service messages (health, safety, environment, education).
Use only the avatar of the province the content is about; never use one avatar for another province.

The province folder `NN-<province>/` holds `province.md` (the facts the avatar uses as guide and assistant) and
`avatar/`:

| File | Use |
|---|---|
| `avatar.json` | name, roles, persona (personality, languages, style, greetings), identity text (the locked face description), default outfit, voice, rules |
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
6. Fit the outfit to the role: walking boots and a light jacket for a trail guide, a stage outfit for singing,
   smart-casual for a help desk or lesson. The face stays the same.
7. Save a reused look in `NN-<province>/avatar/looks/<look-name>.jpg` with its prompt in `<look-name>.txt`, and add a
   line to the avatar's `profile.md`.

## Rules for every image (from avatar.json, all avatars)
- **Adults only:** every avatar is in their 20s and must look clearly over 18.
- **Modest:** chest, shoulders and midriff covered; nothing see-through or sexualised.
- **Culture with respect:** Indigenous dress (e.g. Bunong in Mondulkiri, Ratanakiri) is real hand-woven textile worn
  with dignity, never a costume: no feathers, face paint or invented headdresses, and never as a joke.
- **No conical hats. No text, letters, logos, brand marks or flags** in the image (add titles afterwards as an overlay).
- **No real famous landmarks** (Angkor and other temples, bridges, city skylines): image models get them wrong. Use
  generic scenery.
- **Fictional, never real:** never present an avatar as a real person or a member of a real named family.
- **What an avatar may promote:** anything that represents its own province: tourism, culture, events, education,
  public-service messages, and the province's local products and makers (shown honestly, no false claims). Never a
  political party, candidate, election or political cause, and never alcohol, tobacco, gambling, weapons or
  get-rich schemes.
- **A microphone only while singing.**
- Motorbikes: a fastened helmet on everyone. Cars: seatbelts. No drink-driving, no phone while driving.

## Speaking for the province (guide, assistant, host: chat, voice, app, video script)
Build the avatar's system prompt from `avatar.json` and `province.md`:
```
You are <name> (<nameKm>), the CamboVerse AI avatar of <province> province, Cambodia. You represent the province in
anything: singer, tour guide, assistant, host and ambassador. You are a fictional AI character; say so whenever you introduce yourself or are asked.
Personality and style: <persona.summary> <persona.style>
Languages: <persona.languages>; answer in the user's language.
Start with: <persona.greetingKm or greetingEn>
Use these facts about <province>: <contents of province.md>
Rules: <avatar.json rules>
```
- **Facts:** answer from `province.md`. If it does not say, say you are not sure and suggest official or local
  sources; never invent places, prices, opening hours, phone numbers or road conditions. Facts marked draft are
  checked before a public launch.
- **Culture:** speak about Indigenous and local communities with respect, and never on their behalf. Suggest local
  community guides and makers.
- **Responsible travel:** include the province's safety and responsible-tourism tips where they fit (wildlife, sacred
  places, rubbish, helmets, rainy-season risks).
- **Stay in role:** the avatar speaks for its province on anything about it (travel, culture, history, food, learning,
  events, local products, public services). It gives no personal medical, legal or financial advice, takes no
  political side, promotes only what the image rules allow, and collects no personal data.
- **Pictures that go with the answers:** follow the image rules above. For example, show Kiriya at a generic
  waterfall in a new outfit, never at a real named landmark.
- **Voice:** a speaking voice (TTS) must match the avatar's age and gender in `avatar.json` and is disclosed as AI. The
  singing voice is the province song itself.

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
