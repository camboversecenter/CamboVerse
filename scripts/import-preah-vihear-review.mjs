// Package the approved review for the local viewer; retain original Blender scale.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const green = process.argv.includes('--green');
const mountain = green || process.argv.includes('--mountain');
const revision = green ? 'preah-vihear-green-v4' : mountain ? 'preah-vihear-mountain-v3' : 'preah-vihear-review-v2';
const folder = green ? 'preah-vihear-green-v4' : mountain ? 'preah-vihear-mountain-v3' : 'preah-vihear-v2';
const lift = mountain ? 3 : .57;
const out = path.join(root, 'public/models/local', folder);
fs.mkdirSync(out, { recursive: true });
for (const tier of ['normal', 'ultra']) {
  const source = fs.readFileSync(path.join(root, `output/${revision}/preah-vihear-${tier}.glb`));
  assert.equal(source.readUInt32LE(0), 0x46546c67);
  const jsonLength = source.readUInt32LE(12);
  const gltf = JSON.parse(source.toString('utf8', 20, 20 + jsonLength));
  for (const scene of gltf.scenes) {
    const node = gltf.nodes.length;
    gltf.nodes.push({ name: 'Preah Vihear viewer placement', children: scene.nodes,
      scale: [.15, .15, .15], translation: [0, lift, 0] });
    scene.nodes = [node];
  }
  gltf.asset.extras = { ...gltf.asset.extras, provenance: 'Original reference-guided Blender illustration; not a measured survey.',
    reviewSource: `output/${revision}`, viewerScale: .15, viewerLift: lift };
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const remainingChunks = source.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + remainingChunks.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const result = Buffer.concat([header, padded, remainingChunks]);
  fs.writeFileSync(path.join(out, `preah-vihear-${tier}.glb`), result);
  console.log(`${tier}: ${result.length} bytes, viewer scale 0.15, grounded cliff base`);
}
