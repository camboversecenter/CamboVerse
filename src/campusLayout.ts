/**
 * The NUM campus ground plan — **one source of truth**.
 *
 * Three different things need to agree about where a building is and how big
 * it is: the walkable scene (`BuildingsView`), the camera that a landmark
 * button drops you at (`buildings.ts` → `view`), and the isolated model on the
 * building's own page (`BuildingView`). When each kept its own copy they
 * drifted — pages showed a 45 m teaching block while the campus had a 53 m
 * one, and landmark buttons still pointed at positions from an older layout.
 *
 * So the plan lives here and everything reads from it. This block is the
 * verbatim export of `public/campus-editor.html`: drag the layout there, hit
 * **Export JSON**, and paste the four arrays in below. Nothing else needs
 * touching — viewpoints and page framing are derived, not typed out again.
 */

export type LayoutRect = {
  id: string;
  /** Which component renders it; `pool` is water rather than a component. */
  kind: string;
  position: [number, number, number];
  rotation: number;
  /** Absent for components that take no size prop (gate, monument, shrine). */
  size?: [number, number];
  /** Created in the editor rather than being part of the original campus. */
  added?: boolean;
};

export type LayoutSegment = {
  id: string;
  kind: "road" | "walkway" | "wall";
  widthM: number;
  /** Walls only — how far the segment is extruded upward. */
  heightM?: number;
  from: [number, number];
  to: [number, number];
  added?: boolean;
};

/* ------------------------------------------------------------- the plan --- */

export const CAMPUS_BUILDINGS: LayoutRect[] = [
  { id: "gate", kind: "main-gate", position: [-3, 0, 249], rotation: 3.07 },
  { id: "monument", kind: "monument", position: [-12, 0, 126.5], rotation: 3.142 },
  { id: "teaching", kind: "teaching-block", position: [-16, 0, -90.1], rotation: 0, size: [53, 16.1] },
  { id: "construction", kind: "construction-block", position: [-66, 0, -89.5], rotation: 0, size: [42, 16.1] },
  { id: "parking-0", kind: "parking-canopy", position: [40.1, 0, 91.2], rotation: 1.567, size: [92.5, 12.4] },
  { id: "parking-1", kind: "parking-canopy", position: [59.9, 0, 90.2], rotation: 1.567, size: [79.2, 12.5] },
  { id: "parking-2", kind: "parking-canopy", position: [81.5, 0, 89.7], rotation: 1.567, size: [86.4, 12.5] },
  { id: "hall", kind: "great-hall", position: [63.2, 0, -49.4], rotation: 0, size: [50.3, 76.8] },
  { id: "shrine", kind: "shrine", position: [83.8, 0, 6.3], rotation: 0 },
  { id: "field", kind: "sports-field", position: [-55.7, 0, 79], rotation: 0, size: [120.4, 66] },
  { id: "teaching-block-khmgey", kind: "teaching-block", position: [-56.2, 0, 158], rotation: 0, size: [38.6, 8], added: true },
  { id: "main-gate-dj2hjk", kind: "main-gate", position: [-128.5, 0, 34.6], rotation: -1.58, added: true },
];

export const CAMPUS_POOLS: LayoutRect[] = [
  { id: "pool-ani4gy", kind: "pool", position: [-117.2, 0, -21.1], rotation: 0, size: [30, 93.8], added: true },
];

export const CAMPUS_ROADS: LayoutSegment[] = [
  { id: "avenue-lane-out", kind: "road", widthM: 14, from: [-10, 152], to: [-3, 249] },
  { id: "avenue-walk-l", kind: "walkway", widthM: 2.3, from: [-18, 152.7], to: [-11, 249.7] },
  { id: "avenue-walk-r", kind: "walkway", widthM: 2.3, from: [-3.1, 151.3], to: [3.9, 248.3] },
  { id: "south-perimeter", kind: "road", widthM: 10, from: [-140.1, 148.9], to: [178.7, 145.9] },
  { id: "north-perimeter", kind: "road", widthM: 10, from: [-138.5, -115.6], to: [128.2, -132.5] },
  { id: "west-perimeter", kind: "road", widthM: 9.5, from: [-139, -119.6], to: [-138.5, 154.1] },
  { id: "east-perimeter", kind: "road", widthM: 10, from: [122.7, -138.1], to: [174, 150] },
  { id: "middle-horiz", kind: "road", widthM: 10, from: [-135.5, 35], to: [150.4, 34.5] },
  { id: "central-vert", kind: "road", widthM: 10, from: [20.5, -118.2], to: [21.5, 142.8] },
  { id: "road-jcrjrw", kind: "road", widthM: 10, from: [16.9, -69.5], to: [-90.5, -69] },
  { id: "road-b14lw1", kind: "road", widthM: 10, from: [-95, 33], to: [-95, -112] },
  { id: "road-upcm9l", kind: "road", widthM: 10, from: [101, 39], to: [102.5, 142.4] },
  { id: "road-xlueh9", kind: "road", widthM: 10, from: [17.4, -39.2], to: [-90.1, -39.6], added: true },
];

export const CAMPUS_WALLS: LayoutSegment[] = [
  { id: "wall-ubcfdu", kind: "wall", widthM: 0.5, heightM: 4, from: [-19, 162.7], to: [-12.8, 250.3] },
  { id: "wall-upehtn", kind: "wall", widthM: 0.5, heightM: 4, from: [-0.5, 162.8], to: [6.1, 248.6] },
  { id: "wall-38v12i", kind: "wall", widthM: 0.5, heightM: 4, from: [-1.1, 163.2], to: [183.2, 161.6] },
  { id: "wall-gzpyay", kind: "wall", widthM: 0.5, heightM: 4, from: [182.7, 161.7], to: [129, -137.8] },
  { id: "wall-vsoh40", kind: "wall", widthM: 0.5, heightM: 4, from: [-131, -119.9], to: [130, -138.3] },
  { id: "wall-v939fs", kind: "wall", widthM: 0.5, heightM: 4, from: [-144.9, 164.7], to: [-145.4, -117.9] },
  { id: "wall-psu6uu", kind: "wall", widthM: 0.5, heightM: 4, from: [-144.9, 164.2], to: [-19.4, 164.2] },
];

/* ---------------------------------------------------------------- sizes --- */

/** Plan size for components that take no size prop, so framing still works. */
const KIND_SIZE: Record<string, [number, number]> = {
  "main-gate": [15, 6],
  // The monument is a circular plaza — steps + hedge mounds carry it out to
  // ~16 m, and the palm ring a bit further to ~18 m across (see
  // EntranceMonument's palmR in CampusBuildings.tsx) — which is what
  // planting has to keep clear of and what the page camera has to frame.
  // Square-ish footprint since it's round, not oblong.
  monument: [19, 19],
  shrine: [8, 8],
};

const ALL_RECTS = [...CAMPUS_BUILDINGS, ...CAMPUS_POOLS];

export const layoutById = (id: string): LayoutRect | null =>
  ALL_RECTS.find((b) => b.id === id) ?? null;

export const sizeOf = (b: LayoutRect): [number, number] =>
  b.size ?? KIND_SIZE[b.kind] ?? [10, 10];

/**
 * Registry id → the layout pieces it is actually made of. The car park is one
 * entry on the Buildings page but three canopies on the ground.
 */
const VIEW_MEMBERS: Record<string, string[]> = {
  parking: ["parking-0", "parking-1", "parking-2"],
  "sport-bathroom": ["teaching-block-khmgey"],
  "west-gate": ["main-gate-dj2hjk"],
  pool: ["pool-ani4gy"],
};

/** The layout pieces behind a registry id. */
export const membersOf = (id: string): LayoutRect[] =>
  (VIEW_MEMBERS[id] ?? [id]).map(layoutById).filter((b): b is LayoutRect => b !== null);

/** Axis-aligned plan bounds of everything behind a registry id. */
export function bboxOf(id: string) {
  const parts = membersOf(id);
  if (!parts.length) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, cx: 0, cz: 0, w: 10, d: 10 };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const b of parts) {
    const [w, d] = sizeOf(b);
    // A rotated rectangle's axis-aligned extent.
    const c = Math.abs(Math.cos(b.rotation)), s = Math.abs(Math.sin(b.rotation));
    const hx = (w / 2) * c + (d / 2) * s;
    const hz = (w / 2) * s + (d / 2) * c;
    minX = Math.min(minX, b.position[0] - hx);
    maxX = Math.max(maxX, b.position[0] + hx);
    minZ = Math.min(minZ, b.position[2] - hz);
    maxZ = Math.max(maxZ, b.position[2] + hz);
  }
  return {
    minX, maxX, minZ, maxZ,
    cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
    w: maxX - minX, d: maxZ - minZ,
  };
}

/** Widest plan dimension — what page framing needs. */
export const spanOf = (id: string): number => {
  const bb = bboxOf(id);
  return Math.round(Math.max(bb.w, bb.d));
};

/* ----------------------------------------------------------- viewpoints --- */

type Approach = "south" | "north" | "east" | "west";

/** Standing eye height, matching `FirstPersonControls`. */
export const EYE_HEIGHT_M = 1.65;

/**
 * Which side you walk up to a building from and how far back to stand. Only
 * the *approach* is a judgement call — the actual coordinates come from the
 * plan, so moving a building moves its viewpoint. `eyeY` should be left alone
 * unless a viewpoint genuinely is above ground: the walker is snapped to the
 * terrain at eye height every frame, so a raised value only reads as flying.
 */
const VIEW_HINTS: Record<string, { from: Approach; eyeY?: number; gap?: number }> = {
  gate: { from: "south", gap: 38 },
  monument: { from: "south", gap: 20 },
  // Gaps chosen so the viewer stands clear of the internal road at z ≈ -39.
  // No `eyeY` override: you arrive standing on the ground, not hovering.
  teaching: { from: "south", gap: 51 },
  construction: { from: "south", gap: 49 },
  // Stand east of the pitch rather than out in the middle of it.
  parking: { from: "west", gap: 22 },
  hall: { from: "south", gap: 55 },
  shrine: { from: "south", gap: 13 },
  field: { from: "south", gap: 26 },
  // Approached from inside the campus: south of the bathroom is outside the
  // boundary wall, which would mean looking at it through the wall.
  "sport-bathroom": { from: "north", gap: 24 },
  // Kept short so the viewer stands clear of the north–south road at x ≈ -95.
  "west-gate": { from: "east", gap: 20 },
  pool: { from: "east", gap: 34 },
};

/**
 * Where to stand to see a building, derived from the plan above.
 *
 * `yaw` follows `FirstPersonControls`: forward is `(-sin y, 0, -cos y)`, so
 * yaw 0 looks north (-z), π looks south, π/2 west, -π/2 east.
 */
export function viewpointFor(id: string): { at: [number, number, number]; yaw: number } {
  const bb = bboxOf(id);
  const hint = VIEW_HINTS[id] ?? { from: "south" as Approach };
  const gap = hint.gap ?? 40;
  const y = hint.eyeY ?? EYE_HEIGHT_M;
  switch (hint.from) {
    case "north": return { at: [bb.cx, y, bb.minZ - gap], yaw: Math.PI };
    case "west": return { at: [bb.minX - gap, y, bb.cz], yaw: -Math.PI / 2 };
    case "east": return { at: [bb.maxX + gap, y, bb.cz], yaw: Math.PI / 2 };
    case "south":
    default: return { at: [bb.cx, y, bb.maxZ + gap], yaw: 0 };
  }
}
