# CamboVerse Provinces — AI avatars for every province

Each of Cambodia's 25 provinces gets one **fictional AI avatar**, the face and voice of that province. The avatar
**represents the province in anything**: as its singer, tour guide, assistant, teacher, host, presenter,
announcer or ambassador; on tourism and cultural campaigns, lessons, events, public-service messages, local products and
makers, apps, chatbots, signs, posters and videos. For example:
- **Singer:** sings the province's own Khmer song.
- **Tour guide:** shows visitors the province's places, food, crafts and seasons.
- **Assistant:** answers anything about the province (travel, culture, learning).
- **Ambassador:** fronts the province's events, campaigns, lessons, local products and public-service messages.

Her or his look draws on the province: its landscape, people, local products, crafts and krama colours. Everything here is released as part of the CamboVerse
**Digital Public Good** (see [DPG.md](./DPG.md)).

> ⚠️ **AI disclosure:** every avatar and every image here is AI-generated. The avatars are fictional and do not show
> any real person. The songs were made with **Suno**.

## Licences
- Avatars, images, lyrics, timing files and karaoke data: **CC BY 4.0** ([LICENSE-MEDIA](./LICENSE-MEDIA)), credit
  "CamboVerse Provinces — CamboVerse Center".
- Scripts (`tools/`): **Apache-2.0**, the repository's code licence ([../LICENSE](../LICENSE)).
- Song rights: the owner confirmed (2026-10-21) that the Suno song rights allow a CC BY release.

## Folder layout
```
NN-<province>/
  README.md     province, avatar profile, song credits, AI disclosure, how to reuse
  province.md   facts the avatar uses as a guide and assistant (places, food, culture, travel tips)
  avatar/       avatar.json, face.jpg, body.jpg, looks/, options/ (the official look's prompt), profile.md
  song/         <song>.mp3, lyrics.txt (corrected), lyrics.suno.txt (as given to Suno), rights.txt
```
Files over 50 MB never go in the repo; they are attached to a GitHub Release (tag `provinces/NN-<province>`) instead.

## Province tracker
| # | Province | Avatar | Song | Media | Status |
|---|---|---|---|---|---|
| 01 | [Phnom Penh (ភ្នំពេញ)](./01-phnom-penh/) | Penh (ពេញ), Khmer woman | ភ្នំពេញ រាជធានីកម្ពុជា | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 02 | Banteay Meanchey (បន្ទាយមានជ័យ) | — | — | — | ⏳ not started |
| 03 | [Battambang (បាត់ដំបង)](./03-battambang/) | Rachana (រចនា), Khmer woman | បាត់ដំបងបណ្ដូលចិត្ត | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 04 | [Kampong Cham (កំពង់ចាម)](./04-kampong-cham/) | Chey (ជ័យ), Khmer man | កំពង់ចាម កំពង់ចិត្ត | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 05 | [Kampong Chhnang (កំពង់ឆ្នាំង)](./05-kampong-chhnang/) | Vichea (វិជ្ជា), Khmer man | កំពង់ឆ្នាំង ទឹកដីសិប្បកម្ម | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 06 | Kampong Speu (កំពង់ស្ពឺ) | — | — | — | ⏳ not started |
| 07 | [Kampong Thom (កំពង់ធំ)](./07-kampong-thom/) | Sambo (សំបូរ), Khmer woman | កំពង់ធំជម្រំចិត្ត | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 08 | [Kampot (កំពត)](./08-kampot/) | Theara (ធារា), Khmer man | កំពតកំពូលដួងចិត្ត | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 09 | Kandal (កណ្ដាល) | — | — | — | ⏳ not started |
| 10 | [Kep (កែប)](./10-kep/) | Malis (មាលីស), Khmer woman | កែប ក្ដាមឆ្ងាញ់ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 11 | [Koh Kong (កោះកុង)](./11-koh-kong/) | Samuth (សមុទ្រ), Khmer man | កោះកុងទឹកដីសមុទ្រ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 12 | [Kratie (ក្រចេះ)](./12-kratie/) | Khmer man, river breeze look (name TBD) | ក្រចេះ ម្លប់ដួងចិត្ត | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 13 | [Mondulkiri (មណ្ឌលគិរី)](./13-mondulkiri/) | Kiriya (គិរីយា), Bunong woman | មណ្ឌលគិរី ឋានសួគ៌ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 14 | Oddar Meanchey (ឧត្ដរមានជ័យ) | — | — | — | ⏳ not started |
| 15 | Pailin (ប៉ៃលិន) | — | — | — | ⏳ not started |
| 16 | Preah Sihanouk (ព្រះសីហនុ) | — | — | — | ⏳ not started |
| 17 | [Preah Vihear (ព្រះវិហារ)](./17-preah-vihear/) | Santi (សន្តិ), Khmer man | ព្រះវិហារ កន្លែងប្រវត្តិសាស្ត្រ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 18 | [Prey Veng (ព្រៃវែង)](./18-prey-veng/) | Thida (ធីតា), Khmer woman | ព្រៃវែង វាលស្រែបៃតង | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 19 | Pursat (ពោធិ៍សាត់) | — | — | — | ⏳ not started |
| 20 | [Ratanakiri (រតនគិរី)](./20-ratanakiri/) | Ratana (រតនា), Indigenous highland woman | រតនគិរី ទឹកដីធម្មជាតិ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 21 | [Siem Reap (សៀមរាប)](./21-siem-reap/) | Seila (សិលា), Khmer man | សៀមរាប ទីក្រុងបុរាណ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 22 | Stung Treng (ស្ទឹងត្រែង) | — | — | — | ⏳ not started |
| 23 | Svay Rieng (ស្វាយរៀង) | — | — | — | ⏳ not started |
| 24 | [Takeo (តាកែវ)](./24-takeo/) | Keo (កែវ), Khmer woman | តាកែវ ទឹកដីប្រវត្តិសាស្ត្រ | avatar, song MP3, lyrics, guide facts | ✅ avatar picked |
| 25 | Tbong Khmum (ត្បូងឃ្មុំ) | — | — | — | ⏳ not started |

Status key: ⏳ not started · 🎧 waiting for song · 🎨 looks proposed · ✅ avatar picked · 📦 released

**Using an avatar** for anything about its province, in new images, videos or chat (same face, any outfit): [SKILL.md](./SKILL.md) and `tools/avatar.mjs`.

Production notes: [NOTES.md](./NOTES.md)
