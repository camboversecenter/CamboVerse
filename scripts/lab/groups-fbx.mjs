/**
 * List the GROUP nodes of a Z-Anatomy FBX that match a pattern, with how many
 * meshes and triangles sit beneath each — so a structure built from many parts
 * (the brain is a cortical parcellation of dozens of gyri) can be collected by
 * its group rather than name by name. Label markers (12 tris, names ending in
 * "j") are not counted.
 *
 *   node scripts/lab/groups-fbx.mjs <file.fbx> "<regex>" [maxDepth]
 */
import { readFileSync } from "node:fs";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
const [, , file, pat = ".", maxDepth = "4"] = process.argv;
const buf = readFileSync(file);
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
const re = new RegExp(pat, "i");
const tally = (o) => { let m = 0, t = 0; o.traverse((x) => { if (!x.isMesh) return; const g = x.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; if (n <= 12 || /j$/.test(x.name)) return; m++; t += n; }); return [m, t]; };
const walk = (o, d) => {
  if (d > +maxDepth) return;
  if (!o.isMesh && o !== root && re.test(o.name)) { const [m, t] = tally(o); if (m) console.log("  ".repeat(d) + o.name.padEnd(46 - 2 * d), String(m).padStart(5), "meshes", String(t).padStart(8), "tris"); }
  for (const c of o.children) walk(c, d + 1);
};
walk(root, 0);
