import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Procedural ground textures, drawn on a canvas at runtime — no image files, no
 * CDN, nothing to download. Multi-scale blotches keep the tiling from reading as
 * an obvious grid, and a light noise pass gives the surface some tooth so it
 * catches the sun instead of looking like flat paint.
 *
 * Cached per key: a texture is built once and shared by every mesh that uses it.
 */
const cache = new Map<string, CanvasTexture>();

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return [c, c.getContext("2d")!];
}

/** Deterministic PRNG so a texture looks the same on every device/run. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `#rgb`, `#rrggbb` and `#rrggbbaa` to `[r, g, b, a]`.
 *
 * Needed because a radial gradient must fade to ITS OWN colour at zero alpha.
 * Ending at the `transparent` keyword means ending at `rgba(0,0,0,0)`, and the
 * browser interpolates the channels un-premultiplied, so the colour sweeps
 * towards black on the way out and every blob gets a dark rim. On grass that
 * passes for shade between blades; on pale concrete the surface came out
 * looking like grey bubbles.
 */
function rgba(hex: string, alpha?: number): [number, number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha ?? a];
}

/** Soft blobs at several scales — the base of every natural-looking surface. */
function blotches(
  ctx: CanvasRenderingContext2D, size: number, rand: () => number,
  colors: string[], scales: [number, number][],
) {
  for (const [radius, count] of scales) {
    for (let i = 0; i < count; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = radius * (0.5 + rand());
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const [cr, cg, cb, ca] = rgba(colors[(rand() * colors.length) | 0]);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${ca})`);
      // Ease the falloff as well: a linear ramp still leaves a visible disc edge.
      g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${(ca * 0.45).toFixed(3)})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      // Wrap-safe: draw the blob again across each edge it overlaps.
      for (const dx of [0, -size, size]) {
        for (const dy of [0, -size, size]) {
          if (Math.abs(x + dx - size / 2) > size || Math.abs(y + dy - size / 2) > size) continue;
          ctx.save();
          ctx.translate(dx, dy);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}

/** Fine per-pixel grain, so the surface isn't glassy under the sun. */
function grain(ctx: CanvasRenderingContext2D, size: number, rand: () => number, amount: number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Grass. `kind: "lawn"` is watered and mown; `kind: "rough"` is the field
 * beyond the kerb — drier, patchier, and a good deal less green.
 *
 * These are two palettes rather than one texture under two material tints,
 * because multiplying one green by two colours is the same by-eye shortcut
 * `metresRepeat` exists to avoid: a mown lawn is not a darker rough field, it
 * is a different surface. The material can then stay white and let the texture
 * carry the whole colour, instead of double-darkening it.
 *
 * Both palettes are kept deliberately low-frequency. Single-pixel blades and
 * heavy per-texel grain look good up close but never resolve into a stable mip
 * level, so at distance the ground boils as the camera moves. Wider, softer
 * marks mip down cleanly.
 */
export function grassTexture(repeat = 28, { kind = "lawn" }: { kind?: "lawn" | "rough" } = {}): Texture {
  const key = `grass:${repeat}:${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const lawn = kind === "lawn";
  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(7);

  ctx.fillStyle = lawn ? "#7fa855" : "#8d9a5c";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand,
    lawn ? ["#8fb85e", "#6b9247", "#9cc46a", "#5f8a3e"]
         : ["#9aa663", "#79874b", "#a8b06c", "#6d7a44"],
    [[120, 14], [46, 40], [18, 120]]);
  // sun-dried patches — the rough field has far more of them
  blotches(ctx, size, rand,
    lawn ? ["#a8b366", "#b4bd7033"] : ["#bcb87a", "#c8c08866"],
    lawn ? [[30, 16]] : [[70, 14], [26, 40]]);

  // clumps of blades, wide enough to survive being mipped down
  for (let i = 0; i < (lawn ? 900 : 560); i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 6 + rand() * 10;
    const lean = (rand() - 0.5) * 5;
    ctx.strokeStyle = lawn
      ? (rand() > 0.5 ? "rgba(168,205,112,0.34)" : "rgba(84,116,54,0.3)")
      : (rand() > 0.5 ? "rgba(196,198,132,0.3)" : "rgba(104,116,66,0.26)");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - len);
    ctx.stroke();
  }
  grain(ctx, size, rand, 5);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 16;
  cache.set(key, tex);
  return tex;
}

/** Turned garden soil: damp reddish-brown earth, clods, and a few small stones. */
export function soilTexture(repeat = 3): Texture {
  const key = `soil:${repeat}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(21);

  ctx.fillStyle = "#8a6142";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, ["#9a6e48", "#775234", "#a87b52", "#6b4830"], [[110, 12], [40, 46], [14, 150]]);

  // clods and stones catch a highlight on their sunward side
  for (let i = 0; i < 420; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 3.4;
    ctx.fillStyle = `rgba(${140 + rand() * 40 | 0},${110 + rand() * 30 | 0},${86 + rand() * 26 | 0},0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(40,26,16,0.4)";
    ctx.beginPath();
    ctx.arc(x + r * 0.4, y + r * 0.5, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, size, rand, 9);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 16;
  cache.set(key, tex);
  return tex;
}

/** Bark: vertical fissures and colour drift, wrapped around a trunk. */
export function barkTexture(tint = "#6b4a2b"): Texture {
  const key = `bark:${tint}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(13);

  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);
  // long vertical fissures
  for (let i = 0; i < 150; i++) {
    const x = rand() * size;
    const w = 1 + rand() * 4;
    ctx.strokeStyle = rand() > 0.5 ? "rgba(30,20,12,0.34)" : "rgba(190,170,140,0.16)";
    ctx.lineWidth = w;
    ctx.beginPath();
    let y = 0;
    let cx = x;
    ctx.moveTo(cx, y);
    while (y < size) {
      y += 12 + rand() * 24;
      cx += (rand() - 0.5) * 7;
      ctx.lineTo(cx, y);
    }
    ctx.stroke();
  }
  grain(ctx, size, rand, 18);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(3, 1);
  cache.set(key, tex);
  return tex;
}

/**
 * How many times a texture must repeat across a surface for its features to
 * come out at a given real-world size.
 *
 * Without this every paved area gets the same `repeat` and slabs come out
 * enormous on the forecourt and tiny on the footpath — the classic tell that a
 * texture was applied by eye rather than measured. `tileM` is the size of ONE
 * repeat in metres, and the paving tile below draws a 2x2 slab grid, so a 3 m
 * slab means `tileM = 6`.
 */
export function metresRepeat(widthM: number, depthM: number, tileM: number): [number, number] {
  return [Math.max(1, widthM / tileM), Math.max(1, depthM / tileM)];
}

/**
 * Poured concrete paving: a 2x2 slab grid with expansion joints, pour-to-pour
 * tone variation, and a little staining.
 *
 * The joints sit ON the tile edges, so the repeat seam IS a joint — which turns
 * the one artifact of tiling into the thing the surface is supposed to have.
 * Concrete really is a grid; a 150 m apron of flat colour reads as a void, and
 * the joints are what give a visitor any sense of how big the yard is.
 */
export function pavingTexture(
  repeatX = 8, repeatY = 8, { tint = "#cfcac1", detail = 512 }: { tint?: string; detail?: number } = {},
): Texture {
  const key = `paving:${repeatX}:${repeatY}:${tint}:${detail}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = detail;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(41);

  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);
  // Pour variation: each slab was laid on a different day, and it shows.
  const half = size / 2;
  for (const [sx, sy] of [[0, 0], [half, 0], [0, half], [half, half]] as [number, number][]) {
    ctx.fillStyle = `rgba(255,255,255,${(rand() * 0.05).toFixed(3)})`;
    ctx.fillRect(sx, sy, half, half);
    ctx.fillStyle = `rgba(90,86,78,${(rand() * 0.05).toFixed(3)})`;
    ctx.fillRect(sx, sy, half, half);
  }
  blotches(ctx, size, rand, ["#c4bfb5", "#d6d2c9", "#b8b2a6"], [[90, 8], [34, 26]]);

  // Expansion joints, on the tile edges so the seam becomes the joint.
  ctx.strokeStyle = "rgba(120,115,105,0.55)";
  ctx.lineWidth = Math.max(1.5, size / 190);
  for (const p of [0, half, size]) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  // A softer shadow just inside each joint, which is what actually sells a
  // recessed line at a grazing angle.
  ctx.strokeStyle = "rgba(150,145,136,0.35)";
  ctx.lineWidth = Math.max(1, size / 300);
  for (const p of [2, half + 2, size - 2]) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  grain(ctx, size, rand, 12);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8; // paving is nearly always seen at a grazing angle
  cache.set(key, tex);
  return tex;
}

/** Asphalt: fine aggregate speckle, patches, and the odd repair seam. */
export function asphaltTexture(
  repeatX = 8, repeatY = 8, { detail = 512 }: { detail?: number } = {},
): Texture {
  const key = `asphalt:${repeatX}:${repeatY}:${detail}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = detail;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(59);

  ctx.fillStyle = "#4c4b49";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, ["#565553", "#434240", "#5f5d59"], [[110, 8], [40, 24], [14, 90]]);

  // Aggregate. Individually invisible, collectively the whole surface.
  for (let i = 0; i < size * 12; i++) {
    const x = rand() * size, y = rand() * size;
    const r = 0.5 + rand() * 1.2;
    ctx.fillStyle = rand() > 0.5 ? "rgba(190,188,182,0.28)" : "rgba(28,28,27,0.35)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // The longitudinal joint between two passes of the paver.
  //
  // Two things have to be true or it stops reading as a road. It must enter and
  // leave the tile at the SAME offset, or the repeat turns one crack into a
  // squiggle that dead-ends at every tile edge. And it must run ALONG the
  // carriageway, not across it — repeats are derived from metres, so whichever
  // axis repeats more often is the long axis of the surface, and that is the
  // one the joint follows.
  const alongU = repeatX >= repeatY;
  const seam = size * (0.3 + rand() * 0.4);
  const wob = () => seam + (rand() - 0.5) * size * 0.2;
  ctx.strokeStyle = "rgba(30,30,29,0.5)";
  ctx.lineWidth = Math.max(2, size / 160);
  ctx.beginPath();
  if (alongU) {
    ctx.moveTo(0, seam);
    ctx.bezierCurveTo(size * 0.34, wob(), size * 0.66, wob(), size, seam);
  } else {
    ctx.moveTo(seam, 0);
    ctx.bezierCurveTo(wob(), size * 0.34, wob(), size * 0.66, seam, size);
  }
  ctx.stroke();
  grain(ctx, size, rand, 14);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}
