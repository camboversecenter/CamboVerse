/**
 * The Virtual Farm (កសិដ្ឋាននិម្មិត) — a guided journey through the Khmer rice
 * year (វដ្ដដាំស្រូវ). Rice (ស្រូវ) is the heart of Cambodian life, and its
 * growing cycle sets the rhythm of the village and the festival calendar. Each
 * stage here pairs a traditional step with its tool and a cultural fact; walking
 * the whole cycle earns a Heritage Passport credential.
 *
 * A rice-first starting point — see TODO.md ("Grow the Virtual Farm") for the
 * companion crops, livestock, seasons, and ceremonies the community can add.
 */

/** The visual state of the paddy at a stage (drives the 3D scene). */
export type Field = "bare" | "ploughed" | "seedbed" | "transplanted" | "growing" | "ripe" | "harvested";

export interface FarmStage {
  id: string;
  /** Romanised name. */
  name: string;
  /** Khmer script. */
  khmer: string;
  /** English. */
  english: string;
  emoji: string;
  /** The traditional tool / helper of this step. */
  tool: { khmer: string; roman: string; english: string };
  /** A cultural / educational note. */
  fact: string;
  /** The action the visitor performs. */
  action: string;
  /** Paddy state to render. */
  field: Field;
  /** Accent colour. */
  color: string;
}

export const FARM_STAGES: FarmStage[] = [
  {
    id: "plough",
    name: "Phchuor Sre",
    khmer: "ភ្ជួរស្រែ",
    english: "Ploughing",
    emoji: "🐃",
    tool: { khmer: "នង្គ័ល · ក្របី", roman: "Nongkoal · Krobei", english: "Plough & water buffalo" },
    fact: "As the first monsoon rains soften the earth, farmers flood and plough the paddy behind a water buffalo — the buffalo is the family's most valued partner. The King opens the season nationwide with the Royal Ploughing Ceremony (ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល).",
    action: "Guide the buffalo",
    field: "ploughed",
    color: "#8a6a3a",
  },
  {
    id: "seedbed",
    name: "Bandoh Srov",
    khmer: "បណ្ដុះស្រូវ",
    english: "The Seedbed",
    emoji: "🌱",
    tool: { khmer: "គ្រាប់ស្រូវ", roman: "Kroab Srov", english: "Rice seed" },
    fact: "Rice isn't sown straight into the field. Seed is first raised thickly in a small nursery bed, where the young seedlings grow strong for a month before they are moved. Phka Rumduol — Cambodia's world-famous jasmine rice — begins its life here.",
    action: "Scatter the seed",
    field: "seedbed",
    color: "#5aa03a",
  },
  {
    id: "transplant",
    name: "Stung",
    khmer: "ស្ទូង",
    english: "Transplanting",
    emoji: "🌾",
    tool: { khmer: "ដៃ", roman: "Dai", english: "By hand" },
    fact: "Bent double under the sun, workers push seedlings into the mud one bunch at a time, in neat rows. It is hard, sociable work — whole villages trade labour (ប្រវាស់ដៃ) to plant each other's fields.",
    action: "Plant the seedlings",
    field: "transplanted",
    color: "#4c8a3f",
  },
  {
    id: "water",
    name: "Thae Tuk",
    khmer: "ថែទឹក",
    english: "Tending the Water",
    emoji: "💧",
    tool: { khmer: "ភ្លឺស្រែ", roman: "Phlu Sre", english: "Paddy dikes" },
    fact: "Through the rainy season the crop is nursed: low earthen dikes (ភ្លឺ) hold rain in the paddy, and farmers open and close them to keep the water just right. The whole harvest rides on the timing of the monsoon.",
    action: "Tend the dikes",
    field: "growing",
    color: "#2f8ae0",
  },
  {
    id: "harvest",
    name: "Chrot Srov",
    khmer: "ច្រូតស្រូវ",
    english: "The Harvest",
    emoji: "🌾",
    tool: { khmer: "កណ្ដៀវ", roman: "Kandiev", english: "Sickle" },
    fact: "When the dry season turns the paddy gold, the rice is cut by hand with a curved sickle, gathered into sheaves, and carried in. Harvest is a season of plenty and of gratitude.",
    action: "Cut the rice",
    field: "ripe",
    color: "#e0a92f",
  },
  {
    id: "thresh",
    name: "Bok · Rey",
    khmer: "បោក · រៃ",
    english: "Threshing & Winnowing",
    emoji: "🧺",
    tool: { khmer: "ចង្អេរ", roman: "Chang-e", english: "Winnowing basket" },
    fact: "The grain is beaten from the stalks (បោក), then tossed from a wide woven basket so the breeze carries off the light chaff (រៃ) and the heavy rice falls back — a skill of wind and wrist.",
    action: "Winnow the grain",
    field: "harvested",
    color: "#c8912e",
  },
  {
    id: "store",
    name: "Chang-rok",
    khmer: "ជង្រុក",
    english: "Store & Share",
    emoji: "🏚️",
    tool: { khmer: "ជង្រុកស្រូវ", roman: "Chang-rok Srov", english: "Rice granary" },
    fact: "The clean rice is stored in a raised wooden granary to feed the family through the year — and to become sticky-rice cakes like អន្សម at festivals. Nothing is wasted: straw feeds the buffalo, and the cycle begins again.",
    action: "Fill the granary",
    field: "harvested",
    color: "#a9762e",
  },
];

/** The credential earned for completing the whole rice cycle. */
export const FARM_CREDENTIAL = "farm:rice-cycle";
