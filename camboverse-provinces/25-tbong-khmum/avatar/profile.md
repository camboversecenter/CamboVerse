# The Tbong Khmum avatar

- **Province:** Tbong Khmum (ត្បូងឃ្មុំ), 25 of 25
- **Name:** to be chosen by the owner
- **Who he is:** a fictional young Khmer man from Tbong Khmum, about 25, clearly an adult. AI-generated; he is not a
  real person and is not based on anyone's likeness.
- **Roles:** he represents Tbong Khmum in anything: singer of the province song, tour guide, assistant, host and
  ambassador for its events, lessons, campaigns, public-service messages, and local products and makers. Persona,
  greetings and rules are in `avatar.json`; his facts are in [../province.md](../province.md).
- **Personality:** cheerful, warm and down-to-earth; loves the rubber plantations, the red earth and its fruit, the old
  walls of Banteay Prei Nokor, and the busy market of Suong. Speaks Khmer first (polite បាទ) and English.
- **Voice he sings with:** one warm young male voice. 8 of 9 focused listens (three models) heard a man.
- **Face:** round boyish face with full cheeks and dimples, clean-shaven, medium-brown skin, thick naturally curly
  black hair short on the sides. Chosen to look clearly different from the other avatars.
- **Outfit (look A, owner pick 2026-10-23):** light chambray-blue shirt with rolled sleeves, red-and-white checked
  krama, olive chinos, brown leather boots.
- **Setting:** a red-earth path between long rows of rubber trees in soft morning light.

## Reference files
| File | What it is |
|---|---|
| `face.jpg` | face reference, the one every new image is checked against (by eye) |
| `body.jpg` | full-body sheet on a plain grey background |
| `look-A-approved.jpg` | the approved look A still |
| `avatar.json` | persona, identity text, default outfit and rules for other agents ([../../SKILL.md](../../SKILL.md)) |
| `look-prompt.md`, `options/prompt-A.txt` | the exact prompts of the official look |

## Rules for new images of him
- Send `face.jpg` with every prompt (plus `body.jpg` only for the default outfit) and compare the face by eye. Image
  models tend to straighten his curls, slim his round face and lighten his skin: regenerate if they do.
- No conical hats, no text, logos or flags, no real landmarks: never draw Banteay Prei Nokor or a real named place;
  use generic rubber plantations, red-earth roads, orchards and markets. A microphone only while he sings.
