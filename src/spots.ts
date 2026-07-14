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
  /** Full surrounding landscape to render (Angkor's moat island, Wat Phnom's hill). */
  landscape?: "angkor" | "wat-phnom";
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
        id: "moat-bridge",
        title: "Moat & Western Bridge",
        khmer: "គូទឹក និងស្ពាន",
        info: "A vast rectangular moat — a canal nearly 200 m wide — surrounds the whole temple island, symbolising the cosmic ocean. A sandstone bridge carries visitors across it from the west.",
        target: [0, 0.4, 17],
        camera: [3.6, 2.8, 21.5],
      },
      {
        id: "western-gate",
        title: "Western Entrance Gopura",
        khmer: "គោបុរៈខាងលិច",
        info: "The long galleried gateway is the ceremonial western entrance — a towered portal in a wall stretching to the corners, the threshold between the outer world and the temple grounds. It is far smaller than the temple it heralds.",
        target: [0, 0.9, 13.4],
        camera: [3.2, 2.0, 16.8],
      },
      {
        id: "causeway",
        title: "The Causeway",
        khmer: "ស្ពានតម្កល់",
        info: "The raised sandstone causeway runs the length of the courtyard, the ceremonial approach leading straight from the entrance gopura to the temple's five towers.",
        target: [0, 0.5, 9],
        camera: [2.6, 2.0, 12.6],
      },
      {
        id: "reflecting-ponds",
        title: "Reflecting Ponds",
        khmer: "ស្រះឆ្លុះ",
        info: "Two great rectangular pools flank the causeway. The northern one gives the famous mirror reflection of the five towers at sunrise — the most photographed view in Cambodia.",
        target: [-5.3, 0.2, 7.6],
        camera: [-5.3, 1.7, 12.0],
      },
      {
        id: "temple-galleries",
        title: "Temple Galleries",
        khmer: "វិថីប្រាសាទ",
        info: "The outer galleries of the temple carry Angkor's celebrated bas-reliefs — hundreds of metres of carved scenes from myth, epic and history.",
        target: [-3.0, 1.3, 2.1],
        camera: [-5.8, 2.3, 6.4],
      },
      {
        id: "central-sanctuary",
        title: "Central Sanctuary",
        khmer: "ប្រាសាទកណ្ដាល",
        info: "The tallest tower crowns the temple-mountain — the symbolic Mount Meru, home of the gods at the heart of the five-tower quincunx.",
        target: [0, 2.8, -0.18],
        camera: [3.0, 3.4, 7.4],
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
  {
    id: "wat-phnom",
    name: "Wat Phnom",
    khmer: "វត្តភ្នំ",
    province: "Phnom Penh",
    blurb:
      "The hilltop temple that gives Phnom Penh its name — a great white stupa and an orange-roofed vihara crowning the city's only hill, founded in 1372.",
    lat: 11.5764,
    lng: 104.9282,
    nudge: [0.25, -0.55],
    model: "/models/wat-phnom.glb",
    live: true,
    aerial: true,
    landscape: "wat-phnom",
    splat: "/models/wat-phnom.splat",
    pois: [
      {
        id: "central-stupa",
        title: "The Great Stupa",
        khmer: "ព្រះចេតិយ",
        info: "The tall whitewashed stupa crowns the hill — it enshrines the ashes of King Ponhea Yat and, by legend, the sacred images Lady Penh found in the river, giving Phnom Penh its name.",
        target: [0, 4.2, -2.2],
        camera: [2.9, 4.7, 3.6],
      },
      {
        id: "main-vihara",
        title: "The Vihara",
        khmer: "ព្រះវិហារ",
        info: "The vihara — the main sanctuary hall — carries a tiered, gilded roof with soaring finials, and inside a great seated Buddha before richly painted walls.",
        target: [0, 2.5, -0.25],
        camera: [3.2, 2.8, 4.8],
      },
      {
        id: "naga-staircase",
        title: "Naga Staircase",
        khmer: "ជណ្ដើរនាគ",
        info: "The grand ceremonial stairway climbs the hill from the east, its balustrades formed by seven-headed nagas and guarded by lions — the sacred approach to the temple.",
        target: [0, 0.8, 3.8],
        camera: [2.2, 1.7, 7.6],
      },
      {
        id: "flower-clock",
        title: "The Flower Clock",
        khmer: "នាឡិកាផ្កា",
        info: "At the foot of the hill a working clock is planted into a circular flower garden — a beloved landmark and meeting point in the park around Wat Phnom.",
        target: [0, 0.1, 12.6],
        camera: [1.1, 5.8, 15.8],
      },
      {
        id: "city-overlook",
        title: "City Overlook",
        khmer: "ទិដ្ឋភាពរាជធានី",
        info: "From the hilltop the temple looks out over Phnom Penh — the wooded park below giving way to the boulevards and skyline of Cambodia's capital.",
        target: [0, 1.0, 15],
        camera: [1.6, 3.5, 3.2],
      },
    ],
  },
];
