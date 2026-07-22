/**
 * Province identity — the 🇰🇭 face each province shows on the province map
 * (see TODO.md · "Province identity"): its Khmer name, a one-line identity,
 * and a few emblem/known-for chips (temples, pepper, silk…).
 *
 * Keyed by ADM1 pcode (stable across name-spelling variants in the boundary
 * data — "Siemreap" vs "Siem Reap" etc.; display names go through
 * `prettyProvince` in spots.ts).
 *
 * Contributor rules: keep every claim true and uncontroversial — these lines
 * teach. Khmer names use standard spellings; native-speaker review is always
 * welcome. Add or refine a province's chips via PR (see TODO.md).
 */
export interface ProvinceInfo {
  /** Khmer name (standard spelling). */
  khmer: string;
  /** One-line identity shown under the province name. */
  tagline: string;
  /** Emblem / known-for chips: an emoji + a couple of words each. */
  knownFor: string[];
}

export const PROVINCE_INFO: Record<string, ProvinceInfo> = {
  KH01: {
    khmer: "បន្ទាយមានជ័យ",
    tagline:
      "The 'citadel of victory' — north-western rice country, home to the vast temple of Banteay Chhmar.",
    knownFor: ["🛕 Banteay Chhmar", "🌾 Rice country", "🚉 Border trade"],
  },
  KH02: {
    khmer: "បាត់ដំបង",
    tagline:
      "Cambodia's rice bowl — colonial-era streets, the bamboo train, and a famous arts and circus scene.",
    knownFor: ["🌾 Rice bowl", "🎨 Arts & circus", "🚋 Bamboo train"],
  },
  KH03: {
    khmer: "កំពង់ចាម",
    tagline:
      "A grand Mekong river port amid rubber country, with the rebuilt-every-season bamboo bridge to Koh Paen.",
    knownFor: ["🌉 Bamboo bridge", "🛕 Wat Nokor", "🌳 Rubber"],
  },
  KH04: {
    khmer: "កំពង់ឆ្នាំង",
    tagline:
      "The pottery province — 'chhnang' means cooking pot — with floating villages where the Tonlé Sap narrows.",
    knownFor: ["🏺 Pottery", "🛶 Floating villages", "🐟 Tonlé Sap fish"],
  },
  KH05: {
    khmer: "កំពង់ស្ពឺ",
    tagline:
      "Palm-sugar country under the Cardamoms — Kirirom's pine forests and Cambodia's highest peak, Phnom Aural.",
    knownFor: ["🌴 Palm sugar", "🌲 Kirirom", "⛰️ Phnom Aural"],
  },
  KH06: {
    khmer: "កំពង់ធំ",
    tagline:
      "Between the great lake and the north — home of Sambor Prei Kuk, capital of ancient Chenla.",
    knownFor: ["🛕 Sambor Prei Kuk", "🐦 Tonlé Sap wetlands", "🌾 Rice & cashews"],
  },
  KH07: {
    khmer: "កំពត",
    tagline:
      "World-famous pepper farms, salt fields and a riverside old town beneath misty Bokor mountain.",
    knownFor: ["🌶️ Kampot pepper", "🧂 Salt fields", "⛰️ Bokor"],
  },
  KH08: {
    khmer: "កណ្ដាល",
    tagline:
      "The province around the capital — Mekong islands, market gardens, and the old royal hill of Oudong.",
    knownFor: ["👑 Oudong", "🏝️ Mekong islands", "🥬 Market gardens"],
  },
  KH09: {
    khmer: "កោះកុង",
    tagline:
      "The wild south-west — Cardamom rainforest, mangrove shores and island-scattered seas.",
    knownFor: ["🌧️ Cardamom rainforest", "🌿 Mangroves", "🏝️ Islands"],
  },
  KH10: {
    khmer: "ក្រចេះ",
    tagline:
      "A sleepy Mekong river town famous for the Irrawaddy dolphins of Kampi pool.",
    knownFor: ["🐬 Irrawaddy dolphins", "🏞️ Mekong islands", "🛕 Phnom Sambok"],
  },
  KH11: {
    khmer: "មណ្ឌលគិរី",
    tagline:
      "Rolling highlands of the east — waterfalls, coffee, elephants, and the homeland of the Bunong people.",
    knownFor: ["🐘 Elephants", "💦 Bou Sra falls", "☕ Coffee"],
  },
  KH12: {
    khmer: "ភ្នំពេញ",
    tagline:
      "The capital at the four-faced rivers — the Royal Palace, riverside boulevards, and Wat Phnom's legend.",
    knownFor: ["👑 Royal Palace", "🏞️ Chaktomuk riverfront", "🛕 Wat Phnom"],
  },
  KH13: {
    khmer: "ព្រះវិហារ",
    tagline:
      "The high, wild north — the clifftop temple of Preah Vihear and the lost capital of Koh Ker.",
    knownFor: ["🛕 Preah Vihear temple", "🛕 Koh Ker", "🌳 Northern forests"],
  },
  KH14: {
    khmer: "ព្រៃវែង",
    tagline:
      "'The long forest' — now deep rice-and-fish country east of the Mekong, with roots back to Funan at Ba Phnom.",
    knownFor: ["🌾 Rice & fish", "⛰️ Ba Phnom", "🕰️ Funan roots"],
  },
  KH15: {
    khmer: "ពោធិ៍សាត់",
    tagline:
      "Between lake and mountains — marble carvers, the floating village of Kampong Luong, and famous oranges.",
    knownFor: ["🪨 Marble carving", "🛶 Kampong Luong", "🍊 Pursat oranges"],
  },
  KH16: {
    khmer: "រតនគិរី",
    tagline:
      "Red-earth highlands — the volcanic crater lake of Yeak Laom, gem mines and indigenous villages.",
    knownFor: ["🌋 Yeak Laom lake", "💎 Zircon gems", "🏞️ Virachey park"],
  },
  KH17: {
    khmer: "សៀមរាប",
    tagline:
      "Home of Angkor — the heart of the Khmer Empire and Cambodia's living hall of wonders.",
    knownFor: ["🛕 Angkor", "🛶 Tonlé Sap villages", "🎭 Crafts & performance"],
  },
  KH18: {
    khmer: "ព្រះសីហនុ",
    tagline:
      "Cambodia's deep-water port and beach coast — the gateway to Koh Rong's white sands.",
    knownFor: ["⚓ Deep-sea port", "🏖️ Beaches", "🏝️ Koh Rong"],
  },
  KH19: {
    khmer: "ស្ទឹងត្រែង",
    tagline:
      "Where the Sekong meets the Mekong — river islands, Ramsar flooded forests and thundering border falls.",
    knownFor: ["🏞️ Sekong–Mekong", "💦 Sopheakmit falls", "🌊 Flooded forest"],
  },
  KH20: {
    khmer: "ស្វាយរៀង",
    tagline:
      "The 'mango province' of the far south-east — rice plains threaded by the Waiko river.",
    knownFor: ["🥭 Mangoes", "🌾 Rice plains", "🛂 Bavet gateway"],
  },
  KH21: {
    khmer: "តាកែវ",
    tagline:
      "Called the cradle of Khmer civilisation — Angkor Borei and Phnom Da, where Funan's story comes to light.",
    knownFor: ["🛕 Phnom Da", "🏺 Angkor Borei", "🧵 Silk weaving"],
  },
  KH22: {
    khmer: "ឧត្ដរមានជ័យ",
    tagline:
      "Cambodia's remote north under the Dângrêk escarpment — one of the youngest provinces, at peace after difficult decades.",
    knownFor: ["⛰️ Dângrêk range", "🌾 Rice frontier", "🕊️ Anlong Veng"],
  },
  KH23: {
    khmer: "កែប",
    tagline:
      "Cambodia's oldest seaside resort, founded in 1908 — the crab market, and Rabbit Island offshore.",
    knownFor: ["🦀 Crab market", "🏖️ Seaside villas", "🏝️ Koh Tonsay"],
  },
  KH24: {
    khmer: "ប៉ៃលិន",
    tagline:
      "Gem country in the Cardamom foothills — sapphires, rubies and orchard fruit.",
    knownFor: ["💎 Sapphires & rubies", "🍊 Orchards", "⛰️ Cardamom foothills"],
  },
  KH25: {
    khmer: "ត្បូងឃ្មុំ",
    tagline:
      "Cambodia's youngest province (2013) — rubber, cashew and pepper country on the Mekong's east bank.",
    knownFor: ["🌳 Rubber plantations", "🌶️ Memot pepper", "🏞️ Mekong east bank"],
  },
};
