import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(process.argv[2]);
let tris = 0;
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  for (const p of m.listPrimitives()) {
    const idx = p.getIndices(); const pos = p.getAttribute("POSITION"); const nrm = p.getAttribute("NORMAL");
    const t = idx ? idx.getCount() / 3 : pos.getCount() / 3; tris += t;
    console.log(n.getName().padEnd(16), "verts", String(pos.getCount()).padStart(7), " indexed", !!idx, " tris", String(t).padStart(6), " normals", !!nrm, " anchor", JSON.stringify(n.getExtras().anchor));
  }
}
console.log("total tris", tris, "| extensions:", doc.getRoot().listExtensionsUsed().map((e) => e.extensionName).join(", "));
