/**
 * Compose a keepsake "postcard" PNG from a source canvas (a try-on snapshot),
 * framed in warm silk with a Khmer + English caption. Shared by the Fashion and
 * Sak Yant try-on experiences. Self-contained — draws with the Canvas 2D API and
 * returns a data URL the visitor can save; nothing is uploaded.
 */
export function makePostcard(
  src: HTMLCanvasElement,
  khmerCaption: string,
  subCaption: string,
): string {
  const W = 1080;
  const pad = 36;
  const banner = 132;
  const iw = src.width || 640;
  const ih = src.height || 480;
  const scale = (W - pad * 2) / iw;
  const dh = ih * scale;
  const H = Math.round(pad * 2 + dh + banner);

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#efe7dc";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c8912e";
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);

  ctx.drawImage(src, pad, pad, W - pad * 2, dh);
  ctx.strokeStyle = "#c8912e";
  ctx.lineWidth = 4;
  ctx.strokeRect(pad, pad, W - pad * 2, dh);

  const by = pad + dh;
  ctx.textAlign = "center";
  ctx.fillStyle = "#3a2c1e";
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText(khmerCaption, W / 2, by + 56);
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = "#8a6a4a";
  ctx.fillText(subCaption, W / 2, by + 100);

  return c.toDataURL("image/png");
}
