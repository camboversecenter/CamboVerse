import fs from 'node:fs';
import assert from 'node:assert/strict';
for (const tier of ['normal', 'ultra']) {
  const buffer = fs.readFileSync(`public/models/local/khmer-kaom-v1-${tier}.glb`);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  const doc = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
  assert.equal(doc.meshes.length, 2);
  assert.deepEqual(new Set(doc.nodes.filter(n => n.mesh != null).map(n => n.extras.artifactPart)), new Set(['body', 'lid']));
  let triangles = 0;
  for (const mesh of doc.meshes) for (const p of mesh.primitives) {
    assert.ok(p.attributes.COLOR_0 != null, 'Clay vertex colour must survive export');
    assert.ok(p.attributes.NORMAL != null);
    const positions = doc.accessors[p.attributes.POSITION];
    assert.ok([...positions.min, ...positions.max].every(Number.isFinite));
    triangles += doc.accessors[p.indices].count / 3;
  }
  assert.ok(buffer.length < (tier === 'normal' ? 300000 : 1800000));
  assert.ok(triangles < (tier === 'normal' ? 12000 : 70000));
  console.log(`${tier}: ${triangles} triangles, ${buffer.length} bytes; parts and colours verified`);
}
