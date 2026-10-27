import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const reports = [];
for (const tier of ['normal', 'ultra']) {
  const bytes = await readFile(new URL(`../public/models/local/lab-lungs-${tier}.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength), '');
  const names = [];
  let triangles = 0;
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    names.push(mesh.name);
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count)/3;
    for (const value of mesh.geometry.attributes.position.array) assert(Number.isFinite(value));
    assert(!mesh.material.transmission);
    if (mesh.name !== 'part-trachea') {
      assert.equal(mesh.morphTargetInfluences.length,1);
      mesh.morphTargetInfluences[0] = 1;
      const vertex = new Vector3();
      mesh.getVertexPosition(0,vertex);
      assert(vertex.toArray().every(Number.isFinite));
      mesh.morphTargetInfluences[0] = 0;
    }
  });
  for (const name of ['part-right-lung-upper','part-right-lung-middle','part-right-lung-lower',
    'part-left-lung-upper','part-left-lung-lower','part-notch','part-trachea','part-bronchi','part-tree']) assert(names.includes(name),name);
  const bounds = new Box3().setFromObject(gltf.scene,true);
  assert(Math.abs(bounds.min.y+7)<.1 && Math.abs(bounds.max.y-15)<.1,'Expected upright bounds');
  assert(triangles < (tier==='normal' ? 20000 : 50000));
  assert(names.length<=10,'Draw-call budget');
  reports.push({tier,triangles,bytes:bytes.length,draws:names.length,names:names.sort()});
}
assert.deepEqual(reports[0].names,reports[1].names,'Lesson-part parity');
console.log(JSON.stringify(reports,null,2));
