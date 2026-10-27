import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Group, SphereGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import type { Detail } from "./LabOrgans";
import { LabTissueMaterial } from "./LabTissueMaterial";
import type { LabLayer } from "../lab";

function highlight(isSelected: boolean, anySelected: boolean, isHovered: boolean = false, baseOpacity: number = 1, baseTransparent: boolean = false) {
  const ghost = anySelected && !isSelected;
  return {
    emissive: isSelected ? "#ffd9a0" : (isHovered ? "#3a251a" : "#000000"),
    emissiveIntensity: isSelected ? 0.42 : (isHovered ? 0.15 : 0),
    transparent: ghost || baseTransparent,
    opacity: ghost ? 0.32 : baseOpacity,
    depthWrite: !ghost,
  };
}

export function Eye({
  layer = "whole", detail = "ultra", onPick, selected, knob = 50
}: {
  layer?: LabLayer;
  detail?: Detail;
  onPick?: (partId: string) => void;
  selected?: string | null;
  knob?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(id);
  };
  const hover = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(id);
  };
  const unhover = () => setHovered(null);

  const seg = detail === "ultra" ? 64 : 32;

  // Sclera (Eyeball) - A sphere with a hole cut out of the front for the cornea
  const scleraGeo = useMemo(() => {
    return new SphereGeometry(11, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.85);
  }, [seg]);

  // Cornea - The clear front dome
  const corneaGeo = useMemo(() => {
    const geo = new SphereGeometry(10, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.3);
    geo.translate(0, 0, 3); // push it out a bit to bulge
    geo.rotateX(-Math.PI / 2); // face forward
    return geo;
  }, [seg]);

  // Lens - A flattened sphere
  const lensGeo = useMemo(() => {
    const geo = new SphereGeometry(4.5, seg, seg);
    geo.scale(1, 1, 0.45);
    geo.translate(0, 0, 4);
    return geo;
  }, [seg]);

  // Retina - Inner lining of the back of the eye
  const retinaGeo = useMemo(() => {
    const geo = new SphereGeometry(10.7, seg, seg, 0, Math.PI * 2, Math.PI * 0.5, Math.PI);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [seg]);

  // Optic Nerve - Cylinder out the back
  const nerveGeo = useMemo(() => {
    const geo = new CylinderGeometry(1.8, 1.8, 10, seg);
    geo.rotateX(Math.PI / 2);
    geo.translate(1.5, -2, -14); // slightly offset because optic nerve is not perfectly centered
    return geo;
  }, [seg]);

  // Vitreous Humor - Jelly inside
  const vitreousGeo = useMemo(() => {
    const geo = new SphereGeometry(10.5, seg, seg, 0, Math.PI * 2, Math.PI * 0.3, Math.PI);
    geo.rotateX(-Math.PI / 2);
    geo.scale(1, 1, 0.95);
    return geo;
  }, [seg]);

  const irisGeo = useMemo(() => {
    const pts: Vector2[] = [];
    pts.push(new Vector2(2.0, 0.5)); // inner edge (pupil)
    pts.push(new Vector2(3.0, 1.0)); 
    pts.push(new Vector2(4.5, 0.5)); 
    pts.push(new Vector2(5.5, 0));   // outer edge meeting sclera
    const geo = new LatheGeometry(pts, seg);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, 5.5);
    return geo;
  }, [seg]);

  // Pupil disc
  const pupilRef = useRef<Group>(null);
  const pupilGeo = useMemo(() => {
    const geo = new CylinderGeometry(1, 1, 0.1, seg);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, 6.0); // just behind the cornea, in front of the lens
    return geo;
  }, [seg]);

  useFrame((_, dt) => {
    if (pupilRef.current) {
      // knob = 0 to 100 (light brightness).
      // If 100 (bright light) -> tiny pupil (scale 1.5)
      // If 0 (dark) -> large pupil (scale 4.0)
      const targetScale = 4.0 - (knob / 100) * 2.5; 
      const k = 1 - Math.exp(-dt * 5); // smooth easing
      const currentScale = pupilRef.current.scale.x;
      const nextScale = currentScale + (targetScale - currentScale) * k;
      pupilRef.current.scale.set(nextScale, nextScale, 1);
    }
  });

  const showOuter = layer === "whole";
  const showInner = layer === "cutaway";
  const showOptics = layer === "frame";

  return (
    <group rotation={[0, -Math.PI / 2, 0]}> {/* Turn 90 degrees to face the camera */}
      
      {/* Sclera - Outer white shell */}
      {(showOuter || showInner) && (
        <mesh 
          geometry={scleraGeo} 
          onClick={pick("sclera")} onPointerOver={hover("sclera")} onPointerOut={unhover} 
          castShadow receiveShadow
          rotation={[-Math.PI/2, 0, 0]}
        >
          <LabTissueMaterial detail={detail} kind="ceramic"
            color="#f2f5f7"
            roughness={0.4}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
            {...highlight(selected === "sclera", !!selected, hovered === "sclera")}
            transparent={showInner || (!!selected && selected !== "sclera")}
            opacity={showInner ? 0.15 : ((!!selected && selected !== "sclera") ? 0.32 : 1)}
            depthWrite={!(showInner || (!!selected && selected !== "sclera"))}
            side={DoubleSide}
          />
        </mesh>
      )}

      {/* Cornea - Clear front dome */}
      {(showOuter || showInner) && (
        <mesh 
          geometry={corneaGeo} 
          onClick={pick("cornea")} onPointerOver={hover("cornea")} onPointerOut={unhover} 
          castShadow={false} receiveShadow
        >
          <LabTissueMaterial detail={detail} kind="glass"
            color="#ffffff"
            roughness={0.1}
            transmission={detail === "ultra" ? 0.95 : 0}
            thickness={detail === "ultra" ? 0.5 : 0}
            ior={1.376}
            clearcoat={1.0}
            {...highlight(selected === "cornea", !!selected, hovered === "cornea", detail === "ultra" ? 1 : 0.4, true)}
          />
        </mesh>
      )}

      {/* Iris - Colored part */}
      {(showInner || showOuter) && (
        <mesh 
          geometry={irisGeo} 
          onClick={pick("iris")} onPointerOver={hover("iris")} onPointerOut={unhover}
          castShadow receiveShadow
        >
          <LabTissueMaterial detail={detail} kind="iris"
            color="#477a9e" // A nice blue-grey iris
            roughness={0.7}
            {...highlight(selected === "iris", !!selected, hovered === "iris")}
          />
        </mesh>
      )}

      {/* Pupil - Black hole (represented as a black disc that scales) */}
      {(showInner || showOuter) && (
        <group ref={pupilRef}>
          <mesh geometry={pupilGeo}>
            <meshBasicMaterial color="#050505" />
          </mesh>
        </group>
      )}

      {/* Lens - Crystal clear focusing element */}
      {(showInner || showOptics) && (
        <mesh 
          geometry={lensGeo} 
          onClick={pick("lens")} onPointerOver={hover("lens")} onPointerOut={unhover}
          castShadow
        >
          <LabTissueMaterial detail={detail} kind="glass"
            color="#e3f4f7"
            roughness={0.1}
            transmission={detail === "ultra" ? 0.8 : 0}
            thickness={detail === "ultra" ? 2.0 : 0}
            ior={1.4}
            {...highlight(selected === "lens", !!selected, hovered === "lens", detail === "ultra" ? 1 : 0.6, true)}
          />
        </mesh>
      )}

      {/* Vitreous Humor - Jelly filling */}
      {showInner && (
        <mesh 
          geometry={vitreousGeo} 
          onClick={pick("vitreous")} onPointerOver={hover("vitreous")} onPointerOut={unhover}
        >
          <LabTissueMaterial detail={detail} kind="glass"
            color="#d3eaf2"
            roughness={0.2}
            transmission={detail === "ultra" ? 0.9 : 0}
            {...highlight(selected === "vitreous", !!selected, hovered === "vitreous", detail === "ultra" ? 1 : 0.3, true)}
          />
        </mesh>
      )}

      {/* Retina - Inner screen */}
      {(showInner || showOptics) && (
        <mesh 
          geometry={retinaGeo} 
          onClick={pick("retina")} onPointerOver={hover("retina")} onPointerOut={unhover}
          receiveShadow
        >
          <LabTissueMaterial detail={detail} kind="retina"
            color="#bd524c" // reddish orange
            roughness={0.8}
            sheen={0.5}
            sheenColor="#ffa08c"
            side={DoubleSide}
            {...highlight(selected === "retina", !!selected, hovered === "retina")}
          />
        </mesh>
      )}

      {/* Optic Nerve - Cable to the brain */}
      {(showInner || showOptics) && (
        <mesh 
          geometry={nerveGeo} 
          onClick={pick("optic-nerve")} onPointerOver={hover("optic-nerve")} onPointerOut={unhover}
          castShadow receiveShadow
        >
          <LabTissueMaterial detail={detail} kind="nerve"
            color="#e6dcc8"
            roughness={0.6}
            {...highlight(selected === "optic-nerve", !!selected, hovered === "optic-nerve")}
          />
        </mesh>
      )}
      
    </group>
  );
}
