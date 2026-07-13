/**
 * Heritage sites / tourist spots shown on the Cambodia map.
 *
 * `lat`/`lng` are real coordinates, projected onto the map by `projectLatLng`
 * so pins sit at their true geographic position. `nudge` is a small [dx, dz]
 * offset (world units) used only to fan out sites that are geographically too
 * close to label legibly (the Angkor cluster) — tourist-map style. `model` is
 * the glTF loaded on teleport; for now every spot shares the sample model.
 * `live` marks whether a real experience exists yet (others show "coming soon").
 */
export interface Spot {
  id: string;
  name: string;
  khmer: string;
  province: string;
  blurb: string;
  lat: number;
  lng: number;
  nudge?: [number, number];
  model: string;
  live: boolean;
}

const SAMPLE = "/models/heritage-sample.glb";

export const SPOTS: Spot[] = [
  {
    id: "angkor-wat",
    name: "Angkor Wat",
    khmer: "អង្គរវត្ត",
    province: "Siem Reap",
    blurb:
      "The largest religious monument on Earth, built in the early 12th century — the soul of the Khmer Empire and Cambodia's national symbol.",
    lat: 13.4125,
    lng: 103.867,
    model: "/models/angkor-wat.glb",
    live: true,
  },
  {
    id: "bayon",
    name: "Bayon",
    khmer: "ប្រាសាទបាយ័ន",
    province: "Siem Reap",
    blurb:
      "At the heart of Angkor Thom, famed for the serene stone faces gazing from its many towers.",
    lat: 13.4413,
    lng: 103.8586,
    nudge: [-1.1, -0.5],
    model: "/models/bayon.glb",
    live: true,
  },
  {
    id: "ta-prohm",
    name: "Ta Prohm",
    khmer: "ប្រាសាទតាព្រហ្ម",
    province: "Siem Reap",
    blurb:
      "The temple left in the embrace of the jungle, its stones entwined with towering silk-cotton tree roots.",
    lat: 13.4348,
    lng: 103.8891,
    nudge: [0.9, 0.5],
    model: SAMPLE,
    live: false,
  },
  {
    id: "banteay-srei",
    name: "Banteay Srei",
    khmer: "ប្រាសាទបន្ទាយស្រី",
    province: "Siem Reap",
    blurb:
      "The 'citadel of women', renowned for exquisitely fine carving in rose-pink sandstone.",
    lat: 13.5988,
    lng: 103.9633,
    nudge: [0.4, -0.9],
    model: SAMPLE,
    live: false,
  },
  {
    id: "preah-vihear",
    name: "Preah Vihear",
    khmer: "ប្រាសាទព្រះវិហារ",
    province: "Preah Vihear",
    blurb:
      "A dramatic cliff-top Shaivite temple on the Dângrêk escarpment — a UNESCO World Heritage Site.",
    lat: 14.3907,
    lng: 104.6809,
    model: SAMPLE,
    live: false,
  },
  {
    id: "royal-palace",
    name: "Royal Palace",
    khmer: "ព្រះបរមរាជវាំង",
    province: "Phnom Penh",
    blurb:
      "The royal residence and the Silver Pagoda in the capital, Phnom Penh — living Khmer heritage.",
    lat: 11.5645,
    lng: 104.9284,
    model: SAMPLE,
    live: false,
  },
];
