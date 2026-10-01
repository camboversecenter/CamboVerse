/**
 * List a Z-Anatomy FBX's meshes whose names match a pattern, with each mesh's
 * OWN triangle count and bounding box — never its children's. (A structure's
 * node carries its downstream branches as children; measuring with them is how
 * the superior vena cava appears to be 67 cm tall.)
 *
 *   node scripts/lab/survey-fbx.mjs <file.fbx> "<regex>" [maxRows]
 */
import { readFileSync } from "node:fs";
import { Box3, Vector3 } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
const [, , file, pat = ".", max = "60"] = process.argv;
const buf = readFileSync(file);
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
root.updateMatrixWorld(true);
const re = new RegExp(pat, "i");
let all = 0, n = 0; const rows = [];
root.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry; const t = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  all += t; n++;
  // Skip the 12-triangle label markers (names ending in "j"): they are pins, not anatomy.
  if (!re.test(o.name) || t <= 12 || /j$/.test(o.name)) return;
  g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
  const c = b.getCenter(new Vector3()), s = b.getSize(new Vector3());
  rows.push([t, o.name, c, s]);
});
console.log(`${file.split("/").pop()}: ${n} meshes, ${all} tris; ${rows.length} match /${pat}/, ${rows.reduce((a, r) => a + r[0], 0)} tris`);
for (const [t, nm, c, s] of rows.slice(0, +max)) console.log(String(t).padStart(7), nm.padEnd(52), "c", c.toArray().map((v) => v.toFixed(0)).join(",").padEnd(12), "s", s.toArray().map((v) => v.toFixed(0)).join(","));
