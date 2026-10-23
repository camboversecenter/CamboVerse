# The Banteay Meanchey avatar

- **Province:** Banteay Meanchey (បន្ទាយមានជ័យ), 2 of 25
- **Name:** to be chosen by the owner
- **Who he is:** a fictional young Khmer man from Banteay Meanchey, about 26, clearly an adult. AI-generated; he is not
  a real person and is not based on anyone's likeness.
- **Roles:** he represents Banteay Meanchey in anything: singer of the province song, tour guide, assistant, host and
  ambassador for its events, lessons, campaigns, public-service messages, and local products and makers. Persona,
  greetings and rules are in `avatar.json`; his facts are in [../province.md](../province.md).
- **Personality:** proud, gracious and warm, with a classic touch; loves Banteay Chhmar, the sarus cranes, village
  silk and krama weaving, and sunsets over the plains. Speaks Khmer first (polite បាទ) and English.
- **Voice he sings with:** one warm young male tenor. 7 of 9 focused listens (three models) heard a man.
- **Face:** well-defined square jaw, a neat thin pencil moustache, warm tan skin, glossy slicked-back black hair.
  Chosen to look clearly different from the other avatars.
- **Outfit (look B, owner pick 2026-10-23):** dark-indigo Khmer silk shirt with a mandarin collar and gold border,
  red-and-white hand-woven krama over one shoulder, cream trousers, brown leather sandals.
- **Setting:** a shaded village lane with wooden stilt houses, hand looms and woven cloth drying.

## Reference files
| File | What it is |
|---|---|
| `face.jpg` | face reference, the one every new image is checked against (by eye) |
| `body.jpg` | full-body sheet on a plain grey background |
| `look-B-approved.jpg` | the approved look B still |
| `avatar.json` | persona, identity text, default outfit and rules for other agents ([../../SKILL.md](../../SKILL.md)) |
| `look-prompt.md`, `options/prompt-B.txt` | the exact prompts of the official look |

## Rules for new images of him
- Send `face.jpg` with every prompt (plus `body.jpg` only for the default outfit) and compare the face by eye,
  including the pencil moustache (image models tend to thin it out or remove it).
- No conical hats, no text, logos or flags, no real landmarks: never draw Banteay Chhmar or its carvings; use generic
  villages, wetlands, rice plains and hills. A microphone only while he sings.
