/**
 * Audio playback for the Khmer Alphabet Classroom.
 *
 * Plays the clip in `public/audio/` (one per letter, named by the letter's own
 * codepoints — see that folder's README.md and SOURCES.json). A tile with no
 * clip stays silent rather than falling back to any form of TTS — device
 * Khmer voices are unreliable across browsers/OSes and reading an English
 * romanisation as a substitute was judged worse than silence.
 *
 * Mobile-budget notes (TODO.md's "$150 Android over 4G" bar): nothing is
 * fetched until a letter is actually tapped, so opening the classroom costs
 * zero audio bytes, and clips are same-origin so they reuse the connection the
 * app already has instead of paying a fresh DNS + TLS handshake per letter.
 *
 * Only one letter sounds at a time — tapping a second cuts the first off rather
 * than layering, which is what a classroom board should do.
 */
import { stopSpeaking } from "./voice";

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
 * Say a letter (or syllable) aloud: its recorded clip if we have one,
 * otherwise nothing.
 *
 * Fire-and-forget — call it straight from a tap handler. Browsers block audio
 * that isn't user-initiated, so it must originate from a real gesture.
 */
export function playLetterAudio(char: string): void {
  stopLetterAudio();

  const el = new Audio(clipUrl(char));
  current = el;

  // A missing or undecodable file lands here rather than throwing — stays silent.
  el.onerror = () => {
    if (current === el) current = null;
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
