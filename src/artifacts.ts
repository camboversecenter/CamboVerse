/**
 * Khmer traditional tools & objects — 3D artifacts you can inspect up close, in
 * plain view or in VR, with an educational explanation and their everyday uses.
 *
 * Unlike heritage sites (which live on the map), artifacts are portable objects.
 * Each carries a `model` (glTF) and points of interest that teach how it works.
 * They're seeded into the Asset registry as commons assets (license/provenance/
 * consent) just like sites — see src/worker/rails.ts.
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

export function artifactById(id: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.id === id);
}
