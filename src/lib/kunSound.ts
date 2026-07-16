/**
 * Self-contained fight sound effects for the Kun Khmer Dojo, synthesized live
 * with the Web Audio API — no audio files to download, nothing external to
 * license or host. This keeps the dojo a good Digital Public Good citizen
 * (self-contained, runs on a cheap phone) while still landing punches with a
 * satisfying thud, whoosh, and ringside bell.
 *
 * The AudioContext is created lazily on the first play (which always happens
 * inside a user gesture — a tap or key press — so autoplay policies are happy).
 */
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A short burst of shaped noise — the "smack" of a landed strike. */
function noiseBurst(c: AudioContext, t: number, dur: number, cutoff: number, gain: number, type: BiquadFilterType = "lowpass") {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t);
}

/** A low, fast pitch-down thump — the body-impact under a strike. */
function thump(c: AudioContext, t: number, f0: number, gain: number) {
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * 0.5), t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

export type HitKind = "punch" | "kick" | "knee" | "elbow" | "block";

/** The sound of a technique landing (or being blocked). */
export function playHit(kind: HitKind = "punch") {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  if (kind === "block") {
    noiseBurst(c, t, 0.12, 550, 0.22);
    thump(c, t, 110, 0.35);
    return;
  }
  const cutoff = kind === "elbow" ? 2400 : kind === "kick" ? 1400 : 1900;
  const f0 = kind === "kick" ? 140 : kind === "knee" ? 120 : kind === "elbow" ? 210 : 175;
  noiseBurst(c, t, 0.13, cutoff, 0.5);
  thump(c, t, f0, 0.6);
}

/** A swing through the air — the wind-up of a strike or a dodge. */
export function playWhoosh() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.22;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / d.length));
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(380, t);
  bp.frequency.exponentialRampToValueAtTime(1300, t + dur);
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.value = 0.22;
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
}

/** The ringside bell — struck once to start a bout, twice for a win. */
export function playBell(times = 1) {
  const c = ac();
  if (!c) return;
  for (let n = 0; n < times; n++) {
    const t = c.currentTime + n * 0.3;
    [660, 990, 1320].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.6);
    });
  }
}
