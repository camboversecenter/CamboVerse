# The Kratie avatar

- **Province:** Kratie (ក្រចេះ), 12 of 25
- **Name:** to be chosen by the owner
- **Who he is:** a fictional young Khmer man from Kratie, about 24, clearly an adult. AI-generated; he is not a real
  person and is not based on anyone's likeness.
- **Roles:** he represents Kratie in anything: singer of the province song, tour guide, assistant, host and ambassador
  for its events, lessons, campaigns, public-service messages, and local products and makers. Persona, greetings and
  rules are in `avatar.json`; his facts are in [../province.md](../province.md).
- **Personality:** calm, warm and easy-going, a local friend taking you along the river; loves Mekong sunsets, the
  dolphins at Kampi, cycling on Koh Trong, old wooden houses and krolan sticky rice. Speaks Khmer first (polite បាទ)
  and English.
- **Voice he sings with:** one warm young male voice. 8 of 9 focused listens (three models) heard a man.
- **Face:** youthful soft oval face with full cheeks and high cheekbones, clean-shaven, light-golden skin, glossy
  straight black chin-length hair parted in the middle and tucked behind his ears. Chosen to look clearly different
  from the other avatars.
- **Outfit (look B, owner pick 2026-10-23):** long-sleeve white cotton shirt with rolled sleeves, deep indigo woven
  Khmer silk scarf, loose sand-coloured trousers, leather sandals.
- **Setting:** a grassy bank of the wide river at golden sunset, with shade trees and small wooden boats.

## Reference files
| File | What it is |
|---|---|
| `face.jpg` | face reference, the one every new image is checked against (by eye) |
| `body.jpg` | full-body sheet on a plain grey background |
| `look-B-approved.jpg` | the approved look B still |
| `avatar.json` | persona, identity text, default outfit and rules for other agents ([../../SKILL.md](../../SKILL.md)) |
| `look-prompt.md`, `options/prompt-B.txt` | the exact prompts of the official look |

## Rules for new images of him
- Send `face.jpg` with every prompt (plus `body.jpg` only for the default outfit) and compare the face by eye. Image
  models tend to narrow his face and make him look gaunt or older: regenerate if they do.
- No conical hats, no text, logos or flags, no real landmarks: never draw the 100-pillar pagoda or a real named place,
  and do not draw the dolphins; use a generic wide river, islands, shade trees and wooden boats. A microphone only
  while he sings.
