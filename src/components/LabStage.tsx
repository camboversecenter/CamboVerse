import { useMemo } from "react";
import { Object3D } from "three";
import type { Detail } from "./LabOrgans";

/** A scale-relative display bench. No fetched assets or extra render passes in Normal. */
export function LabStage({ size, span, centre, floor, detail }: {
  size: number; span: number; centre: number; floor: number; detail: Detail;
}) {
  const ultra = detail === "ultra";
  const extent = Math.max(size, span);
  const radius = Math.max(span * 0.68, size * 0.38);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, centre, 0);
    return object;
  }, [centre]);

  return <>
    <primitive object={target} />
    <ambientLight intensity={0.22} />
    <hemisphereLight args={["#dceaf5", "#555048", 0.65]} />
    <directionalLight
      position={[-extent * 0.8, centre + extent * 1.4, extent]}
      target={target} color="#fff0da" intensity={2.5}
      castShadow={ultra} shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-extent} shadow-camera-right={extent}
      shadow-camera-top={extent} shadow-camera-bottom={-extent}
      shadow-camera-near={extent * 0.05} shadow-camera-far={extent * 5}
      shadow-normalBias={extent * 0.001} shadow-bias={-0.0001}
    />
    <directionalLight position={[extent, centre + extent * 0.35, -extent]}
      target={target} intensity={1.2} color="#b9d8f6" />
    <directionalLight position={[extent * 0.5, centre, extent]}
      target={target} intensity={0.35} color="#ffffff" />

    <group name="lab-stage" position={[0, floor, 0]}>
      <mesh receiveShadow={ultra} position={[0, -extent * 0.025, 0]}>
        <cylinderGeometry args={[radius, radius * 1.025, extent * 0.05, ultra ? 96 : 32]} />
        <meshStandardMaterial color="#56656b" roughness={0.62} metalness={0.22} />
      </mesh>
      <mesh position={[0, -extent * 0.057, 0]}>
        <cylinderGeometry args={[radius * 0.96, radius * 0.96, extent * 0.014, ultra ? 96 : 32]} />
        <meshStandardMaterial color="#202e35" roughness={0.36} metalness={0.65} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, extent * 0.0005, 0]}>
        <ringGeometry args={[radius * 0.94, radius * 0.946, ultra ? 96 : 32]} />
        <meshBasicMaterial color="#9eafb0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -extent * 0.066, 0]} receiveShadow={ultra}>
        <planeGeometry args={[extent * 200, extent * 200]} />
        <meshStandardMaterial color="#27353e" roughness={0.92} />
      </mesh>
    </group>
  </>;
}
