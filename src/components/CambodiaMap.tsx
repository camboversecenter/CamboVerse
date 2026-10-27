import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, ExtrudeGeometry, LinearFilter, Shape, ShapeGeometry, SRGBColorSpace } from "three";
import { Line } from "@react-three/drei";
import { CAMBODIA_OUTLINE, projectLatLng } from "../cambodia-outline";
import { CAMBODIA_PROVINCES } from "../cambodia-provinces";
import {
  MEKONG_NORMAL, MEKONG_ULTRA,
  TONLE_SAP_LAKE_NORMAL, TONLE_SAP_LAKE_ULTRA,
  TONLE_SAP_RIVER_NORMAL, TONLE_SAP_RIVER_ULTRA,
} from "../cambodia-water";

/**
 * A cartographic map of Cambodia in the XZ plane (-z is north), built from a
 * real border GeoJSON (simplified in `cambodia-outline.ts`): filled landmass,
 * a coastline/border stroke, the Tonlé Sap lake, and the Mekong + Tonlé Sap
 * rivers all placed by lat/lng via `projectLatLng`. Water geometry is a small
 * offline simplification of Natural Earth 1:10m data, not live hydrology.
 */

const toWorld = (pts: [number, number][], y: number) =>
  pts.map(([lat, lng]) => {
    const [x, z] = projectLatLng(lat, lng);
    return [x, y, z] as [number, number, number];
  });

type MapDetail = "normal" | "ultra";

// This is an *illustrative* shaded-relief treatment, not surveyed elevation.
// The border, provinces, sites and waterways keep their geographic coordinates.
function makeLandTexture(detail: MapDetail, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const size = detail === "ultra" ? 384 : 192;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const image = context.createImageData(size, size);
  const hills = [
    [11.75, 103.35, 1.0, 0.8, 1.0], // southwest uplands
    [12.3, 103.05, 0.65, 0.8, 0.65],
    [13.85, 104.0, 0.85, 0.55, 0.7], // northern uplands
    [13.6, 107.0, 0.85, 0.9, 0.75], // northeast uplands
  ].map(([lat, lng, rx, rz, height]) => {
    const [x, z] = projectLatLng(lat, lng);
    return { x, z, rx, rz, height };
  });
  const relief = (x: number, z: number) => {
    let h = 0;
    for (const hill of hills) {
      const dx = (x - hill.x) / hill.rx;
      const dz = (z - hill.z) / hill.rz;
      h += hill.height * Math.exp(-0.8 * (dx * dx + dz * dz));
    }
    return Math.min(1, h);
  };
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  for (let row = 0; row < size; row++) {
    // Canvas top row corresponds to texture v=1 (CanvasTexture flips on upload).
    const localY = bounds.maxY - row / (size - 1) * (bounds.maxY - bounds.minY);
    const z = -localY;
    for (let col = 0; col < size; col++) {
      const x = bounds.minX + col / (size - 1) * (bounds.maxX - bounds.minX);
      const h = relief(x, z);
      const grain = Math.sin(x * 13.4 + z * 8.1) * Math.sin(z * 17.3 - x * 5.7);
      const broad = Math.sin(x * 2.8 + z * 4.1) * Math.sin(z * 3.7 - x * 1.2);
      const shade = detail === "ultra"
        ? (relief(x - 0.08, z - 0.08) - relief(x + 0.08, z + 0.08)) * 17
        : 0;
      const variation = grain * (detail === "ultra" ? 5 : 2) + broad * 5 + shade;
      const i = (row * size + col) * 4;
      image.data[i] = clamp(137 - h * 46 + variation);
      image.data[i + 1] = clamp(151 - h * 35 + variation);
      image.data[i + 2] = clamp(103 - h * 33 + variation * 0.7);
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

/**
 * Invisible, clickable fill per province (ADM1) a visitor taps a province on
 * the national map to teleport into that province's own map. The meshes are
 * transparent (opacity 0) but still raycast; a hovered province lights up
 * faintly. Site pins sit above these and stop propagation, so tapping a pin
 * enters the site while tapping open land enters the province.
 */
function ProvinceRegions({ onSelect }: { onSelect: (name: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const regions = useMemo(
    () =>
      CAMBODIA_PROVINCES.flatMap((p) =>
        p.rings.map((ring, ri) => {
          const s = new Shape();
          ring.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)));
          s.closePath();
          return { key: `${p.pcode}-${ri}`, name: p.name, shape: s };
        }),
      ),
    [],
  );
  return (
    <group>
      {regions.map((r) => (
        <mesh
          key={r.key}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(r.name);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(r.name);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHover((h) => (h === r.name ? null : h));
            document.body.style.cursor = "auto";
          }}
        >
          <shapeGeometry args={[r.shape]} />
          <meshBasicMaterial
            color="#e8d9a0"
            transparent
            opacity={hover === r.name ? 0.3 : 0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CambodiaMap({ onSelectProvince, detail = "normal" }: { onSelectProvince?: (name: string) => void; detail?: MapDetail }) {
  const lake = detail === "ultra" ? TONLE_SAP_LAKE_ULTRA : TONLE_SAP_LAKE_NORMAL;
  const mekong = detail === "ultra" ? MEKONG_ULTRA : MEKONG_NORMAL;
  const tonleSapRiver = detail === "ultra" ? TONLE_SAP_RIVER_ULTRA : TONLE_SAP_RIVER_NORMAL;
  const shape = useMemo(() => {
    const s = new Shape();
    CAMBODIA_OUTLINE.forEach(([x, z], i) => {
      // mesh is rotated -PI/2 about X, mapping shape (x, y) -> world (x, 0, -y)
      i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z);
    });
    s.closePath();
    return s;
  }, []);

  const landGeometry = useMemo(() => {
    const geometry = new ShapeGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const positions = geometry.getAttribute("position");
    const uvs = geometry.getAttribute("uv");
    for (let i = 0; i < positions.count; i++) {
      uvs.setXY(i,
        (positions.getX(i) - box.min.x) / (box.max.x - box.min.x),
        (positions.getY(i) - box.min.y) / (box.max.y - box.min.y));
    }
    uvs.needsUpdate = true;
    return geometry;
  }, [shape]);
  const bounds = useMemo(() => {
    const box = landGeometry.boundingBox!;
    return { minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y };
  }, [landGeometry]);
  const landTexture = useMemo(() => makeLandTexture(detail, bounds), [detail, bounds]);
  const edgeGeometry = useMemo(() => detail === "ultra"
    ? new ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 1 })
    : null, [detail, shape]);
  useEffect(() => () => landTexture?.dispose(), [landTexture]);
  useEffect(() => () => edgeGeometry?.dispose(), [edgeGeometry]);
  useEffect(() => () => landGeometry.dispose(), [landGeometry]);

  const coast = useMemo(
    () => [...CAMBODIA_OUTLINE, CAMBODIA_OUTLINE[0]].map(([x, z]) => [x, 0.04, z] as [number, number, number]),
    [],
  );

  // Province (ADM1) boundaries each ring closed into a boundary polyline.
  const provinceRings = useMemo(
    () =>
      CAMBODIA_PROVINCES.flatMap((p) =>
        p.rings.map((ring) =>
          [...ring, ring[0]].map(([x, z]) => [x, 0.045, z] as [number, number, number]),
        ),
      ),
    [],
  );

  const tonleSapShape = useMemo(() => {
    const s = new Shape();
    lake.forEach(([lat, lng], i) => {
      const [x, z] = projectLatLng(lat, lng);
      i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z);
    });
    s.closePath();
    return s;
  }, [lake]);
  const lakeShore = useMemo(() => toWorld([...lake, lake[0]], 0.041), [lake]);

  return (
    <group>
      {/* Ultra gets an edge silhouette; the map surface stays level so pins and
          province hit regions retain their existing positions. */}
      {edgeGeometry && (
        <mesh geometry={edgeGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} raycast={() => null}>
          <meshStandardMaterial color="#4b5138" roughness={1} />
        </mesh>
      )}
      <mesh geometry={landGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} raycast={() => null}>
        <meshStandardMaterial map={landTexture} color="#ffffff" roughness={1} />
      </mesh>

      {/* Province (ADM1) boundaries */}
      {provinceRings.map((ring, i) => (
        <Line key={i} points={ring} color="#364733" lineWidth={detail === "ultra" ? 1.2 : 1} transparent opacity={0.58} />
      ))}

      {/* Clickable province fills (teleport to a province map) */}
      {onSelectProvince && <ProvinceRegions onSelect={onSelectProvince} />}

      {/* Coastline / border (drawn over the province lines for a crisp edge) */}
      <Line points={coast} color="#e5dfc5" lineWidth={detail === "ultra" ? 2.5 : 2} transparent opacity={0.9} />

      {/* Natural Earth lake shore. Lake level varies by season; this is a
          generalized reference shape rather than a current shoreline. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <shapeGeometry args={[tonleSapShape]} />
        <meshStandardMaterial color="#4a777b" roughness={0.72} metalness={0.02} />
      </mesh>
      <Line points={lakeShore} color="#98aa8b" lineWidth={detail === "ultra" ? 1.6 : 1.2} transparent opacity={0.65} />

      {/* River centerlines, with muted banks in Ultra. The same waterways
          remain visible in Normal with fewer points and one stroke each. */}
      {detail === "ultra" && <Line points={toWorld(mekong, 0.049)} color="#435f59" lineWidth={3.3} transparent opacity={0.36} />}
      {detail === "ultra" && <Line points={toWorld(tonleSapRiver, 0.049)} color="#435f59" lineWidth={3} transparent opacity={0.36} />}
      <Line points={toWorld(mekong, 0.052)} color="#6a9ca3" lineWidth={detail === "ultra" ? 1.9 : 1.6} transparent opacity={0.95} />
      <Line points={toWorld(tonleSapRiver, 0.052)} color="#6a9ca3" lineWidth={detail === "ultra" ? 1.8 : 1.5} transparent opacity={0.95} />
    </group>
  );
}
