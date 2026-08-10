# Letter pronunciation clips

Short audio clips (one per consonant, dependent vowel, independent vowel, and
numeral) so the **Khmer Alphabet Classroom** can play a real sound on click,
instead of depending on the visitor's device having a Khmer text-to-speech
voice installed — most don't (see `src/lib/voice.ts`).

**Filename convention**: each letter's own Unicode codepoint(s) in uppercase
hex, joined by `-`, e.g. `1780.mp3` is ក (U+1780), `17BB-17C6.mp3` is ុំ
(U+17BB U+17C6). Dependent vowels have no sound on their own, so the *clip
content* is the vowel spoken attached to a sample consonant (កា, កិ, …) — but
the *filename* is still keyed by the vowel's own char, matching how the app
looks it up.

`ClassroomView.tsx` and `LetterSpace.tsx` play whatever file matches a letter's
codepoint slug, falling back to device text-to-speech when there is no file.

## Sources — mixed, and NOT yet cleared for release

This folder currently holds **two different kinds of clip**. `SOURCES.json`
records, per letter, which one it is and where it came from.

| Count | Source | Status |
| ----- | ------ | ------ |
| 57 | Human recordings from a Khmer phonics lesson archive (Google Drive), silence-trimmed and loudness-normalized to −16 LUFS | ⚠️ **provenance unconfirmed** |
| 19 | Machine-generated via Google Translate's TTS endpoint (`scripts/generate-audio.mjs`) | ⚠️ **placeholder, not openly licensed** |

**Neither set is cleared to publish yet.** Do not treat this folder as
CC-BY/CC0 until both questions below are answered:

1. **Who recorded the lesson archive, and can it be released CC-BY / CC0?**
   The clips came from a lesson-numbered Drive folder (`មេរៀនទី…`). Until the
   recordist and the speaker's consent are established, this is someone else's
   material. `ARCHITECTURE.md` §2 makes `license`, `provenance`, and `consent`
   mandatory — an asset without them is rejected (charter §3.5), and TODO.md
   allows only `CC-BY-4.0`, `CC-BY-SA-4.0`, or `CC0-1.0` (no NC, no ND).
2. **The 19 placeholders should be replaced, not shipped.** They are Google
   Translate TTS output and are not openly licensed.

### What's missing from the recordings

The lesson archive teaches **two consonants per lesson**, and only the first of
each pair gets a bare-letter recording. So these 19 have no human recording and
currently fall back to the machine placeholder:

- **8 consonants** — ថ ធ ផ ព ម រ វ ហ
- **1 independent vowel** — ឳ (appears only inside the word ក្រឳ)
- **10 numerals** — ០ ១ ២ ៣ ៤ ៥ ៦ ៧ ៨ ៩ (absent from the archive entirely)

That is a short list — one recording session with a native speaker would give
the classroom complete, uniformly-licensed coverage, which is what TODO.md's
"🔊 Record pronunciations" item actually asks for.

## Regenerating

`scripts/generate-audio.mjs` (`node scripts/generate-audio.mjs`) regenerates the
**machine placeholders**. Note it overwrites *every* letter, including ones that
have a human recording — pass specific chars (e.g. `node
scripts/generate-audio.mjs ០ ១`) to avoid clobbering the real clips.
