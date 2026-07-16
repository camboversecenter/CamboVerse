/**
 * Virtual Meditation (សមាធិនិម្មិត) — serene Khmer sanctuaries you sit inside,
 * flat-screen or in VR. Cambodia's forests, mountains, temples and rivers are
 * places of natural stillness; here each becomes a calm space with a generated
 * ambient soundscape and a gentle breathing guide.
 *
 * The practice is universal — breath and presence, for anyone of any faith or
 * none. The *setting* honours Khmer sacred landscapes. An optional chant layer
 * offers traditional Theravada verses (see SUTRAS); it is off by default and
 * never instructs — it simply shares the words as heritage.
 */
export type Ambience = "forest" | "temple" | "mountain" | "river";

export interface SoundLayers {
  wind?: number; // 0..1 amount
  water?: number;
  birds?: number; // birds/min-ish density
  insects?: number;
  bell?: number; // bell strikes density
}

export interface Sanctuary {
  id: string;
  name: string;
  khmer: string;
  english: string;
  scene: Ambience;
  /** A short, calming invitation shown on entry. */
  invite: string;
  /** Sky / mood colours. */
  sky: string;
  fog: [string, number, number];
  accent: string;
  sound: SoundLayers;
}

export const SANCTUARIES: Sanctuary[] = [
  {
    id: "forest",
    name: "Prey",
    khmer: "ព្រៃ",
    english: "Rainforest",
    scene: "forest",
    invite: "Deep in the Cardamom forest. Let the birdsong and the breath of the trees carry your attention.",
    sky: "#243026",
    fog: ["#2b3a2e", 8, 26],
    accent: "#6fae55",
    sound: { wind: 0.5, birds: 0.7, insects: 0.6 },
  },
  {
    id: "temple",
    name: "Prasat",
    khmer: "ប្រាសាទ",
    english: "Temple at Dawn",
    scene: "temple",
    invite: "Before an Angkor temple as first light breaks through the mist. A distant bell marks the stillness.",
    sky: "#e7cfa6",
    fog: ["#e3c79a", 10, 34],
    accent: "#c8912e",
    sound: { wind: 0.3, bell: 0.5, birds: 0.3 },
  },
  {
    id: "mountain",
    name: "Phnom",
    khmer: "ភ្នំ",
    english: "Mountain Mist",
    scene: "mountain",
    invite: "High on a Kulen ridge, above the clouds. Only the wind, the space, and your breathing.",
    sky: "#bcd0dd",
    fog: ["#c3d4df", 9, 30],
    accent: "#7fa0b8",
    sound: { wind: 0.8 },
  },
  {
    id: "river",
    name: "Tonle",
    khmer: "ទន្លេ",
    english: "Riverside at Dusk",
    scene: "river",
    invite: "By the Mekong at dusk. Water moves without hurry; let each breath settle like the evening.",
    sky: "#caa4b0",
    fog: ["#b98f9c", 10, 30],
    accent: "#b3728a",
    sound: { water: 0.7, insects: 0.5, birds: 0.2 },
  },
];

export function sanctuaryById(id: string): Sanctuary | undefined {
  return SANCTUARIES.find((s) => s.id === id);
}

/** Breathing patterns (seconds). "hold" may be 0. */
export interface BreathPattern {
  id: string;
  label: string;
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
}
export const BREATH_PATTERNS: BreathPattern[] = [
  { id: "calm", label: "Calm 4·2·6", inhale: 4, hold: 2, exhale: 6, rest: 0 },
  { id: "box", label: "Box 4·4·4·4", inhale: 4, hold: 4, exhale: 4, rest: 4 },
  { id: "deep", label: "Deep 4·7·8", inhale: 4, hold: 7, exhale: 8, rest: 0 },
];

/** Session lengths offered, in minutes. */
export const DURATIONS = [2, 5, 10] as const;

/**
 * A small set of foundational, universally-recited Theravada verses, shared as
 * heritage — not as instruction. Pali is the canonical language of recitation
 * in Cambodia; the English is a plain rendering of the meaning; the Khmer gives
 * the sense. These are traditional and widely known, but Khmer-script Pali
 * orthography and translations should be reviewed with Cambodian monastic
 * communities (see TODO.md · "Grow the Virtual Meditation").
 */
export interface Sutra {
  id: string;
  title: string;
  pali: string;
  english: string;
  khmer: string;
}
export const SUTRAS: Sutra[] = [
  {
    id: "vandana",
    title: "Homage · វន្ទនា",
    pali: "Namo tassa bhagavato arahato sammāsambuddhassa",
    english: "Homage to the Blessed One, the Worthy One, the Perfectly Self-Awakened One.",
    khmer: "សូមនមស្ការព្រះមានព្រះភាគ អរហន្ត សម្មាសម្ពុទ្ធ",
  },
  {
    id: "tisarana",
    title: "The Three Refuges · ត្រៃសរណគមន៍",
    pali: "Buddhaṃ saraṇaṃ gacchāmi · Dhammaṃ saraṇaṃ gacchāmi · Saṅghaṃ saraṇaṃ gacchāmi",
    english: "I go to the Buddha for refuge; to the Dhamma for refuge; to the Sangha for refuge.",
    khmer: "ខ្ញុំសូមប្រកាន់យកព្រះពុទ្ធ ព្រះធម៌ និងព្រះសង្ឃ ជាទីពឹង",
  },
  {
    id: "metta",
    title: "Loving-kindness · មេត្តា",
    pali: "Sabbe sattā sukhī hontu, averā hontu, abyāpajjhā hontu",
    english: "May all beings be happy; may they be free from enmity; may they be free from affliction.",
    khmer: "សូមឲ្យសព្វសត្វទាំងអស់មានសុភមង្គល ឥតពៀរ ឥតទុក្ខ",
  },
  {
    id: "anicca",
    title: "Impermanence · អនិច្ចា",
    pali: "Aniccā vata saṅkhārā, uppādavaya-dhammino",
    english: "Impermanent are all conditioned things; their nature is to arise and pass away.",
    khmer: "សង្ខារទាំងឡាយមិនទៀង កើតឡើងហើយរលត់ទៅវិញ",
  },
];

/** The gentle, non-scored credential for completing a sitting. */
export const MED_CREDENTIAL = "meditation:calm";
