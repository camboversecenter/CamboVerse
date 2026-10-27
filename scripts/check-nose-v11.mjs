import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
async function inspect(v,tier){
 const b=readFileSync(`public/models/local/lab-head-fitted-v${v}-${tier}.glb`);
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
 scene.updateMatrixWorld(true);const parts=new Map();let dental=0;const sides=new Set();
 scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(!p.userData.anatomyPart&&p.parent)p=p.parent;
 const id=p.userData.anatomyPart;assert(id);assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
 const item=parts.get(id)??{tri:0,box:new Box3()};
 item.tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
 item.box.union(new Box3().setFromObject(o));parts.set(id,item);
 if(p.userData.studyDentition)dental++;if(id==='ears')sides.add(p.userData.anatomySide);
 });return {parts,dental,sides};
}
const eyeUpdate=process.argv.includes('--eyes-v12');
for(const tier of ['normal','ultra']){
 const old=await inspect(eyeUpdate?11:10,tier),next=await inspect(eyeUpdate?12:11,tier);
 assert.equal(next.parts.size,4);assert.equal(next.dental,old.dental);assert.equal(next.dental,2);
 assert.deepEqual([...next.sides].sort(),['left','right']);
 for(const id of ['mouth',eyeUpdate?'nose':'eyes','ears']){
  const a=old.parts.get(id),b=next.parts.get(id);assert.equal(a.tri,b.tri);
  assert(a.box.min.distanceTo(b.box.min)<.001);assert(a.box.max.distanceTo(b.box.max)<.001);
 }
 const changed=next.parts.get(eyeUpdate?'eyes':'nose');assert(changed.tri<(tier==='normal'?9000:35000));
 console.log({tier,triangles:changed.tri,otherParts:'unchanged',studyDentition:next.dental});
}
