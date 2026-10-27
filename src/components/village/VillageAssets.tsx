import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh, Mesh, Object3D } from 'three';
import { ASSETS, placements, type AssetName, type VillageMode } from './layout';
function AssetInstances({ name, mode }: { name: AssetName; mode: VillageMode }) {
  const { scene } = useGLTF(`/models/village/${name}-${mode}.glb`, false, false);
  const ref = useRef<InstancedMesh>(null);
  const mesh = useMemo(() => {
    let found: Mesh | undefined;
    scene.traverse(object => { if (object instanceof Mesh) found = object; });
    if (!found) throw new Error(`Village asset missing mesh: ${name}`);
    scene.updateMatrixWorld(true);
    return found;
  }, [scene, name]);
  useLayoutEffect(() => {
    const target = ref.current;
    if (!target) return;
    const dummy = new Object3D();
    placements[name].forEach((p, i) => {
      dummy.position.set(...p.position);
      dummy.rotation.set(0, p.rotation ?? 0, 0);
      dummy.scale.setScalar(p.scale ?? 1);
      dummy.updateMatrix();
      target.setMatrixAt(i, dummy.matrix.clone().multiply(mesh.matrixWorld));
    });
    target.instanceMatrix.needsUpdate = true;
    target.computeBoundingSphere();
  }, [name, mesh]);
  return <instancedMesh ref={ref} args={[mesh.geometry, mesh.material, placements[name].length]} castShadow={mode === 'ultra'} receiveShadow={mode === 'ultra'} dispose={null} />;
}
export function VillageAssets({ mode }: { mode: VillageMode }) {
  return <group>{ASSETS.filter(name => placements[name].length > 0).map(name => <AssetInstances key={`${name}-${mode}`} name={name} mode={mode} />)}</group>;
}
