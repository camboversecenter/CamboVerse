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

export function artifactById(id: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.id === id);
}
