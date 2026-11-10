import { useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Mesh } from 'three';
import type { Detail } from './LabOrgans';
import { AnatomyAssetBoundary } from './AnatomyAssetBoundary';
import { anatomyAssetUrl } from '../anatomyAssets';

/** Published Blender teaching illustration; the underlying skin model is unchanged. */
export function LabMusclesPilot({ detail, onPick, fallback }: {
  detail: Detail; onPick: (id: string) => void; fallback: ReactNode;
}) {
  return <AnatomyAssetBoundary url={anatomyAssetUrl('muscles', detail)} fallback={fallback}><Loaded detail={detail} onPick={onPick} /></AnatomyAssetBoundary>;
}
function Loaded({ detail, onPick }: { detail: Detail; onPick: (id: string) => void }) {
  const { scene } = useGLTF(anatomyAssetUrl('muscles', detail));
  const copy = useMemo(() => {
    const model = scene.clone(true);
    model.traverse(node => {
      if ((node as Mesh).isMesh) { node.castShadow = detail === 'ultra'; node.receiveShadow = detail === 'ultra'; }
    });
    return model;
  }, [scene, detail]);
  return <group onClick={e => { e.stopPropagation(); onPick('muscles'); }}><primitive object={copy} dispose={null} /></group>;
}
