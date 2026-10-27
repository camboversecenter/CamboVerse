import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const ids = ['sclera', 'cornea', 'iris', 'lens', 'retina', 'optic-nerve', 'vitreous'];
const reports = [];
for (const tier of ['normal', 'ultra']) {
  const bytes = await readFile(new URL(`../public/models/local/lab-eye-${tier}.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const names = [];
  let triangles = 0;
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    names.push(mesh.name);
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    assert(!mesh.material.transmission, 'Expensive effects are applied only by Ultra renderer');
    for (const value of mesh.geometry.attributes.position.array) assert(Number.isFinite(value));
  });
  for (const id of ids) assert(names.some((name) => name === `part-${id}` || name.startsWith(`part-${id}-`)), `Missing ${id}`);
  assert(triangles < (tier === 'normal' ? 10000 : 50000));
  const iris = gltf.scene.getObjectByName('part-iris');
  assert(iris.geometry.attributes.color, 'Iris fibers must survive export');
  assert(iris.morphTargetInfluences?.length === 1, 'Dilation must survive export');
  const point = new Vector3();
  iris.morphTargetInfluences[0] = 0;
  iris.getVertexPosition(0, point);
  const small = Math.hypot(point.x, point.y);
  iris.morphTargetInfluences[0] = 1;
  iris.getVertexPosition(0, point);
  const large = Math.hypot(point.x, point.y);
  assert(Math.abs(small - 1.5) < 0.01 && Math.abs(large - 3.8) < 0.01, 'Iris aperture must expand while outer rim stays fixed');
  const bounds = new Box3().setFromObject(gltf.scene, true);
  assert(Math.abs(bounds.min.y + 11) < 0.1, 'Eye must meet bench');
  reports.push({ tier, bytes: bytes.length, triangles, names: names.sort(), pupilRadii: [small, large] });
}
assert.deepEqual(reports[0].names, reports[1].names, 'Both tiers must contain the same parts');
console.log(JSON.stringify(reports, null, 2));
