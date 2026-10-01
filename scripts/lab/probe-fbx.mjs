import { readFileSync } from "node:fs";
import { Box3, Vector3 } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
const buf = readFileSync(process.argv[2]);
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
root.updateMatrixWorld(true);
const re = new RegExp(process.argv[3], "i");
for (const o of (() => { const a = []; root.traverse((x) => x.isMesh && re.test(x.name) && a.push(x)); return a; })()) {
  const b = new Box3().setFromObject(o); const s = b.getSize(new Vector3()); const c = b.getCenter(new Vector3());
  const tris = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
  console.log(String(tris).padStart(7), o.name.padEnd(46), "centre", c.toArray().map((v) => v.toFixed(1)).join(","), " size", s.toArray().map((v) => v.toFixed(1)).join(","));
}
