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
/**
 * A point of interest inside a site — a place the visitor travels to and learns
 * about. `target` is the look-at point (and the marker position); `camera` is
 * the eye position when visiting. Coordinates are in the model's world space.
 * (This is where the future AI tour-guide agent will attach per spot.)
 */
export interface Poi {
  id: string;
  title: string;
  khmer?: string;
  info: string;
  target: [number, number, number];
  camera: [number, number, number];
}

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
  /** Show a reflecting pool in front (e.g. Angkor Wat's iconic view). */
  water?: boolean;
  /** Optional Gaussian-splat capture (.splat) — enables a photoreal toggle. */
  splat?: string;
  /** Points of interest to walk between inside the site. */
  pois?: Poi[];
  /** Arrive high above the site (whole-complex aerial view), then teleport down. */
  aerial?: boolean;
  /** Full surrounding landscape to render (e.g. Angkor's moat + forest island). */
  landscape?: "angkor";
}

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
    aerial: true,
    landscape: "angkor",
    splat: "/models/angkor-wat.splat",
    pois: [
      {
        id: "moat-crossing",
        title: "Moat Crossing",
        khmer: "កសិន្ធុជុំវិញ",
        info: "A vast rectangular moat — a canal nearly 200 m wide — surrounds the whole temple island, symbolising the cosmic ocean. The western causeway carries visitors across it.",
        target: [0, 0.3, 9.6],
        camera: [2.2, 1.8, 12.8],
      },
      {
        id: "causeway",
        title: "The Causeway",
        khmer: "ស្ពានតម្កល់",
        info: "The long sandstone causeway is the ceremonial approach from the west, crossing the moat toward the temple's five towers.",
        target: [0, 0.6, 2.8],
        camera: [0, 1.5, 6.8],
      },
      {
        id: "twin-ponds",
        title: "Twin Ponds",
        khmer: "ស្រះទឹកទាំងពីរ",
        info: "Two ponds flank the approach lawn — the northern one gives the famous mirror reflection of the five towers at sunrise.",
        target: [2.7, 0.2, 5.2],
        camera: [4.2, 1.5, 7.0],
      },
      {
        id: "central-sanctuary",
        title: "Central Sanctuary",
        khmer: "ប្រាសាទកណ្ដាល",
        info: "The tallest tower crowns the temple-mountain — the symbolic Mount Meru, home of the gods at the heart of the quincunx.",
        target: [0, 2.0, -0.13],
        camera: [1.8, 1.7, 2.0],
      },
      {
        id: "west-gallery",
        title: "Western Gallery",
        khmer: "វិថីខាងលិច",
        info: "The outer galleries carry Angkor's famous bas-reliefs — hundreds of metres of carved scenes from myth and history.",
        target: [-2.0, 0.8, 0],
        camera: [-3.6, 1.4, 1.7],
      },
      {
        id: "corner-gopura",
        title: "Corner Gopura",
        khmer: "គោបុរៈជ្រុង",
        info: "Gopuras — the towered gateways — mark the corners and entrances of the enclosure walls.",
        target: [2.1, 0.9, 1.3],
        camera: [3.4, 1.4, 3.0],
      },
    ],
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
    model: "/models/ta-prohm.glb",
    live: true,
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
    model: "/models/banteay-srei.glb",
    live: true,
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
    model: "/models/preah-vihear.glb",
    live: true,
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
    model: "/models/royal-palace.glb",
    live: true,
  },
];
