import { useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Mesh } from 'three';
import type { Detail } from './LabOrgans';
import { AnatomyAssetBoundary } from './AnatomyAssetBoundary';
import { anatomyAssetUrl } from '../anatomyAssets';

/** Versioned Blender asset, in the same centimetre/body frame as LabBody. */
export function LabSkeletonPilot({ detail, onPick }: {
  detail: Detail; onPick: (id: string) => void; fallback: ReactNode;
}) {
  return <AnatomyAssetBoundary url={anatomyAssetUrl('skeleton', detail)}><Loaded detail={detail} onPick={onPick} /></AnatomyAssetBoundary>;
}
function Loaded({ detail, onPick }: { detail: Detail; onPick: (id: string) => void }) {
  const { scene } = useGLTF(anatomyAssetUrl('skeleton', detail));
  const copy = useMemo(() => {
    const model = scene.clone(true);
    model.traverse(node => {
      if ((node as Mesh).isMesh) node.castShadow = detail === 'ultra';
    });
    return model;
  }, [scene, detail]);
  return <group onClick={e => { e.stopPropagation(); onPick('skeleton'); }}>
    <primitive object={copy} dispose={null} />
  </group>;
}
