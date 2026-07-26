/**
 * Places — several generated buildings composed into somewhere you can walk.
 *
 * A building on its own is a model. A PLACE is buildings positioned relative to
 * each other on shared ground, which is the thing the map can teleport into and
 * a visitor can be inside of. The distinction is small in data and large in
 * effect: everything here is coordinates and counts, and none of it is geometry.
 *
 * The buildings come from `scripts/generate-building.mjs --bare` — bare because
 * a building destined for a place must not carry its own apron and planting;
 * the scene draws one shared ground, and twenty baked forecourts overlapping is
 * both wrong and expensive.
 *
 * Same honesty as the building specs themselves: a place is an INTERPRETATION.
 * The campus below is laid out plausibly around one photographed façade, not
 * surveyed. Nothing here identifies a real institution.
 */

export interface PlacedBuilding {
  /** A `-bare` model under public/models. */
  model: string;
  /** Metres, in the place's own frame. */
  x: number;
  z: number;
  /** Degrees, clockwise from facing +Z. */
  rotation?: number;
}

export interface TreeRow {
  from: [number, number];
  to: [number, number];
  count: number;
  heightM?: number;
  /** Jitter, in metres, so a row does not read as a printed pattern. */
  jitterM?: number;
  seed?: number;
}

export interface Place {
  id: string;
  name: string;
  nameKm?: string;
  blurb: string;
  /** Where the visitor starts, and what they are looking at. */
  camera: { position: [number, number, number]; target: [number, number, number] };
  ground: { color: string; sizeM: number };
  /** Paved areas: forecourts, roads, footpaths. */
  paving: { x: number; z: number; w: number; d: number; color?: string }[];
  lawns: { x: number; z: number; w: number; d: number; kerb?: boolean }[];
  buildings: PlacedBuilding[];
  treeRows: TreeRow[];
  palms: { x: number; z: number; scale?: number; spin?: number }[];
  flagpoles?: { x: number; z: number }[];
  /** Shown to the visitor, because a generated place should say that it is one. */
  provenance: string;
}

export const PLACES: Place[] = [
  {
    id: "institute-campus",
    name: "Institute campus",
    nameKm: "បរិវេណវិទ្យាស្ថាន",
    blurb:
      "A modern Cambodian public campus: a four-storey teaching block with a Khmer tile roof, " +
      "two annexes in the same architectural family, a paved forecourt and young planting.",
    camera: { position: [-46, 8, 74], target: [0, 8, 6] },
    ground: { color: "#8f9a6a", sizeM: 900 },
    paving: [
      { x: 0, z: 34, w: 150, d: 66 },              // the forecourt
      { x: 0, z: 82, w: 150, d: 14, color: "#b9b4ab" }, // the road along the front
      { x: -62, z: 20, w: 26, d: 40 },             // side yard, west
      { x: 62, z: 20, w: 26, d: 40 },              // side yard, east
    ],
    lawns: [
      { x: 0, z: 14, w: 78, d: 13, kerb: true },
      { x: -46, z: 46, w: 30, d: 18, kerb: true },
      { x: 46, z: 46, w: 30, d: 18, kerb: true },
    ],
    buildings: [
      { model: "institute-block-bare", x: 0, z: 0 },
      // The annexes turn inward, which is what makes three buildings read as a
      // campus rather than as three buildings that happen to be near each other.
      { model: "annex-block-bare", x: -62, z: 26, rotation: 90 },
      { model: "annex-block-bare", x: 62, z: 26, rotation: -90 },
    ],
    treeRows: [
      { from: [-36, 21], to: [36, 21], count: 16, heightM: 4.6, jitterM: 0.5, seed: 3 },
      { from: [-40, 30], to: [40, 30], count: 13, heightM: 4.2, jitterM: 0.7, seed: 11 },
      { from: [-70, 62], to: [70, 62], count: 18, heightM: 5.0, jitterM: 0.9, seed: 19 },
    ],
    palms: [
      { x: -44, z: 8, scale: 1.15, spin: 0.4 },
      { x: 44, z: 8, scale: 1.1, spin: 2.1 },
      { x: -78, z: 40, scale: 1.2, spin: 1.2 },
      { x: 78, z: 40, scale: 1.05, spin: 2.8 },
      { x: -30, z: 74, scale: 1.1, spin: 0.7 },
      { x: 30, z: 74, scale: 1.15, spin: 1.9 },
    ],
    flagpoles: [{ x: -4, z: 6 }, { x: 0, z: 6 }, { x: 4, z: 6 }],
    provenance:
      "Generated from a single photograph of the main block. The block's typology is read from " +
      "that photo; the annexes, the layout and the planting are plausible, not surveyed. No real " +
      "institution is represented and no name or emblem is reproduced.",
  },
];

export const placeById = (id: string) => PLACES.find((p) => p.id === id) ?? null;
