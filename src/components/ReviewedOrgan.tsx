import { Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3, type MeshPhysicalMaterial, type Plane } from 'three';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import type { Detail } from './LabOrgans';
import { isFittedHeadPart } from '../biologyRoomState';
import { anatomyAssetUrl } from '../anatomyAssets';
import { showStudyDentition } from '../mouthStudy';
import {SeparatedAnatomy} from './FloatingAnatomy';
import {heartLandmarkIndex} from '../heartLandmarks';

export function ReviewedOrgan({ id, detail, diameter, selected, showTeeth = false, studySingleEar = false, onBounds, clipPlanes, peelAmount = 0, activeStructure, separated=false, onLandmarks }: { id: string; detail: Detail; diameter: number; selected: boolean; showTeeth?: boolean; studySingleEar?: boolean; onBounds?: (center: Vector3, diameter: number) => void; clipPlanes?: Plane[]; peelAmount?: number; activeStructure?: number | null; separated?:boolean; onLandmarks?: (points: (Vector3 | undefined)[]) => void }) {
  const { scene } = useGLTF(anatomyAssetUrl(isFittedHeadPart(id) ? 'head' : 'organs', detail));
  const result = useMemo(() => {
    const model = scene.clone(true);
    const remove: Mesh[] = [];
    model.traverse(o => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      // Multi-material glTF nodes become Groups; their primitives inherit the ID.
      let tagged = o;
      while (!tagged.userData.anatomyPart && tagged.parent) tagged = tagged.parent;
      const keep = tagged.userData.anatomyPart === id && showStudyDentition(Boolean(tagged.userData.studyDentition), showTeeth, showTeeth) && (!studySingleEar || id !== 'ears' || tagged.userData.anatomySide === 'right');
      if (!keep) { remove.push(mesh); return; }
      mesh.material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone();
      const mat = mesh.material as MeshPhysicalMaterial;
      mat.userData.baseOpacity = mat.opacity;
      mat.userData.baseTransparent = mat.transparent;
      if (detail === 'normal' && 'transmission' in mat) mat.transmission = 0;
      mesh.castShadow = detail === 'ultra';
    });
    remove.forEach(mesh => mesh.removeFromParent());
    const bounds = new Box3().setFromObject(model);
    if (bounds.isEmpty()) throw new Error(`No reviewed geometry for ${id}`);
    const size = bounds.getSize(new Vector3());
    const landmarks: (Vector3 | undefined)[] = [];
    if (id === 'heart') {
      const boxes = new Map<number, Box3>();
      model.traverse(node => {
        const index = heartLandmarkIndex(node.name);
        if (index === undefined) return;
        const box = boxes.get(index) ?? new Box3();
        box.union(new Box3().setFromObject(node)); boxes.set(index, box);
      });
      boxes.forEach((box, index) => {if (!box.isEmpty()) landmarks[index] = box.getCenter(new Vector3());});
    }
    return { model, landmarks, center: bounds.getCenter(new Vector3()), diameter: Math.max(size.x, size.y, size.z) };
  }, [scene, id, detail, studySingleEar, showTeeth]);
  useEffect(() => { onBounds?.(result.center, result.diameter); }, [result, onBounds]);
  useEffect(() => {onLandmarks?.(result.landmarks);}, [result, onLandmarks]);
  useEffect(() => {
    result.model.traverse(o => { if ((o as Mesh).isMesh) {
      const mat = (o as Mesh).material as MeshStandardMaterial;
      let node = o;
      let landmark = heartLandmarkIndex(node.name);
      while (landmark === undefined && node.parent) {node = node.parent; landmark = heartLandmarkIndex(node.name);}
      const highlighted = id === 'heart' && activeStructure != null && landmark === activeStructure;
      mat.emissive?.set(highlighted ? '#b27b26' : selected ? '#513023' : '#000000'); mat.emissiveIntensity = highlighted ? .65 : .2;
      mat.clippingPlanes = clipPlanes ?? [];
      mat.clipShadows = true;
      mat.transparent = Boolean(mat.userData.baseTransparent) || peelAmount > 0;
      mat.opacity = (mat.userData.baseOpacity ?? 1) * (peelAmount > 0 ? Math.max(0, 1 - peelAmount) : 1);
      mat.needsUpdate = true;
    } });
  }, [result, selected, clipPlanes, peelAmount, activeStructure, id]);
  useEffect(() => () => result.model.traverse(o => { if ((o as Mesh).isMesh) ((o as Mesh).material as MeshStandardMaterial).dispose(); }), [result]);
  return <group scale={diameter / result.diameter}><group position={result.center.clone().negate()}>{separated ? <SeparatedAnatomy model={result.model}/> : <primitive object={result.model} dispose={null} />}</group></group>;
}

export function ReviewedOrganDetail({ id, detail, diameter, selected, onPick, fallback }: { id: string; detail: Detail; diameter: number; selected: boolean; onPick: (id: string) => void; fallback: ReactNode }) {
  return <ModelErrorBoundary key={`${id}-${detail}`} fallback={fallback}><Suspense fallback={fallback}>
    <group onClick={e => { e.stopPropagation(); onPick(id); }}><ReviewedOrgan id={id} detail={detail} diameter={diameter} selected={selected} /></group>
  </Suspense></ModelErrorBoundary>;
}
