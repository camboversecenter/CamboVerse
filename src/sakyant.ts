/**
 * Sak Yant — សាក់យ័ន្ត — the Khmer sacred tattoo.
 *
 * Yantra tattooing is believed to have originated in Cambodia and uses Indian
 * yantra designs written in the old Khmer sacred script (អក្សរខម, Khom). A real
 * Sak Yant is applied by a monk or master (គ្រូ / អាចារ្យ, kru / achar) with a
 * metal rod or bamboo needle while sacred incantations (kata) are recited to
 * imbue the design with spiritual power — protection, courage, luck, prosperity.
 *
 * This module carries the educational content and *stylised, procedurally drawn*
 * renditions of the best-known yant. The drawings deliberately evoke the forms
 * rather than reproduce specific sacred inscriptions — a respectful preview, not
 * a substitute for a blessed tattoo from a real master. The whole feature exists
 * to send visitors to genuine Cambodian practitioners (see {@link REFERRAL}).
 *
 * Sources (all open web, for the descriptions): Wikipedia "Yantra tattooing";
 * the Federation of Khmer Sakyantra; general Sak Yant references. Verify meanings
 * with a Khmer master — lineages vary.
 */

export interface Yantra {
  id: string;
  name: string;
  khmer: string;
  english: string;
  meaning: string;
  placement: string;
}

/** A starting set of the most recognisable yant. Masters know many more. */
export const YANTRAS: Yantra[] = [
  {
    id: "gaoyord",
    name: "Gao Yord",
    khmer: "ប្រាំបួនកំពូល",
    english: "The Nine Spires",
    meaning:
      "The master yant and the foundation of all others — nine sacred peaks representing the Buddha's qualities. A protective yant said to shield the wearer from harm and bad luck; often the first anyone receives.",
    placement: "Nape of the neck",
  },
  {
    id: "hahtaew",
    name: "Hah Taew",
    khmer: "ប្រាំជួរ",
    english: "The Five Lines",
    meaning:
      "Five sacred lines, each a written blessing — success and direction in life, protection, good fortune in love and kindness, charisma and attraction, and a shield against bad luck.",
    placement: "Upper arm or shoulder",
  },
  {
    id: "paedtidt",
    name: "Paed Tidt",
    khmer: "ប្រាំបីទិស",
    english: "The Eight Directions",
    meaning:
      "A mandala radiating protection to the eight directions — so the wearer is guarded wherever they travel. Favoured by travellers and those who face danger.",
    placement: "Chest or upper back",
  },
  {
    id: "unalome",
    name: "Unalome",
    khmer: "ឧណ្ណាឡោម",
    english: "The Path to Enlightenment",
    meaning:
      "A spiral that unwinds into a straight line rising to a point — the winding path of life straightening as the mind is disciplined, ending in enlightenment. Often crowns other yant.",
    placement: "Crown of the head or forearm",
  },
  {
    id: "khla",
    name: "Tiger · Khla",
    khmer: "ខ្លា",
    english: "The Sacred Tiger",
    meaning:
      "The tiger lends its nature to the wearer — power, authority (amnaj), fearlessness and command. A yant of strength, favoured by leaders and fighters.",
    placement: "Back, chest or upper arm",
  },
  {
    id: "neak",
    name: "Naga · Neak",
    khmer: "នាគ",
    english: "The Sacred Serpent",
    meaning:
      "The naga, guardian who sheltered the Buddha, is revered across Cambodia — a symbol of water and purification, wisdom, wealth and protection. It brings blessing and guards the wearer.",
    placement: "Along the arm or spine",
  },
];

export interface Precept {
  khmer: string;
  text: string;
}

/**
 * A Sak Yant's power is traditionally kept by living the Five Precepts
 * (សីលប្រាំ) of Buddhism; breaking them is said to let the blessing fade.
 */
export const PRECEPTS: Precept[] = [
  { khmer: "បិណ្ឌបាត", text: "Do not kill — harm no living being with malice." },
  { khmer: "អទិន្នាទាន", text: "Do not steal — take nothing that is not given." },
  { khmer: "កាមេសុមិច្ឆាចារ", text: "Do not commit adultery — respect others' partners." },
  { khmer: "មុសាវាទ", text: "Do not lie — speak no words that harm." },
  { khmer: "សុរាមេរយ", text: "Do not lose yourself to drink or drugs." },
];

/** Short "about" notes shown on the education panel. */
export const ABOUT = [
  {
    title: "Born in Cambodia",
    khmer: "កំណើតនៅកម្ពុជា",
    text: "Yantra tattooing is believed to have begun with the Khmer, who wrote Indian yantra in the old sacred Khmer script (Khom). Warriors once wore them into battle for protection and strength.",
  },
  {
    title: "Blessed by a master",
    khmer: "ប្រសិទ្ធិដោយគ្រូ",
    text: "A true Sak Yant is not mere decoration. A monk or master (គ្រូ / អាចារ្យ) applies it by hand with a metal rod or bamboo, reciting sacred kata that give the yant its power.",
  },
  {
    title: "A living blessing",
    khmer: "ពរជ័យរស់",
    text: "The wearer keeps the yant's power by living the Five Precepts. The tattoo is a spiritual bond, carried with respect — not a fashion.",
  },
];

/**
 * The referral — the whole point of this feature. A virtual preview is not a
 * real, blessed Sak Yant; to receive one, visit a genuine Khmer master. We point
 * to the Federation of Khmer Sakyantra rather than name individual studios, so
 * the authority on authentic practitioners stays with the Khmer community. The
 * `studios` list is intentionally left for the Federation / community to fill
 * with vetted masters (see TODO.md) — we do not invent shop details.
 */
export const REFERRAL = {
  org: "Federation of Khmer Sakyantra",
  url: "https://www.federationofkhmersakyantra.com/",
  note: "A real Sak Yant is applied and blessed by a Khmer master (គ្រូ / អាចារ្យ). If a yant calls to you, receive it in Cambodia from a genuine practitioner — that is where its meaning truly lives.",
  studios: [] as { name: string; city: string; url?: string }[],
};

export const SAKYANT_CREDENTIAL = "sakyant:learned";

/* ---------- procedural yant drawing (Canvas 2D) ---------- */

/**
 * Draw a stylised yant of the given id, centred at the current origin, sized to
 * roughly fit a box of side `s`, in ink colour `ink`. The caller sets up the
 * transform (translate/rotate/scale). Stylised line-art — evokes the sacred
 * forms without reproducing specific inscriptions.
 */
export function drawYantra(ctx: CanvasRenderingContext2D, id: string, s: number, ink: string) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (id) {
    case "gaoyord": drawGaoYord(ctx, s); break;
    case "hahtaew": drawHahTaew(ctx, s); break;
    case "paedtidt": drawPaedTidt(ctx, s); break;
    case "unalome": drawUnalome(ctx, s, 0); break;
    case "khla": drawTiger(ctx, s); break;
    case "neak": drawNaga(ctx, s); break;
    default: drawGaoYord(ctx, s);
  }
  ctx.restore();
}

/** One tapering "flame bud" spire from (x, base) up to height h, half-width w. */
function spire(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(x - w, base);
  ctx.quadraticCurveTo(x - w * 0.5, base - h * 0.5, x, base - h);
  ctx.quadraticCurveTo(x + w * 0.5, base - h * 0.5, x + w, base);
  ctx.stroke();
  // finial circle
  ctx.beginPath();
  ctx.arc(x, base - h - w * 0.5, w * 0.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGaoYord(ctx: CanvasRenderingContext2D, s: number) {
  const base = s * 0.34;
  const step = s * 0.084;
  // nine spires, tallest at centre
  for (let i = -4; i <= 4; i++) {
    const h = s * (0.62 - Math.abs(i) * 0.1);
    spire(ctx, i * step, base, h, s * 0.03);
  }
  // unalome crowning the centre spire
  ctx.save();
  ctx.translate(0, base - s * 0.62);
  drawUnalome(ctx, s * 0.34, -s * 0.02);
  ctx.restore();
  // base line + a short tail
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, base);
  ctx.lineTo(s * 0.4, base);
  ctx.stroke();
  glyphRow(ctx, -s * 0.34, base + s * 0.1, s * 0.68, s * 0.06);
  glyphRow(ctx, -s * 0.28, base + s * 0.2, s * 0.56, s * 0.055);
}

function drawHahTaew(ctx: CanvasRenderingContext2D, s: number) {
  const w = s * 0.78;
  const top = -s * 0.42;
  const rowH = s * 0.17;
  // rounded frame
  roundRect(ctx, -w / 2, top, w, rowH * 5 + s * 0.06, s * 0.05);
  ctx.stroke();
  // five lines of stylised script
  for (let r = 0; r < 5; r++) {
    const y = top + s * 0.03 + rowH * (r + 0.6);
    glyphRow(ctx, -w / 2 + s * 0.05, y, w - s * 0.1, s * 0.07);
  }
}

function drawPaedTidt(ctx: CanvasRenderingContext2D, s: number) {
  // centre with concentric circles and dots
  ctx.beginPath(); ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, s * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // eight spires radiating outward
  for (let k = 0; k < 8; k++) {
    ctx.save();
    ctx.rotate((k * Math.PI) / 4);
    ctx.translate(0, -s * 0.17);
    spire(ctx, 0, 0, s * 0.26, s * 0.028);
    ctx.restore();
  }
  // outer ring of small dots
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2, s * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Unalome: a coil that unwinds into a rising line with gentle curves to a point. */
function drawUnalome(ctx: CanvasRenderingContext2D, s: number, topExtra: number) {
  const b = s * 0.4;
  const cy = b - s * 0.12; // spiral centre
  // spiral, drawn cleanly from its innermost point outward (no chord)
  let ex = 0, ey = cy, first = true;
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 3; t += 0.18) {
    const r = s * 0.018 + t * s * 0.028;
    const x = Math.cos(t) * r;
    const y = cy + Math.sin(t) * r;
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    ex = x; ey = y;
  }
  ctx.stroke();
  // the rising body: from the spiral's outer end, up through two soft S-curves
  const topY = b - s * 0.82 + topExtra;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.bezierCurveTo(ex - s * 0.16, ey - s * 0.16, s * 0.12, cy - s * 0.28, 0, cy - s * 0.38);
  ctx.quadraticCurveTo(-s * 0.1, cy - s * 0.5, 0, topY);
  ctx.stroke();
  // crowning dot
  ctx.beginPath();
  ctx.arc(0, topY - s * 0.02, s * 0.028, 0, Math.PI * 2);
  ctx.fill();
}

function drawTiger(ctx: CanvasRenderingContext2D, s: number) {
  ctx.save();
  ctx.translate(0, s * 0.05);
  const u = s * 0.5;
  // crouching body
  ctx.beginPath();
  ctx.moveTo(-0.7 * u, 0.15 * u);
  ctx.bezierCurveTo(-0.6 * u, -0.3 * u, 0.3 * u, -0.35 * u, 0.55 * u, -0.05 * u); // back
  ctx.bezierCurveTo(0.75 * u, 0.05 * u, 0.7 * u, 0.2 * u, 0.6 * u, 0.28 * u); // rump
  ctx.bezierCurveTo(0.3 * u, 0.2 * u, -0.2 * u, 0.25 * u, -0.55 * u, 0.35 * u); // belly
  ctx.closePath();
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(-0.72 * u, 0.02 * u, 0.16 * u, 0, Math.PI * 2);
  ctx.stroke();
  // ears
  for (const dx of [-0.1, 0.02]) {
    ctx.beginPath();
    ctx.moveTo((-0.72 + dx) * u, -0.12 * u);
    ctx.lineTo((-0.72 + dx + 0.03) * u, -0.2 * u);
    ctx.lineTo((-0.72 + dx + 0.08) * u, -0.11 * u);
    ctx.stroke();
  }
  // legs
  for (const lx of [-0.5, -0.15, 0.25, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(lx * u, 0.28 * u);
    ctx.lineTo(lx * u + 0.02 * u, 0.5 * u);
    ctx.stroke();
  }
  // tail, curling up
  ctx.beginPath();
  ctx.moveTo(0.58 * u, 0.1 * u);
  ctx.quadraticCurveTo(0.9 * u, -0.05 * u, 0.85 * u, -0.35 * u);
  ctx.stroke();
  // stripes
  for (let i = 0; i < 5; i++) {
    const x = (-0.4 + i * 0.18) * u;
    ctx.beginPath();
    ctx.moveTo(x, -0.22 * u);
    ctx.lineTo(x + 0.03 * u, 0.02 * u);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNaga(ctx: CanvasRenderingContext2D, s: number) {
  const u = s * 0.42;
  // sinuous body rising from a coil
  ctx.beginPath();
  ctx.moveTo(-0.2 * u, u);
  ctx.bezierCurveTo(0.8 * u, 0.9 * u, -0.8 * u, 0.4 * u, 0.1 * u, 0.15 * u);
  ctx.bezierCurveTo(0.7 * u, -0.05 * u, -0.3 * u, -0.4 * u, 0.15 * u, -0.72 * u);
  ctx.stroke();
  // scales along the body
  for (let t = 0.1; t < 0.9; t += 0.12) {
    const y = u - t * 1.7 * u;
    ctx.beginPath();
    ctx.arc(Math.sin(t * 9) * 0.12 * u, y, 0.05 * u, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  // raised head
  ctx.save();
  ctx.translate(0.15 * u, -0.78 * u);
  ctx.beginPath();
  ctx.moveTo(-0.12 * u, 0.1 * u);
  ctx.quadraticCurveTo(-0.14 * u, -0.14 * u, 0.06 * u, -0.16 * u);
  ctx.quadraticCurveTo(0.24 * u, -0.14 * u, 0.16 * u, 0.08 * u);
  ctx.stroke();
  // crest of flame points behind the head
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 0.05 * u, -0.14 * u);
    ctx.lineTo(i * 0.06 * u, -0.3 * u);
    ctx.lineTo(i * 0.05 * u + 0.03 * u, -0.15 * u);
    ctx.stroke();
  }
  // eye + tongue
  ctx.beginPath(); ctx.arc(0.02 * u, -0.05 * u, 0.02 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.14 * u, 0.02 * u);
  ctx.lineTo(0.28 * u, 0.06 * u);
  ctx.stroke();
  ctx.restore();
}

/* --- small helpers --- */

/** A row of rhythmic glyph-like marks that evoke sacred script (abstract). */
function glyphRow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const n = Math.max(5, Math.round(w / (h * 0.9)));
  const dx = w / n;
  for (let i = 0; i < n; i++) {
    const gx = x + dx * (i + 0.5);
    ctx.beginPath();
    if (i % 3 === 0) {
      // little loop
      ctx.arc(gx, y - h * 0.3, h * 0.3, 0, Math.PI * 2);
    } else if (i % 3 === 1) {
      // vertical with a foot
      ctx.moveTo(gx, y - h * 0.7);
      ctx.lineTo(gx, y + h * 0.1);
      ctx.lineTo(gx + dx * 0.3, y + h * 0.1);
    } else {
      // hook
      ctx.moveTo(gx - dx * 0.2, y - h * 0.6);
      ctx.quadraticCurveTo(gx + dx * 0.3, y - h * 0.6, gx, y + h * 0.1);
    }
    ctx.stroke();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
