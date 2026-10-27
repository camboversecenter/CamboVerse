import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const expected={macro:['capitulum','deltoid-tuberosity','distal-body','greater-tubercle','head','lateral-epicondyle','lesser-tubercle','medial-epicondyle','shaft','trochlea'],cutaway:['artery','compact-bone','endosteum','periosteum','red-marrow','spongy-bone','vein','yellow-marrow'],micro:['artery','canaliculi','central-canal','lacunae','lamellae','nerve','osteocytes','vein']};
for(const mode of Object.keys(expected))for(const tier of ['normal','ultra']){
 const b=readFileSync(new URL(`../public/models/local/humerus-study-v1-${mode}-${tier}.glb`,import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
 const parts=new Set();let triangles=0,draws=0;
 scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(!p.userData.studyPart&&p.parent)p=p.parent;
 parts.add(p.userData.studyPart);assert.equal(p.userData.studyScale,mode==='micro'?'magnified-not-body-scale':'illustrative-centimetres');
 assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
 triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;draws++;});
 assert.deepEqual([...parts].sort(),expected[mode]);assert(triangles<=(tier==='normal'?30500:250000));assert(draws<=12);
 console.log({mode,tier,parts:parts.size,triangles,draws,bytes:b.length});
}
