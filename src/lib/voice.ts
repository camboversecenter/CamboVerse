/**
 * On-device speech, using the browser's built-in Web Speech API — free, no
 * network, no external dependency (so it stays a Digital Public Good and works
 * on a cheap Android). Text-to-speech reads the guide's words aloud;
 * speech-recognition lets a visitor ask a question by voice.
 *
 * Reality check for low-end devices: English / French / Chinese voices are
 * widely available, but Khmer TTS is patchy — callers should degrade to
 * text-only when {@link voiceFor} returns null.
 */

export interface Lang {
  code: "en" | "km" | "fr" | "zh";
  /** Endonym, shown in the picker. */
  name: string;
  /** BCP-47 tag for the speech engine. */
  bcp: string;
  /** English name used when prompting the model. */
  prompt: string;
}

export const LANGS: Lang[] = [
  { code: "en", name: "English", bcp: "en-US", prompt: "English" },
  { code: "km", name: "ខ្មែរ", bcp: "km-KH", prompt: "Khmer" },
  { code: "fr", name: "Français", bcp: "fr-FR", prompt: "French" },
  { code: "zh", name: "中文", bcp: "zh-CN", prompt: "Chinese (Simplified)" },
];

export type LangCode = Lang["code"];

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Best available voice for a BCP-47 tag, or null if the device has none. */
export function voiceFor(bcp: string): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const base = bcp.split("-")[0];
  return (
    voices.find((v) => v.lang === bcp) ||
    voices.find((v) => v.lang.replace("_", "-").startsWith(base)) ||
    null
  );
}

/**
 * Speak `text` in the given language. Returns false if TTS is unavailable.
 * `onBoundary`/`onEnd` let the mascot animate its mouth while talking.
 */
export function speak(
  text: string,
  bcp: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {},
): boolean {
  if (!ttsSupported() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = bcp;
  const v = voiceFor(bcp);
  if (v) u.voice = v;
  u.rate = 1.0;
  u.pitch = 1.2; // a touch higher — reads as friendly/cute
  if (handlers.onStart) u.onstart = handlers.onStart;
  const done = () => handlers.onEnd?.();
  u.onend = done;
  u.onerror = done;
  synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

export function sttSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Listen for one spoken phrase and hand back the transcript. Returns a stop()
 * function, or null if recognition is unavailable.
 */
export function listenOnce(
  bcp: string,
  onResult: (text: string) => void,
  onError?: (err: string) => void,
): (() => void) | null {
  const w = window as unknown as Record<string, unknown>;
  const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void;
        onerror: (e: { error: string }) => void;
        start: () => void;
        stop: () => void;
      })
    | undefined;
  if (!SR) {
    onError?.("unsupported");
    return null;
  }
  const rec = new SR();
  rec.lang = bcp;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => onResult(e.results[0][0].transcript);
  rec.onerror = (e) => onError?.(e.error);
  rec.start();
  return () => rec.stop();
}
