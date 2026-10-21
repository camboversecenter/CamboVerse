# CamboVerse Provinces — songs and AI singers

One Khmer song for each of Cambodia's 25 provinces. Each song gets one **fictional AI singer** whose look draws on that
province: its landscape, local products, crafts and krama colours. Everything here is released as part of the CamboVerse
**Digital Public Good** (see [DPG.md](./DPG.md)).

> ⚠️ **AI disclosure:** every singer and every image here is AI-generated. The singers are fictional and do not show
> any real person. The songs were made with **Suno**.

## Licences
- Avatars, images, lyrics, timing files and karaoke data: **CC BY 4.0** ([LICENSE-MEDIA](./LICENSE-MEDIA)), credit
  "CamboVerse Provinces — CamboVerse Center".
- Scripts (`tools/`): **Apache-2.0**, the repository's code licence ([../LICENSE](../LICENSE)).
- Song rights: the owner confirmed (2026-10-21) that the Suno song rights allow a CC BY release.

## Folder layout
```
NN-<province>/
  README.md     province, singer profile, song credits, AI disclosure, how to reuse
  avatar/       avatar.json, face.jpg, body.jpg, looks/, look options, prompts, profile.md
  song/         lyrics.txt (corrected), lyrics.suno.txt (as given to Suno), rights.txt
```
Files over 50 MB never go in the repo; they are attached to a GitHub Release (tag `provinces/NN-<province>`) instead.

## Province tracker
| # | Province | Singer | Song | Media | Status |
|---|---|---|---|---|---|
| 01 | Phnom Penh (ភ្នំពេញ) | — | — | — | ⏳ not started |
| 02 | Banteay Meanchey (បន្ទាយមានជ័យ) | — | — | — | ⏳ not started |
| 03 | Battambang (បាត់ដំបង) | — | — | — | ⏳ not started |
| 04 | Kampong Cham (កំពង់ចាម) | — | — | — | ⏳ not started |
| 05 | Kampong Chhnang (កំពង់ឆ្នាំង) | — | — | — | ⏳ not started |
| 06 | Kampong Speu (កំពង់ស្ពឺ) | — | — | — | ⏳ not started |
| 07 | Kampong Thom (កំពង់ធំ) | — | — | — | ⏳ not started |
| 08 | Kampot (កំពត) | — | — | — | ⏳ not started |
| 09 | Kandal (កណ្ដាល) | — | — | — | ⏳ not started |
| 10 | Kep (កែប) | — | — | — | ⏳ not started |
| 11 | Koh Kong (កោះកុង) | — | — | — | ⏳ not started |
| 12 | Kratie (ក្រចេះ) | — | — | — | ⏳ not started |
| 13 | [Mondulkiri (មណ្ឌលគិរី)](./13-mondulkiri/) | Bunong singer, look E (name TBD) | មណ្ឌលគិរី ឋានសួគ៌ | avatar, lyrics | ✅ singer picked |
| 14 | Oddar Meanchey (ឧត្ដរមានជ័យ) | — | — | — | ⏳ not started |
| 15 | Pailin (ប៉ៃលិន) | — | — | — | ⏳ not started |
| 16 | Preah Sihanouk (ព្រះសីហនុ) | — | — | — | ⏳ not started |
| 17 | Preah Vihear (ព្រះវិហារ) | — | — | — | ⏳ not started |
| 18 | Prey Veng (ព្រៃវែង) | — | — | — | ⏳ not started |
| 19 | Pursat (ពោធិ៍សាត់) | — | — | — | ⏳ not started |
| 20 | Ratanakiri (រតនគិរី) | — | — | — | ⏳ not started |
| 21 | Siem Reap (សៀមរាប) | — | — | — | ⏳ not started |
| 22 | Stung Treng (ស្ទឹងត្រែង) | — | — | — | ⏳ not started |
| 23 | Svay Rieng (ស្វាយរៀង) | — | — | — | ⏳ not started |
| 24 | Takeo (តាកែវ) | — | — | — | ⏳ not started |
| 25 | Tbong Khmum (ត្បូងឃ្មុំ) | — | — | — | ⏳ not started |

Status key: ⏳ not started · 🎧 waiting for song · 🎨 looks proposed · ✅ singer picked · 📦 released

**Using an avatar in new images or videos** (same face, any outfit): [SKILL.md](./SKILL.md) and `tools/avatar.mjs`.

Production notes: [NOTES.md](./NOTES.md)
