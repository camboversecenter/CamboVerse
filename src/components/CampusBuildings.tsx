import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh,
  Matrix4, Quaternion, Vector3,
} from "three";
import { Text, Instances, Instance } from "@react-three/drei";
import {
  paveTexture, glazingTexture, roofTexture, signTexture, radialPaveTexture,
} from "../lib/campusTexture";

/**
 * The building kit for the NUM International Campus — hipped metal roofs, a
 * glazed great hall under a deep overhang, long white teaching blocks, the
 * entrance monument, a Khmer shrine, and the parking canopies.
 *
 * Everything is procedural: boxes, planes and a few custom roof geometries with
 * canvas-drawn textures. Nothing is downloaded, and the whole campus stays
 * inside the low-end-phone budget.
 */

/* ------------------------------------------------------------- geometry --- */

/**
 * A hipped roof over a `w × d` footprint: two long slopes meeting at a ridge,
 * closed by a triangular hip at each end. When the plan is square the ridge
 * collapses to a point and it becomes a pyramid — which is what the great hall
 * has. `overhang` extends the eaves out past the walls.
 */
export function hippedRoofGeometry(w: number, d: number, h: number, overhang = 0): BufferGeometry {
  const W = w + overhang * 2;
  const D = d + overhang * 2;
  const ridge = Math.max(0, W - D) / 2; // half the ridge length along x
  const hx = W / 2;
  const hz = D / 2;

  // eave corners (y=0) then the two ridge points (y=h)
  const v = [
    [-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz],
    [-ridge, h, 0], [ridge, h, 0],
  ];
  const faces = [
    [0, 1, 5], [0, 5, 4],   // back slope
    [2, 3, 4], [2, 4, 5],   // front slope
    [1, 2, 5],              // right hip
    [3, 0, 4],              // left hip
  ];
  const pos: number[] = [];
  for (const f of faces) for (const i of f) pos.push(v[i][0], v[i][1], v[i][2]);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  // simple planar UVs so the ribbed roofing runs down the slope
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 6, pos[i + 2] / 6);
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** A pitched gable end (the small decorative pediment over an entrance). */
function gableGeometry(w: number, h: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(
    [-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0], 3,
  ));
  g.setAttribute("uv", new Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  g.computeVertexNormals();
  return g;
}

/* --------------------------------------------------------------- pieces --- */

/** The tall slender finial that crowns a Khmer roof. */
function Finial({ height = 4, color = "#f2efe6" }: { height?: number; color?: string }) {
  return (
    <group>
      <mesh castShadow>
        <coneGeometry args={[0.28, height * 0.62, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, height * 0.45, 0]} castShadow>
        <coneGeometry args={[0.12, height * 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, height * 0.72, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#d8b24a" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

/**
 * The **Great Hall** — the campus's landmark.
 *
 * Re-measured from the Center's drone photographs (July 2026). Two corrections
 * to the earlier version, both of which change how the building reads:
 *
 * - The glazed box does **not** run the full height. It stops at `wall`, and
 *   above it is an open, shaded storey (`clear`) you see straight through
 *   between the colonnade posts. Previously the glass went all the way up to
 *   the soffit, which flattened the facade.
 * - The eave cantilevers about **6 m** past the glass, not 4.5 — the deep white
 *   fascia floating well clear of the wall is the building's signature.
 *
 * The 34 colonnade posts and the 6 rooftop plant units are instanced, so the
 * whole hall costs roughly a dozen draw calls instead of fifty.
 */
export function GreatHall({
  w = 32, d = 50, wall = 10.5, clear = 4.5, roof = 8,
  position = [0, 0, 0] as [number, number, number], rotation = 0,
}) {
  const glass = useMemo(() => glazingTexture(28), []);
  const roofTex = useMemo(() => roofTexture("#b23a34", 52, [8, 4]), []);
  const over = 6;                       // eave cantilever past the glazed box
  const post = wall + clear;            // colonnade posts run the full height
  const roofGeo = useMemo(() => hippedRoofGeometry(w, d, roof, over), [w, d, roof]);
  const gable = useMemo(() => gableGeometry(9, 6.2), []);
  const eaveY = 0.7 + post;

  // Posts stand outboard of the glass on a 2.9 m rhythm, so the glazed box is
  // read *behind* a colonnade rather than flush with it.
  const colonnade = useMemo(() => {
    const bay = 2.9;
    const cx = w / 2 + 2.2;
    const cz = d / 2 + 2.2;
    const nx = Math.round((cx * 2) / bay);
    const nz = Math.round((cz * 2) / bay);
    const items: Placement[] = [];
    for (let i = 0; i <= nx; i++) {
      const x = -cx + (i * cx * 2) / nx;
      items.push({ pos: [x, 0.7 + post / 2, cz] }, { pos: [x, 0.7 + post / 2, -cz] });
    }
    for (let i = 1; i < nz; i++) {
      const z = -cz + (i * cz * 2) / nz;
      items.push({ pos: [cx, 0.7 + post / 2, z] }, { pos: [-cx, 0.7 + post / 2, z] });
    }
    return items;
  }, [w, d, post]);

  // Six plant enclosures in the offset cross the photographs show.
  const plant = useMemo<Placement[]>(() => {
    const y = 0.7 + post + 1.9;
    return [
      { pos: [-6.5, y, 4.5] }, { pos: [0, y, 4.5] }, { pos: [6.5, y, 4.5] },
      { pos: [-3.2, y, 8.4] }, { pos: [3.2, y, 8.4] }, { pos: [0, y, 0.6] },
    ];
  }, [post]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* plinth, with the bright turf apron that rings the glass */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 11, 0.7, d + 11]} />
        <meshStandardMaterial color="#cdc9c0" roughness={1} />
      </mesh>
      <mesh position={[0, 0.72, 0]} receiveShadow>
        <boxGeometry args={[w + 5.5, 0.06, d + 5.5]} />
        <meshStandardMaterial color="#5f8e44" roughness={1} />
      </mesh>

      {/* glazed volume — stops well short of the soffit */}
      <mesh position={[0, 0.7 + wall / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, wall, d]} />
        <meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} />
      </mesh>

      {/* the open shaded storey above it, seen through the colonnade */}
      <mesh position={[0, 0.7 + wall + clear / 2, 0]}>
        <boxGeometry args={[w - 1.2, clear, d - 1.2]} />
        <meshStandardMaterial color="#1c2022" roughness={0.95} />
      </mesh>

      {/* white colonnade carrying the overhang — one draw call */}
      <Props items={colonnade}>
        <boxGeometry args={[0.36, post, 0.36]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.7} />
      </Props>

      {/* fascia band, then the very deep hipped roof */}
      <mesh position={[0, eaveY + 0.55, 0]} castShadow>
        <boxGeometry args={[w + over * 2 + 0.6, 1.1, d + over * 2 + 0.6]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.65} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, eaveY + 1.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={roofTex} roughness={0.55} metalness={0.16} side={DoubleSide} />
      </mesh>

      {/* roof-top plant enclosures — one draw call */}
      <Props items={plant}>
        <boxGeometry args={[2.8, 0.95, 1.8]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.8} />
      </Props>

      {/* Khmer gable astride the ridge: red roof planes, white pierced tympanum,
          needle finial. It sits across the ridge, not as a pyramid cap. */}
      <group position={[0, eaveY + 1.1 + roof - 1.4, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 2.3, 3.1, 0]} rotation={[0, 0, s * 0.42]} castShadow>
            <boxGeometry args={[0.3, 7.2, 5.6]} />
            <meshStandardMaterial color="#b23a34" roughness={0.6} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={gable} position={[0, 0.2, s * 2.6]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow>
            <meshStandardMaterial color="#f4f2ec" roughness={0.7} side={DoubleSide} />
          </mesh>
        ))}
        {/* the pierced tympanum face — the real Khmer motif is below the
            resolution of every reference view, so this stands in for it */}
        <mesh position={[0, 2.2, 2.72]}>
          <ringGeometry args={[0.5, 1.15, 6]} />
          <meshStandardMaterial color="#c9713a" roughness={0.7} side={DoubleSide} />
        </mesh>
        <group position={[0, 6.4, 0]}><Finial height={5.5} /></group>
      </group>

      {/* entrance: polished stone portal, gridded glass canopy, guardians */}
      <group position={[0, 0, d / 2 + 1.1]}>
        <mesh position={[0, 0.7 + wall * 0.62, 0]} castShadow>
          <boxGeometry args={[9.5, wall * 1.24, 1.7]} />
          <meshStandardMaterial color="#6d4a42" roughness={0.42} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.7 + 2.7, 0.5]}>
          <boxGeometry args={[4.6, 5.4, 0.4]} />
          <meshStandardMaterial color="#2f3a40" roughness={0.28} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.7 + 5.6, 3.2]} castShadow>
          <boxGeometry args={[11, 0.24, 5]} />
          <meshStandardMaterial color="#a9c6d4" transparent opacity={0.5} roughness={0.12} metalness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 6.4, 0.7, 3]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[1.1, 1.2, 1.1]} />
              <meshStandardMaterial color="#8d8078" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.85, 0]} castShadow>
              <capsuleGeometry args={[0.4, 1.05, 4, 8]} />
              <meshStandardMaterial color="#9a8d84" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* steps down to the plaza */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.55 - i * 0.18, 4.2 + i * 0.9]} receiveShadow>
            <boxGeometry args={[12 + i * 1.5, 0.2, 1.1]} />
            <meshStandardMaterial color="#b9b4ab" roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ClassroomInterior({ roomW, d, fh }: { roomW: number, d: number, fh: number }) {
  const desks = useMemo(() => {
    const arr = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = -roomW / 2 + 2.5 + row * 1.2;
        const z = -d / 2 + 4.5 + col * 2;
        arr.push([x, 0.7, z]);
      }
    }
    return arr;
  }, [roomW, d]);

  return (
    <group>
      {/* Floor & Ceiling */}
      <mesh position={[0, 0.25, 0]} receiveShadow><boxGeometry args={[roomW, 0.5, d]} /><meshStandardMaterial color="#c2b092" roughness={0.7} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
      <mesh position={[0, fh, 0]} castShadow receiveShadow><boxGeometry args={[roomW, 0.2, d]} /><meshStandardMaterial color="#f0f0f0" roughness={0.9} /></mesh>
      
      {/* Side walls (Solid) */}
      <mesh position={[-roomW / 2 + 0.2, 0.5 + fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.4, fh, d]} /><meshStandardMaterial color="#f2f0ea" roughness={0.85} /></mesh>
      <mesh position={[roomW / 2 - 0.2, 0.5 + fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.4, fh, d]} /><meshStandardMaterial color="#f2f0ea" roughness={0.85} /></mesh>

      {/* Whiteboard on the left wall */}
      <mesh position={[-roomW / 2 + 0.45, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[5, 1.2, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Teacher's Desk */}
      <mesh position={[-roomW / 2 + 1.5, 0.7, 0]} castShadow receiveShadow><boxGeometry args={[0.8, 0.8, 2.5]} /><meshStandardMaterial color="#a17b4c" roughness={0.6} /></mesh>

      {/* Student Desks (Instanced) */}
      <Instances limit={20} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.05, 1.2]} />
        <meshStandardMaterial color="#e6d5b8" roughness={0.7} />
        {desks.map((pos, i) => <Instance key={`desk-${i}`} position={pos as [number, number, number]} />)}
      </Instances>
      
      {/* Student Chairs (Instanced) */}
      <Instances limit={20} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#444" roughness={0.8} />
        {desks.map((pos, i) => <Instance key={`chair-${i}`} position={[pos[0] + 0.8, 0.4, pos[2]] as [number, number, number]} />)}
      </Instances>
    </group>
  );
}

function OfficeInterior({ roomW, d, fh }: { roomW: number, d: number, fh: number }) {
  return (
    <group>
      {/* Floor & Ceiling */}
      <mesh position={[0, 0.25, 0]} receiveShadow><boxGeometry args={[roomW, 0.5, d]} /><meshStandardMaterial color="#9ea6a2" roughness={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
      <mesh position={[0, fh, 0]} castShadow receiveShadow><boxGeometry args={[roomW, 0.2, d]} /><meshStandardMaterial color="#f0f0f0" roughness={0.9} /></mesh>
      
      {/* Side walls (Solid) */}
      <mesh position={[-roomW / 2 + 0.2, 0.5 + fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.4, fh, d]} /><meshStandardMaterial color="#f2f0ea" roughness={0.85} /></mesh>
      <mesh position={[roomW / 2 - 0.2, 0.5 + fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.4, fh, d]} /><meshStandardMaterial color="#f2f0ea" roughness={0.85} /></mesh>

      {/* Executive Desk */}
      <mesh position={[-roomW / 2 + 2.5, 0.75, -2]} castShadow receiveShadow><boxGeometry args={[1.8, 0.8, 0.9]} /><meshStandardMaterial color="#5c3f22" roughness={0.6} /></mesh>
      {/* Executive Chair */}
      <mesh position={[-roomW / 2 + 1.2, 0.6, -2]} castShadow receiveShadow><boxGeometry args={[0.6, 1.2, 0.6]} /><meshStandardMaterial color="#1a1a1a" roughness={0.8} /></mesh>

      {/* Bookshelf */}
      <mesh position={[roomW / 2 - 0.8, 1.2, -d / 2 + 1.5]} castShadow receiveShadow><boxGeometry args={[0.8, 2.4, 3]} /><meshStandardMaterial color="#5c3f22" roughness={0.7} /></mesh>

      {/* Small Meeting Table */}
      <mesh position={[1, 0.7, 3]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.1, 16]} />
        <meshStandardMaterial color="#e0dfdb" roughness={0.5} />
      </mesh>
      <mesh position={[1, 0.35, 3]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.7, 8]} />
        <meshStandardMaterial color="#666" roughness={0.7} />
      </mesh>

      {/* Chairs around meeting table */}
      {[-1, 1].map((cx, i) => (
        <mesh key={`meet-c-${i}`} position={[1 + cx * 1.8, 0.45, 3]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.9, 0.5]} />
          <meshStandardMaterial color="#2d5236" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}


/**
 * A **teaching block** — the long white buildings with red hipped roofs, a
 * central pediment and stair tower.
 */
export function TeachingBlock({
  w = 60, d = 15, floors = 4, position = [0, 0, 0] as [number, number, number], rotation = 0, tower = true,
  onRoomClick
}: any) {
  const fh = 3.5;
  const totalUpperH = (floors - 1) * fh;
  
  const roofTex = useMemo(() => roofTexture("#b23a34", 40, [10, 3]), []);
  const roofGeo = useMemo(() => hippedRoofGeometry(w, d, 4.2, 1.4), [w, d]);
  const gable = useMemo(() => gableGeometry(9, 3.2), []);
  const glass = useMemo(() => glazingTexture(10), []);
  const fdeSignTex = useMemo(() => signTexture("មហាវិទ្យាល័យសេដ្ឋកិច្ចឌីជីថល", "FACULTY OF DIGITAL ECONOMY", { fg: "#ffffff", sub: "#ffffff" }), []);

  const roomW = w / 7;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Plinth */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[w + 2.4, 0.5, d + 2.4]} />
        <meshStandardMaterial color="#cfcbc2" roughness={1} />
      </mesh>

      {/* --- GROUND FLOOR (3 equal sections) --- */}
      {/* Left Wing (Administration Room) */}
      <group 
        position={[-w / 2 + (w / 3) / 2, 0, 0]} 
        onClick={(e) => { e.stopPropagation(); onRoomClick?.('admin'); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Floor (Tan tiles) — raised 0.01 m above plinth top so they never Z-fight */}
        <mesh position={[0, 0.26, 0]} receiveShadow><boxGeometry args={[w / 3 - 0.2, 0.5, d - 0.2]} /><meshStandardMaterial color="#d4c9b8" roughness={0.7} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
        {/* Ceiling (White) */}
        <mesh position={[0, fh, 0]} castShadow receiveShadow><boxGeometry args={[w / 3 - 0.2, 0.2, d - 0.2]} /><meshStandardMaterial color="#f0f0f0" roughness={0.9} /></mesh>
        {/* Back Wall */}
        <mesh position={[0, 0.5 + fh / 2, -d / 2 + 0.3]} castShadow receiveShadow><boxGeometry args={[w / 3 - 0.2, fh, 0.4]} /><meshStandardMaterial color="#e8e5df" roughness={0.5} /></mesh>
        
        {/* Left Side Wall (Solid Outer) */}
        <mesh position={[-w / 6 + 0.3, 0.5 + fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.4, fh, d - 0.2]} /><meshStandardMaterial color="#e0dfdb" roughness={0.9} /></mesh>
        
        {/* Right Side Wall (Inner, with Doorway facing corridor) */}
        <mesh position={[w / 6 - 0.3, 0.5 + fh / 2, -4.3]} castShadow receiveShadow><boxGeometry args={[0.4, fh, 6.2]} /><meshStandardMaterial color="#e0dfdb" roughness={0.9} /></mesh>
        <mesh position={[w / 6 - 0.3, 0.5 + fh / 2, 4.3]} castShadow receiveShadow><boxGeometry args={[0.4, fh, 6.2]} /><meshStandardMaterial color="#e0dfdb" roughness={0.9} /></mesh>
        <mesh position={[w / 6 - 0.3, fh - 0.4, 0]} castShadow receiveShadow><boxGeometry args={[0.4, 0.8, 2.4]} /><meshStandardMaterial color="#e0dfdb" roughness={0.9} /></mesh>
        
        {/* Front Glass Wall (Solid) */}
        <mesh position={[0, 0.5 + fh / 2, d / 2 - 0.2]} castShadow receiveShadow><boxGeometry args={[w / 3 - 0.4, fh, 0.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>
        
        {/* Hanging Ceiling Lights */}
        {[-4, 4].map(lx => (
          <group key={`light-${lx}`} position={[lx, fh - 0.1, 0]}>
            <mesh position={[0, -0.2, 0]}><boxGeometry args={[0.1, 0.4, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, -0.4, 0]}><boxGeometry args={[4, 0.1, 0.8]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} /></mesh>
          </group>
        ))}

        {/* Furniture: Reception Desk (Wood and White) */}
        <group position={[0, 0, -3.5]}>
          {/* Main Desk body */}
          <mesh position={[0, 1.01, 0]} castShadow receiveShadow><boxGeometry args={[5, 1.0, 1.2]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
          {/* Front fascia — starts 0.05 m higher than the body bottom to avoid co-planar Z-fight */}
          <mesh position={[0, 1.08, 0.5]} castShadow receiveShadow><boxGeometry args={[5.2, 1.06, 0.2]} /><meshStandardMaterial color="#a17b4c" roughness={0.6} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
          {/* Computer Monitors */}
          {[-1.2, 1.2].map(x => (
            <group key={x} position={[x, 1.6, 0]}>
              <mesh position={[0, 0, -0.2]} castShadow><boxGeometry args={[0.8, 0.5, 0.05]} /><meshStandardMaterial color="#111" roughness={0.3} /></mesh>
              <mesh position={[0, -0.3, -0.3]} castShadow><boxGeometry args={[0.2, 0.3, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
            </group>
          ))}
          {/* Office Chairs behind desk */}
          {[-1.2, 1.2].map(x => (
            <group key={`chair-${x}`} position={[x, 0.9, -1]}>
              <mesh position={[0, 0, 0]} castShadow receiveShadow><boxGeometry args={[0.6, 0.1, 0.6]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
              <mesh position={[0, 0.4, -0.25]} castShadow receiveShadow><boxGeometry args={[0.6, 0.8, 0.1]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
              <mesh position={[0, -0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[0.05, 0.05, 0.6]} /><meshStandardMaterial color="#555" metalness={0.8} /></mesh>
            </group>
          ))}
        </group>

        {/* Accent Panel behind desk */}
        <mesh position={[0, 2.0, -d / 2 + 0.52]} castShadow><boxGeometry args={[6, 2.5, 0.1]} /><meshStandardMaterial color="#2b3b5c" roughness={0.7} /></mesh>

        {/* Waiting Area: Sofas and Coffee Table */}
        <group position={[-5, 0, 3]}>
          {/* Sofa 1 (Facing center) */}
          <group position={[0, 0.7, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0]} castShadow receiveShadow><boxGeometry args={[3, 0.4, 1.2]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
            <mesh position={[0, 0.5, -0.4]} castShadow receiveShadow><boxGeometry args={[3, 0.8, 0.4]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
            <mesh position={[-1.4, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.2, 0.4, 1.2]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
            <mesh position={[1.4, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.2, 0.4, 1.2]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
          </group>
        </group>
        
        <group position={[5, 0, 3]}>
          {/* Sofa 2 (Facing center) */}
          <group position={[0, 0.7, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0]} castShadow receiveShadow><boxGeometry args={[3, 0.4, 1.2]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
            <mesh position={[0, 0.5, -0.4]} castShadow receiveShadow><boxGeometry args={[3, 0.8, 0.4]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
            <mesh position={[-1.4, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.2, 0.4, 1.2]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
            <mesh position={[1.4, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.2, 0.4, 1.2]} /><meshStandardMaterial color="#4a5d4e" roughness={0.8} /></mesh>
          </group>
        </group>

        {/* Coffee Table — tabletop sits 0.03 m clear of the base top to avoid co-planar Z-fight */}
        <group position={[0, 0, 3]}>
          <mesh position={[0, 0.73, 0]} castShadow receiveShadow><boxGeometry args={[2.5, 0.05, 1.5]} /><meshStandardMaterial color="#111" roughness={0.2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow><boxGeometry args={[2.0, 0.66, 1.0]} /><meshStandardMaterial color="#a17b4c" roughness={0.6} /></mesh>
        </group>

        {/* Potted Plant */}
        <group position={[7, 0.5, -5]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[0.4, 0.3, 0.6]} /><meshStandardMaterial color="#cfcfcf" roughness={0.8} /></mesh>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow><sphereGeometry args={[0.7, 8, 8]} /><meshStandardMaterial color="#3f7a33" roughness={0.9} /></mesh>
        </group>
        <group position={[-7, 0.5, -5]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[0.4, 0.3, 0.6]} /><meshStandardMaterial color="#cfcfcf" roughness={0.8} /></mesh>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow><sphereGeometry args={[0.7, 8, 8]} /><meshStandardMaterial color="#3f7a33" roughness={0.9} /></mesh>
        </group>

        {/* Sign: Administration Room (inside facing out) */}
        <mesh position={[0, fh - 0.5, d / 2 - 0.05]}>
          <boxGeometry args={[4.4, 0.8, 0.1]} />
          <meshStandardMaterial color="#2b3b5c" roughness={0.8} />
          <Text position={[0, 0, 0.06]} fontSize={0.35} color="white" anchorX="center" anchorY="middle">Administration</Text>
        </mesh>
      </group>

      {/* Middle (Open Space): 1/3 width. */}
      {[-w / 2 + w / 3, w / 2 - w / 3].map((cx) => (
        <group key={`col-gf-${cx}`}>
          <mesh position={[cx, 0.5 + fh / 2, d / 2 - 0.5]} castShadow>
            <boxGeometry args={[0.5, fh, 0.5]} />
            <meshStandardMaterial color="#cfcbc2" roughness={1} />
          </mesh>
          <mesh position={[cx, 0.5 + fh / 2, -d / 2 + 0.5]} castShadow>
            <boxGeometry args={[0.5, fh, 0.5]} />
            <meshStandardMaterial color="#cfcbc2" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Faculty of Digital Economy Stage and Slatted Wall */}
      <group 
        position={[0, 0, -d / 2 + 3]}
        onClick={(e) => { e.stopPropagation(); onRoomClick?.('middle'); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Stage Platform */}
        <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
          <boxGeometry args={[w / 3 - 1, 0.8, 4]} />
          <meshStandardMaterial color="#8a8d8f" roughness={0.9} />
        </mesh>
        {/* Steps */}
        <mesh position={[0, 0.2, 2.5]} receiveShadow castShadow>
          <boxGeometry args={[w / 3 - 1, 0.4, 1]} />
          <meshStandardMaterial color="#8a8d8f" roughness={0.9} />
        </mesh>

        {/* Slatted Wooden Backdrop */}
        <group position={[0, 0.8 + (fh - 0.8) / 2, -1.8]}>
          {/* Base backing (optional, to block light slightly or give depth) */}
          <mesh position={[0, 0, -0.1]} castShadow receiveShadow>
            <boxGeometry args={[w / 3 - 1.5, fh - 0.8, 0.1]} />
            <meshStandardMaterial color="#222222" roughness={0.9} />
          </mesh>
          {/* Individual wooden slats */}
          {Array.from({ length: 90 }).map((_, i) => {
            const sx = -(w / 3 - 1.5) / 2 + 0.1 + i * 0.2;
            return (
              <mesh key={`slat-${i}`} position={[sx, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.08, fh - 0.8, 0.1]} />
                <meshStandardMaterial color="#d4a36a" roughness={0.7} />
              </mesh>
            );
          })}

          {/* Signage: Logo and Text */}
          <group position={[0, 0.5, 0.15]}>
            {/* Simple Logo Placeholder */}
            <mesh position={[-4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.6, 0.6, 0.05]} />
              <meshStandardMaterial color="#3b5998" />
            </mesh>
            <mesh position={[-4, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.05]} />
              <meshStandardMaterial color="#d8b24a" />
            </mesh>
            <mesh position={[-4, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.05]} />
              <meshStandardMaterial color="#b23a34" />
            </mesh>
            
            {/* Faculty Text (Rendered as texture to avoid woff2 font loading errors) */}
            <mesh position={[0.5, 0, 0]}>
              <planeGeometry args={[7, 1.8]} />
              <meshStandardMaterial map={fdeSignTex} transparent />
            </mesh>
          </group>
        </group>
      </group>

      {/* Right Wing (CamboVerse Center) */}
      <group 
        position={[w / 2 - (w / 3) / 2, 0, 0]} 
        onClick={(e) => { e.stopPropagation(); onRoomClick?.('camboverse'); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Floor (Tan tiles) — raised 0.01 m above plinth top so they never Z-fight */}
        <mesh position={[0, 0.26, 0]} receiveShadow><boxGeometry args={[w / 3 - 0.2, 0.5, d - 0.2]} /><meshStandardMaterial color="#c2b092" roughness={0.5} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>
        {/* Ceiling (Dark Industrial) */}
        <mesh position={[0, fh, 0]} castShadow receiveShadow><boxGeometry args={[w / 3 - 0.2, 0.2, d - 0.2]} /><meshStandardMaterial color="#3a3a3a" roughness={0.9} /></mesh>
        
        {/* Back Wall (White Marble) */}
        <mesh position={[0, 0.5 + fh / 2, -d / 2 + 0.3]} castShadow receiveShadow><boxGeometry args={[w / 3 - 0.2, fh, 0.4]} /><meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.1} /></mesh>
        {/* Presentation Screen on Back Wall */}
        <mesh position={[0, 2.0, -d / 2 + 0.52]} castShadow><boxGeometry args={[8, 2.0, 0.1]} /><meshStandardMaterial color="#111111" roughness={0.2} /></mesh>

        {/* Left Side Wall (Inner, with Doorway facing corridor) */}
        <mesh position={[-w / 6 + 0.3, 0.5 + fh / 2, -4.3]} castShadow receiveShadow><boxGeometry args={[0.4, fh, 6.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>
        <mesh position={[-w / 6 + 0.3, 0.5 + fh / 2, 4.3]} castShadow receiveShadow><boxGeometry args={[0.4, fh, 6.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>
        <mesh position={[-w / 6 + 0.3, fh - 0.4, 0]} castShadow receiveShadow><boxGeometry args={[0.4, 0.8, 2.4]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>

        {/* Right Side Wall (Outer Glass) */}
        <mesh position={[w / 6 - 0.3, 0.5 + fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.4, fh, d - 0.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>
        
        {/* Front Glass Wall (Solid) */}
        <mesh position={[0, 0.5 + fh / 2, d / 2 - 0.2]} castShadow receiveShadow><boxGeometry args={[w / 3 - 0.4, fh, 0.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>

        {/* Hanging Ceiling Lights */}
        {[-5, 0, 5].map(lx => (
          <group key={`light-${lx}`}>
            {[-3, 3].map(lz => (
              <mesh key={`light-${lx}-${lz}`} position={[lx, fh - 0.2, lz]}><boxGeometry args={[1.8, 0.1, 0.4]} /><meshStandardMaterial color="#111" emissive="#fff" emissiveIntensity={1} /></mesh>
            ))}
          </group>
        ))}
        
        {/* Left Side: Tiered Wooden Seating (Bleachers) */}
        <group position={[-w / 6 + 1.1, 0.5, 1]}>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.4, 8]} /><meshStandardMaterial color="#a88c67" roughness={0.8} /></mesh>
          <mesh position={[-0.4, 0.6, 0]} castShadow receiveShadow><boxGeometry args={[0.8, 0.4, 8]} /><meshStandardMaterial color="#a88c67" roughness={0.8} /></mesh>
        </group>

        {/* Right Side: Low Wooden Cabinets */}
        <mesh position={[w / 6 - 0.8, 0.7, 1]} castShadow receiveShadow><boxGeometry args={[1, 0.6, 8]} /><meshStandardMaterial color="#d4b88a" roughness={0.7} /></mesh>

        {/* Center: U-Shaped Meeting Tables */}
        <group position={[0, 0.8, 0]}>
          <mesh position={[-2.5, 0, 1]} castShadow receiveShadow><boxGeometry args={[1, 0.6, 6]} /><meshStandardMaterial color="#ffffff" roughness={0.5} /></mesh>
          <mesh position={[2.5, 0, 1]} castShadow receiveShadow><boxGeometry args={[1, 0.6, 6]} /><meshStandardMaterial color="#ffffff" roughness={0.5} /></mesh>
          <mesh position={[0, 0, -2.5]} castShadow receiveShadow><boxGeometry args={[6, 0.6, 1]} /><meshStandardMaterial color="#ffffff" roughness={0.5} /></mesh>
        </group>

        {/* Office Chairs around tables */}
        {[-1, 1, 3].map((cz, i) => (
           <group key={`chair-l-${i}`} position={[-3.5, 0.7, cz]} rotation={[0, Math.PI / 2, 0]}>
             <mesh position={[0, -0.1, 0]} castShadow><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#333" /></mesh>
             <mesh position={[0, 0.15, -0.2]} castShadow><boxGeometry args={[0.5, 0.4, 0.05]} /><meshStandardMaterial color="#555" /></mesh>
           </group>
        ))}
        {[-1, 1, 3].map((cz, i) => (
           <group key={`chair-r-${i}`} position={[3.5, 0.7, cz]} rotation={[0, -Math.PI / 2, 0]}>
             <mesh position={[0, -0.1, 0]} castShadow><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#333" /></mesh>
             <mesh position={[0, 0.15, -0.2]} castShadow><boxGeometry args={[0.5, 0.4, 0.05]} /><meshStandardMaterial color="#555" /></mesh>
           </group>
        ))}
        {[-1.5, 0, 1.5].map((cx, i) => (
           <group key={`chair-t-${i}`} position={[cx, 0.7, -1.6]} rotation={[0, 0, 0]}>
             <mesh position={[0, -0.1, 0]} castShadow><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#333" /></mesh>
             <mesh position={[0, 0.15, -0.2]} castShadow><boxGeometry args={[0.5, 0.4, 0.05]} /><meshStandardMaterial color="#555" /></mesh>
           </group>
        ))}
        
        {/* Sign: CamboVerse Center */}
        <mesh position={[0, fh - 0.5, d / 2 - 0.05]}>
          <boxGeometry args={[4.8, 0.8, 0.1]} />
          <meshStandardMaterial color="#2d5236" roughness={0.8} />
          <Text position={[0, 0, 0.06]} fontSize={0.35} color="white" anchorX="center" anchorY="middle">CamboVerse Center</Text>
        </mesh>
      </group>

      {/* Ground Floor Canopy (Front only) */}
      <mesh position={[0, 0.5 + fh, d / 2 + 1]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[w + 0.5, 0.2, 2.4]} />
        <meshStandardMaterial map={roofTex} roughness={0.7} />
      </mesh>

      {/* --- ALL UPPER FLOORS (Fully Modeled) --- */}
      {Array.from({ length: floors - 1 }).map((_, f) => {
        const floorIdx = f + 1; // 1, 2, 3...
        const isOffice = floorIdx % 2 === 0;
        const typePrefix = isOffice ? 'office' : 'class';
        
        return Array.from({ length: 7 }).map((_, i) => {
          const cx = -w / 2 + roomW / 2 + i * roomW;
          return (
            <group 
              key={`${typePrefix}-${floorIdx}-${i}`} 
              position={[cx, 0.5 + floorIdx * fh, 0]}
              onClick={(e) => { e.stopPropagation(); onRoomClick?.(`${typePrefix}-${floorIdx}-${i}`); }}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              {isOffice ? (
                <OfficeInterior roomW={roomW} d={d} fh={fh} />
              ) : (
                <ClassroomInterior roomW={roomW} d={d} fh={fh} />
              )}
              {/* Front & Back Glass Windows */}
              <mesh position={[0, fh / 2, d / 2 - 0.2]} castShadow receiveShadow><boxGeometry args={[roomW - 0.4, fh, 0.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>
              <mesh position={[0, fh / 2, -d / 2 + 0.2]} castShadow receiveShadow><boxGeometry args={[roomW - 0.4, fh, 0.2]} /><meshStandardMaterial map={glass} roughness={0.18} metalness={0.35} transparent opacity={0.6} /></mesh>
            </group>
          );
        });
      })}

      {/* Vertical columns to demarcate the 7 bays visually on the upper floors */}
      {Array.from({ length: 8 }).map((_, i) => {
        const cx = -w / 2 + i * roomW;
        return (
          <group key={`pilaster-${i}`}>
            <mesh position={[cx, 0.5 + fh + totalUpperH / 2, d / 2 + 0.05]} castShadow>
              <boxGeometry args={[0.5, totalUpperH, 0.2]} />
              <meshStandardMaterial color="#e6e3da" roughness={1} />
            </mesh>
            <mesh position={[cx, 0.5 + fh + totalUpperH / 2, -d / 2 - 0.05]} castShadow>
              <boxGeometry args={[0.5, totalUpperH, 0.2]} />
              <meshStandardMaterial color="#e6e3da" roughness={1} />
            </mesh>
          </group>
        );
      })}

      {/* eave band + hipped roof */}
      <mesh position={[0, 0.5 + fh + totalUpperH + 0.25, 0]} castShadow>
        <boxGeometry args={[w + 2.8, 0.5, d + 2.8]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.75} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, 0.5 + fh + totalUpperH + 0.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={roofTex} roughness={0.62} side={DoubleSide} />
      </mesh>

      {/* Roof Finials (Chofa) at the 4 corners of the eave */}
      {[
        [-1, -1, Math.PI / 4],
        [1, -1, -Math.PI / 4],
        [-1, 1, 3 * Math.PI / 4],
        [1, 1, -3 * Math.PI / 4]
      ].map(([sx, sz, rot], i) => (
        <mesh key={`finial-${i}`} position={[(w / 2 + 1.2) * sx, 0.5 + fh + totalUpperH + 1.2, (d / 2 + 1.2) * sz]} rotation={[0, rot, -0.3]} castShadow>
          <coneGeometry args={[0.15, 1.8, 4]} />
          <meshStandardMaterial color="#f6f4ee" roughness={0.8} />
        </mesh>
      ))}

      {/* central pediment (sitting on the roof) */}
      {tower && (
        <group position={[0, 0.5 + fh + totalUpperH + 0.5, d / 2 - 0.5]}>
          <mesh geometry={gable} scale={[0.6, 0.6, 0.6]} position={[0, 0.8, 0]} castShadow>
            <meshStandardMaterial color="#f4f2ec" roughness={0.75} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.8, 0.4]}>
            <circleGeometry args={[0.6, 20]} />
            <meshStandardMaterial color="#d8b24a" roughness={0.5} metalness={0.35} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * The **main gate**: a traditional Khmer roofed structure spanning the entrance
 * avenue, featuring a large central gable, side pavilions for pedestrians, and
 * ornate white pillars, matching the architectural render.
 */
export function MainGate({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const roofTex = useMemo(() => roofTexture("#b23a34", 32, [6, 3]), []);
  const signTex = useMemo(() => signTexture("សាកលវិទ្យាល័យ ជាតិគ្រប់គ្រង", "National University of Management", { fg: "#ffffff", sub: "#e0ded5", bg: "#555b63" }), []);
  
  const mainRoofGeo = useMemo(() => hippedRoofGeometry(15, 6, 5, 1.5), []);
  const sideRoofGeo = useMemo(() => hippedRoofGeometry(4, 4, 2.5, 1), []);
  const mainGable = useMemo(() => gableGeometry(16, 9), []);
  const sideGable = useMemo(() => gableGeometry(4.5, 2.5), []);
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* --- Central Span --- */}
      {/* Inner Main Pillars */}
      {[-7.5, 7.5].map((x) => (
        <group key={`inner-${x}`} position={[x, 0, 0]}>
          <mesh position={[0, 4, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, 8, 2.5]} />
            <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
          </mesh>
          {/* Pillar Capital/Base */}
          <mesh position={[0, 8.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.6, 2.9]} />
            <meshStandardMaterial color="#e8e5dc" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.8, 2.9]} />
            <meshStandardMaterial color="#e8e5dc" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Central Crossbeam */}
      <mesh position={[0, 8.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 1, 3]} />
        <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
      </mesh>

      {/* Hanging Sign */}
      <mesh position={[0, 7.6, 0]} castShadow>
        <boxGeometry args={[11, 1.6, 0.2]} />
        <meshStandardMaterial color="#555b63" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`sign-${s}`} position={[0, 7.6, s * 0.11]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[10.8, 1.4]} />
          <meshStandardMaterial map={signTex} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}

      {/* Main Roof */}
      <mesh position={[0, 9.2, 0]} castShadow>
        <primitive object={mainRoofGeo} attach="geometry" />
        <meshStandardMaterial map={roofTex} roughness={0.9} />
      </mesh>

      {/* Main Front/Back Gables */}
      {[-1, 1].map((s) => (
        <mesh key={`main-gable-${s}`} position={[0, 9.2, s * 4.4]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow>
          <primitive object={mainGable} attach="geometry" />
          <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
        </mesh>
      ))}
      <group position={[0, 18.2, 0]}><Finial height={3.5} /></group>

      {/* --- Side Spans (Pedestrian Gates) --- */}
      {[-11.5, 11.5].map((x) => (
        <group key={`side-${x}`} position={[x, 0, 0]}>
          {/* Outer Pillar */}
          <mesh position={[0, 3, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 6, 2]} />
            <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
          </mesh>
          <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.4, 2.3]} />
            <meshStandardMaterial color="#e8e5dc" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.6, 2.3]} />
            <meshStandardMaterial color="#e8e5dc" roughness={0.9} />
          </mesh>

          {/* Side Crossbeam */}
          <mesh position={[x > 0 ? -2 : 2, 6.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[4, 0.8, 2]} />
            <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
          </mesh>

          {/* Side Roof */}
          <mesh position={[x > 0 ? -1.5 : 1.5, 7, 0]} castShadow>
            <primitive object={sideRoofGeo} attach="geometry" />
            <meshStandardMaterial map={roofTex} roughness={0.9} />
          </mesh>

          {/* Side Gables */}
          {[-1, 1].map((s) => (
            <mesh key={`side-gable-${s}`} position={[x > 0 ? -1.5 : 1.5, 7, s * 2.4]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow>
              <primitive object={sideGable} attach="geometry" />
              <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
            </mesh>
          ))}
          <group position={[x > 0 ? -1.5 : 1.5, 9.5, 0]}><Finial height={2} /></group>
        </group>
      ))}
    </group>
  );
}


/**
 * The **entrance monument**: gold NUM lettering on a dark plinth, on its curved
 * flight of steps between clipped hedges.
 */
/**
 * One straight letter-stroke, as a box whose long axis runs from `from` to
 * `to` (both in the letter's own local X/Y plane — X across, Y up). Rotating
 * a box around Z to align its default X-axis with an arbitrary 2D direction
 * is the same trick `hippedRoofGeometry`'s neighbours use for anything at an
 * angle: build it flat along an axis, then rotate into place.
 */
function Stroke({
  from, to, w, t, color, metalness, roughness,
}: {
  from: [number, number]; to: [number, number]; w: number; t: number;
  color: string; metalness: number; roughness: number;
}) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  return (
    <mesh position={[mx, my, 0]} rotation={[0, 0, angle]} castShadow receiveShadow>
      <boxGeometry args={[len, w, t]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

type LetterProps = { cx: number; h: number; stroke: number; depth: number; baseY: number; color: string };
const GOLD_FINISH = { metalness: 0.75, roughness: 0.18 };

/** A block "N": two uprights and a single diagonal, top-left to bottom-right. */
function LetterN({ cx, h, stroke, depth, baseY, color }: LetterProps) {
  const w = h * 0.62, hw = w / 2, hh = h / 2, my = baseY + hh;
  const p = { t: stroke, depth, color, ...GOLD_FINISH };
  return (
    <group position={[cx, my, 0]}>
      <Stroke from={[-hw + stroke / 2, -hh]} to={[-hw + stroke / 2, hh]} w={stroke} {...p} />
      <Stroke from={[hw - stroke / 2, -hh]} to={[hw - stroke / 2, hh]} w={stroke} {...p} />
      <Stroke from={[-hw + stroke * 0.9, hh - stroke * 0.3]} to={[hw - stroke * 0.9, -hh + stroke * 0.3]} w={stroke} {...p} />
    </group>
  );
}

/** A block "M": two uprights and a V dipping to half height, not to the floor. */
function LetterM({ cx, h, stroke, depth, baseY, color }: LetterProps) {
  const w = h * 0.8, hw = w / 2, hh = h / 2, my = baseY + hh;
  const p = { t: stroke, depth, color, ...GOLD_FINISH };
  return (
    <group position={[cx, my, 0]}>
      <Stroke from={[-hw + stroke / 2, -hh]} to={[-hw + stroke / 2, hh]} w={stroke} {...p} />
      <Stroke from={[hw - stroke / 2, -hh]} to={[hw - stroke / 2, hh]} w={stroke} {...p} />
      <Stroke from={[-hw + stroke * 0.9, hh - stroke * 0.2]} to={[0, 0]} w={stroke} {...p} />
      <Stroke from={[hw - stroke * 0.9, hh - stroke * 0.2]} to={[0, 0]} w={stroke} {...p} />
    </group>
  );
}

/**
 * A block "U": two uprights joined by a curved foot, approximated as short
 * straight segments around an arc — the same stroke width as the uprights, so
 * it reads as one continuous letterform rather than switching techniques
 * partway down.
 */
function LetterU({ cx, h, stroke, depth, baseY, color }: LetterProps) {
  const w = h * 0.58, hw = w / 2, hh = h / 2, my = baseY + hh;
  const curveR = hw - stroke / 2;
  const straightBottomY = -hh + curveR;
  const p = { t: stroke, depth, color, ...GOLD_FINISH };
  const segs = 16;
  const arcPoint = (a: number): [number, number] => [Math.cos(a) * curveR, straightBottomY + Math.sin(a) * curveR];
  return (
    <group position={[cx, my, 0]}>
      <Stroke from={[-hw + stroke / 2, straightBottomY]} to={[-hw + stroke / 2, hh]} w={stroke} {...p} />
      <Stroke from={[hw - stroke / 2, straightBottomY]} to={[hw - stroke / 2, hh]} w={stroke} {...p} />
      {Array.from({ length: segs }, (_, i) => {
        const a0 = Math.PI + (i / segs) * Math.PI;
        const a1 = Math.PI + ((i + 1) / segs) * Math.PI;
        return <Stroke key={i} from={arcPoint(a0)} to={arcPoint(a1)} w={stroke} {...p} />;
      })}
    </group>
  );
}

/**
 * The campus entrance monument: freestanding mirror-gold "NUM" letters
 * standing on a low polished-granite wall reading "INTERNATIONAL CAMPUS", on
 * a circular plaza — radial paving, a near-full ring of curved steps (with a
 * gap for the approach path), and a ring hedge outside that.
 *
 * Rebuilt from drone footage of the real thing (see the campus layout notes):
 * the original version was a flat signboard on a rectangular plinth, which is
 * not what actually stands there. Letters are built from primitives (boxes
 * for the strokes, a curved approximation for the U) rather than a loaded
 * font — no assets, matching everything else on this campus — with a bright
 * low-roughness gold material rather than a true mirror: this scene has no
 * environment map, and adding one reflective surface per letter face would
 * cost far more than the low-end-phone budget allows for a single landmark.
 *
 * Letter height (~5.4 m) and wall height (~1.3 m) come from measuring a
 * person against the letters in one drone frame — a visual estimate, not a
 * survey, in keeping with how every other building here is sourced.
 */
/**
 * One rounded hedge mass: a short run of overlapping flattened hemisphere
 * domes following an arc, so it reads as a dense curved planting bed rather
 * than a single sphere. `angleCenter`/`angleSpan` are in the monument's own
 * angle system (see `FRONT_ANGLE` below); `radius` is the arc the domes sit
 * on; `w`/`h` are the mass's tangential width and height.
 */
export function HedgeMass({
  angleCenter, angleSpan, radius, w, h, domes, hedgeMap,
}: {
  angleCenter: number; angleSpan: number; radius: number; w: number; h: number;
  domes: number; hedgeMap: import("three").Texture;
}) {
  const step = angleSpan / Math.max(1, domes - 1);
  const domeW = w * 1.15; // overlap neighbours so the run reads as one mass
  return (
    <>
      {Array.from({ length: domes }, (_, i) => {
        const a = domes === 1 ? angleCenter : angleCenter - angleSpan / 2 + i * step;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}
            rotation={[0, -a, 0]}
            scale={[domeW / 2, h, domeW / 2]}
            receiveShadow
            castShadow
          >
            <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial map={hedgeMap} color="#7fae3a" roughness={0.95} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * A short brown planter-edge transition at one end of the stair arc: a brief
 * curved segment continuing the stair's own outer radius (so it reads as
 * part of the same sweep, not bolted on), then ONE short chamfered segment
 * angled away from pure-tangent — a corner cut, not a freestanding arm.
 * Deliberately kept small: most of this is meant to end up hidden under the
 * hedge mass that now sits on top of it (see `FrontHedge` below), not to
 * read as a wall in its own right. Solid wedges from the centre out to
 * `radius`, same technique the stair tiers themselves already use (the
 * inner portion is hidden under the stairs and platform).
 *
 * `thetaAtSide` is the stair arc's own end angle on this side (`arcStart` or
 * `arcStart + arcLen`, already in CylinderGeometry's theta convention — see
 * the note above `arcStart`); `side` is +1/-1 and picks which way the curve
 * continues and which way the chamfer angles, so the two calls mirror
 * exactly rather than being hand-tuned separately.
 */
export function StairBorder({
  side, thetaAtSide, radius, height, extraAngle, chamferLen, chamferAngle, color,
}: {
  side: 1 | -1; thetaAtSide: number; radius: number; height: number;
  extraAngle: number; chamferLen: number; chamferAngle: number; color: string;
}) {
  const curveEnd = thetaAtSide + side * extraAngle;
  const thetaStart = Math.min(thetaAtSide, curveEnd);
  // tangent direction of travel at the curve's far end, rotated outward by
  // `chamferAngle` so the short tail cuts at an angle instead of continuing
  // straight out radially — the "chamfered corner" look, not a long arm.
  const tanX = side * Math.cos(curveEnd);
  const tanZ = -side * Math.sin(curveEnd);
  const phi = side * chamferAngle;
  const dirX = tanX * Math.cos(phi) - tanZ * Math.sin(phi);
  const dirZ = tanX * Math.sin(phi) + tanZ * Math.cos(phi);
  const endX = radius * Math.sin(curveEnd);
  const endZ = radius * Math.cos(curveEnd);
  const tailAngle = Math.atan2(-dirZ, dirX);
  const tailCx = endX + (dirX * chamferLen) / 2;
  const tailCz = endZ + (dirZ * chamferLen) / 2;

  return (
    <group>
      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius, height, 24, 1, false, thetaStart, extraAngle]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[tailCx, height / 2, tailCz]} rotation={[0, tailAngle, 0]} receiveShadow castShadow>
        <boxGeometry args={[chamferLen, height, radius * 0.14]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * Profile for the front hedge beds: a fuller trimmed box-shrub profile with steep
 * rounded sides, a broad flattened top, and soft transitions at ground level.
 */
const HEDGE_BED_PROFILE: [number, number][] = [
  [0.00, 0.00],
  [0.02, 0.35],
  [0.06, 0.70],
  [0.12, 0.90],
  [0.22, 0.98],
  [0.35, 1.00],
  [0.65, 1.00],
  [0.78, 0.98],
  [0.88, 0.90],
  [0.94, 0.70],
  [0.98, 0.35],
  [1.00, 0.00],
];

/**
 * Builds one continuous rounded front hedge bed as a single lofted mesh.
 * Sweeps `HEDGE_BED_PROFILE` along a polar arc around the monument origin.
 * Smoothly tapers at both ends to form seamless rounded caps.
 */
function frontHedgeBedGeometry({
  angleStart, angleEnd, innerR, depth, height, angularSegments = 48,
}: {
  angleStart: number; angleEnd: number; innerR: number; depth: number; height: number;
  angularSegments?: number;
}): BufferGeometry {
  const taperAt = (u: number) => {
    const startEase = Math.sin(Math.min(1, u / 0.12) * Math.PI / 2);
    const endEase = Math.sin(Math.min(1, (1 - u) / 0.12) * Math.PI / 2);
    return Math.min(startEase, endEase);
  };

  const crossSegments = HEDGE_BED_PROFILE.length;
  const pos: number[] = [];
  const col: number[] = [];

  for (let i = 0; i <= angularSegments; i++) {
    const u = i / angularSegments;
    const angle = angleStart + (angleEnd - angleStart) * u;
    const taper = taperAt(u);
    for (let j = 0; j < crossSegments; j++) {
      const [rFrac, yFrac] = HEDGE_BED_PROFILE[j];

      // Fine small-scale foliage noise
      const wave1 = Math.sin(i * 1.8) * Math.cos(j * 1.5);
      const wave2 = Math.cos(i * 3.2) * Math.sin(j * 2.8);
      const rJitter = 1 + 0.012 * wave1 + 0.008 * wave2;
      const yJitter = 1 + 0.015 * wave1 + 0.010 * wave2;

      const radius = innerR + rFrac * depth * taper * rJitter;
      const y = yFrac * height * taper * yJitter;

      pos.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

      // Fine tonal variation
      const jitter = 0.90 + 0.10 * Math.sin(i * 1.2) * Math.cos(j * 1.8);
      col.push(jitter, jitter, jitter);
    }
  }

  const idx: number[] = [];
  for (let i = 0; i < angularSegments; i++) {
    for (let j = 0; j < crossSegments - 1; j++) {
      const a = i * crossSegments + j;
      const b = a + 1;
      const c = a + crossSegments;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** One continuous front hedge bed mass. */
function FrontHedgeBed({
  angleStart, angleEnd, innerR, depth, height, color,
}: {
  angleStart: number; angleEnd: number; innerR: number; depth: number; height: number; color: string;
}) {
  const geo = useMemo(
    () => frontHedgeBedGeometry({ angleStart, angleEnd, innerR, depth, height }),
    [angleStart, angleEnd, innerR, depth, height]
  );
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial color={color} vertexColors roughness={0.92} side={DoubleSide} />
    </mesh>
  );
}

export function EntranceMonument({ position = [0, 0, 0] as [number, number, number], rotation = 0, scale = 1.5 }) {
  const radialPave = useMemo(() => radialPaveTexture(), []);

  // Saved Layout Config from 3D Editor
  const PLATFORM_R = 2.8;
  const PLATFORM_THICKNESS = 0.45;
  const platformPos: [number, number, number] = [0, 0.38, 0];

  const STEPS = 3;
  const STEP_W = 0.42;
  const STEP_H = 0.15;
  const STAIR_ARC = (360 * Math.PI) / 180;
  const stairsPos: [number, number, number] = [0, 0.15, 0];

  const WALL_LEN = 3.8;
  const WALL_H = 1.02;
  const WALL_T = 0.55;
  const pedestalPos: [number, number, number] = [-0.02, 0.82, -0.03];

  // Letters are sized off the pedestal's own length (not a fixed constant) so
  // they always read as sitting on the bar instead of overhanging it — 0.72
  // is the same width:pedestal ratio the original hand-tuned proportions had.
  const LETTER_FIT = 0.72;
  const H = (WALL_LEN * LETTER_FIT) / 2.2, GAP = H * 0.1;
  const GOLD = "#C89E2C";
  const STROKE = H * 0.16;
  const wN = H * 0.62, wU = H * 0.58, wM = H * 0.8;
  const totalW = wN + GAP + wU + GAP + wM;
  const xN = -totalW / 2 + wN / 2;
  const xU = xN + wN / 2 + GAP + wU / 2;
  const xM = xU + wU / 2 + GAP + wM / 2;
  const lettersPos: [number, number, number] = [0, pedestalPos[1] + WALL_H / 2 + H / 2 + 0.06, -0.03];

  const hedgesConfig = [
    { id: "hedge_1", innerR: 4.2, depth: 1.8, height: 0.75, arcLength: 2.6, color: "#82B238", pos: [-1.19, 0.05, -1] as [number, number, number], rotY: -0.46, mirror: false },
    { id: "hedge_2", innerR: 4.2, depth: 1.8, height: 0.76, arcLength: 2.7, color: "#82B238", pos: [-1.32, 0, 0.93] as [number, number, number], rotY: 0.87, mirror: false },
    { id: "hedge_3", innerR: 4.2, depth: 1.8, height: 0.76, arcLength: 2.7, color: "#82B238", pos: [1.32, 0, 0.93] as [number, number, number], rotY: -0.87, mirror: true },
    { id: "hedge_4", innerR: 4.2, depth: 1.8, height: 0.75, arcLength: 2.6, color: "#82B238", pos: [1.19, 0.05, -1] as [number, number, number], rotY: 0.46, mirror: true },
  ];

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* 360-Degree Symmetrical Stairs Stack */}
      <group position={stairsPos}>
        {Array.from({ length: STEPS }, (_, i) => (
          <mesh key={i} position={[0, i * STEP_H + STEP_H / 2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[PLATFORM_R + (STEPS - i) * STEP_W, PLATFORM_R + (STEPS - i) * STEP_W, STEP_H, 48, 1, false, 0, STAIR_ARC]} />
            <meshStandardMaterial color="#8A5A43" roughness={1} />
          </mesh>
        ))}
      </group>

      {/* Grey Circular Platform */}
      <group position={platformPos}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLATFORM_THICKNESS / 2 + 0.01, 0]} receiveShadow>
          <circleGeometry args={[PLATFORM_R, 48]} />
          <meshStandardMaterial map={radialPave} color="#cfcdc7" roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[PLATFORM_R, PLATFORM_R, PLATFORM_THICKNESS, 48]} />
          <meshStandardMaterial map={radialPave} color="#cfcdc7" roughness={1} />
        </mesh>
      </group>

      {/* Black Pedestal Wall & Letters */}
      <mesh position={pedestalPos} receiveShadow castShadow>
        <boxGeometry args={[WALL_LEN, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#171717" roughness={0.2} metalness={0.3} />
      </mesh>
      <group position={lettersPos}>
        <LetterN cx={xN} h={H} stroke={STROKE} depth={0.15} baseY={-H / 2} color={GOLD} />
        <LetterU cx={xU} h={H} stroke={STROKE} depth={0.15} baseY={-H / 2} color={GOLD} />
        <LetterM cx={xM} h={H} stroke={STROKE} depth={0.15} baseY={-H / 2} color={GOLD} />
      </group>

      {/* Custom Placed Hedge Beds */}
      {hedgesConfig.map((h) => {
        const midR = h.innerR + h.depth / 2;
        const span = h.arcLength / midR;
        return (
          <group key={h.id} position={h.pos} rotation={[0, h.rotY, 0]} scale={[h.mirror ? -1 : 1, 1, 1]}>
            <FrontHedgeBed
              angleStart={0}
              angleEnd={span}
              innerR={h.innerR}
              depth={h.depth}
              height={h.height}
              color={h.color}
            />
          </group>
        );
      })}
    </group>
  );
}

/** The small white Khmer shrine standing in the plaza. */
export function Shrine({ position = [0, 0, 0] as [number, number, number] }) {
  const tiers = 5;
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.6, 0.5, 4.6]} />
        <meshStandardMaterial color="#e9e6de" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.4, 0.5, 3.4]} />
        <meshStandardMaterial color="#f2efe7" roughness={0.9} />
      </mesh>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * 1.2, 2.2, sz * 1.2]} castShadow>
          <boxGeometry args={[0.28, 2.4, 0.28]} />
          <meshStandardMaterial color="#f4f2ec" roughness={0.8} />
        </mesh>
      )))}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[3.2, 0.35, 3.2]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.8} />
      </mesh>
      {/* tiered spire */}
      {Array.from({ length: tiers }).map((_, i) => {
        const t = i / tiers;
        return (
          <mesh key={i} position={[0, 3.9 + i * 0.62, 0]} castShadow>
            <boxGeometry args={[2.7 - t * 1.9, 0.45, 2.7 - t * 1.9]} />
            <meshStandardMaterial color={i % 2 ? "#d8792f" : "#f4f2ec"} roughness={0.75} />
          </mesh>
        );
      })}
      <group position={[0, 3.9 + tiers * 0.62, 0]}><Finial height={2.6} /></group>
    </group>
  );
}

/** A long parking canopy — a single white shed roof on slim posts. */
export function ParkingCanopy({
  length = 60, width = 11, height = 4.2, position = [0, 0, 0] as [number, number, number], rotation = 0,
}) {
  const posts = Math.max(3, Math.round(length / 9));
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: posts }).map((_, i) => (
        <mesh key={i} position={[(i / (posts - 1) - 0.5) * (length - 4), height / 2, 0]} castShadow>
          <boxGeometry args={[0.3, height, 0.3]} />
          <meshStandardMaterial color="#d9d7d1" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.2, 0]} rotation={[0.06, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.25, width]} />
        <meshStandardMaterial color="#f4f4f1" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Solar panel array in the middle of the roof */}
      <mesh position={[0, height + 0.35, 0]} rotation={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[length * 0.7, 0.1, width * 0.7]} />
        <meshStandardMaterial color="#1f2c3d" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

/** The athletics track and its infield. */
export function SportsField({
  position = [0, 0, 0] as [number, number, number], w = 120, d = 75,
}) {
  const lineW = 0.3; // width of painted lines
  return (
    <group position={position}>
      {/* Paved border */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 14, d + 14]} />
        <meshStandardMaterial color="#b3b0a8" roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

      {/* Grass pitch */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 4, d + 4]} />
        <meshStandardMaterial color="#4a7c32" roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>

      {/* White lines */}
      <group position={[0, 0.06, 0]}>
        {/* Outer boundary */}
        <mesh position={[0, 0, d/2]}><boxGeometry args={[w, 0.02, lineW]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
        <mesh position={[0, 0, -d/2]}><boxGeometry args={[w, 0.02, lineW]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
        <mesh position={[w/2, 0, 0]}><boxGeometry args={[lineW, 0.02, d]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
        <mesh position={[-w/2, 0, 0]}><boxGeometry args={[lineW, 0.02, d]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>

        {/* Center line and circle */}
        <mesh position={[0, 0, 0]}><boxGeometry args={[lineW, 0.02, d]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
        <mesh rotation={[-Math.PI/2, 0, 0]}><ringGeometry args={[9.15 - lineW/2, 9.15 + lineW/2, 32]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
        <mesh rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[0.5, 16]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>

        {/* Penalty and goal boxes */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (w/2 - 16.5/2), 0, 0]}>
            {/* Penalty box (16.5m deep, 40.3m wide) */}
            <mesh position={[0, 0, 40.3/2]}><boxGeometry args={[16.5, 0.02, lineW]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            <mesh position={[0, 0, -40.3/2]}><boxGeometry args={[16.5, 0.02, lineW]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            <mesh position={[-s * 16.5/2, 0, 0]}><boxGeometry args={[lineW, 0.02, 40.3]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            {/* Goal area (5.5m deep, 18.3m wide) */}
            <mesh position={[s * (16.5/2 - 5.5/2), 0, 18.3/2]}><boxGeometry args={[5.5, 0.02, lineW]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            <mesh position={[s * (16.5/2 - 5.5/2), 0, -18.3/2]}><boxGeometry args={[5.5, 0.02, lineW]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            <mesh position={[s * (16.5/2 - 5.5), 0, 0]}><boxGeometry args={[lineW, 0.02, 18.3]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            {/* Penalty mark (11m from goal line) */}
            <mesh position={[s * (16.5/2 - 11), 0, 0]} rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[0.3, 16]}/><meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/></mesh>
            {/* Penalty arc */}
            <mesh position={[s * (16.5/2 - 11), 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <ringGeometry args={[9.15 - lineW/2, 9.15 + lineW/2, 16, 1, s === 1 ? Math.PI - Math.acos(5.5/9.15) : -Math.acos(5.5/9.15), 2 * Math.acos(5.5/9.15)]}/>
              <meshBasicMaterial color="white" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}/>
            </mesh>
          </group>
        ))}
      </group>

      {/* Goals (standard 7.32m x 2.44m) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * w/2, 0, 0]} rotation={[0, s === 1 ? -Math.PI/2 : Math.PI/2, 0]}>
          <mesh position={[0, 2.44, 0]}>
            <boxGeometry args={[7.32 + 0.12, 0.12, 0.12]} />
            <meshStandardMaterial color="#eceae4" roughness={0.8} />
          </mesh>
          {[-3.66, 3.66].map((x) => (
            <mesh key={x} position={[x, 1.22, 0]}>
              <boxGeometry args={[0.12, 2.44, 0.12]} />
              <meshStandardMaterial color="#eceae4" roughness={0.8} />
            </mesh>
          ))}
          {/* Back nets support */}
          {[-3.66, 3.66].map((x) => (
            <mesh key={`net-${x}`} position={[x, 1.22, s * -1]} rotation={[Math.PI / 8 * s, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 2.6]} />
              <meshStandardMaterial color="#eceae4" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* Corner flags */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={`flag-${i}`} position={[sx * w/2, 0, sz * d/2]}>
          <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 1.5]} /><meshStandardMaterial color="white" /></mesh>
          <mesh position={[0.15, 1.35, 0]} castShadow><planeGeometry args={[0.3, 0.2]} /><meshStandardMaterial color="#e04c38" side={DoubleSide} /></mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * A **building under construction** — the bare concrete/steel frame standing
 * next to the finished teaching block in the campus photographs. Columns, floor
 * slabs and a part-clad top storey: the campus as it actually is today, still
 * being built.
 */
export function ConstructionBlock({
  w = 46, d = 18, floors = 5, position = [0, 0, 0] as [number, number, number], rotation = 0,
}) {
  const fh = 3.6;
  const bays = Math.max(3, Math.round(w / 7));
  const ribs = Math.max(2, Math.round(d / 7));
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* floor slabs */}
      {Array.from({ length: floors }).map((_, f) => (
        <mesh key={f} position={[0, 0.4 + f * fh, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.3, d]} />
          <meshStandardMaterial color="#b8b4ac" roughness={1} />
        </mesh>
      ))}
      {/* column grid */}
      {Array.from({ length: bays }).map((_, i) =>
        Array.from({ length: ribs }).map((_, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[
              (i / (bays - 1) - 0.5) * (w - 3),
              0.4 + (floors * fh) / 2,
              (j / (ribs - 1) - 0.5) * (d - 3),
            ]}
            castShadow
          >
            <boxGeometry args={[0.5, floors * fh, 0.5]} />
            <meshStandardMaterial color="#c3bfb6" roughness={1} />
          </mesh>
        )),
      )}
      {/* part-built top storey and a stub of cladding */}
      <mesh position={[w * 0.22, 0.4 + floors * fh + 1.2, 0]} castShadow>
        <boxGeometry args={[w * 0.42, 2.4, d * 0.9]} />
        <meshStandardMaterial color="#9aa0a4" roughness={0.9} metalness={0.15} />
      </mesh>
      {/* scaffold rail along one edge */}
      {Array.from({ length: floors }).map((_, f) => (
        <mesh key={`r${f}`} position={[0, 0.4 + f * fh + 1.1, d / 2]} >
          <boxGeometry args={[w, 0.08, 0.08]} />
          <meshStandardMaterial color="#8a6a3a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------- instanced site props --- */

type Placement = { pos: [number, number, number]; rot?: number; scale?: number };

/** Many identical props in a single draw call (bollards, lamps, kerbs, houses). */
export function Props({
  items, children,
}: {
  items: Placement[];
  children: React.ReactNode;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const s = new Vector3();
    items.forEach((it, i) => {
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      q.setFromAxisAngle(new Vector3(0, 1, 0), it.rot ?? 0);
      const sc = it.scale ?? 1;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, items.length)]} castShadow receiveShadow>
      {children}
    </instancedMesh>
  );
}

/** A paved area (plaza, road, car park). */
export function Paving({
  w, d, position = [0, 0, 0] as [number, number, number], rotation = 0, kind = "pave" as "pave" | "road",
  repeat,
}: {
  w: number; d: number; position?: [number, number, number]; rotation?: number;
  kind?: "pave" | "road"; repeat?: number;
}) {
  const t = useMemo(
    () => (kind === "pave" ? paveTexture(repeat ?? Math.round(Math.max(w, d) / 4)) : roofTexture("#8d8d88", 2, [1, 1])),
    [kind, w, d, repeat],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, rotation]} position={position} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={t} roughness={1} color={kind === "road" ? "#9a9a95" : "#ffffff"} />
    </mesh>
  );
}

/* ----------------------------------------------------------------- pool --- */

/** How the pool is built, in metres. Shared so the campus and the building
 *  page show the same thing. */
export const POOL = {
  /** Width of the paved coping around the water. */
  rim: 1.5,
  /** How far the basin floor sits below the coping. */
  depth: 5,
  /** How far the water surface sits below the coping — the freeboard you see
   *  as a band of tiled wall along the near edge. */
  drop: 0.3,
  /** Thickness of the coping slab. */
  coping: 0.18,
};

/**
 * A swimming pool built as an actual excavated basin — coping, four tiled
 * walls and a floor — rather than a flat rectangle of colour.
 *
 * A single plane has no thickness, so it carries no depth cue and simply
 * vanishes at grazing angles; and where it sat a few centimetres above another
 * flat surface the depth buffer could not separate the two reliably at range,
 * so which one won flipped as the camera moved. Real geometry fixes both: the
 * rim catches light from any direction and the basin reads as a hole in the
 * ground from every angle.
 *
 * `topY` is the height of the coping's top surface, so the caller can sit it
 * on whatever ground stack it has.
 */
export function Pool({ w, d, topY = 0 }: { w: number; d: number; topY?: number }) {
  const RIM = POOL.rim;
  const floorY = topY - POOL.depth;
  const waterY = topY - POOL.drop;
  const wallY = (topY + floorY) / 2;
  return (
    <group>
      {/* Coping: four solid slabs framing the opening. They never overlap the
          water in plan, so there is nothing for the depth buffer to fight over. */}
      {[
        { x: 0, z: -(d + RIM) / 2, sw: w + RIM * 2, sd: RIM },
        { x: 0, z: (d + RIM) / 2, sw: w + RIM * 2, sd: RIM },
        { x: -(w + RIM) / 2, z: 0, sw: RIM, sd: d },
        { x: (w + RIM) / 2, z: 0, sw: RIM, sd: d },
      ].map((s, i) => (
        <mesh key={`cope-${i}`} position={[s.x, topY - POOL.coping / 2, s.z]} castShadow receiveShadow>
          <boxGeometry args={[s.sw, POOL.coping, s.sd]} />
          <meshStandardMaterial color="#cfc9bd" roughness={1} />
        </mesh>
      ))}

      {/* Basin floor — pale tile, so the water reads as lit and shallow. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#8fc9db" roughness={0.55} />
      </mesh>

      {/* The four tiled walls, facing inward. DoubleSide keeps the near wall
          drawn when you look across the pool from outside it. */}
      {[
        { x: 0, z: -d / 2, rot: 0, len: w },
        { x: 0, z: d / 2, rot: Math.PI, len: w },
        { x: -w / 2, z: 0, rot: Math.PI / 2, len: d },
        { x: w / 2, z: 0, rot: -Math.PI / 2, len: d },
      ].map((s, i) => (
        <mesh key={`wall-${i}`} position={[s.x, wallY, s.z]} rotation={[0, s.rot, 0]} receiveShadow>
          <planeGeometry args={[s.len, POOL.depth]} />
          <meshStandardMaterial color="#a8d8e6" roughness={0.5} side={DoubleSide} />
        </mesh>
      ))}

      {/* Water, set below the coping and translucent so the tiled floor shows
          through — that is the cue that makes it a pool and not a blue mat.
          `depthWrite` off stops it occluding the basin behind it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, waterY, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color="#2f7690" roughness={0.3} metalness={0.1}
          transparent opacity={0.72} depthWrite={false} side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
