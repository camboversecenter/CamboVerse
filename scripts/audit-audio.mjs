/**
 * One-off audit: enumerate every tile in the Alphabet Classroom (top-level
 * letters + each letter's "learn to use" syllables) and report which ones
 * have no clip in public/audio/. Not wired into the app or build.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = resolve(HERE, "../public/audio");

function slug(ch) {
  return [...ch].map((c) => c.codePointAt(0).toString(16).toUpperCase()).join("-");
}
function hasClip(ch) {
  return existsSync(resolve(AUDIO_DIR, `${slug(ch)}.mp3`));
}

// ---- mirrors src/khmer.ts -------------------------------------------------

const con = (char, roman, series, base) => ({ char, roman, series, base });
const dv = (char, aRoman, oRoman) => ({ char, roman: `${aRoman} / ${oRoman}`, aRoman, oRoman });

const CONSONANTS = [
  con("ក", "kâ", "a", "k"), con("ខ", "khâ", "a", "kh"), con("គ", "kô", "o", "k"), con("ឃ", "khô", "o", "kh"), con("ង", "ngô", "o", "ng"),
  con("ច", "châ", "a", "ch"), con("ឆ", "chhâ", "a", "chh"), con("ជ", "chô", "o", "ch"), con("ឈ", "chhô", "o", "chh"), con("ញ", "nhô", "o", "nh"),
  con("ដ", "dâ", "a", "d"), con("ឋ", "thâ", "a", "th"), con("ឌ", "dô", "o", "d"), con("ឍ", "thô", "o", "th"), con("ណ", "nâ", "a", "n"),
  con("ត", "tâ", "a", "t"), con("ថ", "thâ", "a", "th"), con("ទ", "tô", "o", "t"), con("ធ", "thô", "o", "th"), con("ន", "nô", "o", "n"),
  con("ប", "bâ", "a", "b"), con("ផ", "phâ", "a", "ph"), con("ព", "pô", "o", "p"), con("ភ", "phô", "o", "ph"), con("ម", "mô", "o", "m"),
  con("យ", "yô", "o", "y"), con("រ", "rô", "o", "r"), con("ល", "lô", "o", "l"), con("វ", "vô", "o", "v"),
  con("ស", "sâ", "a", "s"), con("ហ", "hâ", "a", "h"), con("ឡ", "lâ", "a", "l"), con("អ", "'â", "a", "'"),
];
const DEP_VOWELS = [
  dv("ា", "aa", "ie"), dv("ិ", "e", "i"), dv("ី", "ei", "i"), dv("ឹ", "eu", "eu"), dv("ឺ", "eu", "eu"),
  dv("ុ", "o", "u"), dv("ូ", "ou", "u"), dv("ួ", "uo", "uo"), dv("ើ", "aeu", "eu"), dv("ឿ", "eua", "eua"),
  dv("ៀ", "ie", "ie"), dv("េ", "e", "e"), dv("ែ", "ae", "ee"), dv("ៃ", "ai", "ey"), dv("ោ", "ao", "oo"),
  dv("ៅ", "au", "ou"), dv("ុំ", "om", "um"), dv("ំ", "am", "um"), dv("ាំ", "am", "oam"), dv("ះ", "ah", "eah"),
  dv("ុះ", "oh", "uh"), dv("េះ", "eh", "ih"), dv("ោះ", "aoh", "uoh"),
];
const INDEP_VOWELS = [
  "ឥ", "ឦ", "ឧ", "ឩ", "ឪ", "ឫ", "ឬ", "ឭ", "ឮ", "ឯ", "ឰ", "ឱ", "ឳ",
].map((char) => ({ char, roman: "" }));
const NUMERALS = [
  ["០", "0"], ["១", "1"], ["២", "2"], ["៣", "3"], ["៤", "4"],
  ["៥", "5"], ["៦", "6"], ["៧", "7"], ["៨", "8"], ["៩", "9"],
].map(([char, roman]) => ({ char, roman }));

// ---- mirrors usageFor() in src/khmer.ts -----------------------------------

function syllablesForConsonant(letter) {
  const base = letter.base ?? "";
  const series = letter.series ?? "a";
  const out = [{ khmer: letter.char, sound: letter.roman }];
  for (const v of DEP_VOWELS) {
    const reading = (series === "a" ? v.aRoman : v.oRoman) ?? v.roman;
    out.push({ khmer: letter.char + v.char, sound: base + reading });
  }
  return out;
}
function syllablesForVowel(letter) {
  const samples = ["ក", "គ", "ន", "ម", "ស", "ព"].map((c) => CONSONANTS.find((x) => x.char === c));
  return samples.map((c) => {
    const reading = (c.series === "a" ? letter.aRoman : letter.oRoman) ?? letter.roman;
    return { khmer: c.char + letter.char, sound: (c.base ?? "") + reading };
  });
}
function syllablesForNumeral(letter) {
  return [
    { khmer: letter.char + "០", sound: `${letter.roman}0` },
    { khmer: "១" + letter.char, sound: `1${letter.roman}` },
    { khmer: "២០២" + letter.char, sound: `202${letter.roman}` },
  ];
}

// ---- walk every tile -------------------------------------------------------

const rows = [];

function checkTop(kind, letters) {
  for (const l of letters) {
    rows.push({ screen: "Classroom (top-level)", kind, khmer: l.char, sound: l.roman ?? "", hasAudio: hasClip(l.char) });
  }
}
checkTop("consonant", CONSONANTS);
checkTop("dependent-vowel", DEP_VOWELS);
checkTop("independent-vowel", INDEP_VOWELS);
checkTop("numeral", NUMERALS);

for (const l of CONSONANTS) {
  for (const s of syllablesForConsonant(l)) {
    rows.push({ screen: `Learn to use ${l.char}`, kind: "syllable", khmer: s.khmer, sound: s.sound, hasAudio: hasClip(s.khmer) });
  }
}
for (const l of DEP_VOWELS) {
  for (const s of syllablesForVowel(l)) {
    rows.push({ screen: `Learn to use ${l.char}`, kind: "syllable", khmer: s.khmer, sound: s.sound, hasAudio: hasClip(s.khmer) });
  }
}
for (const l of NUMERALS) {
  for (const s of syllablesForNumeral(l)) {
    rows.push({ screen: `Learn to use ${l.char}`, kind: "numeral-combo", khmer: s.khmer, sound: s.sound, hasAudio: hasClip(s.khmer) });
  }
}
// independent vowels have no "learn to use" syllables (usageFor returns []).

const total = rows.length;
const missingRows = rows.filter((r) => !r.hasAudio);
const withAudio = total - missingRows.length;

console.log(`Total tiles: ${total}`);
console.log(`With audio:  ${withAudio}`);
console.log(`Missing:     ${missingRows.length}`);
console.log("");
console.log("screen\tkind\tkhmer\tsound");
for (const r of missingRows) {
  console.log(`${r.screen}\t${r.kind}\t${r.khmer}\t${r.sound}`);
}
