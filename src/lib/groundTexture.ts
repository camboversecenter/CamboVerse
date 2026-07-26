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
      const col = colors[(rand() * colors.length) | 0];
      g.addColorStop(0, col);
      g.addColorStop(1, "transparent");
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

/** Tropical lawn: layered greens, scattered dry patches, short blade strokes. */
export function grassTexture(repeat = 28): Texture {
  const key = `grass:${repeat}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(7);

  ctx.fillStyle = "#7fa855";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, ["#8fb85e", "#6b9247", "#9cc46a", "#5f8a3e"], [[120, 14], [46, 40], [18, 120]]);
  blotches(ctx, size, rand, ["#a8b366", "#b4bd7033"], [[30, 16]]); // sun-dried patches

  // short blades, in the two dominant directions light would catch
  for (let i = 0; i < 2600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 3 + rand() * 6;
    const lean = (rand() - 0.5) * 3;
    ctx.strokeStyle = rand() > 0.5 ? "rgba(168,205,112,0.5)" : "rgba(84,116,54,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - len);
    ctx.stroke();
  }
  grain(ctx, size, rand, 16);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
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
  grain(ctx, size, rand, 22);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
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
