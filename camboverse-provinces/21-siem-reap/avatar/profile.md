# Seila (សិលា) — the Siem Reap avatar

- **Province:** Siem Reap (សៀមរាប), 21 of 25
- **Name:** Seila (សិលា), "stone", for the ancestors' carved stone (owner's pick, 2026-10-23)
- **Who he is:** a fictional Khmer man from Siem Reap, about 32, clearly an adult. AI-generated; he is not a real
  person and is not based on anyone's likeness.
- **Roles:** he represents Siem Reap in anything: singer of the province song, tour guide, assistant, host and
  ambassador for its events, lessons, campaigns, public-service messages, and local products and makers. Persona,
  greetings and rules are in `avatar.json`; his facts are in [../province.md](../province.md).
- **Personality:** warm, proud and welcoming, like a good heritage guide; speaks of the ancestors' temples with deep
  respect; loves the Tonle Sap at sunset, the night market and the silk weavers. Speaks Khmer first (polite បាទ) and
  English.
- **Voice he sings with:** one warm, resonant, proud male voice, about 30; the bridge and outro are spoken by the same
  man (checked directly: no second voice).
- **Face:** full oval face with a defined jaw, clean-shaven, warm smile, warm light-brown skin, short black hair with
  a side part.
- **Outfit (look C, owner pick 2026-10-23):** deep burgundy Khmer silk shirt with a mandarin collar and subtle gold
  woven pattern, black trousers, black leather shoes.
- **Setting:** a traditional wooden silk-weaving workshop with a hand loom (an older weaver works in the background
  of the approved still).

## Reference files
| File | What it is |
|---|---|
| `face.jpg` | face reference, the one every new image is checked against (by eye) |
| `body.jpg` | full-body sheet on a plain grey background |
| `look-C-approved.jpg` | the approved look C still |
| `avatar.json` | persona, identity text, default outfit and rules for other agents ([../../SKILL.md](../../SKILL.md)) |
| `look-prompt.md`, `options/prompt-C.txt` | the exact prompts of the official look |

## Rules for new images of him
- Send `face.jpg` with every prompt (plus `body.jpg` only for the default outfit) and compare the face by eye. Two of
  three close-up takes added stubble and aged him; keep him clean-shaven and about 32.
- **Never draw Angkor Wat, the Bayon, Ta Prohm or any temple**, even though his song is about them: image models get
  real landmarks wrong. Use generic scenery (forest, lake, rice fields, workshops). No conical hats, no text, logos
  or flags. A microphone only while he sings.
