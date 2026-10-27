import { useEffect, useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { DataTexture, LinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from "three";
import type { Detail } from "./LabOrgans";

/**
 * Tiny, tileable surface cues generated on-device. They make a material read
 * as bone, tissue, timber, or ceramic without shipping a texture download or
 * implying that a schematic model is a scan.
 */
export type LabMaterialKind =
  | "muscle" | "lung" | "organ" | "vessel" | "bone" | "skin"
  | "iris" | "retina" | "nerve" | "metal" | "wood" | "ceramic" | "earth" | "water" | "glass";

const MATERIAL: Record<LabMaterialKind, {
  grain: number; mottling: number; bump: number; clearcoat?: number;
  transmission?: number; sheen?: number;
}> = {
  muscle: { grain: 23, mottling: 12, bump: 0.035, clearcoat: 0.4, transmission: 0.15, sheen: 0.4 },
  lung: { grain: 19, mottling: 10, bump: 0.025, clearcoat: 0.2, transmission: 0.15, sheen: 0.4 },
  organ: { grain: 13, mottling: 14, bump: 0.028, clearcoat: 0.5, transmission: 0.08, sheen: 0.25 },
  vessel: { grain: 28, mottling: 8, bump: 0.016, clearcoat: 0.45, sheen: 0.2 },
  bone: { grain: 31, mottling: 17, bump: 0.045 },
  skin: { grain: 37, mottling: 10, bump: 0.018, sheen: 0.18 },
  iris: { grain: 42, mottling: 18, bump: 0.022, sheen: 0.15 },
  retina: { grain: 26, mottling: 13, bump: 0.015, sheen: 0.35 },
  nerve: { grain: 30, mottling: 9, bump: 0.018, sheen: 0.12 },
  metal: { grain: 47, mottling: 8, bump: 0.01 },
  wood: { grain: 19, mottling: 20, bump: 0.028 },
  ceramic: { grain: 53, mottling: 7, bump: 0.012, clearcoat: 0.12 },
  earth: { grain: 17, mottling: 24, bump: 0.035 },
  water: { grain: 14, mottling: 7, bump: 0.012, clearcoat: 0.7, transmission: 0.3 },
  glass: { grain: 61, mottling: 3, bump: 0.004, clearcoat: 1, transmission: 0.9 },
};

function tissueMaps(detail: Detail, kind: LabMaterialKind) {
  const size = detail === "ultra" ? 128 : 64;
  const spec = MATERIAL[kind];
  const colour = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2;
    const v = y / size * Math.PI * 2;
    const mottling = Math.sin(u * 3 + Math.sin(v * 2)) * Math.sin(v * 5 + Math.cos(u));
    const grain = Math.sin(u * spec.grain + 2 * Math.sin(v * 3))
      * Math.sin(v * (spec.grain * 0.45) + Math.cos(u * 5));
    const shade = Math.round(239 + mottling * spec.mottling + grain * 4);
    const height = Math.round(160 + grain * 35 + mottling * 16);
    const i = (y * size + x) * 4;
    colour.set([shade, shade - 3, shade - 2, 255], i);
    relief.set([height, height, height, 255], i);
  }
  const map = new DataTexture(colour, size, size, RGBAFormat);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.magFilter = map.minFilter = LinearFilter;
  map.needsUpdate = true;
  const bump = detail === "ultra" ? new DataTexture(relief, size, size, RGBAFormat) : null;
  if (bump) {
    bump.wrapS = bump.wrapT = RepeatWrapping;
    bump.magFilter = bump.minFilter = LinearFilter;
    bump.needsUpdate = true;
  }
  return { map, bump };
}

type TissueProps = Pick<ThreeElements["meshPhysicalMaterial"],
  "color" | "roughness" | "metalness" | "transparent" | "opacity" | "depthWrite" | "side" | "emissive"
  | "emissiveIntensity" | "sheen" | "sheenColor" | "sheenRoughness" | "clearcoat" | "clearcoatRoughness" | "transmission" | "thickness" | "ior" | "reflectivity">;

export function LabTissueMaterial({ detail, kind, ...props }:
  TissueProps & { detail: Detail; kind: LabMaterialKind }) {
  const maps = useMemo(() => tissueMaps(detail, kind), [detail, kind]);
  useEffect(() => () => { maps.map.dispose(); maps.bump?.dispose(); }, [maps]);
  // Physical-only controls are deliberately omitted from Normal. Its shader is
  // cheaper, and passing them through would falsely imply an Ultra feature.
  const { sheen, sheenColor, sheenRoughness, clearcoat, clearcoatRoughness, transmission, thickness, ior, ...standardProps } = props;
  if (detail === "normal") return <meshStandardMaterial {...standardProps} map={maps.map} />;
  const spec = MATERIAL[kind];
  return <meshPhysicalMaterial {...standardProps} map={maps.map} bumpMap={maps.bump}
    bumpScale={spec.bump}
    clearcoat={clearcoat ?? spec.clearcoat ?? 0}
    clearcoatRoughness={clearcoatRoughness ?? 0.3}
    transmission={transmission ?? spec.transmission ?? 0}
    thickness={thickness ?? 1.2}
    ior={ior}
    sheen={sheen ?? spec.sheen ?? 0}
    sheenRoughness={sheenRoughness ?? 0.6}
    sheenColor={sheenColor ?? (kind === "muscle" || kind === "organ" ? "#ffa8a8" : "#ffd1d1")}
  />;
}
