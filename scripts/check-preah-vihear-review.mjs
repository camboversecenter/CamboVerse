// Review-asset checks only; does not modify or load the live application.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'output/preah-vihear-review-v2');
const report = JSON.parse(fs.readFileSync(path.join(out, 'build-report.json'), 'utf8'));
const measured = [];
for (const tier of ['normal', 'ultra']) {
  const bytes = fs.readFileSync(path.join(out, `preah-vihear-${tier}.glb`));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.equal(gltf.asset.version, '2.0');
  assert.ok(gltf.buffers.every(buffer => !buffer.uri), 'No external geometry dependency');
  assert.ok(gltf.images.every(image => image.bufferView !== undefined && !image.uri), 'Textures embedded');
  for (const view of gltf.bufferViews) {
    assert.ok((view.byteOffset ?? 0) + view.byteLength <= gltf.buffers[view.buffer].byteLength);
  }
  const primitives = gltf.meshes.flatMap(mesh => mesh.primitives);
  const triangles = primitives.reduce((sum, primitive) => {
    assert.equal(primitive.mode ?? 4, 4);
    const position = gltf.accessors[primitive.attributes.POSITION];
    assert.ok(position.min.every(Number.isFinite) && position.max.every(Number.isFinite));
    assert.ok(position.count > 0);
    return sum + gltf.accessors[primitive.indices].count / 3;
  }, 0);
  const entry = report.find(item => item.tier === tier);
  assert.equal(triangles, entry.triangles);
  assert.equal(bytes.length, entry.bytes);
  assert.equal(primitives.length, entry.draws);
  assert.deepEqual(entry.gateOrderNorthToSouth, ['V', 'IV', 'III', 'II', 'I']);
  assert.ok(primitives.length <= 12, 'Keep material batches bounded');
  // Initial review budgets only, not a substitute for target-phone testing.
  if (tier === 'normal') {
    assert.ok(triangles < 50000, `Normal triangle budget: ${triangles}`);
    assert.ok(bytes.length < 4 * 1024 * 1024, 'Normal uncompressed download under 4 MiB');
  }
  assert.ok(fs.statSync(path.join(out, `preah-vihear-${tier}.blend`)).size > 1000);
  measured.push({ tier, triangles, draws: primitives.length, bytes: bytes.length });
}
assert.ok(measured[0].triangles < measured[1].triangles, 'Normal must reduce geometry');
for (const name of ['normal-overview', 'ultra-overview', 'ultra-gateway-iii', 'ultra-sanctuary', 'ultra-plan']) {
  const png = fs.readFileSync(path.join(out, `${name}.png`));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) >= 1000 && png.readUInt32BE(20) >= 1000);
}
const catalog = fs.readFileSync(path.join(root, 'src/spots.ts'), 'utf8');
for (const tier of ['normal', 'ultra']) {
  assert.ok(catalog.includes(`/models/local/preah-vihear-green-v4/preah-vihear-${tier}.glb`),
    'User-authorized local import must use the viewer-packaged model');
}
console.log('Preah Vihear standalone review checks passed:', measured);
