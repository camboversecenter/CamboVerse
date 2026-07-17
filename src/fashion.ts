/**
 * Khmer traditional fashion (សម្លៀកបំពាក់ប្រពៃណីខ្មែរ) — three lenses:
 *  • Colour by day — the seven-day colour custom (ពណ៌ប្រចាំថ្ងៃ), an outfit
 *    colour for each day of the week.
 *  • Varieties — the garments themselves (sampot, chang kben, phamuong, av pak,
 *    krama…). A starting set; more to add (see TODO.md).
 *  • Through the ages — how Khmer dress changed across the historical eras,
 *    tied to the "Back in Time" history.
 *
 * The seven-day colours and era styles are traditional but regionally and
 * historically varied — treat them as a respectful, community-verifiable guide,
 * not a single authority.
 */

/** An outfit the procedural figure can wear. */
export interface Outfit {
  /** Sampot (lower garment) colour. */
  skirt: string;
  /** Wrap skirt, or chang kben (the pantaloon wrap). */
  skirtStyle?: "skirt" | "kben";
  /** Upper garment. */
  top: "sbai" | "blouse" | "shirt" | "bare";
  topColor: string;
  /** Krama scarf colour, or null for none. */
  krama?: string | null;
  /** Ceremonial gold — crown (mkot), belt, jewellery. */
  gold?: boolean;
  /** Trousers colour (e.g. the enforced black of the Khmer Rouge years). */
  legs?: string | null;
  tone?: string;
}

export interface DayColor {
  day: string;
  khmer: string;
  color: string;
  colorName: string;
}

/**
 * The seven-day colours (Sunday→Saturday), matching the traditional sbai-and-
 * sampot palette. Sources vary on a few days — verify with Khmer elders.
 */
export const DAY_COLORS: DayColor[] = [
  { day: "Sunday", khmer: "ថ្ងៃអាទិត្យ", color: "#d23b30", colorName: "Red · ក្រហម" },
  { day: "Monday", khmer: "ថ្ងៃចន្ទ", color: "#e0892f", colorName: "Orange · ទឹកក្រូច" },
  { day: "Tuesday", khmer: "ថ្ងៃអង្គារ", color: "#8a4fa0", colorName: "Purple · ស្វាយ" },
  { day: "Wednesday", khmer: "ថ្ងៃពុធ", color: "#7fa93c", colorName: "Green · បៃតង" },
  { day: "Thursday", khmer: "ថ្ងៃព្រហស្បតិ៍", color: "#9fc0a0", colorName: "Pale green · បៃតងខ្ចី" },
  { day: "Friday", khmer: "ថ្ងៃសុក្រ", color: "#4a86c8", colorName: "Blue · ខៀវ" },
  { day: "Saturday", khmer: "ថ្ងៃសៅរ៍", color: "#8f2f45", colorName: "Dark red · ស្វាយចាស់" },
];

export interface Variety {
  id: string;
  name: string;
  khmer: string;
  english: string;
  desc: string;
  outfit: Outfit;
}

/** A starting set of garment styles — the community can add many more. */
export const VARIETIES: Variety[] = [
  {
    id: "sbai",
    name: "Sbai · Sampot",
    khmer: "ស្បៃ · សំពត់",
    english: "Ceremonial shoulder cloth & skirt",
    desc: "The formal look of the seven-day colours and of dancers: a sbai (ស្បៃ) draped over one shoulder across the body, a wrapped sampot, a golden belt, and an apsara-style crown (មកុដ).",
    outfit: { skirt: "#c8912e", top: "sbai", topColor: "#d23b30", gold: true, skirtStyle: "skirt" },
  },
  {
    id: "changkben",
    name: "Sampot Chang Kben",
    khmer: "សំពត់ចងក្បិន",
    english: "The pantaloon wrap",
    desc: "A long cloth wrapped around the waist, passed between the legs and tucked at the back to make loose 'pantaloons'. Worn by women and men alike for formal occasions — the classic Khmer silhouette on the Angkor reliefs.",
    outfit: { skirt: "#6a4b8a", top: "bare", topColor: "#6a4b8a", gold: true, skirtStyle: "kben" },
  },
  {
    id: "phamuong",
    name: "Sampot Phamuong",
    khmer: "សំពត់ផាមួង",
    english: "Twill silk sampot",
    desc: "A traditional single-colour twill-weave silk, often in a rich jewel tone — a formal cloth woven on Cambodian looms, worn with an embroidered blouse.",
    outfit: { skirt: "#2f6f5e", top: "blouse", topColor: "#e7dcc4", gold: true, skirtStyle: "skirt" },
  },
  {
    id: "avpak",
    name: "Av Pak",
    khmer: "អាវប៉ាក់",
    english: "Embroidered blouse",
    desc: "A fitted blouse embroidered with fine thread and beadwork, worn over a sampot for weddings and ceremonies — pairing the upper garment with the lower silk.",
    outfit: { skirt: "#8f2f45", top: "blouse", topColor: "#f0e2c0", gold: true, skirtStyle: "skirt" },
  },
  {
    id: "krama",
    name: "Krama",
    khmer: "ក្រមា",
    english: "The checkered scarf",
    desc: "Cambodia's most iconic everyday cloth — a checkered cotton scarf worn a hundred ways: sun-shade, towel, sarong, baby-sling, belt. From farmer to city, everyone has a krama.",
    outfit: { skirt: "#4a6a8a", top: "shirt", topColor: "#dcdcd2", krama: "#c0392b", skirtStyle: "skirt" },
  },
];

export interface FashionEra {
  id: string; // matches history.ts era ids where possible
  name: string;
  khmer: string;
  years: string;
  desc: string;
  outfit: Outfit;
}

/** How dress changed through the ages — aligned to the "Back in Time" eras. */
export const FASHION_ERAS: FashionEra[] = [
  {
    id: "angkor",
    name: "The Angkor Empire",
    khmer: "ចក្រភពអង្គរ",
    years: "802–1431",
    desc: "On the Angkor bas-reliefs, both men and women wear the sampot chang kben, often bare-chested, adorned with elaborate gold — crowns, collars, and armlets. The apsara dancers' costume descends from this age.",
    outfit: { skirt: "#c8912e", top: "bare", topColor: "#c8912e", gold: true, skirtStyle: "kben" },
  },
  {
    id: "middle",
    name: "The Middle Period",
    khmer: "សម័យកណ្ដាល",
    years: "1431–1863",
    desc: "After Angkor, dress grew more covered. The chang kben and wrapped sampot remained everyday wear, in handwoven silk and cotton, with a sbai for formal occasions.",
    outfit: { skirt: "#7a4b2a", top: "sbai", topColor: "#8a5a3a", skirtStyle: "kben" },
  },
  {
    id: "french",
    name: "French Protectorate",
    khmer: "អាណាព្យាបាលបារាំង",
    years: "1863–1953",
    desc: "Under the protectorate, Western tailoring mixed with Khmer dress — fitted blouses and jackets over the sampot, a blend of a covered top with the traditional lower cloth.",
    outfit: { skirt: "#4a5a6a", top: "blouse", topColor: "#e7e0d2", skirtStyle: "skirt" },
  },
  {
    id: "independence",
    name: "Independence & Sangkum",
    khmer: "ឯករាជ្យ",
    years: "1953–1970",
    desc: "A golden age of Cambodian style — women in elegant fitted blouses and phamuong silk sampots, a confident blend of the traditional and the modern in the era of your grandparents.",
    outfit: { skirt: "#2f6f8e", top: "blouse", topColor: "#f0e6d2", gold: true, skirtStyle: "skirt" },
  },
  {
    id: "war",
    name: "The Khmer Rouge years",
    khmer: "សម័យខ្មែរក្រហម",
    years: "1975–1979",
    desc: "Under the Khmer Rouge, everyone was forced to wear the same plain black clothing and a krama — colour, silk, and personal dress were banned. It is remembered with sorrow, a stark break in a long, colourful tradition.",
    outfit: { skirt: "#1c1c1c", top: "shirt", topColor: "#1c1c1c", krama: "#7a2e2e", legs: "#1c1c1c", skirtStyle: "skirt" },
  },
  {
    id: "modern",
    name: "Modern Cambodia",
    khmer: "កម្ពុជាសម័យទំនើប",
    years: "1979–today",
    desc: "Today Cambodians wear everyday modern clothes, but the traditional silk sampot, sbai, and the seven-day colours return for weddings, festivals, and Buddhist holy days — a living heritage, proudly revived.",
    outfit: { skirt: "#b0325a", top: "sbai", topColor: "#d23b30", gold: true, skirtStyle: "skirt" },
  },
];

/** The gentle credential for touring Khmer fashion through the ages. */
export const FASHION_CREDENTIAL = "fashion:through-the-ages";
