/**
 * Synthesized sound effects for the Chemistry Experience Room.
 * Uses Web Audio API only - no audio files needed.
 * AudioContext created lazily on first user gesture.
 */
let ctx: AudioContext | null = null;
let muted = false;

export function setChemMuted(m: boolean) { muted = m; }
export function isChemMuted() { return muted; }

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function noise(c: AudioContext, dur: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Liquid pouring into a vessel. */
export function playPour() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.6;
  const src = c.createBufferSource();
  src.buffer = noise(c, dur);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(800, t);
  bp.frequency.linearRampToValueAtTime(1800, t + dur * 0.3);
  bp.frequency.linearRampToValueAtTime(600, t + dur);
  bp.Q.value = 2;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.05);
  g.gain.setValueAtTime(0.18, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

/** Fizzing / bubbling reaction. */
export function playFizz() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 1.2;
  const src = c.createBufferSource();
  src.buffer = noise(c, dur);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3000;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.15, t + 0.1);
  g.gain.setValueAtTime(0.12, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(hp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);

  for (let i = 0; i < 6; i++) {
    const bt = t + 0.1 + Math.random() * 0.8;
    const osc = c.createOscillator();
    osc.type = 'sine';
    const f = 400 + Math.random() * 600;
    osc.frequency.setValueAtTime(f, bt);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, bt + 0.06);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.06, bt);
    bg.gain.exponentialRampToValueAtTime(0.001, bt + 0.08);
    osc.connect(bg).connect(c.destination);
    osc.start(bt);
    osc.stop(bt + 0.1);
  }
}

/** Fire ignition / flame whoosh. */
export function playFlame() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.5;
  const src = c.createBufferSource();
  src.buffer = noise(c, dur);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(200, t);
  bp.frequency.exponentialRampToValueAtTime(2500, t + 0.15);
  bp.frequency.exponentialRampToValueAtTime(800, t + dur);
  bp.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.04, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

/** Glass clink - picking up or setting down glassware. */
export function playClink() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(3200, t);
  osc.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
  const g = c.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.3);

  const osc2 = c.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(5200, t);
  osc2.frequency.exponentialRampToValueAtTime(4000, t + 0.1);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.06, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc2.connect(g2).connect(c.destination);
  osc2.start(t);
  osc2.stop(t + 0.2);
}

/** Electrolysis bubbles - gentle periodic pops. */
export function playBubbles() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 8; i++) {
    const bt = t + i * 0.12 + Math.random() * 0.06;
    const osc = c.createOscillator();
    osc.type = 'sine';
    const f = 300 + Math.random() * 500;
    osc.frequency.setValueAtTime(f, bt);
    osc.frequency.exponentialRampToValueAtTime(f * 2, bt + 0.04);
    const g = c.createGain();
    g.gain.setValueAtTime(0.07, bt);
    g.gain.exponentialRampToValueAtTime(0.001, bt + 0.06);
    osc.connect(g).connect(c.destination);
    osc.start(bt);
    osc.stop(bt + 0.08);
  }
}

/** Single drip - distillation collection. */
export function playDrip() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
  const g = c.createGain();
  g.gain.setValueAtTime(0.1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

/** Success chime - correct answer or badge earned. */
export function playSuccess() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  [523, 659, 784].forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    const start = t + i * 0.12;
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.1, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });
}

/** Error buzz - wrong answer. */
export function playError() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 150;
  const g = c.createGain();
  g.gain.setValueAtTime(0.08, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.15);
  g.gain.linearRampToValueAtTime(0, t + 0.25);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Footstep on lab floor - alternates pitch for left/right. */
let stepSide = 0;
export function playFootstep() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  stepSide ^= 1;
  const base = stepSide ? 120 : 100;

  const src = c.createBufferSource();
  const dur = 0.12;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  const g = c.createGain();
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(lp).connect(g).connect(c.destination);
  src.start(t);

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.5, t + 0.08);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.05, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g2).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

/**
 * Calm ambient soundtrack - warm layered pads that loop continuously.
 * Builds a rich, relaxing texture from sine/triangle oscillators tuned
 * to consonant intervals (root, fifth, octave, major-third) with slow
 * LFO modulation and gentle shimmer.
 */
let ambientNodes: { master: GainNode; oscs: OscillatorNode[]; lfos: OscillatorNode[]; shimmerInterval: number } | null = null;

export function startAmbient() {
  if (ambientNodes) return;
  const c = ac();
  if (!c) return;

  const master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(1, c.currentTime + 3);
  master.connect(c.destination);

  const oscs: OscillatorNode[] = [];
  const lfos: OscillatorNode[] = [];

  const voices: { freq: number; type: OscillatorType; vol: number; detune: number }[] = [
    { freq: 65.41,  type: 'sine',     vol: 0.025, detune: 0 },
    { freq: 98.00,  type: 'sine',     vol: 0.018, detune: -3 },
    { freq: 130.81, type: 'triangle', vol: 0.014, detune: 5 },
    { freq: 164.81, type: 'sine',     vol: 0.010, detune: -2 },
    { freq: 196.00, type: 'triangle', vol: 0.008, detune: 4 },
  ];

  for (const v of voices) {
    const osc = c.createOscillator();
    osc.type = v.type;
    osc.frequency.value = v.freq;
    osc.detune.value = v.detune;

    const g = c.createGain();
    g.gain.value = v.vol;

    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08 + Math.random() * 0.12;
    const lfoGain = c.createGain();
    lfoGain.gain.value = v.vol * 0.4;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();
    lfos.push(lfo);

    osc.connect(g).connect(master);
    osc.start();
    oscs.push(osc);
  }

  // Gentle high-frequency shimmer: short tones that fade in and out
  const shimmerInterval = window.setInterval(() => {
    const cx = ac();
    if (!cx || !ambientNodes) return;
    const t = cx.currentTime;
    const freq = 800 + Math.random() * 1600;
    const dur = 2 + Math.random() * 3;
    const osc = cx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = cx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.003 + Math.random() * 0.004, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }, 3000);

  ambientNodes = { master, oscs, lfos, shimmerInterval };
}

export function stopAmbient() {
  if (!ambientNodes) return;
  const c = ac();
  const { master, oscs, lfos, shimmerInterval } = ambientNodes;
  clearInterval(shimmerInterval);
  if (c) {
    const t = c.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 2);
    setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); } catch {} });
      lfos.forEach(l => { try { l.stop(); } catch {} });
      master.disconnect();
    }, 2500);
  } else {
    oscs.forEach(o => { try { o.stop(); } catch {} });
    lfos.forEach(l => { try { l.stop(); } catch {} });
    master.disconnect();
  }
  ambientNodes = null;
}

/** Legacy alias kept for backward compat - starts the ambient if not running. */
export function playAmbient() { startAmbient(); }

/** Electrical hum - electrolysis running. */
export function playElectricHum() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.8;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 60;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 180;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.1);
  g.gain.setValueAtTime(0.06, t + dur - 0.2);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(lp).connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}
