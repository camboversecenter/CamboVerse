import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three';
import type { CaptureWalkArea } from '../spots';
import { areaGroundTriangles } from '../captureAreaWalk';

export function CaptureAreaGround({area}:{area:CaptureWalkArea}) {
  const geometry=useMemo(()=>{
    const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(areaGroundTriangles(area),3));g.computeVertexNormals();return g;
  },[area]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshBasicMaterial color="#8a8275" side={DoubleSide}/></mesh>;
}
