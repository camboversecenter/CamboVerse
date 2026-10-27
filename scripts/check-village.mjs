// Verify the Blender -> browser contract without needing WebGL or Blender.
import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = new URL('../public/models/village/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
assert.equal(manifest.assets.length, 32);
const totals = { normal: 0, ultra: 0 };
const names = new Set();
const houseHashes = { normal: new Set(), ultra: new Set() };
for (const asset of manifest.assets) {
  const key = `${asset.asset}-${asset.mode}`;
  assert(!names.has(key), `Duplicate ${key}`);
  names.add(key);
  const path = new URL(`${key}.glb`, root);
  const bytes = readFileSync(path);
  if (asset.asset.startsWith('house')) houseHashes[asset.mode].add(createHash('sha256').update(bytes).digest('hex'));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.length, asset.bytes);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.equal(gltf.meshes.length, 1, `${key} must have one instanced mesh`);
  assert.equal(gltf.meshes[0].primitives.length, 1, `${key} must have one draw primitive`);
  const primitive = gltf.meshes[0].primitives[0];
  assert(primitive.attributes.COLOR_0 !== undefined, `${key} missing vertex colors`);
  assert.equal(gltf.accessors[primitive.indices].count / 3, asset.triangles);
  const positions = gltf.accessors[primitive.attributes.POSITION];
  assert([...positions.min, ...positions.max].every(Number.isFinite));
  assert(!gltf.images?.length, 'External textures are not part of this kit');
  totals[asset.mode] += bytes.length;
}
for (const mode of ['normal', 'ultra']) {
  assert.equal(houseHashes[mode].size, 3, `${mode} needs three distinct house models`);
  assert(statSync(new URL(`../assets/village/village-${mode}.blend`, import.meta.url)).size > 1000);
}
assert(totals.normal < 1_000_000, 'Normal download exceeds the 1 MB asset budget');
console.log(JSON.stringify({ status: 'PASS', assets: manifest.assets.length, bytes: totals }, null, 2));
