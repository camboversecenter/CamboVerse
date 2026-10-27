// Check every household study model with the same loader used by the browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = new URL('../public/models/village/', import.meta.url);
const names = ['water-jar', 'basket-study', 'cooking-pot', 'winnowing-tray', 'mortar-study'];
const totals = { normal: 0, ultra: 0 };
for (const name of names) {
  const triangles = {};
  for (const mode of ['normal', 'ultra']) {
    const bytes = readFileSync(new URL(`${name}-${mode}.glb`, root));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    let meshes = 0;
    triangles[mode] = 0;
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      const geometry = object.geometry;
      assert(geometry.attributes.normal, `${name}: missing normals`);
      assert([...geometry.attributes.position.array].every(Number.isFinite), `${name}: invalid vertices`);
      assert(object.material.color, `${name}: missing base color`);
      triangles[mode] += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    });
    assert(meshes > 0, `${name}: empty scene`);
    totals[mode] += bytes.length;
  }
  assert(triangles.normal < triangles.ultra, `${name}: Normal must use less geometry`);
}
assert(totals.normal < 100_000, 'Household Normal assets exceed 100 KB');
console.log(JSON.stringify({ status: 'PASS', assets: names.length * 2, bytes: totals }, null, 2));
