/**
 * A no-dependency authoring aid for Khmer stroke order. It reads the current
 * stroke medians from src/strokeOrder.ts and the letter outlines from
 * src/glyphPaths.ts, and writes an HTML preview that overlays the numbered
 * strokes on each letter (with a coordinate grid) so you can check the shape,
 * order, and direction — then adjust the numbers in src/strokeOrder.ts and
 * re-run.
 *
 * Coordinates are in a 0..100 box (same as glyphPaths). Each stroke is a median
 * polyline [[x,y], …] tracing the pen's path; strokes are drawn in array order.
 *
 * Run: `node scripts/author-stroke-order.mjs` then open the printed HTML file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, ".stroke-preview.html"); // gitignored

function extract(file, marker) {
  const ts = readFileSync(resolve(HERE, "..", file), "utf8");
  const i = ts.indexOf("= ", ts.indexOf(marker)) + 2;
  const j = ts.lastIndexOf("};") + 1;
  // eslint-disable-next-line no-eval
  return eval("(" + ts.slice(i, j) + ")");
}

const GLYPHS = extract("src/glyphPaths.ts", "GLYPH_PATHS");
const STROKES = extract("src/strokeOrder.ts", "STROKE_ORDER");

const COLORS = ["#e5342f", "#2f6be5", "#1f9d3a", "#c8912e", "#8b3fd0", "#0aa"];

function cell(ch) {
  const g = GLYPHS[ch];
  const data = STROKES[ch];
  if (!g || !data) return "";
  let grid = "";
  for (let n = 10; n < 100; n += 10)
    grid += `<line x1="${n}" y1="0" x2="${n}" y2="100" stroke="#0002"/><line x1="0" y1="${n}" x2="100" y2="${n}" stroke="#0002"/>`;
  const strokes = data.strokes
    .map((s, i) => {
      const pts = s.map((p) => p.join(",")).join(" ");
      const [sx, sy] = s[0];
      const c = COLORS[i % COLORS.length];
      return `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${sx}" cy="${sy}" r="3.6" fill="${c}"/><text x="${sx}" y="${sy}" dy="1.2" font-size="4" fill="#fff" text-anchor="middle">${i + 1}</text>`;
    })
    .join("");
  return `<figure><svg viewBox="-2 -2 104 104">${grid}<path d="${g.normal}" fill="#0002" stroke="#0005" stroke-width="0.4"/>${strokes}</svg><figcaption>${ch} ${data.verified ? "✓" : "✎ draft"}</figcaption></figure>`;
}

const chars = Object.keys(STROKES);
const html = `<!doctype html><meta charset="utf8"><title>Khmer stroke-order preview</title>
<style>body{background:#efe4cb;font:14px sans-serif;margin:16px}h1{font-size:16px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:900px}
figure{margin:0;border:1px solid #0002;background:#fff8}svg{width:100%;display:block}
figcaption{text-align:center;padding:3px}</style>
<h1>Khmer stroke-order preview — ${chars.length} letters</h1>
<p>Coloured numbered lines are the stroke medians over each letter's outline. Edit src/strokeOrder.ts and re-run.</p>
<div class="grid">${chars.map(cell).join("")}</div>`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT} — ${chars.length} letters. Open it in a browser to review.`);
