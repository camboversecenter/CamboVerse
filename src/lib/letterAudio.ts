/**
 * Audio playback for the Khmer Alphabet Classroom.
 *
 * Plays the clip in `public/audio/` (one per letter, named by the letter's own
 * codepoints — see that folder's README.md and SOURCES.json). Device
 * text-to-speech is only a fallback: Khmer TTS voices are patchy and most
 * low-end Androids have none (see ./voice.ts), so the clip is what a visitor
 * normally hears.
 *
 * Mobile-budget notes (TODO.md's "$150 Android over 4G" bar): nothing is
 * fetched until a letter is actually tapped, so opening the classroom costs
 * zero audio bytes, and clips are same-origin so they reuse the connection the
 * app already has instead of paying a fresh DNS + TLS handshake per letter.
 *
 * Only one letter sounds at a time — tapping a second cuts the first off rather
 * than layering, which is what a classroom board should do.
 */
import { speak, stopSpeaking, ttsSupported } from "./voice";

/**
 * Where the clips live. Same-origin `public/audio/` today; point this at a CDN
 * (R2, Bunny) if the library ever outgrows the repo — nothing else changes.
 */
const AUDIO_BASE = "/audio";

/** Filesystem-safe, unambiguous key: the char's own codepoints in hex. */
export function slugFor(char: string): string {
  return [...char].map((c) => c.codePointAt(0)!.toString(16).toUpperCase()).join("-");
}

/** URL of the clip for a letter (not a promise that the file exists). */
export function clipUrl(char: string): string {
  return `${AUDIO_BASE}/${slugFor(char)}.mp3`;
}

/**
 * Letters we've already found to have no clip. Syllables in the "learn to use"
 * space mostly fall here — we record letters, not every combination — so this
 * keeps repeat taps from re-requesting a known-404.
 */
const missing = new Set<string>();

let current: HTMLAudioElement | null = null;

/** Stop whatever is sounding right now. */
export function stopLetterAudio(): void {
  if (current) {
    current.pause();
    current = null;
  }
  stopSpeaking();
}

/**
 * Say a letter (or syllable) aloud: its recorded clip if we have one, otherwise
 * the device's Khmer voice, otherwise nothing.
 *
 * Fire-and-forget — call it straight from a tap handler. Browsers block audio
 * that isn't user-initiated, so it must originate from a real gesture.
 */
export function playLetterAudio(char: string): void {
  stopLetterAudio();

  if (missing.has(char)) {
    speakFallback(char);
    return;
  }

  const el = new Audio(clipUrl(char));
  current = el;

  // A missing or undecodable file lands here rather than throwing.
  el.onerror = () => {
    missing.add(char);
    if (current === el) current = null;
    speakFallback(char);
  };
  el.onended = () => {
    if (current === el) current = null;
  };

  el.play().catch(() => {
    // Autoplay refusal (no gesture yet) — don't mark the clip missing, since
    // the same file will usually play fine on the next real tap.
    if (current === el) current = null;
  });
}

function speakFallback(char: string): void {
  if (ttsSupported()) speak(char, "km-KH");
}
