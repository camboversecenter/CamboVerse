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
}

export interface KhmerGroup {
  id: string;
  title: string;
  khmer: string;
  note: string;
  letters: KhmerLetter[];
}

const DOT = "◌"; // dotted circle base for combining vowels
const dv = (char: string, roman: string): KhmerLetter => ({ char, display: DOT + char, roman });
const con = (char: string, roman: string, series: Series): KhmerLetter => ({ char, display: char, roman, series });

export const KHMER_GROUPS: KhmerGroup[] = [
  {
    id: "consonants",
    title: "Consonants",
    khmer: "ព្យញ្ជនៈ",
    note:
      "33 consonants. Each belongs to the a-series or o-series, which decides how the vowels with it are pronounced.",
    letters: [
      con("ក", "kâ", "a"), con("ខ", "khâ", "a"), con("គ", "kô", "o"), con("ឃ", "khô", "o"), con("ង", "ngô", "o"),
      con("ច", "châ", "a"), con("ឆ", "chhâ", "a"), con("ជ", "chô", "o"), con("ឈ", "chhô", "o"), con("ញ", "nhô", "o"),
      con("ដ", "dâ", "a"), con("ឋ", "thâ", "a"), con("ឌ", "dô", "o"), con("ឍ", "thô", "o"), con("ណ", "nâ", "a"),
      con("ត", "tâ", "a"), con("ថ", "thâ", "a"), con("ទ", "tô", "o"), con("ធ", "thô", "o"), con("ន", "nô", "o"),
      con("ប", "bâ", "a"), con("ផ", "phâ", "a"), con("ព", "pô", "o"), con("ភ", "phô", "o"), con("ម", "mô", "o"),
      con("យ", "yô", "o"), con("រ", "rô", "o"), con("ល", "lô", "o"), con("វ", "vô", "o"),
      con("ស", "sâ", "a"), con("ហ", "hâ", "a"), con("ឡ", "lâ", "a"), con("អ", "’â", "a"),
    ],
  },
  {
    id: "dependent-vowels",
    title: "Dependent vowels",
    khmer: "ស្រៈនិស្ស័យ",
    note:
      "Vowel signs that attach to a consonant. Each is read one way after an a-series consonant and another after an o-series one.",
    letters: [
      dv("ា", "aa"), dv("ិ", "e/i"), dv("ី", "ei/i"), dv("ឹ", "oe"), dv("ឺ", "eu"),
      dv("ុ", "o/u"), dv("ូ", "ou"), dv("ួ", "uo"), dv("ើ", "aeu"), dv("ឿ", "uea"),
      dv("ៀ", "iə"), dv("េ", "e"), dv("ែ", "ae"), dv("ៃ", "ai"), dv("ោ", "ao"),
      dv("ៅ", "au"), dv("ុំ", "om"), dv("ំ", "am/om"), dv("ាំ", "am"), dv("ះ", "ah"),
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
