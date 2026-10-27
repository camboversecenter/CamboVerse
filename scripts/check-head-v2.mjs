import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
const v3=process.argv.includes('--v3');
for(const tier of ['normal','ultra']){
 const load=async v=>{const b=readFileSync(`public/models/local/lab-head-fitted-${v}-${tier}.glb`);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'')).scene;};
 const measure=scene=>{scene.updateMatrixWorld(true);const out=new Map();scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(!p.userData.anatomyPart&&p.parent)p=p.parent;const id=p.userData.anatomyPart;assert(['eyes','ears','nose','mouth'].includes(id));assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));const a=out.get(id)??{tri:0,box:new Box3()};a.tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;a.box.union(new Box3().setFromObject(o));out.set(id,a);});return out;};
 const old=measure(await load(v3?'v2':'v1')),next=measure(await load(v3?'v3':'v2'));assert.equal(next.size,4);
 for(const id of [v3?'ears':'eyes','nose','mouth']){assert.equal(old.get(id).tri,next.get(id).tri);assert(old.get(id).box.min.distanceTo(next.get(id).box.min)<.0001);assert(old.get(id).box.max.distanceTo(next.get(id).box.max)<.0001);}
 const total=[...next.values()].reduce((s,a)=>s+a.tri,0);assert(total<(tier==='normal'?40000:100000));console.log(tier,total,'triangles; all four IDs present, non-target organs unchanged');
}
