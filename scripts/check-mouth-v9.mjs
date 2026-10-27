import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
async function inspect(version,tier){
 const b=readFileSync(`public/models/local/lab-head-fitted-v${version}-${tier}.glb`);
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
 scene.updateMatrixWorld(true);const parts=new Map();
 scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(!p.userData.anatomyPart&&p.parent)p=p.parent;
 const id=p.userData.anatomyPart;assert(id);assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
 const item=parts.get(id)??{tri:0,box:new Box3(),sides:new Set()};
 item.tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;item.box.union(new Box3().setFromObject(o));
 if(id==='ears')item.sides.add(p.userData.anatomySide);parts.set(id,item);});return parts;
}
for(const tier of ['normal','ultra']){
 const old=await inspect(7,tier),next=await inspect(9,tier);
 assert.equal(next.size,4);
 for(const id of ['eyes','ears','nose']){
  assert.equal(next.get(id).tri,old.get(id).tri);
  assert(next.get(id).box.min.distanceTo(old.get(id).box.min)<.001);
  assert(next.get(id).box.max.distanceTo(old.get(id).box.max)<.001);
 }
 assert.deepEqual([...next.get('ears').sides].sort(),['left','right']);
 assert(next.get('mouth').tri>old.get('mouth').tri);
 const total=[...next.values()].reduce((s,p)=>s+p.tri,0);
 assert(total<(tier==='normal'?55000:180000));
 console.log({tier,total,mouthTriangles:next.get('mouth').tri,otherParts:'unchanged'});
}
