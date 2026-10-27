import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const expected = ['bladder', 'diaphragm', 'gallbladder', 'great-vessels', 'kidneys',
  'large-intestine', 'liver', 'oesophagus', 'pancreas', 'small-intestine',
  'spinal-cord', 'spleen', 'stomach', 'thyroid', 'ureters'];
const counts = {};
for (const kind of ['skeleton', 'viscera']) for (const tier of ['normal', 'ultra']) {
  const version = kind === 'skeleton' && process.argv.includes('--skeleton-head-v5') ? 'head-v5' : process.argv.includes(`--${kind}-v3`) ? 'v3' : 'v2';
  const bytes = readFileSync(new URL(`../public/models/local/lab-${kind}-${version}-${tier}.glb`, import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const parts = new Set(); let triangles = 0; let draws = 0;
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    let tagged = mesh;
    while (!tagged.userData.anatomyPart && tagged.parent) tagged = tagged.parent;
    assert(tagged.userData.anatomyPart, `Untagged primitive: ${mesh.name}`);
    parts.add(tagged.userData.anatomyPart);
    const positions = mesh.geometry.attributes.position;
    assert(Array.from(positions.array).every(Number.isFinite));
    triangles += (mesh.geometry.index?.count ?? positions.count) / 3;
    draws++;
  });
  assert.deepEqual([...parts].sort(), kind === 'skeleton' ? ['skeleton'] : expected);
  const size = new Box3().setFromObject(scene).getSize(new Vector3());
  assert(size.y > (kind === 'skeleton' ? 150 : 65) && size.y < 200, 'Unexpected centimetre scale/orientation');
  assert(size.x > 10 && size.z > 5);
  assert(triangles < (tier === 'normal' ? 35000 : 300000));
  assert(draws <= (kind === 'skeleton' ? 4 : 17));
  counts[`${kind}-${tier}`] = triangles;
  console.log(`${kind} ${tier}: ${triangles} triangles, ${draws} draws, ${parts.size} part IDs, ${(bytes.length / 1024).toFixed(0)} KiB`);
}
for (const kind of ['skeleton', 'viscera']) assert(counts[`${kind}-normal`] < counts[`${kind}-ultra`] / 2);
console.log('Both fidelity tiers preserve all part IDs, finite geometry, budgets and body scale.');
