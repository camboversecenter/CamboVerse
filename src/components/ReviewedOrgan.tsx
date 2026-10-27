import { Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3, type MeshPhysicalMaterial, type Plane } from 'three';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import type { Detail } from './LabOrgans';
import { isFittedHeadPart } from '../biologyRoomState';
import { anatomyAssetUrl } from '../anatomyAssets';
import { showStudyDentition } from '../mouthStudy';

export function ReviewedOrgan({ id, detail, diameter, selected, showTeeth = false, studySingleEar = false, onBounds, clipPlanes, peelAmount = 0 }: { id: string; detail: Detail; diameter: number; selected: boolean; showTeeth?: boolean; studySingleEar?: boolean; onBounds?: (center: Vector3, diameter: number) => void; clipPlanes?: Plane[]; peelAmount?: number }) {
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
    return { model, center: bounds.getCenter(new Vector3()), diameter: Math.max(size.x, size.y, size.z) };
  }, [scene, id, detail, studySingleEar, showTeeth]);
  useEffect(() => { onBounds?.(result.center, result.diameter); }, [result, onBounds]);
  useEffect(() => {
    result.model.traverse(o => { if ((o as Mesh).isMesh) {
      const mat = (o as Mesh).material as MeshStandardMaterial;
      mat.emissive?.set(selected ? '#513023' : '#000000'); mat.emissiveIntensity = .2;
      mat.clippingPlanes = clipPlanes ?? [];
      mat.clipShadows = true;
      mat.transparent = Boolean(mat.userData.baseTransparent) || peelAmount > 0;
      mat.opacity = (mat.userData.baseOpacity ?? 1) * (peelAmount > 0 ? Math.max(0, 1 - peelAmount) : 1);
      mat.needsUpdate = true;
    } });
  }, [result, selected, clipPlanes, peelAmount]);
  useEffect(() => () => result.model.traverse(o => { if ((o as Mesh).isMesh) ((o as Mesh).material as MeshStandardMaterial).dispose(); }), [result]);
  return <group scale={diameter / result.diameter}><group position={result.center.clone().negate()}><primitive object={result.model} dispose={null} /></group></group>;
}

export function ReviewedOrganDetail({ id, detail, diameter, selected, onPick, fallback }: { id: string; detail: Detail; diameter: number; selected: boolean; onPick: (id: string) => void; fallback: ReactNode }) {
  return <ModelErrorBoundary key={`${id}-${detail}`} fallback={fallback}><Suspense fallback={fallback}>
    <group onClick={e => { e.stopPropagation(); onPick(id); }}><ReviewedOrgan id={id} detail={detail} diameter={diameter} selected={selected} /></group>
  </Suspense></ModelErrorBoundary>;
}
