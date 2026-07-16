/**
 * Generated ambient soundscapes for the Virtual Meditation sanctuaries —
 * synthesized live with the Web Audio API, so there are no audio files to
 * download, host, or license. This keeps the meditation self-contained and
 * light on a $150 phone over 4G, and avoids putting a recording of real monks
 * where a synthesized tone belongs.
 *
 * Layers: wind, water, cicada shimmer, scheduled birdsong, a singing-bowl bell,
 * and an optional warm chant *drone* (an ambient tone — not a recording of
 * chanting). Everything routes through one master gain for muting.
 */
import type { Sanctuary } from "../meditation";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let running = false;
const sources: AudioScheduledSourceNode[] = [];
const timers: number[] = [];
let drone: { gain: GainNode } | null = null;

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.2);
}
export function isMuted() {
  return muted;
}

function ac(): AudioContext | null {
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

function noiseBuffer(c: AudioContext, seconds = 2): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
function loopNoise(c: AudioContext): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  src.start();
  sources.push(src);
  return src;
}
/** A slow low-frequency oscillator driving a param, for living movement. */
function lfo(c: AudioContext, rate: number, depth: number, center: number, param: AudioParam) {
  const o = c.createOscillator();
  o.frequency.value = rate;
  const g = c.createGain();
  g.gain.value = depth;
  o.connect(g).connect(param);
  param.value = center;
  o.start();
  sources.push(o);
}

function wind(c: AudioContext, amt: number) {
  const n = loopNoise(c);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  lfo(c, 0.07, 220, 480, lp.frequency); // gusts
  const g = c.createGain();
  g.gain.value = amt * 0.22;
  lfo(c, 0.05, amt * 0.09, amt * 0.22, g.gain);
  n.connect(lp).connect(g).connect(master!);
}
function water(c: AudioContext, amt: number) {
  const n = loopNoise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900;
  bp.Q.value = 0.6;
  lfo(c, 0.9, 260, 900, bp.frequency); // babble
  const g = c.createGain();
  g.gain.value = amt * 0.16;
  n.connect(bp).connect(g).connect(master!);
}
function insects(c: AudioContext, amt: number) {
  const n = loopNoise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 6300;
  bp.Q.value = 6;
  const g = c.createGain();
  g.gain.value = amt * 0.04;
  lfo(c, 7, amt * 0.03, amt * 0.04, g.gain); // shimmer
  n.connect(bp).connect(g).connect(master!);
}

function chirp(c: AudioContext) {
  if (!running || !master) return;
  const t = c.currentTime;
  const notes = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < notes; i++) {
    const start = t + i * 0.12;
    const o = c.createOscillator();
    o.type = "sine";
    const base = 2200 + Math.random() * 1400;
    o.frequency.setValueAtTime(base, start);
    o.frequency.exponentialRampToValueAtTime(base * 1.3, start + 0.05);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.06, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + 0.13);
  }
}
/** A soft singing-bowl bell (several inharmonic partials, long decay). */
function ring(c: AudioContext, gain = 0.28) {
  if (!master) return;
  const t = c.currentTime;
  [523, 523 * 1.5, 523 * 2.61, 523 * 3.86].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    const peak = gain / (i + 1.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02 + i * 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4 - i * 0.4);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + 3.6);
  });
}

function schedule(fn: () => void, minMs: number, maxMs: number) {
  const tick = () => {
    if (!running) return;
    fn();
    timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  timers.push(window.setTimeout(tick, 400 + Math.random() * 1200));
}

function makeDrone(c: AudioContext) {
  const g = c.createGain();
  g.gain.value = 0;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 760;
  // A warm "Om"-like chord: root, fifth, octave, plus a soft upper partial.
  [110, 110 * 1.5, 220, 330].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = i === 3 ? "triangle" : "sine";
    o.frequency.value = f;
    const og = c.createGain();
    og.gain.value = i === 0 ? 0.5 : 0.28 / i;
    o.connect(og).connect(lp);
    o.start();
    sources.push(o);
    // gentle vibrato for a vocal quality
    lfo(c, 0.2 + i * 0.03, 0.6, f, o.frequency);
  });
  lp.connect(g).connect(master!);
  lfo(c, 0.06, 0.04, 0.12, g.gain); // slow devotional swell (added once chant on)
  drone = { gain: g };
}

/** Start a sanctuary's soundscape (optionally with the chant drone). */
export function start(s: Sanctuary, chant: boolean) {
  stop();
  const c = ac();
  if (!c) return;
  running = true;
  master = c.createGain();
  master.gain.value = muted ? 0 : 0.6;
  master.connect(c.destination);

  if (s.sound.wind) wind(c, s.sound.wind);
  if (s.sound.water) water(c, s.sound.water);
  if (s.sound.insects) insects(c, s.sound.insects);
  if (s.sound.birds) schedule(() => chirp(c), 1500 / s.sound.birds, 6000 / s.sound.birds);
  if (s.sound.bell) schedule(() => ring(c, 0.16), 9000 / s.sound.bell, 22000 / s.sound.bell);

  makeDrone(c);
  setChant(chant);
}

export function stop() {
  running = false;
  timers.forEach((t) => clearTimeout(t));
  timers.length = 0;
  for (const s of sources) {
    try { s.stop(); } catch { /* already stopped */ }
  }
  sources.length = 0;
  drone = null;
  if (master) {
    try { master.disconnect(); } catch { /* ignore */ }
  }
  master = null;
}

/** Fade the chant drone in/out. */
export function setChant(on: boolean) {
  if (drone && ctx) drone.gain.gain.setTargetAtTime(on ? 0.18 : 0, ctx.currentTime, 1.4);
}

/** A single bell — used to open and close a sitting. */
export function chime() {
  const c = ac();
  if (c && master) ring(c, 0.3);
}
