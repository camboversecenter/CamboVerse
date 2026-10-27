import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { DoubleSide, type Mesh, type MeshStandardMaterial } from "three";
import type { Detail } from "./LabOrgans";
import type { LabLayer } from "../lab";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const ids = ["skin", "ear", "eye", "iris", "pupil", "skull", "brain", "facial-muscles"];
const partId = (name: string) => ids.find((id) => name.replace(/\.\d+$/, '') === `part-${id}` || name.startsWith(`part-${id}-`));
const lessonId = (id?: string) => id === "ear" ? "skin" : id === "iris" || id === "pupil" ? "eye" : id;
type Props = { detail: Detail; layer: LabLayer; selected: string | null;
  onPick: (id: string) => void; fallback: ReactNode };

/** Local Blender head pilot: exterior, muscle and skull/brain learning layers. */
export function LabHeadAnatomyPilot(props: Props) {
  const asset = props.layer === 'whole' ? 'lab-head-reviewed'
    : props.layer === 'cutaway' ? 'lab-head-muscles-v2' : 'lab-head-internal-v2';
  const url = `/models/local/${asset}-${props.detail}.glb?revision=anatomy-2c`;
  return <ModelErrorBoundary key={url} fallback={props.fallback}>
    <Suspense fallback={props.fallback}><LoadedHead key={url} {...props} url={url} /></Suspense>
  </ModelErrorBoundary>;
}

function LoadedHead({ url, detail, layer, selected, onPick }: Props & { url: string }) {
  const { scene } = useGLTF(url, false, false);
  const [hovered, setHovered] = useState<string | null>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = (mesh.material as MeshStandardMaterial).clone();
      (mesh.material as MeshStandardMaterial).side = DoubleSide;
    });
    return clone;
  }, [scene]);
  useEffect(() => () => model.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh) (mesh.material as MeshStandardMaterial).dispose();
  }), [model]);
  useEffect(() => {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const id = partId(mesh.name);
      // Each layer is authored as a complete view: half skin/muscle comparison,
      // or an open skull with brain. Opaque surfaces preserve depth cues.
      mesh.visible = Boolean(id);
      const mat = mesh.material as MeshStandardMaterial;
      const focused = lessonId(id) === selected;
      const ghost = !!selected && !focused;
      mat.opacity = ghost ? .24 : 1;
      mat.transparent = mat.opacity < 1;
      mat.depthWrite = !mat.transparent;
      mat.emissive.set(focused ? "#ffd9a0" : hovered === id ? "#56371d" : "#000000");
      mat.emissiveIntensity = focused ? .28 : .1;
      mesh.castShadow = detail === "ultra" && mesh.visible && !mat.transparent;
      mesh.receiveShadow = detail === "ultra";
      mat.needsUpdate = true;
    });
  }, [model, detail, layer, selected, hovered]);
  return <group name="lab-head-anatomy-blender-pilot" onClick={(event) => {
    const id = lessonId(partId(event.object.name));
    if (id) { event.stopPropagation(); onPick(id); }
  }} onPointerOver={(event) => {
    const id = lessonId(partId(event.object.name));
    if (id) { event.stopPropagation(); setHovered(id); }
  }} onPointerOut={() => setHovered(null)}>
    <primitive object={model} dispose={null} />
  </group>;
}

/** Tiny code-built fallback keeps the lesson available if a local asset is absent. */
export function HeadAnatomyFallback({ layer, onPick }: Pick<Props, "layer" | "onPick">) {
  const inner = layer !== "whole";
  return <group onClick={(event) => { event.stopPropagation(); onPick(inner ? "skull" : "skin"); }}>
    <mesh position={[0, 3, 0]} scale={[.6, 1, .6]}><sphereGeometry args={[10.995, 24, 16]} /><meshStandardMaterial color={inner ? "#c4af82" : "#b26d50"} /></mesh>
    {inner && <mesh position={[0, 7, 0]}><sphereGeometry args={[4.8, 24, 16]} /><meshStandardMaterial color="#a95b5b" /></mesh>}
  </group>;
}
