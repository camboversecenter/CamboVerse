import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const base='/models/local/room-mesh-v1/';
const scene=new THREE.Scene();
scene.background=new THREE.Color('#101b22');
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.02,300);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.minDistance=.05;
controls.maxDistance=100;
const status=document.querySelector<HTMLParagraphElement>('#status')!;
const select=document.querySelector<HTMLSelectElement>('#positions')!;
const materials:THREE.MeshBasicMaterial[]=[];
let poses:{name:string;center:number[]}[]=[];
let center=new THREE.Vector3(),radius=10;
// SfM world is approximately Y-down; use a proper rotation, never a reflection.
const rotation=new THREE.Matrix4().makeRotationX(Math.PI);
const transform=(v:number[])=>new THREE.Vector3(...v as [number,number,number]).applyMatrix4(rotation);
function overview(){camera.position.copy(center).add(new THREE.Vector3(radius*.9,radius*.7,radius*.9));controls.target.copy(center);controls.update();}
document.querySelector('#overview')!.addEventListener('click',overview);
select.addEventListener('change',()=>{
 const pose=poses[Number(select.value)];if(!pose || select.value==='')return;
 camera.position.copy(transform(pose.center));
 const target=center.clone();target.y=camera.position.y;
 if(target.distanceTo(camera.position)<.2)target.z-=2;
 controls.target.copy(target);controls.update();
});
document.querySelector<HTMLButtonElement>('#wire')!.addEventListener('click',event=>{
 const enabled=!materials[0]?.wireframe;materials.forEach(m=>m.wireframe=enabled);
 (event.currentTarget as HTMLButtonElement).textContent=enabled?'Hide edges':'Show edges';
});
document.querySelector<HTMLButtonElement>('#hide')!.addEventListener('click',event=>{
 const collapsed=document.querySelector('#panel')!.classList.toggle('collapsed');
 const button=event.currentTarget as HTMLButtonElement;
 button.textContent=collapsed?'Show':'Hide';button.setAttribute('aria-expanded',String(!collapsed));
});
async function load(){
 const response=await fetch(base+'cameras.json');if(!response.ok)throw new Error('Room assets are not ready yet.');
 poses=await response.json();
 const gltf=await new GLTFLoader().loadAsync(base+'room.glb');
 const root=gltf.scene;root.applyMatrix4(rotation);
 let faces=0;
 root.traverse(object=>{if(object instanceof THREE.Mesh){
  faces+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;
  const replace=(old:THREE.Material)=>{
   const material=new THREE.MeshBasicMaterial({map:(old as THREE.MeshStandardMaterial).map,side:THREE.DoubleSide});materials.push(material);return material;
  };
  object.material=Array.isArray(object.material)?object.material.map(replace):replace(object.material);
 }});
 scene.add(root);
 const box=new THREE.Box3().setFromPoints(poses.map(p=>transform(p.center)));center=box.getCenter(new THREE.Vector3());radius=Math.max(...box.getSize(new THREE.Vector3()).toArray())*.8;
 poses.forEach((pose,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent='Photo '+pose.name.match(/_(\d{3})\.jpg$/)?.[1];select.append(option);});
 overview();status.textContent=`27 photo positions · ${Math.round(faces).toLocaleString()} reconstructed triangles · textures ready`;
}
load().catch(error=>{status.textContent='Preview could not load.';document.querySelector('#error')!.textContent=String(error);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
