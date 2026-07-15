/**
 * Khmer traditional life — 3D artifacts you can inspect up close, in plain view
 * or in VR, with an educational explanation and their everyday uses: everyday
 * objects and tools, and traditional buildings like the Khmer stilt house.
 *
 * Unlike heritage sites (which live on the map), these are self-contained
 * objects. Each carries a `model` (glTF) and points of interest that teach how
 * it works. They're seeded into the Asset registry as commons assets (license/
 * provenance/consent) just like sites — see src/worker/rails.ts.
 */
import type { Poi } from "./spots";

export interface Artifact {
  id: string;
  /** Khmer name. */
  khmer: string;
  /** Romanized name. */
  name: string;
  /** English gloss. */
  english: string;
  /** e.g. "Traditional tool". */
  category: string;
  /** One-line summary. */
  blurb: string;
  /** A fuller educational explanation. */
  story: string;
  /** What it's used for — bullet points for learning. */
  utilities: string[];
  /** Where it comes from / who makes it. */
  origin: string;
  model: string;
  /** Inspect points that teach the object's parts and how it works. */
  pois: Poi[];
}

export const ARTIFACTS: Artifact[] = [
  {
    id: "kaom",
    khmer: "ក្អម",
    name: "K'am",
    english: "Earthenware water pot",
    category: "Traditional tool",
    blurb:
      "A round-bellied terracotta pot that stores drinking water and keeps it naturally cool.",
    story:
      "The ក្អម (k'am) is a traditional Khmer water pot, hand-thrown from clay and fired by village potters. Its magic is simple physics: the fired earthenware is slightly porous, so a little water seeps to the outside and evaporates. Evaporation draws heat away, so the water inside stays cool even in the heat of the dry season — a clay refrigerator, with no electricity. Its round belly holds plenty of water, the narrow neck keeps it clean and slows evaporation to the right amount, and a fitted lid keeps out dust and insects. For generations the k'am has sat in Khmer homes, at pagodas, and beside village paths — offering cool water to family, monks, and passing travellers, a small everyday act of generosity.",
    utilities: [
      "Stores drinking water in the home",
      "Cools the water naturally by evaporation through the clay — no electricity",
      "The narrow neck and lid keep the water clean from dust and insects",
      "Placed at pagodas and roadsides to offer cool water to travellers (an act of merit)",
      "Made by hand from local clay by village potters — a living craft",
    ],
    origin:
      "Hand-made by village potters across Cambodia — Kampong Chhnang province is especially famous for its earthenware.",
    model: "/models/kaom.glb",
    pois: [
      {
        id: "mouth",
        title: "Mouth & neck",
        khmer: "មាត់ក្អម",
        info: "The narrow neck keeps the water clean and slows evaporation to just the right amount. It's sized to dip a cup or coconut ladle, and to seat the lid snugly.",
        target: [0, 1.7, 0],
        camera: [1.7, 2.1, 2.5],
      },
      {
        id: "lid",
        title: "The lid",
        khmer: "គំរប",
        info: "A domed clay lid with a knob finial. It keeps out dust, leaves, and insects, and holds in a little coolness — lifted by the knob when you draw water.",
        target: [0, 2.0, 0],
        camera: [1.5, 2.7, 2.3],
      },
      {
        id: "belly",
        title: "The belly — how it cools",
        khmer: "ពោះក្អម",
        info: "The wide belly holds the water. Fired clay is slightly porous, so a little water seeps out and evaporates; evaporation carries heat away, cooling the water inside. Feel the outside and it is cool and faintly damp.",
        target: [0, 0.9, 0],
        camera: [2.6, 1.4, 3.4],
      },
      {
        id: "base",
        title: "The base",
        khmer: "បាតក្អម",
        info: "The rounded base sits in a woven or clay ring, or nestles into sand, so the pot stands steady. Its shape comes from being turned on a potter's wheel and shaped by hand.",
        target: [0, 0.2, 0],
        camera: [2.0, 0.8, 3.0],
      },
    ],
  },
];

ARTIFACTS.push({
  id: "changkran",
  khmer: "ចង្ក្រាន",
  name: "Changkran",
  english: "Clay cookstove",
  category: "Traditional tool",
  blurb: "A portable fired-clay stove that cooks with charcoal or firewood — the heart of the Khmer kitchen.",
  story:
    "The ចង្ក្រាន (changkran) is the traditional Khmer cookstove: a bucket-shaped pot of fired clay that burns charcoal or firewood. Fuel is fed through an arched mouth at the front, which also lets in air to feed the flames; the fire burns in a chamber inside, and the cooking pot rests on three clay supports on the rim, just above the coals. The thick clay walls soak up the heat and radiate it steadily, so little fuel is wasted, and the whole stove is light enough to carry from kitchen to courtyard to market stall. From family rice pots to bubbling somlar and street-side grills, the changkran has cooked Khmer food for generations — and still does, wherever there is no gas or electricity.",
  utilities: [
    "Cooks food with charcoal or firewood — no gas or electricity",
    "Thick fired-clay walls hold and radiate heat evenly, saving fuel",
    "Portable — carried between kitchen, courtyard, market, and street stall",
    "The front mouth feeds fuel and lets in air to control the heat",
    "Made by hand from local clay by village potters",
  ],
  origin: "Hand-made by village potters across Cambodia; a fixture of home and street-food cooking.",
  model: "/models/changkran.glb",
  pois: [
    {
      id: "mouth",
      title: "The fire mouth",
      khmer: "មាត់ភ្លើង",
      info: "The arched opening at the front. Charcoal or firewood is fed in here, and it also lets in the air that feeds the flames — push fuel in or pull it back to make the fire hotter or gentler.",
      target: [0, 0.5, 1.0],
      camera: [1.7, 1.0, 3.1],
    },
    {
      id: "cradle",
      title: "The pot supports",
      khmer: "ជើងទ្រ",
      info: "Three clay lugs on the rim cradle the cooking pot just above the coals, leaving a gap so heat and smoke can rise around it. The pot sits here, never directly on the fire.",
      target: [0, 1.55, 0],
      camera: [2.0, 2.1, 2.9],
    },
    {
      id: "body",
      title: "The body — how it holds heat",
      khmer: "តួចង្ក្រាន",
      info: "The thick fired-clay walls absorb the fire's heat and radiate it steadily onto the pot, so the stove keeps cooking evenly and wastes little fuel. Yet it stays light enough to pick up and carry.",
      target: [0, 0.8, 0],
      camera: [2.7, 1.3, 3.3],
    },
    {
      id: "pot",
      title: "The cooking pot",
      khmer: "ឆ្នាំង",
      info: "A clay ឆ្នាំង (chnang) rests in the cradle. Clay cooks gently and evenly — ideal for simmering Khmer stews like somlar, steaming rice, or boiling water. Its lid holds in the heat.",
      target: [0, 2.0, 0],
      camera: [1.8, 2.6, 2.9],
    },
  ],
});

ARTIFACTS.push({
  id: "phteah",
  khmer: "ផ្ទះខ្មែរ",
  name: "Phteah Khmer",
  english: "Traditional stilt house",
  category: "Traditional house",
  blurb: "A wooden house raised high on posts, with a steep tiled roof — climate wisdom in timber.",
  story:
    "The traditional Khmer house (ផ្ទះខ្មែរ) is a wooden home raised high on sturdy posts. Standing on stilts keeps the living floor cool with airflow, lifts it above seasonal floods and animals, and opens a shaded space below for work, rest, weaving, and storage. The steep roof — tiled or thatched — sheds the heavy monsoon rain, and wide eaves shade the walls; the ridge ends often curl upward in decorative finials (kbach). Walls are wooden planks with shuttered windows, thrown open for the breeze and closed against storms. A steep staircase climbs to an open veranda — the sociable heart of the home, where guests are received and the family gathers. Built by village carpenters from local hardwood and shaped by Cambodia's tropical climate, the Khmer house is architecture as everyday wisdom. Its forms vary by region and status — styles such as Rong, Keng, Pet, and Kantaing.",
  utilities: [
    "Raised on posts — cool airflow, and safe above floods and animals",
    "The shaded space below is used for work, weaving, rest, and storage",
    "The steep roof sheds heavy monsoon rain; wide eaves shade the walls",
    "Wooden shutters open for the breeze and close against storms",
    "The open veranda is the social heart — for guests and family life",
    "Built from local hardwood by village carpenters, tuned to the tropical climate",
  ],
  origin: "Built by village carpenters across rural Cambodia; regional styles include Rong, Keng, Pet, and Kantaing.",
  model: "/models/phteah.glb",
  pois: [
    {
      id: "stilts",
      title: "On stilts",
      khmer: "ជើងផ្ទះ",
      info: "Sturdy hardwood posts raise the whole house. This lifts the living floor above floods and animals, lets cool air flow underneath, and creates a shaded ground-level space used for work, weaving, resting, and storage.",
      target: [0, 1.1, 1.6],
      camera: [4.2, 1.8, 6.6],
    },
    {
      id: "stairs",
      title: "The staircase",
      khmer: "ជណ្ដើរ",
      info: "A steep wooden stair climbs from the ground to the raised veranda. It's often steep and sometimes removable — a modest threshold between the public ground and the private home above.",
      target: [0, 1.4, 3.0],
      camera: [2.4, 2.2, 6.8],
    },
    {
      id: "veranda",
      title: "The veranda",
      khmer: "រានហាល",
      info: "The open front porch is the sociable heart of the house — shaded and airy, where the family gathers, guests are received, children play, and daily work is done.",
      target: [0, 3.0, 1.8],
      camera: [3.4, 3.6, 6.2],
    },
    {
      id: "roof",
      title: "The roof & finials",
      khmer: "ដំបូល",
      info: "The steep roof — tiled or thatched — sheds Cambodia's heavy monsoon rain quickly, while wide eaves shade the walls from sun and rain. The ridge ends curl upward in carved finials (kbach), a signature of Khmer roofs.",
      target: [0, 6.0, 0],
      camera: [4.6, 6.4, 7.4],
    },
    {
      id: "walls",
      title: "Walls & shutters",
      khmer: "ជញ្ជាំង និងបង្អួច",
      info: "Walls are wooden planks; the windows are wooden shutters with no glass — opened wide to catch the breeze in the heat, and closed against wind and storms. Simple, repairable, and made from local timber.",
      target: [-2.9, 3.8, -0.8],
      camera: [-6.4, 4.1, 3.2],
    },
  ],
});

ARTIFACTS.push({
  id: "ansom",
  khmer: "អន្សម",
  name: "Ansom",
  english: "Sticky-rice cake in banana leaf",
  category: "Traditional cake",
  blurb: "Cambodia's iconic festival cake — sticky rice and a filling, wrapped in banana leaf and steamed.",
  story:
    "អន្សម (ansom) is the most iconic Khmer cake. Glutinous (sticky) rice, soaked and mixed with coconut, is pressed around a filling and rolled up tightly in a banana leaf, tied with strips, and steamed or boiled for hours. Sweet អន្សមចេក has a banana or mung-bean centre; savoury អន្សមជ្រូក holds seasoned pork with mung bean. Ansom is above all a festival and family food — made especially for Khmer New Year (បុណ្យចូលឆ្នាំ) and Pchum Ben, when families gather the night before to wrap and boil dozens together, then share them with neighbours and offer them at the pagoda. The banana leaf is wrapper and flavour in one: it perfumes the rice as it steams, and it's completely natural and compostable.",
  utilities: [
    "Glutinous rice with coconut, wrapped around a sweet (banana / mung bean) or savoury (pork) filling",
    "Rolled in banana leaf, tied with strips, then steamed or boiled for hours",
    "Made especially for Khmer New Year and Pchum Ben — a family and community food",
    "Families wrap and boil dozens together, then share them and offer them at the pagoda",
    "The banana leaf flavours the rice and is a natural, compostable wrapper",
  ],
  origin: "A festive food made nationwide; families prepare it together for the big holidays.",
  model: "/models/ansom.glb",
  pois: [
    {
      id: "wrap",
      title: "The banana-leaf wrap",
      khmer: "ស្លឹកចេក",
      info: "Each roll is wrapped in a banana leaf and its ends folded over. The leaf holds the shape while it steams, perfumes the rice with its aroma, and is a natural, compostable wrapper — no plastic needed.",
      target: [0, 1.6, -0.45],
      camera: [1.9, 2.3, 2.7],
    },
    {
      id: "ties",
      title: "The ties",
      khmer: "ខ្សែចង",
      info: "Strips of leaf rib, bamboo, or reed bind the roll tightly at intervals so it keeps its firm cylinder shape through hours of steaming or boiling.",
      target: [0.5, 1.6, 0.15],
      camera: [2.3, 2.1, 2.5],
    },
    {
      id: "rice",
      title: "The sticky rice",
      khmer: "អង្ករដំណើប",
      info: "Cut one open and you see the glutinous rice — soaked, mixed with coconut, and steamed until dense and chewy. It's the heart of the cake, pressed firmly around the filling.",
      target: [0, 1.92, 0.85],
      camera: [1.5, 2.4, 2.6],
    },
    {
      id: "filling",
      title: "The filling",
      khmer: "ខ្លឹមក្នុង",
      info: "At the centre sits the filling — sweet ripe banana or mung bean for អន្សមចេក, or seasoned pork with mung bean for the savoury អន្សមជ្រូក. It's what makes each ansom sweet or savoury.",
      target: [0, 1.95, 0.85],
      camera: [1.0, 2.3, 2.4],
    },
  ],
});

export function artifactById(id: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.id === id);
}
