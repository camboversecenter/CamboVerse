/**
 * The buildings of CamboVerse.
 *
 * A **building** is a place a visitor can walk up to in a scene and then open a
 * page of its own — its architecture, what happens inside, and why it looks the
 * way it does. The first set is the National University of Management's
 * international campus; the registry is deliberately open so other institutions,
 * schools and public buildings can be added beside them.
 */

export interface Building {
  id: string;
  name: string;
  khmer: string;
  /** One line under the title. */
  english: string;
  /** Which group of buildings this belongs to. */
  site: string;
  /** A couple of paragraphs for the building's page. */
  about: string[];
  /** Short labelled facts shown as a list. */
  facts: { label: string; value: string }[];
  /** Where a visitor stands to see it in the site scene, and which way they face. */
  view: { at: [number, number, number]; yaw: number };
  /**
   * Roughly how tall the building's *mass* is, so its page can frame it — the
   * roof ridge, not the tip of a finial or an aerial. Framing aims the camera
   * at 0.7 × this, so counting a thin spike points it at empty sky.
   */
  heightM: number;
  /** Its widest plan dimension — framing needs the footprint, not just height. */
  spanM: number;
}

export const NUM_SITE = "NUM International Campus";

/**
 * Listed in the order you actually meet them walking the campus: in at the
 * entrance looking north across the lawn to the teaching block, right and east
 * to the car park, the Great Hall standing beside it, then back to the centre.
 */
export const BUILDINGS: Building[] = [
  {
    id: "gate",
    name: "Main Entrance",
    khmer: "ច្រកចូល",
    english: "The campus monument and forecourt",
    site: NUM_SITE,
    about: [
      "The entrance monument carries the university's name in gold on a dark plinth, set on a curved flight of steps between clipped hedges.",
      "Sugar palms (ដើមត្នោត) flank the avenue behind it — Cambodia's national tree, and the shape most people picture when they picture the Cambodian countryside.",
    ],
    facts: [
      { label: "Marks", value: "The head of the entrance avenue" },
      { label: "Planting", value: "Sugar palms, clipped hedge beds" },
    ],
    view: { at: [0, 1.6, 176], yaw: 0 },
    heightM: 3,
    spanM: 26,
  },
  {
    id: "teaching",
    name: "Teaching Block",
    khmer: "អគារសិក្សា",
    english: "Four floors of classrooms",
    site: NUM_SITE,
    about: [
      "The long teaching blocks are the working heart of the campus: four floors of classrooms behind continuous window bands, under the same red hipped roof that ties every building here together.",
      "A central pediment and stair tower breaks the length and marks the entrance, with the university emblem above the door.",
    ],
    facts: [
      { label: "Floors", value: "Four" },
      { label: "Use", value: "Lecture rooms and seminar rooms" },
      { label: "Roof", value: "Red hipped roof, deep eaves" },
    ],
    view: { at: [-6, 1.6, 96], yaw: 0 },
    heightM: 19,
    spanM: 90,
  },
  {
    id: "construction",
    name: "New Block (under construction)",
    khmer: "អគារកំពុងសាងសង់",
    english: "The campus still being built",
    site: NUM_SITE,
    about: [
      "Beside the teaching block stands a bare frame: columns, floor slabs and a part-clad top storey. It is in every photograph of the campus, and leaving it out would make the place look finished when it isn't.",
      "A university campus is never one moment. This block is the campus growing — and when it is finished, this model should be updated to match.",
    ],
    facts: [
      { label: "Status", value: "Structure up, cladding started" },
      { label: "Floors", value: "Five" },
    ],
    view: { at: [-84, 1.6, 78], yaw: 0 },
    heightM: 20,
    spanM: 48,
  },
  {
    id: "parking",
    name: "Parking Canopies",
    khmer: "ចំណតរថយន្ត",
    english: "Shaded car park",
    site: NUM_SITE,
    about: [
      "Three long white canopies shade the car park. In a country where an afternoon dashboard can pass 70 °C, shade is infrastructure, not luxury.",
      "Their thin steel frames and single-slope roofs are the plainest structures on the campus — and a good place to see how much of the site's character comes from the roofs alone.",
    ],
    facts: [
      { label: "Canopies", value: "Three, about 60 m each" },
      { label: "Structure", value: "Steel posts, single-slope roof" },
    ],
    view: { at: [94, 1.6, 136], yaw: 0 },
    heightM: 5,
    spanM: 64,
  },
  {
    id: "hall",
    name: "The Great Hall",
    khmer: "សាលធំ",
    english: "Ceremonial hall and auditorium",
    site: NUM_SITE,
    about: [
      "The campus landmark: a glazed hall standing inside a white colonnade, sheltered by a hipped roof whose eaves cantilever some six metres past the walls and throw them into shade — the oldest trick in tropical architecture, done at scale.",
      "The glazing stops short of the soffit, leaving an open shaded storey you can see straight through between the columns, so the great roof appears to float above the building rather than sit on it.",
      "A Khmer gable and a slender spire ride the ridge, so a thoroughly modern steel-and-glass building still reads unmistakably as Cambodian. Guardian figures flank the stone entrance portal under its glass canopy.",
    ],
    facts: [
      { label: "Use", value: "Graduations, assemblies, guests of honour" },
      { label: "Roof", value: "Hipped, ~6 m overhang, Khmer spire on the ridge" },
      { label: "Walls", value: "Glazing set back behind a colonnade" },
    ],
    view: { at: [96, 1.6, 74], yaw: 0 },
    heightM: 25,
    spanM: 62,
  },
  {
    id: "shrine",
    name: "Campus Shrine",
    khmer: "ខ្ទមទេវតា",
    english: "A Khmer spirit house",
    site: NUM_SITE,
    about: [
      "A small shrine stands in the plaza on its own columns, with a tiered white-and-orange roof rising to a finial. Shrines like this stand outside homes, offices and campuses across Cambodia.",
      "Students leave incense, flowers or a drink here — often before an exam. It is a working part of the campus, not decoration.",
    ],
    facts: [
      { label: "Khmer", value: "ខ្ទមទេវតា — a spirit house" },
      { label: "Offerings", value: "Incense, flowers, fruit" },
    ],
    view: { at: [62, 1.6, 40], yaw: Math.PI },
    heightM: 8,
    spanM: 6,
  },
  {
    id: "field",
    name: "Sports Field",
    khmer: "ទីលានកីឡា",
    english: "Running track and pitch",
    site: NUM_SITE,
    about: [
      "A running track rings the football pitch on the campus's western side — the open ground that every aerial photograph of the campus is framed around.",
      "It is where the campus is loudest: sports days, inter-faculty matches, and the evening runners once the heat drops.",
    ],
    facts: [
      { label: "Track", value: "Six lanes around the pitch" },
      { label: "Use", value: "Football, athletics, ceremonies" },
    ],
    view: { at: [-104, 1.6, 178], yaw: 0 },
    heightM: 3,
    spanM: 88,
  },
];

export function buildingById(id: string): Building | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
