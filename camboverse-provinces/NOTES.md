# Production notes

Lessons learned while making the province singers. A rule that should apply to every KOMSAN.IO Music song is also
proposed to the `komsan-music` skill (in `sengtha/ivideo`).

## Rules for every province
- Match the singer to the song's lead vocal (gender, rough age, rap or sung, solo or duet) before proposing looks.
- Four looks per province, shown together on one image; the owner picks one.
- Each look shows a fictional adult (clearly 18+) whose outfit and setting draw on the province: local products,
  landscape, krama colours, crafts.
- Generic scenery only: no real landmarks (temples, Angkor, bridges, skylines), no conical hats, modest clothes
  (no bare midriff), no text, logos or flags.
- Provinces with Indigenous communities (Mondulkiri, Ratanakiri, …): no costume stereotypes. Outfits are respectful
  and modern, and traditional dress is used only if the owner approves it.
- After the pick, cut a face reference, make the full-body sheet, and check every still for face drift against the
  reference.
- Never reuse a KOMSAN.IO Music roster singer (Raksmey, Vireak, Kolap, Visal, Bopha, Dara, Rotha, Nita, Kosal).

## Mondulkiri (2026-10-21)
- The owner chose Bunong dress over the modern looks ("Mondulkiri is root from that culture"). For Indigenous
  provinces, offer traditional-dress looks alongside the modern ones, and describe the singer as a member of that
  community. The prompt needs "worn with dignity, real hand-woven textile, not a costume, not a souvenir outfit", plus
  "no feathers, no face paint" and long sleeves.
- Skin-tone change: edit the approved still ("keep everything exactly the same … change only her skin tone") instead
  of regenerating it, so the look the owner picked stays the same.
- Face drift: the first close-up, made from the full-body still alone, came out rounder-faced, wider-nosed and younger.
  The fix was to send a high-resolution face crop of the approved still as the first reference, name the features to
  keep, and pick the best of three. Body sheet: pick the take whose face crop matches `face.jpg` (one of two had aged
  her).
- Transcription of the full mix (no vocal stem) is rough. It is good enough to check the written lines are sung, but
  confirm outro extras ("I can feel the groove", the repeated last line) on an isolated vocal before timing.
- Automatic likeness checks with Gemini (3.5 flash, 3.8 flash, 3.1 pro) did not work: they passed different Bunong
  women as the same person and failed real matches. Faces are checked by eye against `face.jpg` (rule in
  [SKILL.md](./SKILL.md)). A test outfit (teacher) drifted to a longer, older face and was deleted.

## Avatars are more than singers (owner, 2026-10-21)
- Each avatar is the province's **singer, tour guide and assistant** for everything about the province. Later the same
  day the owner widened it: **an avatar can represent anything for its assigned province** (host, ambassador, events,
  campaigns, lessons, local products). Hard limits kept: no politics, no alcohol, tobacco, gambling or weapons, AI
  disclosure always, and one avatar per province only. Every
  province therefore also gets `province.md` (guide facts, marked draft until checked against official sources) and a
  `persona` block in `avatar.json` (personality, languages, style, Khmer and English greetings).
- Guide and assistant rules: always say she or he is an AI, answer from `province.md`, never invent prices, hours or
  phone numbers, never speak for a community, and give responsible-travel tips (for example, never ride elephants).
