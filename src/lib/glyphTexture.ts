import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * Render a Khmer glyph (plus its romanisation) to a canvas and return it as a
 * texture for a 3D letter tile. Uses the browser's own text engine, so the
 * embedded Khmer fonts shape the script correctly (unlike glyph extrusion).
 *
 * Call only after the fonts are loaded (see ClassroomView's font gate).
 */
export function makeGlyphTexture(
  display: string,
  roman: string,
  opts: { family: string; fg?: string; bg?: string; size?: number } = { family: "Noto Sans Khmer" },
): CanvasTexture {
  const size = opts.size ?? 256;
  const w = size;
  const h = Math.round(size * 1.25);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Card background.
  ctx.fillStyle = opts.bg ?? "#efe4cb";
  ctx.fillRect(0, 0, w, h);

  const fg = opts.fg ?? "#241606";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // The glyph, large, in the chosen Khmer font — shrunk to fit the card width.
  ctx.fillStyle = fg;
  let fontSize = Math.round(size * 0.56);
  ctx.font = `${fontSize}px "${opts.family}"`;
  const maxW = w * 0.86;
  const measured = ctx.measureText(display).width;
  if (measured > maxW) {
    fontSize = Math.max(12, Math.floor(fontSize * (maxW / measured)));
    ctx.font = `${fontSize}px "${opts.family}"`;
  }
  ctx.fillText(display, w / 2, h * 0.42);

  // The romanisation, small, in a plain sans font.
  ctx.fillStyle = "#7a5a2a";
  ctx.font = `600 ${Math.round(size * 0.15)}px system-ui, sans-serif`;
  ctx.fillText(roman, w / 2, h * 0.82);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
