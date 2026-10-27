import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D } from 'three';
import { houses, local, type VillageMode } from './layout';

type Shape = 'box' | 'ball' | 'cone';
/** Local ambient characters, not user avatars. Three instanced draw batches. */
export function VillageLife({ mode, paused }: { mode: VillageMode; paused: boolean }) {
  const boxes = useRef<InstancedMesh>(null);
  const balls = useRef<InstancedMesh>(null);
  const cones = useRef<InstancedMesh>(null);
  const time = useRef(0);
  const scratch = useMemo(() => ({ root: new Object3D(), part: new Object3D(), color: new Color() }), []);
  useFrame((_, delta) => {
    if (!paused) time.current += Math.min(delta,.05);
    const t = time.current;
    const refs = { box: boxes.current, ball: balls.current, cone: cones.current };
    if (!refs.box || !refs.ball || !refs.cone) return;
    const counts = { box:0, ball:0, cone:0 };
    const {root,part,color} = scratch;
    const pose = (x: number,z: number,yaw: number, bob=0) => {
      root.position.set(x,bob,z); root.rotation.set(0,yaw,0); root.updateMatrix();
    };
    const add = (shape: Shape, x:number,y:number,z:number, sx:number,sy:number,sz:number, tint:string, tilt=0) => {
      const mesh = refs[shape]!;
      part.position.set(x,y,z); part.scale.set(sx,sy,sz); part.rotation.set(tilt,0,0); part.updateMatrix();
      const index = counts[shape]++;
      mesh.setMatrixAt(index, part.matrix.premultiply(root.matrix));
      mesh.setColorAt(index,color.set(tint));
    };
    // Elliptical loops remain inside the main road and the branch to the wat.
    for (let i=0;i<7;i++) {
      const u = t*.043+i*Math.PI*2/7;
      const branch = i===6;
      const x = branch ? .55*Math.sin(u) : 19*Math.cos(u);
      const z = branch ? -7+5.5*Math.cos(u) : .66*Math.sin(u);
      const dx = branch ? .55*Math.cos(u) : -19*Math.sin(u);
      const dz = branch ? -5.5*Math.sin(u) : .66*Math.cos(u);
      const stride = paused ? 0 : Math.sin(t*5.8+i)*.46;
      pose(x,z,Math.atan2(dx,dz),paused ? 0 : Math.abs(Math.sin(t*5.8+i))*.025);
      const shirt = ['#ac6540','#406f7a','#7b537c','#b49a51','#687948','#bd7a79','#537c79'][i];
      const skin = ['#9b6949','#bd875f','#aa7751'][i%3];
      add('box',0,1.12,0,.43,.57,.25,shirt);
      add('ball',0,1.59,0,.14,.18,.14,skin);
      add('ball',0,1.72,-.025,.145,.075,.145,'#302c29');
      for (const side of [-1,1]) {
        const a=stride*side;
        // Articulated limbs pivot at hips and shoulders, with opposing swing.
        add('box',side*.115,.79-Math.cos(a)*.36,-Math.sin(a)*.36,.14,.72,.16,'#354d57',a);
        add('box',side*.115,.10,-Math.sin(a)*.72+.055,.16,.12,.26,'#403a2b');
        add('box',side*.29,1.35-Math.cos(-a)*.27,-Math.sin(-a)*.27,.12,.54,.13,skin,-a);
      }
      if (i%2===0) add('cone',0,1.85,0,.28,.16,.28,'#c5a570');
    }
    // Two buffalo follow separate loops beside the rice fields, away from homes/pond.
    for(let i=0;i<2;i++) {
      const u=t*.07+i*Math.PI;
      pose(-9+3.2*Math.cos(u),15.5+1.05*Math.sin(u),Math.atan2(-3.2*Math.sin(u),1.05*Math.cos(u)));
      add('ball',0,.96,0,.38,.44,.85,'#555953');
      add('ball',0,1.03,.85,.25,.28,.35,'#50534c');
      add('ball',0,.89,1.12,.23,.14,.22,'#777368');
      for(const side of [-1,1]) {
        for(const fore of [-1,1]) {
          const a=paused ? 0 : Math.sin(t*3.4+i+ (side===fore ? 0 : Math.PI))*.27;
          add('box',side*.26,.8-Math.cos(a)*.35,fore*.52-Math.sin(a)*.35,.13,.70,.14,'#454941',a);
        }
        add('cone',side*.34,1.39,.69,.07,.46,.07,'#d1c5a0',-.65);
        add('ball',side*.26,1.14,.83,.14,.045,.11,'#555953');
      }
      add('box',0,.65,-.87,.045,.48,.045,'#454941',.35);
    }
    // Chickens wander within the open side of four household yards.
    for(let i=0;i<4;i++) {
      const h=houses[i*2];
      const u=t*.3+i;
      const p=local(h,-2.4+.35*Math.cos(u),1.5+.45*Math.sin(u));
      pose(p.position[0],p.position[2],Math.atan2(-.35*Math.sin(u),.45*Math.cos(u))+(h.rotation??0));
      const feather = i%2 ? '#e3ccb0' : '#966145';
      add('ball',0,.30,0,.16,.18,.23,feather);
      add('ball',0,.53,.16,.095,.105,.10,feather);
      add('cone',0,.51,.29,.055,.14,.055,'#ce9a39',Math.PI/2);
      add('ball',0,.64,.15,.035,.07,.05,'#b44331');
      add('cone',0,.40,-.23,.10,.31,.10,feather,-.8);
      for(const side of [-1,1]) {
        const a=paused ? 0 : Math.sin(t*9+i+side)*.35;
        add('box',side*.065,.1,Math.sin(a)*.07,.025,.20,.025,'#ba8c37',a);
      }
    }
    for(const shape of ['box','ball','cone'] as const) {
      const mesh=refs[shape]!;
      mesh.count=counts[shape]; mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
    }
  });
  return <group>
    <instancedMesh ref={boxes} args={[undefined,undefined,100]} frustumCulled={false} castShadow={mode==='ultra'}><boxGeometry /><meshStandardMaterial roughness={.95} /></instancedMesh>
    <instancedMesh ref={balls} args={[undefined,undefined,60]} frustumCulled={false} castShadow={mode==='ultra'}><sphereGeometry args={[1,mode==='normal'?8:12,mode==='normal'?6:10]} /><meshStandardMaterial roughness={.95} /></instancedMesh>
    <instancedMesh ref={cones} args={[undefined,undefined,30]} frustumCulled={false} castShadow={mode==='ultra'}><coneGeometry args={[1,1,mode==='normal'?6:10]} /><meshStandardMaterial roughness={.9} /></instancedMesh>
  </group>;
}
