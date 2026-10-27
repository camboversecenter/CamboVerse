import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
for(const tier of ['normal','ultra']) {
 const measure=async version=>{
  const b=readFileSync(`public/models/local/lab-head-fitted-v${version}-${tier}.glb`);
  const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
  scene.updateMatrixWorld(true); const parts=new Map();
  scene.traverse(o=>{
   if(!o.isMesh)return; let p=o;while(!p.userData.anatomyPart&&p.parent)p=p.parent;
   const id=p.userData.anatomyPart;assert(['eyes','nose','mouth','ears'].includes(id));
   assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
   const item=parts.get(id)??{tri:0,box:new Box3()};item.tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
   item.box.union(new Box3().setFromObject(o));parts.set(id,item);
  });assert.equal(parts.size,4);return parts;
 };
 let previous=await measure(3);
 for(const [version,target] of [[4,'nose'],[5,'mouth'],[6,'ears']]) {
  const next=await measure(version);
  for(const [id,old] of previous)if(id!==target){
   assert.equal(next.get(id).tri,old.tri);
   assert(next.get(id).box.min.distanceTo(old.box.min)<.001);
   assert(next.get(id).box.max.distanceTo(old.box.max)<.001);
  }
  assert(next.get(target).tri>previous.get(target).tri);
  const triangles=[...next.values()].reduce((s,x)=>s+x.tri,0);
  assert(triangles<(tier==='normal'?50000:160000));
  console.log({version,tier,triangles,target,otherParts:'unchanged'});previous=next;
 }
}
