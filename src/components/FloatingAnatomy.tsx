import {createContext, useContext, useEffect, useMemo, useRef, type RefObject} from 'react';
import {useThree, type ThreeEvent} from '@react-three/fiber';
import {useXR} from '@react-three/xr';
import {Group, Mesh, MeshStandardMaterial, Plane, Vector3, type Object3D} from 'three';
import {useLabGrabbable} from './LabInteraction';
import {buildAnatomyPieces} from '../anatomyPieces';
import type {OrganDef} from './LabBody';

export const AirStudyContext=createContext({zoom:(_:number)=>{}, describe:(_:string)=>{}, recall:0});

/** Drag in a plane parallel to the screen, keeping the grabbed point under the pointer. */
export function useAirDrag(ref:RefObject<Group>, enabled:boolean, onMove?:(position:Vector3)=>void) {
  const camera=useThree(s=>s.camera), session=useXR(s=>s.session);
  const drag=useRef<{id:number;plane:Plane;offset:Vector3}|null>(null);
  useEffect(()=>{
    const cancel=()=>{drag.current=null;};
    window.addEventListener('blur',cancel);
    return ()=>{cancel();window.removeEventListener('blur',cancel);};
  },[enabled,session]);
  return {
    onPointerDown:(e:ThreeEvent<PointerEvent>)=>{
      const object=ref.current;
      if (!enabled || session || !object || e.button!==0 || drag.current) return;
      e.stopPropagation(); e.nativeEvent.stopPropagation();
      const normal=camera.getWorldDirection(new Vector3());
      drag.current={id:e.pointerId,plane:new Plane().setFromNormalAndCoplanarPoint(normal,e.point),
        offset:object.getWorldPosition(new Vector3()).sub(e.point)};
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    onPointerMove:(e:ThreeEvent<PointerEvent>)=>{
      const d=drag.current, object=ref.current;
      if (!object || d?.id!==e.pointerId || !d) return;
      e.stopPropagation(); const p=e.ray.intersectPlane(d.plane,new Vector3());
      if (!p) return;
      p.add(d.offset); object.parent?.worldToLocal(p); object.position.copy(p); onMove?.(p);
    },
    onPointerUp:(e:ThreeEvent<PointerEvent>)=>{
      if (!drag.current || drag.current.id!==e.pointerId) return;
      drag.current=null; e.stopPropagation(); (e.target as Element).releasePointerCapture(e.pointerId);
    },
    onPointerCancel:()=>{drag.current=null;},
    onLostPointerCapture:()=>{drag.current=null;},
  };
}

function FloatingPiece({piece}:{piece:ReturnType<typeof buildAnatomyPieces>['pieces'][number]}) {
  const ref=useRef<Group>(null);
  const {describe}=useContext(AirStudyContext);
  useLabGrabbable(ref,true,{floating:true,scaleRange:[.5,3],onRelease:(_,cancelled)=>{if(!cancelled)describe(piece.name);}});
  const drag=useAirDrag(ref,true);
  return <group ref={ref} position={piece.offset} {...drag} onClick={e=>{e.stopPropagation();describe(piece.name);}}>
    <primitive object={piece.model} dispose={null}/>
  </group>;
}

export function SeparatedAnatomy({model}:{model:Object3D}) {
  const layout=useMemo(()=>buildAnatomyPieces(model),[model]);
  useEffect(()=>()=>layout.dispose(),[layout]);
  return <>{layout.pieces.map((p,i)=><FloatingPiece key={i} piece={p}/>)}</>;
}

export function ProceduralPieces({defs}:{defs:OrganDef[]}) {
  const model=useMemo(()=>{
    const group=new Group();
    defs.forEach((d,i)=>{
      const mesh=new Mesh(d.geo,new MeshStandardMaterial({color:d.color,roughness:.56}));
      mesh.name=`${d.id} · modeled piece ${i+1}`; mesh.position.set(...d.at); group.add(mesh);
    });
    return group;
  },[defs]);
  useEffect(()=>()=>model.children.forEach(node=>((node as Mesh).material as MeshStandardMaterial).dispose()),[model]);
  return <SeparatedAnatomy model={model}/>;
}
