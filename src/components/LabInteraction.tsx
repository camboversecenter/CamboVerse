import {createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {useXRStore} from '@react-three/xr';
import {BoxHelper, Group, Object3D} from 'three';
import {LabManipulation, type GrabOptions} from '../labManipulation';

const Context = createContext<LabManipulation | null>(null);
export const useLabInteraction = () => useContext(Context);

export function LabInteractionProvider({children}: {children: ReactNode}) {
  const engine = useMemo(() => new LabManipulation(), []), store = useXRStore();
  const outlines = useMemo(()=>[new BoxHelper(new Group(), '#e5cb78'),new BoxHelper(new Group(), '#e5cb78')],[]);
  const poses = useMemo(()=>new Map<string,{grip:Object3D;ray:Object3D}>(),[]);
  useEffect(()=>()=>outlines.forEach(h=>{h.geometry.dispose();h.material.dispose();}),[outlines]);
  useEffect(() => () => engine.cancel(), [engine]);
  // Run before locomotion so a grip used for a tool never also starts sprinting.
  useFrame((_, dt, frame) => {
    const {session, inputSourceStates, origin, originReferenceSpace} = store.getState();
    origin?.updateWorldMatrix(true,false);
    const hands=inputSourceStates.filter(s=>s.type==='controller').map(s=>{
      let pair=poses.get(s.id);
      if(!pair){pair={grip:new Object3D(),ray:new Object3D()};pair.grip.matrixAutoUpdate=false;pair.ray.matrixAutoUpdate=false;poses.set(s.id,pair);}
      const apply=(object:Object3D,space?:XRSpace)=>{
        const pose=space&&originReferenceSpace&&frame?.getPose(space,originReferenceSpace);
        if(!pose)return undefined;
        object.matrix.fromArray(pose.transform.matrix);
        if(origin)object.matrix.premultiply(origin.matrixWorld);
        object.updateWorldMatrix(false,false);return object;
      };
      // Selection follows the visible target ray. Wrist rotation follows grip
      // space; the visual controller model is not a reliable pointing transform.
      const ray=apply(pair.ray,s.inputSource.targetRaySpace);
      return {id:s.id,handedness:s.inputSource.handedness,object:ray ? apply(pair.grip,s.inputSource.gripSpace) : undefined,rayObject:ray,
        pressed:s.gamepad['xr-standard-squeeze']?.state==='pressed'};
    });
    for(const id of poses.keys())if(!hands.some(h=>h.id===id))poses.delete(id);
    engine.step(hands, dt, !!session && session.visibilityState === 'visible');
    const targets=engine.targets();
    outlines.forEach((outline,i)=>{outline.visible=!!targets[i];if(targets[i])outline.setFromObject(targets[i]);});
  }, -0.5);
  return <Context.Provider value={engine}>{children}{outlines.map((outline,i)=><primitive key={i} object={outline} pointerEvents="none"/>)}</Context.Provider>;
}

export function useLabGrabbable(ref: RefObject<Object3D>, enabled = true, options: GrabOptions = {}, resetKey?: unknown) {
  const engine = useLabInteraction(), latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    if (engine && ref.current && enabled) return engine.register(ref.current, () => latest.current);
  }, [engine, ref, enabled, resetKey]);
  return () => engine?.isHeld(ref.current) ?? false;
}

export function LabMovable({children, position, scale = 1, resetKey, floating=false}: {children: ReactNode; position: [number, number, number]; scale?: number; resetKey?: unknown; floating?:boolean}) {
  const ref = useRef<Group>(null);
  useLabGrabbable(ref, true, floating ? {floating:true,scaleRange:[scale*.5,scale*3]} : {}, resetKey);
  return <group ref={ref} position={position} scale={scale}>{children}</group>;
}
