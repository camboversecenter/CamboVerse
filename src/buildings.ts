/**
 * The buildings of CamboVerse.
 *
 * A **building** is a place a visitor can walk up to and then open a page of
 * its own — its architecture, what happens inside, and why it looks the way it
 * does. A **site** is a group of buildings you can walk between: a campus, a
 * commune centre, a market square.
 *
 * Both are listed on the 🏛 Buildings page (`BuildingsHome`), which is the only
 * way in. The map carries one button, not one per building — the front page is
 * a map of Cambodia, not a directory.
 *
 * A building may belong to a site or stand alone. A standalone building has no
 * walkable scene; it just gets its page. Either way, adding one is an entry
 * here — see `docs/BUILDINGS.md`.
 *
 * Where each one *stands* is not repeated here: `view` and `spanM` are derived
 * from `campusLayout.ts`, the single source of truth for the ground plan. Move
 * a building in the editor and its landmark viewpoint follows automatically.
 */
import { viewpointFor, spanOf } from "./campusLayout";

export interface Site {
  id: string;
  /** Also the key `Building.site` matches on. */
  name: string;
  khmer: string;
  /** One line under the title on the Buildings page. */
  english: string;
  /** A sentence or two on the directory card. */
  blurb: string;
  /** Said in the scene, because a reconstruction should admit that it is one. */
  provenance: string;
}

export interface Building {
  id: string;
  name: string;
  khmer: string;
  /** One line under the title. */
  english: string;
  /**
   * Which site this belongs to, matched against `Site.name`. `null` means it
   * stands alone: it appears on the Buildings page and has its own page, but
   * there is no walkable scene around it.
   */
  site: string | null;
  /** A couple of paragraphs for the building's page. */
  about: string[];
  /** Short labelled facts shown as a list. */
  facts: { label: string; value: string }[];
  /**
   * Where a visitor stands to see it in the site scene, and which way they
   * face. Ignored for a standalone building.
   */
  view: { at: [number, number, number]; yaw: number };
  /**
   * Roughly how tall the building's *mass* is, so its page can frame it — the
   * roof ridge, not the tip of a finial or an aerial. Framing aims the camera
   * at 0.7 × this, so counting a thin spike points it at empty sky.
   */
  heightM: number;
  /** Its widest plan dimension — framing needs the footprint, not just height. */
  spanM: number;
  /**
   * A glTF under `public/models/` (without the extension) to render instead of
   * a hand-written component — the output of
   * `scripts/generate-building.mjs`, which is the no-3D-skills route in
   * `docs/BUILDINGS.md`. Landmarks are authored as components in
   * `CampusBuildings.tsx` instead; this is for ordinary blocks.
   */
  model?: string;
}

export const NUM_SITE = "NUM International Campus";

export const SITES: Site[] = [
  {
    id: "num",
    name: NUM_SITE,
    khmer: "សាកលវិទ្យាល័យជាតិគ្រប់គ្រង · បរិវេណអន្តរជាតិ",
    english: "The National University of Management's new campus",
    blurb:
      "Walk in past the entrance monument, across the lawn to the teaching block, east to the " +
      "car park and the Great Hall, then back to the shrine at the centre. Seven buildings.",
    provenance:
      "Rebuilt from the CamboVerse Center's own photographs of the campus. The massing and the " +
      "walking route follow the photographs; distances between buildings are plausible rather " +
      "than surveyed.",
  },
];

export const siteByName = (name: string) => SITES.find((s) => s.name === name) ?? null;
export const siteById = (id: string) => SITES.find((s) => s.id === id) ?? null;
/** The buildings standing on a site, in registry order (= walking order). */
export const buildingsOfSite = (name: string) => BUILDINGS.filter((b) => b.site === name);
/** Buildings that belong to no site — a page, but no walkable scene. */
export const standaloneBuildings = () => BUILDINGS.filter((b) => b.site === null);

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
    english: "The gate at the foot of the avenue",
    site: NUM_SITE,
    about: [
      "The campus gate stands at the far end of the entrance avenue, where it meets the public road: square piers carrying a red hipped roof, with the university's name across the beam in Khmer and English.",
      "Sugar palms (ដើមត្នោត) line the avenue running north from it — Cambodia's national tree, and the shape most people picture when they picture the Cambodian countryside.",
    ],
    facts: [
      { label: "Marks", value: "The foot of the entrance avenue" },
      { label: "Sign", value: "សាកលវិទ្យាល័យ ជាតិគ្រប់គ្រង · National University of Management" },
      { label: "Planting", value: "Sugar palms along the avenue" },
    ],
    view: viewpointFor("gate"),
    heightM: 12,
    spanM: spanOf("gate"),
  },
  {
    id: "monument",
    name: "NUM Monument",
    khmer: "ផ្ទាំងស្លាកសាកលវិទ្យាល័យ",
    english: "The name sign at the head of the avenue",
    site: NUM_SITE,
    about: [
      "The entrance monument carries the university's name in gold on a dark plinth, set on a curved flight of steps between clipped hedges.",
      "It stands where the avenue arrives at the campus proper, so it is the thing you actually read on the way in — the gate announces the address, this announces the place.",
    ],
    facts: [
      { label: "Marks", value: "The head of the entrance avenue" },
      { label: "Reads", value: "NUM · INTERNATIONAL CAMPUS" },
      { label: "Planting", value: "Clipped hedge beds either side" },
    ],
    view: viewpointFor("monument"),
    heightM: 3,
    spanM: spanOf("monument"),
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
    view: viewpointFor("teaching"),
    heightM: 19,
    spanM: spanOf("teaching"),
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
    view: viewpointFor("construction"),
    heightM: 20,
    spanM: spanOf("construction"),
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
    view: viewpointFor("parking"),
    heightM: 5,
    spanM: spanOf("parking"),
  },
  {
    id: "hall",
    name: "The Great Hall",
    khmer: "សាលសន្និសិទ សម្ដេចធិបតី",
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
    view: viewpointFor("hall"),
    heightM: 25,
    spanM: spanOf("hall"),
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
    view: viewpointFor("shrine"),
    heightM: 8,
    spanM: spanOf("shrine"),
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
    view: viewpointFor("field"),
    heightM: 3,
    spanM: spanOf("field"),
  },
  {
    id: "sport-bathroom",
    name: "Sport Bathroom",
    khmer: "បង្គន់កីឡា",
    english: "Changing rooms and toilets by the pitch",
    site: NUM_SITE,
    about: [
      "A low single-storey block on the south side of the sports field: toilets and changing rooms for anyone using the pitch and the running track.",
      "It is the least photographed building on any campus and one of the most used. A pitch without one is a pitch people leave early.",
    ],
    facts: [
      { label: "Floors", value: "One" },
      { label: "Serves", value: "The sports field and running track" },
    ],
    view: viewpointFor("sport-bathroom"),
    heightM: 4,
    spanM: spanOf("sport-bathroom"),
  },
  {
    id: "pool",
    name: "Swimming Pool",
    khmer: "អាងហែលទឹក",
    english: "The campus pool",
    site: NUM_SITE,
    about: [
      "A long pool on the western edge of the campus, set in a paved surround between the boundary road and the western buildings.",
      "Its length runs north–south, so lanes sit along the site's grain rather than across it.",
    ],
    facts: [
      { label: "Orientation", value: "Lanes run north–south" },
      { label: "Surround", value: "Paved coping on all four sides" },
    ],
    view: viewpointFor("pool"),
    // The basin is 5 m deep, and its page stands it on the apron rather than
    // sinking it, so that depth is what the page camera has to frame.
    heightM: 5,
    spanM: spanOf("pool"),
  },
  {
    id: "west-gate",
    name: "West Gate",
    khmer: "ច្រកចូលខាងលិច",
    english: "The side entrance on the western road",
    site: NUM_SITE,
    about: [
      "A second gate where the middle east–west road meets the western boundary, facing out onto the perimeter road.",
      "Campuses are rarely entered only by their ceremonial front. This is the everyday way in from the west side of the site.",
    ],
    facts: [
      { label: "Faces", value: "West, onto the perimeter road" },
      { label: "Meets", value: "The middle east–west road" },
    ],
    view: viewpointFor("west-gate"),
    heightM: 6,
    spanM: spanOf("west-gate"),
  },
];

export function buildingById(id: string): Building | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
