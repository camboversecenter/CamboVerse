import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
const expected=['left-arm','left-foot','left-hand','left-leg','pelvis','rib-cage','right-arm','right-foot','right-hand','right-leg','shoulder-girdle','skull','spine'];
const v8=process.argv.includes('--v8');
const v9=process.argv.includes('--v9');
const v10=process.argv.includes('--v10');
const v11=process.argv.includes('--v11');
const prefix=v11?'lab-skeleton-v11':v10?'lab-skeleton-v10':v9?'lab-skeleton-v9':v8?'lab-skeleton-v8':process.argv.includes('--v7')?'lab-skeleton-v7':process.argv.includes('--v6')?'lab-skeleton-v6':'lab-skeleton-regions-v4';
for(const tier of ['normal','ultra']){
  const b=readFileSync(new URL(`../public/models/local/${prefix}-${tier}.glb`,import.meta.url));
  const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
  const ids=new Set();let triangles=0,draws=0;
  scene.traverse(o=>{
    if(!o.isMesh)return;
    let p=o;while(!p.userData.skeletonRegion&&p.parent)p=p.parent;
    assert.equal(p.userData.anatomyPart,'skeleton');ids.add(p.userData.skeletonRegion);
    assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
    triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;draws++;
  });
  assert.deepEqual([...ids].sort(),expected);
  const budget=v11?(tier==='normal'?45000:230000):v10?(tier==='normal'?36000:207000):v9?(tier==='normal'?35000:200000):(tier==='normal'?32500:v8?191100:190500);
  assert(triangles<=budget,`Budget exceeded: ${triangles}`);assert(draws<=((v8||v9||v10||v11)?17:16));
  if(v11){
    let extremities=0;
    scene.traverse(o=>{if(o.userData.boneCount){
      const count=o.userData.skeletonRegion.endsWith('hand')?27:26;
      assert.equal(o.userData.boneCount,count);assert.equal(o.userData.illustrativeBones.length,count);extremities++;
    }});assert.equal(extremities,4);
  }
  if(v8||v9||v10||v11){
    let landmarks=false;
    scene.traverse(o=>{if(o.userData.sutures?.includes('coronal, sagittal, lambdoid'))landmarks=true;});
    assert(landmarks,'V8 must retain suture metadata');
    const previous=readFileSync(new URL(`../public/models/local/lab-skeleton-${v11?'v10':v10?'v9':v9?'v8':'v7'}-${tier}.glb`,import.meta.url));
    const old=await new GLTFLoader().parseAsync(previous.buffer.slice(previous.byteOffset,previous.byteOffset+previous.length),'');
    const measurements=root=>{
      root.updateMatrixWorld(true);
      const result=new Map();
      root.traverse(o=>{
        if(!o.isMesh)return;
        let p=o;while(!p.userData.skeletonRegion&&p.parent)p=p.parent;
        const id=p.userData.skeletonRegion;
        if(v11?['left-hand','right-hand','left-foot','right-foot'].includes(id):v10?['left-arm','right-arm','left-leg','right-leg','left-foot','right-foot'].includes(id):v9?['left-arm','right-arm','left-leg','right-leg','shoulder-girdle'].includes(id):id==='skull')return;
        const item=result.get(id)??{bounds:new Box3(),triangles:0};
        item.bounds.union(new Box3().setFromObject(o));
        item.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
        result.set(id,item);
      });return result;
    };
    const before=measurements(old.scene),after=measurements(scene);
    for(const [id,a] of before){
      const b=after.get(id);assert(b,`${id} missing`);
      assert.equal(a.triangles,b.triangles,`${id} geometry changed`);
      assert(a.bounds.min.distanceTo(b.bounds.min)<.0001&&a.bounds.max.distanceTo(b.bounds.max)<.0001,`${id} moved`);
    }
  }
  console.log({tier,triangles,draws,regions:ids.size,bytes:b.length});
}
