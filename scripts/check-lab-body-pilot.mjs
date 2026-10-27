// Local-only asset smoke test: node scripts/check-lab-body-pilot.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3, AnimationMixer } from 'three';

const reports = [];
const facial = process.argv.includes('--facial-v2');
const prefix = facial ? 'lab-body-face-v2' : 'lab-body-makehuman';
for (const tier of ['normal', 'ultra']) {
  const bytes = await readFile(new URL(`../public/models/local/${prefix}-${tier}.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const bounds = new Box3().setFromObject(gltf.scene, true);
  const size = bounds.getSize(new Vector3());
  assert(Math.abs(size.y - 175) < 0.5, 'Must be upright, 175 cm tall');
  assert(Math.abs(bounds.min.y + 86.1) < 0.5, 'Feet must meet existing bench within 5 mm');
  assert(gltf.animations.length === 1, 'One breathing clip');
  let triangles = 0, draws = 0;
  const names = [];
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    names.push(mesh.name);
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    draws += 1;
    assert(!mesh.material.transmission, 'No transmission required');
  });
  assert(triangles <= (tier === 'normal' ? 20000 : 50000));
  assert(draws <= 10);
  if (facial) {
    for (const side of ['l','r']) for (const part of ['eye','iris','pupil','brow']) {
      assert(names.some(name => name === `part-skin-${part}-${side}`), `Missing ${part} ${side}`);
    }
  }
  const mixer = new AnimationMixer(gltf.scene);
  mixer.clipAction(gltf.animations[0]).play();
  mixer.update(2);
  let breathing = false;
  gltf.scene.traverse((mesh) => {
    if (mesh.morphTargetInfluences?.some((weight) => weight > 0.1)) breathing = true;
  });
  assert(breathing, 'Breathing animation must resolve to loaded meshes');
  reports.push({ tier, triangles, draws, bytes: bytes.length, height: size.y, names: names.sort() });
}
assert.deepEqual(reports[0].names, reports[1].names, 'Same parts in both tiers');
console.log(JSON.stringify(reports, null, 2));
