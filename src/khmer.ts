/**
 * The Khmer alphabet (អក្សរខ្មែរ), as data for the Khmer Alphabet Classroom.
 *
 * Khmer letters have two written shapes:
 *  - "Normal" (Noto Sans Khmer here) — the everyday upright shapes.
 *  - "Moul" (អក្សរមូល) — the rounded, ceremonial shapes used for titles, temple
 *    signs, and formal headings.
 * The classroom shows every letter in both, using embedded Google fonts.
 *
 * Consonants carry a "series" (a-series អ / o-series អ) that colours the vowels
 * pronounced with them — the single most important idea in reading Khmer.
 * Dependent vowels are shown on a dotted circle (◌, U+25CC) since they attach to
 * a consonant; romanisations are approximate teaching aids, not strict IPA.
 */
export type Series = "a" | "o";

export interface KhmerLetter {
  /** The character(s). */
  char: string;
  /** How it's shown standalone (dependent vowels get a dotted-circle base). */
  display: string;
  /** Approximate romanisation / sound. */
  roman: string;
  /** Khmer or descriptive name, where useful. */
  name?: string;
  /** Consonant series (a/o), where applicable. */
  series?: Series;
  /** Consonant sound without its inherent vowel (e.g. ក → "k"), for syllables. */
  base?: string;
  /** Dependent-vowel reading after an a-series consonant. */
  aRoman?: string;
  /** Dependent-vowel reading after an o-series consonant. */
  oRoman?: string;
}

export interface KhmerGroup {
  id: string;
  title: string;
  khmer: string;
  note: string;
  letters: KhmerLetter[];
}

const DOT = "◌"; // dotted circle base for combining vowels
// Dependent vowel: two readings (a-series / o-series) — approximate teaching aids.
const dv = (char: string, aRoman: string, oRoman: string): KhmerLetter => ({
  char,
  display: DOT + char,
  roman: `${aRoman} / ${oRoman}`,
  aRoman,
  oRoman,
});
const con = (char: string, roman: string, series: Series, base: string): KhmerLetter => ({
  char,
  display: char,
  roman,
  series,
  base,
});

export const KHMER_GROUPS: KhmerGroup[] = [
  {
    id: "consonants",
    title: "Consonants",
    khmer: "ព្យញ្ជនៈ",
    note:
      "33 consonants. Each belongs to the a-series or o-series, which decides how the vowels with it are pronounced.",
    letters: [
      con("ក", "kâ", "a", "k"), con("ខ", "khâ", "a", "kh"), con("គ", "kô", "o", "k"), con("ឃ", "khô", "o", "kh"), con("ង", "ngô", "o", "ng"),
      con("ច", "châ", "a", "ch"), con("ឆ", "chhâ", "a", "chh"), con("ជ", "chô", "o", "ch"), con("ឈ", "chhô", "o", "chh"), con("ញ", "nhô", "o", "nh"),
      con("ដ", "dâ", "a", "d"), con("ឋ", "thâ", "a", "th"), con("ឌ", "dô", "o", "d"), con("ឍ", "thô", "o", "th"), con("ណ", "nâ", "a", "n"),
      con("ត", "tâ", "a", "t"), con("ថ", "thâ", "a", "th"), con("ទ", "tô", "o", "t"), con("ធ", "thô", "o", "th"), con("ន", "nô", "o", "n"),
      con("ប", "bâ", "a", "b"), con("ផ", "phâ", "a", "ph"), con("ព", "pô", "o", "p"), con("ភ", "phô", "o", "ph"), con("ម", "mô", "o", "m"),
      con("យ", "yô", "o", "y"), con("រ", "rô", "o", "r"), con("ល", "lô", "o", "l"), con("វ", "vô", "o", "v"),
      con("ស", "sâ", "a", "s"), con("ហ", "hâ", "a", "h"), con("ឡ", "lâ", "a", "l"), con("អ", "’â", "a", "’"),
    ],
  },
  {
    id: "dependent-vowels",
    title: "Dependent vowels",
    khmer: "ស្រៈនិស្ស័យ",
    note:
      "Vowel signs that attach to a consonant. Each is read one way after an a-series consonant and another after an o-series one.",
    letters: [
      dv("ា", "aa", "ie"), dv("ិ", "e", "i"), dv("ី", "ei", "i"), dv("ឹ", "eu", "eu"), dv("ឺ", "eu", "eu"),
      dv("ុ", "o", "u"), dv("ូ", "ou", "u"), dv("ួ", "uo", "uo"), dv("ើ", "aeu", "eu"), dv("ឿ", "eua", "eua"),
      dv("ៀ", "ie", "ie"), dv("េ", "e", "e"), dv("ែ", "ae", "ee"), dv("ៃ", "ai", "ey"), dv("ោ", "ao", "oo"),
      dv("ៅ", "au", "ou"), dv("ុំ", "om", "um"), dv("ំ", "am", "um"), dv("ាំ", "am", "oam"), dv("ះ", "ah", "eah"),
    ],
  },
  {
    id: "independent-vowels",
    title: "Independent vowels",
    khmer: "ស្រៈពេញតួ",
    note: "Full vowels that stand on their own (no consonant needed) — used in a smaller set of words.",
    letters: [
      { char: "ឥ", display: "ឥ", roman: "’e" }, { char: "ឦ", display: "ឦ", roman: "’ei" },
      { char: "ឧ", display: "ឧ", roman: "’o" }, { char: "ឩ", display: "ឩ", roman: "’u" },
      { char: "ឪ", display: "ឪ", roman: "’ou" }, { char: "ឫ", display: "ឫ", roman: "’rœ" },
      { char: "ឬ", display: "ឬ", roman: "’rœɨ" }, { char: "ឭ", display: "ឭ", roman: "’lœ" },
      { char: "ឮ", display: "ឮ", roman: "’lœɨ" }, { char: "ឯ", display: "ឯ", roman: "’ae" },
      { char: "ឰ", display: "ឰ", roman: "’ai" }, { char: "ឱ", display: "ឱ", roman: "’ao" },
      { char: "ឳ", display: "ឳ", roman: "’au" },
    ],
  },
  {
    id: "numerals",
    title: "Numerals",
    khmer: "លេខ",
    note: "The Khmer digits 0–9, still used everywhere alongside Western numerals.",
    letters: [
      { char: "០", display: "០", roman: "0", name: "សូន្យ" }, { char: "១", display: "១", roman: "1", name: "មួយ" },
      { char: "២", display: "២", roman: "2", name: "ពីរ" }, { char: "៣", display: "៣", roman: "3", name: "បី" },
      { char: "៤", display: "៤", roman: "4", name: "បួន" }, { char: "៥", display: "៥", roman: "5", name: "ប្រាំ" },
      { char: "៦", display: "៦", roman: "6", name: "ប្រាំមួយ" }, { char: "៧", display: "៧", roman: "7", name: "ប្រាំពីរ" },
      { char: "៨", display: "៨", roman: "8", name: "ប្រាំបី" }, { char: "៩", display: "៩", roman: "9", name: "ប្រាំបួន" },
    ],
  },
];

/** Font families (must match the @font-face names in src/index.css). */
export const KHMER_FONTS = {
  normal: { label: "Normal", khmer: "អក្សរធម្មតា", family: "Noto Sans Khmer" },
  moul: { label: "Moul", khmer: "អក្សរមូល", family: "Moul" },
} as const;

export type KhmerShape = keyof typeof KHMER_FONTS;

// ---- "How to use" a letter: syllables and examples ---------------------------

export interface Syllable {
  /** The composed Khmer text (font shapes it correctly). */
  khmer: string;
  /** Approximate romanised sound. */
  sound: string;
  /** Optional gloss (e.g. a numeral's value). */
  note?: string;
}

export interface LetterUsage {
  title: string;
  lesson: string;
  syllables: Syllable[];
}

const CONSONANTS = KHMER_GROUPS.find((g) => g.id === "consonants")!.letters;
const DEP_VOWELS = KHMER_GROUPS.find((g) => g.id === "dependent-vowels")!.letters;

/** Build the "how to use" content for a letter, given its group. */
export function usageFor(letter: KhmerLetter, groupId: string): LetterUsage {
  if (groupId === "consonants") {
    const base = letter.base ?? "";
    const series = letter.series ?? "a";
    const syllables: Syllable[] = [{ khmer: letter.char, sound: letter.roman, note: "on its own" }];
    for (const v of DEP_VOWELS) {
      const reading = (series === "a" ? v.aRoman : v.oRoman) ?? v.roman;
      syllables.push({ khmer: letter.char + v.char, sound: base + reading });
    }
    return {
      title: `Using ${letter.char} (${letter.roman})`,
      lesson: `A consonant + a vowel = a syllable. ${letter.char} is an ${series}-series consonant, so every vowel takes its ${series}-series reading.`,
      syllables,
    };
  }
  if (groupId === "dependent-vowels") {
    const samples = ["ក", "គ", "ន", "ម", "ស", "ព"]
      .map((c) => CONSONANTS.find((x) => x.char === c))
      .filter(Boolean) as KhmerLetter[];
    const syllables: Syllable[] = samples.map((c) => {
      const reading = (c.series === "a" ? letter.aRoman : letter.oRoman) ?? letter.roman;
      return { khmer: c.char + letter.char, sound: (c.base ?? "") + reading, note: `${c.series}-series` };
    });
    return {
      title: `Using the vowel ${letter.display}`,
      lesson: `This vowel attaches to a consonant, and its sound follows the consonant's series — “${letter.aRoman}” after a-series, “${letter.oRoman}” after o-series.`,
      syllables,
    };
  }
  if (groupId === "numerals") {
    return {
      title: `Using ${letter.char} (${letter.roman})`,
      lesson: "Khmer digits combine just like Western ones to write any number.",
      syllables: [
        { khmer: letter.char + "០", sound: `${letter.roman}0`, note: `${letter.roman}0` },
        { khmer: "១" + letter.char, sound: `1${letter.roman}`, note: `1${letter.roman}` },
        { khmer: "២០២" + letter.char, sound: `202${letter.roman}`, note: "a year" },
      ],
    };
  }
  // independent vowels
  return {
    title: `Using ${letter.char} (${letter.roman})`,
    lesson: "An independent vowel stands on its own — it begins a word without needing a consonant.",
    syllables: [],
  };
}
