/**
 * public/audio/*.mp3 — one short pronunciation clip per Khmer letter, vowel,
 * and numeral, so the Alphabet Classroom can play a real sound on click
 * instead of depending on the visitor's device having a Khmer TTS voice
 * installed (most don't — see src/lib/voice.ts).
 *
 * Fetches clips once from Google Translate's TTS endpoint (the same free,
 * no-API-key service the popular `gTTS` library wraps) and checks them into
 * the repo as static assets — the deployed app never calls out to Google at
 * runtime. This is an interim measure: TODO.md's actual ask is real
 * CC-BY/CC0 native-speaker recordings, which should replace these files
 * whenever a contributor can provide them (see public/audio/README.md).
 *
 * A bare isolated consonant usually TTS's fine as its own citation name, but
 * ឆ came out wrong — confirmed by a native speaker that ឆ + ូ = ឆូ ("chhou")
 * is the correct fix. That does NOT generalize to other consonants (checked
 * with the same native speaker) — see CONSONANT_OVERRIDES below for the only
 * exception; everything else stays a bare letter.
 *
 * Dependent vowels have no sound on their own, so they're spoken attached to
 * a sample a-series consonant (ក) — same anchor src/khmer.ts's usageFor()
 * samples with. The filename key is still each vowel's own char, though.
 *
 * Run: `node scripts/generate-audio.mjs` (all clips), or pass specific chars
 * to regenerate just those, e.g. `node scripts/generate-audio.mjs ឆ ក`.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../public/audio");

const CONSONANTS = ["ក", "ខ", "គ", "ឃ", "ង", "ច", "ឆ", "ជ", "ឈ", "ញ", "ដ", "ឋ", "ឌ", "ឍ", "ណ", "ត", "ថ", "ទ", "ធ", "ន", "ប", "ផ", "ព", "ភ", "ម", "យ", "រ", "ល", "វ", "ស", "ហ", "ឡ", "អ"];
const DEPENDENT_VOWELS = ["ា", "ិ", "ី", "ឹ", "ឺ", "ុ", "ូ", "ួ", "ើ", "ឿ", "ៀ", "េ", "ែ", "ៃ", "ោ", "ៅ", "ុំ", "ំ", "ាំ", "ះ"];
const INDEPENDENT_VOWELS = ["ឥ", "ឦ", "ឧ", "ឩ", "ឪ", "ឫ", "ឬ", "ឭ", "ឮ", "ឯ", "ឰ", "ឱ", "ឳ"];
const NUMERALS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

const ANCHOR = "ក"; // sample a-series consonant dependent vowels attach to

// Bare-letter citation reads wrong for these — confirmed by ear, one at a
// time, with a native speaker. Do not extend this by guessing; only add an
// entry here once someone has actually confirmed the fix sounds right.
const CONSONANT_OVERRIDES = {
  ឆ: "ូ", // bare ឆ mispronounced; ឆ + ូ = ឆូ ("chhou") confirmed correct
};

/** Filesystem-safe, unambiguous key: the char's own codepoints in hex. */
function slug(ch) {
  return [...ch].map((c) => c.codePointAt(0).toString(16).toUpperCase()).join("-");
}

function textToSpeak(ch, isVowel) {
  if (CONSONANT_OVERRIDES[ch]) return ch + CONSONANT_OVERRIDES[ch];
  return isVowel ? ANCHOR + ch : ch;
}

async function fetchClip(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=km&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`suspiciously small response (${buf.length}B)`);
  return buf;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const only = process.argv.slice(2);
  let jobs = [
    ...CONSONANTS.map((ch) => ({ ch, isVowel: false })),
    ...DEPENDENT_VOWELS.map((ch) => ({ ch, isVowel: true })),
    ...INDEPENDENT_VOWELS.map((ch) => ({ ch, isVowel: false })),
    ...NUMERALS.map((ch) => ({ ch, isVowel: false })),
  ];
  if (only.length) jobs = jobs.filter((j) => only.includes(j.ch));

  let ok = 0;
  let failed = [];
  for (const { ch, isVowel } of jobs) {
    const file = resolve(OUT_DIR, `${slug(ch)}.mp3`);
    const text = textToSpeak(ch, isVowel);
    try {
      const buf = await fetchClip(text);
      writeFileSync(file, buf);
      ok++;
      console.log(`  ${ch} ("${text}") -> ${slug(ch)}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      failed.push(ch);
      console.error(`  FAILED ${ch} ("${text}"): ${e.message}`);
    }
    await sleep(350); // be polite to the endpoint — avoid tripping rate limits
  }

  console.log(`\n${ok}/${jobs.length} clips written to ${OUT_DIR}`);
  if (failed.length) console.log(`Failed: ${failed.join(" ")} — re-run this script to retry just those.`);
}

main();
