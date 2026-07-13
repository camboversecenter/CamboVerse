/**
 * Heritage sites / tourist spots shown on the Cambodia map.
 *
 * `map` is the spot's position on the stylized map plane ([x, z], where -z is
 * north) — approximate geography, not survey-accurate. `model` is the glTF to
 * load when the visitor teleports in. For now every spot points at the shared
 * sample model; each will get its own capture as the archive grows. `live`
 * marks whether a real experience exists yet (others render as "coming soon").
 */
export interface Spot {
  id: string;
  name: string;
  khmer: string;
  province: string;
  blurb: string;
  map: [number, number];
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
    map: [-3.8, -1.6],
    model: SAMPLE,
    live: true,
  },
  {
    id: "bayon",
    name: "Bayon",
    khmer: "ប្រាសាទបាយ័ន",
    province: "Siem Reap",
    blurb:
      "At the heart of Angkor Thom, famed for the serene stone faces gazing from its many towers.",
    map: [-3.9, -3.1],
    model: SAMPLE,
    live: false,
  },
  {
    id: "ta-prohm",
    name: "Ta Prohm",
    khmer: "ប្រាសាទតាព្រហ្ម",
    province: "Siem Reap",
    blurb:
      "The temple left in the embrace of the jungle, its stones entwined with towering silk-cotton tree roots.",
    map: [-2.3, -2.3],
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
    map: [-1.9, -3.6],
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
    map: [-0.4, -4.4],
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
    map: [0.6, 3.2],
    model: SAMPLE,
    live: false,
  },
];
