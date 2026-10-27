import { useEffect, useRef, useState } from 'react';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type FashionQuality = 'normal' | 'ultra';
export type FashionLoadState = 'loading' | 'ready' | 'error';

function disposeModel(root: Group) {
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => material.dispose());
  });
}

/** Each mounted tier owns its resources; switching days only recolours the cloth. */
export function FashionDayFigure({ color, quality, onStatus }: {
  color: string; quality: FashionQuality; onStatus: (state: FashionLoadState) => void;
}) {
  const [model, setModel] = useState<{ quality: FashionQuality; root: Group } | null>(null);
  const latestColor = useRef(color);
  latestColor.current = color;
  useEffect(() => {
    let live = true;
    let owned: Group | undefined;
    onStatus('loading');
    new GLTFLoader().load(`/models/fashion/fashion-day-v2-${quality}.glb`, gltf => {
      if (!live) { disposeModel(gltf.scene); return; }
      owned = gltf.scene;
      owned.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = quality === 'ultra';
        object.receiveShadow = quality === 'ultra';
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material instanceof MeshStandardMaterial && material.name.startsWith('day-fabric')) {
            material.color.set(latestColor.current);
            material.roughness = .58;
          }
        });
      });
      setModel({ quality, root: owned });
      onStatus('ready');
    }, undefined, () => { if (live) onStatus('error'); });
    return () => { live = false; if (owned) disposeModel(owned); };
  }, [quality, onStatus]);

  useEffect(() => {
    model?.root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (material instanceof MeshStandardMaterial && material.name.startsWith('day-fabric')) material.color.set(color);
      });
    });
  }, [model, color]);
  return model?.quality === quality ? <primitive object={model.root} position={[0, .1, 0]} dispose={null} /> : null;
}
