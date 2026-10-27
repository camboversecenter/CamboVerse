import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
async function load(version,tier){
 const b=readFileSync(`public/models/local/lab-head-fitted-v${version}-${tier}.glb`);
 return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'')).scene;
}
function groups(scene){
 scene.updateMatrixWorld(true);const out=new Map();
 scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(!p.userData.anatomyPart&&p.parent)p=p.parent;
 const id=p.userData.anatomyPart;assert(id);assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
 const v=out.get(id)??{tri:0,box:new Box3(),sides:new Set()};v.tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
 v.box.union(new Box3().setFromObject(o));
 if(id==='ears'){assert(['left','right'].includes(p.userData.anatomySide));v.sides.add(p.userData.anatomySide);
 const b=new Box3().setFromObject(o);assert(p.userData.anatomySide==='right'?b.max.x<0:b.min.x>0);}
 out.set(id,v);});return out;
}
for(const tier of ['normal','ultra']){
 const current=groups(await load(7,tier));
 const old=await load(6,tier);old.updateMatrixWorld(true);
 for(const id of ['eyes','nose','mouth']){
 let tri=0;const box=new Box3();old.traverse(o=>{if(!o.isMesh)return;let p=o;while(!p.userData.anatomyPart&&p.parent)p=p.parent;
 if(p.userData.anatomyPart===id){tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;box.union(new Box3().setFromObject(o));}});
 assert.equal(current.get(id).tri,tri);assert(current.get(id).box.min.distanceTo(box.min)<.001);assert(current.get(id).box.max.distanceTo(box.max)<.001);
 }
 assert.equal(current.size,4);assert.equal(current.get('ears').sides.size,2);
 console.log(tier,'passed: both ears separately tagged; other head parts unchanged', [...current].map(([id,x])=>[id,x.tri]));
}
