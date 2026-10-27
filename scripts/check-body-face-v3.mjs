import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
for(const tier of ['normal','ultra']){
 const b=await readFile(`public/models/local/lab-body-face-v3-${tier}.glb`);
 const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const ids=new Set();let triangles=0;
 g.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.userData.faceId){ids.add(o.userData.faceId);console.log(tier,o.userData.faceId,new Box3().setFromObject(o).getSize(new Vector3()).toArray());}assert([...o.geometry.attributes.position.array].every(Number.isFinite));}});
 assert.deepEqual([...ids].sort(),['ear-left','ear-right','eye-left','eye-right','mouth','nose']);
 assert(g.animations.length>0,'Retain breathing');
 // Clean region boundaries add geometry; explicit v3 pilot budgets.
 assert(triangles<(tier==='normal'?25000:55000));
 console.log({tier,triangles,bytes:b.length});
}
