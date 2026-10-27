/**
 * Heritage sites / tourist spots shown on the Cambodia map.
 *
 * `lat`/`lng` are real coordinates, projected onto the map by `projectLatLng`
 * so pins sit at their true geographic position. `nudge` is a small [dx, dz]
 * offset (world units) used only to fan out sites that are geographically too
 * close to label legibly (the Angkor cluster) tourist-map style. `model` is
 * the glTF loaded on teleport; for now every spot shares the sample model.
 * `live` marks whether a real experience exists yet (others show "coming soon").
 */
/**
 * A point of interest inside a site a place the visitor travels to and learns
 * about. `target` is the look-at point (and the marker position); `camera` is
 * the eye position when visiting. Coordinates are in the model's world space.
 * (This is where the future AI tour-guide agent will attach per spot.)
 */
export interface PoiCapture {
  normal: string;
  ultra: string;
  rotation: [number, number, number];
  position: [number, number, number];
  scale: number;
  target: [number, number, number];
  camera: [number, number, number];
  /** Optional cleaned derivative; the original remains available for review. */
  cleanup?: {
    normal: string;
    ultra: string;
    lookLimits: { minPitch: number; maxPitch: number };
  };
  /** Optional constrained flat-screen route through a capture. Gaussian
   * splats are appearance, not collision geometry, so the route keeps visitors
   * near photographed viewpoints without pretending the points are a mesh. */
  walk?: CaptureWalkPath;
  /** Grounded walking band around a protected object, rather than through it. */
  walkAround?: CaptureWalkArea;
}

export interface CaptureWalkArea {
  center: [number, number]; // world X/Z
  innerRadius: number;
  outerRadius: number;
  start: [number, number]; // world X/Z, on the walking band
  ground: { height: number; slopeX: number; slopeZ: number };
  eyeHeight: number;
  speed: number;
  startYaw: number;
  startPitch: number;
}

export interface CaptureWalkPath {
  start: [number, number, number];
  end: [number, number, number];
  /** Grounded viewpoints along the photographed route. */
  heightProfile?: Array<{ at: number; groundY: number }>;
  /** Fixed camera height above every authored ground point. */
  eyeHeight?: number;
  /** Half-width of the supported walking strip in scene units. */
  lateralLimit?: number;
  /** Initial look direction. Zero faces toward negative Z. */
  startYaw?: number;
}

export interface Poi {
  id: string;
  title: string;
  khmer?: string;
  info: string;
  target: [number, number, number];
  camera: [number, number, number];
  /** A capture of this stop, viewed separately from the whole-site model. */
  capture?: PoiCapture;
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
  heritageUltraModel?: string;
  /** Background ground height; keep below an authored model's terrain. */
  sceneryGroundY?: number;
  /** World-space shadow offset for authored terrain prone to self-shadow stripes. */
  sceneryShadowNormalBias?: number;
  /** Opt-in height-following navigation for authored hill geometry. */
  terrainWalking?: boolean;
  /** Authored walking arrival eye position; avoids spawning inside raised terraces. */
  walkStart?: [number, number, number];
  /** Regional miniature: inspect landmarks, enter detailed scenes separately. */
  overviewOnly?: boolean;
  /** Optional whole-site inspection pose for differently proportioned assets. */
  overview?: Poi;
  live: boolean;
  /** Show a reflecting pool in front (e.g. Angkor Wat's iconic view). */
  water?: boolean;
  /** Optional Gaussian-splat capture (.splat) enables a photoreal toggle. */
  splat?: string;
  /** Points of interest to walk between inside the site. */
  pois?: Poi[];
  /** Arrive high above the site (whole-complex aerial view), then teleport down. */
  aerial?: boolean;
  /** Full surrounding landscape to render (Angkor's moat island, Wat Phnom's hill). */
  landscape?: "angkor" | "wat-phnom";
}

/** Normalise a province name for matching (spots use "Siem Reap", the ADM1
 * boundary data uses "Siemreap", etc.). */
const normProvince = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** The heritage sites that fall within a given province (by name). */
export function spotsInProvince(provinceName: string): Spot[] {
  const key = normProvince(provinceName);
  return SPOTS.filter((s) => normProvince(s.province) === key);
}

/** A friendlier display name for a few ADM1 names that read oddly. */
export function prettyProvince(name: string): string {
  const fixes: Record<string, string> = {
    Siemreap: "Siem Reap",
    "Preah Sihanouk": "Preah Sihanouk",
    "Tboung Khmum": "Tboung Khmum",
    "Mondul Kiri": "Mondulkiri",
    "Ratanak Kiri": "Ratanakiri",
  };
  return fixes[name] ?? name;
}

import { HERITAGE_HOTSPOTS } from "./heritageHotspots";
import { KULEN_POIS } from './kulenRegion';

const SITE_DEFINITIONS: Spot[] = [
  {
    id: "angkor-wat",
    name: "Angkor Wat",
    khmer: "អង្គរវត្ត",
    province: "Siem Reap",
    blurb:
      "The largest religious monument on Earth, built in the early 12th century the soul of the Khmer Empire and Cambodia's national symbol.",
    lat: 13.4125,
    lng: 103.867,
    model: "/models/local/angkor-wat-refined-v3/angkor-wat-normal.glb",
    heritageUltraModel: "/models/local/angkor-wat-refined-v3/angkor-wat-ultra.glb",
    overview: { id: 'overview', title: 'Angkor Wat', info: '', target: [0, 1, -1], camera: [27, 29, 34] },
    sceneryGroundY: -0.65,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    live: true,
    aerial: true,
    pois: [
      {
        id: "moat-bridge",
        title: "Moat & Western Bridge",
        khmer: "គូទឹក និងស្ពាន",
        info: "A vast rectangular moat a canal nearly 200 m wide surrounds the whole temple island, symbolising the cosmic ocean. A sandstone bridge carries visitors across it from the west.",
        target: [0, 0.3, 18],
        camera: [5, 3, 22],
      },
      {
        id: "western-gate",
        title: "Western Entrance Gopura",
        khmer: "គោបុរៈខាងលិច",
        info: "The long galleried gateway is the ceremonial western entrance a towered portal in a wall stretching to the corners, the threshold between the outer world and the temple grounds. It is far smaller than the temple it heralds.",
        target: [0, 1.4, 14.6],
        camera: [4, 3.5, 20.5],
      },
      {
        id: "causeway",
        title: "The Causeway",
        khmer: "ស្ពានតម្កល់",
        info: "The raised sandstone causeway runs the length of the courtyard, the ceremonial approach leading straight from the entrance gopura to the temple's five towers.",
        target: [0, 0.35, 8],
        camera: [2.2, 2, 12.5],
      },
      {
        id: "reflecting-ponds",
        title: "Reflecting Ponds",
        khmer: "ស្រះឆ្លុះ",
        info: "Two great rectangular pools flank the causeway. The northern one gives the famous mirror reflection of the five towers at sunrise the most photographed view in Cambodia.",
        target: [-6.2, -0.04, 8],
        camera: [-6.2, 2.8, 12.5],
      },
      {
        id: "temple-galleries",
        title: "Temple Galleries",
        khmer: "វិថីប្រាសាទ",
        info: "The outer galleries of the temple carry Angkor's celebrated bas-reliefs hundreds of metres of carved scenes from myth, epic and history.",
        target: [-5, 1.45, 2.5],
        camera: [-6, 3.4, 8.5],
      },
      {
        id: "central-sanctuary",
        title: "Central Sanctuary",
        khmer: "ប្រាសាទកណ្ដាល",
        info: "The tallest tower crowns the temple-mountain the symbolic Mount Meru, home of the gods at the heart of the five-tower quincunx.",
        target: [0, 6, -6],
        camera: [1, 7.5, 5.5],
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
    model: "/models/local/bayon-refined-v2/bayon-normal.glb",
    heritageUltraModel: "/models/local/bayon-refined-v2/bayon-ultra.glb",
    overview: { id: 'overview', title: 'Bayon', info: '', target: [0, 2.5, -4], camera: [25, 23, 30] },
    aerial: true,
    sceneryGroundY: -0.35,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    live: true,
    pois: [
      {
        id: "heart-of-angkor-thom",
        title: "Heart of Angkor Thom",
        khmer: "បេះដូងអង្គរធំ",
        info: "The Bayon stands at the exact centre of Angkor Thom, Jayavarman VII's walled capital of the late 12th century three kilometres on a side, entered through five monumental gates whose towers echo these same serene faces.",
        target: [0, 3, -4],
        camera: [-21, 14, 22],
      },
      {
        id: "bas-relief-galleries",
        title: "Bas-relief Galleries",
        khmer: "ថែវចម្លាក់",
        info: "The outer gallery carries over a kilometre of bas-reliefs with thousands of figures not only gods and battles (including the naval battle against the Cham on the Tonlé Sap) but everyday Khmer life: markets, cockfights, cooking pots, games.",
        target: [-5, 1.3, 6.5],
        camera: [-5, 1.8, 10],
      },
      {
        id: "face-towers",
        title: "The Face Towers",
        khmer: "ប៉មព្រះភ័ក្ត្រ",
        info: "Bayon's many towers carry monumental stone faces looking in several directions. The original tower count is debated. This illustrative model simplifies their number, placement and carving; it is not a measured reconstruction.",
        target: [3.5, 2.5, 4],
        camera: [0, 2.8, 3.6],
      },
      {
        id: "smile-of-angkor",
        title: "The Smile of Angkor",
        khmer: "ស្នាមញញឹមអង្គរ",
        info: "Whose faces are they? Scholars still debate the bodhisattva of compassion Avalokiteshvara, King Jayavarman VII himself, or both fused into one. Their gentle half-smile has become known as 'the smile of Angkor'.",
        target: [-3.5, 2.5, 4],
        camera: [0, 2.8, 3.6],
      },
      {
        id: "central-sanctuary",
        title: "Central Sanctuary",
        khmer: "ប្រាសាទកណ្ដាល",
        info: "Unusually for a Khmer temple, the central sanctuary is circular. A great statue of the Buddha sheltered by the naga once sat here; smashed in a later Hindu reaction, it was recovered from the sanctuary shaft in 1933 and restored.",
        target: [0, 5.8, -4],
        camera: [0.1, 7.5, 4.5],
      },
    ],
  },
  {
    id: "ta-prohm",
    name: "Ta Prohm",
    khmer: "ប្រាសាទតាព្រហ្ម",
    province: "Siem Reap",
    blurb:
      "A forest monastery where giant spung trees and tangled roots embrace weathered stone galleries.",
    lat: 13.4348,
    lng: 103.8891,
    nudge: [0.9, 0.5],
    model: "/models/local/ta-prohm-refined-v2/ta-prohm-normal.glb",
    heritageUltraModel: "/models/local/ta-prohm-refined-v2/ta-prohm-ultra.glb",
    overview: { id: 'overview', title: 'Ta Prohm', info: '', target: [0, 2, -2], camera: [25, 25, 30] },
    sceneryGroundY: -0.55,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    aerial: true,
    live: true,
    pois: [
      {
        id: "rajavihara",
        title: "Rajavihara the Royal Monastery",
        khmer: "រាជវិហារ",
        info: "Jayavarman VII founded this temple in 1186 as Rajavihara, 'the royal monastery', dedicating its central image to his mother in the form of Prajnaparamita, the perfection of wisdom. Its founding stele records thousands of attendants a living monastery-city, not a silent ruin.",
        target: [0, 1.6, 10],
        camera: [3.5, 3.4, 16],
      },
      {
        id: "galleried-enclosures",
        title: "The Galleried Enclosures",
        khmer: "កំពែងថែវ",
        info: "Unlike the temple-mountains, Ta Prohm is a 'flat' monastery: rings of galleried enclosures, courtyards and towers spreading wide under the canopy a plan built for a great community of monks, teachers and students.",
        target: [-5, 1.4, 7],
        camera: [-6, 3.4, 12],
      },
      {
        id: "strangler-roots",
        title: "The Strangler Roots",
        khmer: "ឫសឈើយក្ស",
        info: "Giant spung trees and tangled roots spread over lintels and galleries. Their broad, flowing roots and the weathered masonry are among Ta Prohm's most recognizable features. This model's tree positions and shapes are illustrative.",
        target: [5.2, 2.8, 2.7],
        camera: [9, 4.5, 8.5],
      },
      {
        id: "fallen-stones",
        title: "Fallen Stones",
        khmer: "គំនរថ្ម",
        info: "Collapsed masonry lies beside standing galleries. Ta Prohm is actively conserved and restored: work balances the protection of its stone structures with the care of its large trees. The blocks shown here are an illustrative arrangement, not a record of individual archaeological stones.",
        target: [7.8, 0.4, 5],
        camera: [5.8, 2.6, 6.2],
      },
      {
        id: "movie-star-temple",
        title: "A Movie-Star Temple",
        khmer: "ប្រាសាទតារាភាពយន្ត",
        info: "Ta Prohm reached the world's screens in 2001, when scenes of Lara Croft: Tomb Raider were filmed among these roots and the 'Tomb Raider tree' has drawn visitors from around the world ever since.",
        target: [-5.8, 2.4, -6.5],
        camera: [-3, 3.2, -1],
      },
    ],
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
    model: "/models/local/banteay-srei-refined-v2/banteay-srei-normal.glb",
    heritageUltraModel: "/models/local/banteay-srei-refined-v2/banteay-srei-ultra.glb",
    overview: { id: 'overview', title: 'Banteay Srei', info: '', target: [0, 1, -1], camera: [23, 24, 28] },
    sceneryGroundY: -0.55,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    aerial: true,
    live: true,
    pois: [
      {
        id: "pink-sandstone",
        title: "Rose-Pink Sandstone",
        khmer: "ថ្មភក់ផ្កាឈូក",
        info: "Banteay Srei is carved from hard rose-pink sandstone that holds detail like wood. Its ornament is so deep and so fine that it is often called the 'jewel of Khmer art' a masterwork in miniature, its doorways barely shoulder-high.",
        target: [-3.2, 3, -5],
        camera: [-7.7, 4.5, 1.3],
      },
      {
        id: "counselors-temple",
        title: "A Counselor's Temple",
        khmer: "ប្រាសាទព្រាហ្មណ៍",
        info: "Uniquely, this temple was raised not by a king but by a brahmin: Yajnavaraha, counselor to King Rajendravarman and tutor to the future Jayavarman V, consecrated it to Shiva in 967 under the name Tribhuvanamahesvara 'great lord of the threefold world'.",
        target: [0, 3.2, -5.3],
        camera: [8.5, 7.5, 5],
      },
      {
        id: "two-libraries",
        title: "The Two Libraries",
        khmer: "បណ្ណាល័យទាំងពីរ",
        info: "The pediments of the two libraries are among the most celebrated carvings in all Khmer art: the demon-king Ravana shaking Mount Kailasa as Shiva sits enthroned above, and Indra pouring rain over the burning Khandava forest.",
        target: [3.7, 2.2, 0.4],
        camera: [6.8, 3.4, 4.5],
      },
      {
        id: "citadel-of-women",
        title: "Citadel of the Women",
        khmer: "បន្ទាយស្រី",
        info: "The modern name means 'citadel of the women' folk tradition says the carving is too fine to have been cut by the hand of a man. Kneeling guardian figures with animal heads watch its courtyards; today's are replicas, the originals kept safe in museums.",
        target: [0, 2.2, 10],
        camera: [3.2, 3.4, 16],
      },
      {
        id: "stolen-returned-reborn",
        title: "Stolen, Returned, Reborn",
        khmer: "រស់ឡើងវិញ",
        info: "In 1923 the young André Malraux later France's minister of culture was arrested for removing its devata carvings, which were recovered. The scandal spurred protection, and in the 1930s Banteay Srei became the first Angkor monument restored by anastylosis: dismantled and rebuilt stone by original stone.",
        target: [3.2, 3, -5],
        camera: [7.7, 4.5, 1.3],
      },
    ],
  },
  {
    id: "preah-vihear",
    name: "Preah Vihear",
    khmer: "ប្រាសាទព្រះវិហារ",
    province: "Preah Vihear",
    blurb:
      "A dramatic cliff-top Shaivite temple on the Dângrêk escarpment a UNESCO World Heritage Site.",
    lat: 14.3907,
    lng: 104.6809,
    model: "/models/local/preah-vihear-green-v4/preah-vihear-normal.glb",
    heritageUltraModel: "/models/local/preah-vihear-green-v4/preah-vihear-ultra.glb",
    overview: { id: 'overview', title: 'Preah Vihear overview', info: '', target: [0, 2.4, 0], camera: [14, 17, 20] },
    aerial: true,
    live: true,
    pois: [
      {
        id: "long-ascent",
        title: "The Long Ascent",
        khmer: "ផ្លូវឡើងភ្នំ",
        info: "Most Khmer temples face east; Preah Vihear instead runs 800 metres along a north–south axis, climbing the ridge through a chain of stairways and causeways a pilgrimage built into the mountain itself.",
        target: [0, 1.5, 1.6],
        camera: [1.5, 2.2, 3.4],
      },
      {
        id: "five-gopuras",
        title: "The Five Gopuras",
        khmer: "គោបុរៈទាំងប្រាំ",
        info: "Five cross-shaped gopura pavilions mark the stages of the ascent, each framing the sky until the sanctuary finally appears. Their pediments carry superb carvings including a famous Churning of the Sea of Milk.",
        target: [0, 1.9, 0.11],
        camera: [1.6, 2.3, 1.9],
      },
      {
        id: "lord-of-the-peak",
        title: "Sanctuary of the Lord of the Peak",
        khmer: "ទីសក្ការៈព្រះឥសូរ",
        info: "The temple was sacred to Shiva as Sikharesvara, 'Lord of the Peak'. Begun in the 9th century, it owes most of its present form to Suryavarman I and Suryavarman II, whose reigns bookend Angkor's imperial zenith.",
        target: [0, 2.2, -1.49],
        camera: [1.8, 2.5, 0.7],
      },
      {
        id: "cliff-edge",
        title: "The Cliff Edge",
        khmer: "ចុងជ្រោះ",
        info: "Behind the sanctuary the world simply ends: from a summit 525 metres high, a sheer cliff of the Dângrêk escarpment falls away to the Cambodian plain unrolled far below one of the great views of Southeast Asia.",
        target: [0, 1.2, -2.6],
        camera: [0.8, 2.4, -0.4],
      },
      {
        id: "world-heritage",
        title: "World Heritage on the Heights",
        khmer: "បេតិកភណ្ឌពិភពលោក",
        info: "The International Court of Justice affirmed in 1962 that the temple stands on Cambodian soil, and in 2008 Preah Vihear was inscribed as a UNESCO World Heritage Site a clifftop sanctuary shared with the world.",
        target: [0, 1.6, 0],
        camera: [3.6, 3.2, 3.6],
      },
    ],
  },
  {
    id: "royal-palace",
    name: "Royal Palace",
    khmer: "ព្រះបរមរាជវាំង",
    province: "Phnom Penh",
    blurb:
      "The royal residence and the Silver Pagoda in the capital, Phnom Penh living Khmer heritage.",
    lat: 11.5645,
    lng: 104.9284,
    model: "/models/local/royal-palace-refined-v2/royal-palace-normal.glb",
    heritageUltraModel: "/models/local/royal-palace-refined-v2/royal-palace-ultra.glb",
    overview: { id: 'overview', title: 'Royal Palace', info: '', target: [0, 2, 0], camera: [25, 25, 34] },
    aerial: true,
    // Separate the background ground from the authored courtyard slab.
    sceneryGroundY: -0.35,
    sceneryShadowNormalBias: 0.025,
    live: true,
    pois: [
      {
        id: "facing-chaktomuk",
        title: "Facing Chaktomuk",
        khmer: "ទន្លេចតុមុខ",
        info: "King Norodom moved the capital from Oudong and began this palace in 1866, siting it to face the Chaktomuk the 'four faces', where the Mekong, Bassac and Tonlé Sap rivers meet. It remains the residence of Cambodia's kings today.",
        target: [-3, 2, 9],
        camera: [4, 4, 21],
      },
      {
        id: "throne-hall",
        title: "The Throne Hall",
        khmer: "ព្រះទីនាំងទេវាវិនិច្ឆ័យ",
        info: "The Throne Hall Preah Tineang Tevea Vinichhay, the hall of divine judgement is where coronations and great royal ceremonies are held. The present building, inaugurated in 1919, replaced an earlier wooden hall.",
        target: [-4, 4.5, -4],
        camera: [-0.7, 5, 10],
      },
      {
        id: "golden-spire",
        title: "The Golden Spire",
        khmer: "កំពូលមាស",
        info: "The Throne Hall's gilded spire rises 59 metres, crowned with a four-faced pinnacle that echoes the Bayon the serene gaze of Angkor watching over the modern capital.",
        target: [-4, 8, -5],
        camera: [1, 9, 4],
      },
      {
        id: "moonlight-pavilion",
        title: "Moonlight Pavilion",
        khmer: "ព្រះទីនាំងច័ន្ទឆាយា",
        info: "The open-air Chanchhaya Pavilion 'moonlight' sits on the palace wall facing the river. Royal dancers have performed here by night, and kings have addressed the city from its balcony.",
        target: [-5, 3.6, 9],
        camera: [-2, 5, 24],
      },
      {
        id: "silver-pagoda",
        title: "The Silver Pagoda",
        khmer: "វត្តព្រះកែវមរកត",
        info: "Beside the palace stands Wat Preah Keo Morakot, the Silver Pagoda, floored with thousands of solid-silver tiles. It keeps the Emerald Buddha and a life-size gold Buddha set with more than two thousand diamonds.",
        target: [7, 2.7, -1],
        camera: [3.7, 4.4, 10],
      },
    ],
  },
  {
    id: "wat-phnom",
    name: "Wat Phnom",
    khmer: "វត្តភ្នំ",
    province: "Phnom Penh",
    blurb:
      "The hilltop temple that gives Phnom Penh its name a great white stupa and an orange-roofed vihara crowning the city's only hill, founded in 1372.",
    lat: 11.5764,
    lng: 104.9282,
    nudge: [0.25, -0.55],
    model: "/models/local/wat-phnom-refined-v4/wat-phnom-normal.glb",
    heritageUltraModel: "/models/local/wat-phnom-refined-v4/wat-phnom-ultra.glb",
    overview: { id: 'overview', title: 'Wat Phnom', info: '', target: [0, 2.4, 0], camera: [12, 20.4, 26] },
    // Authored terrain's lowest surface is -0.045 after the existing +1.4 lift.
    sceneryGroundY: -0.12,
    sceneryShadowNormalBias: 0.025,
    live: true,
    aerial: true,
    landscape: "wat-phnom",
    pois: [
      {
        id: "central-stupa",
        title: "The Great Stupa",
        khmer: "ព្រះចេតិយ",
        info: "The tall whitewashed stupa crowns the hill it enshrines the ashes of King Ponhea Yat and, by legend, the sacred images Lady Penh found in the river, giving Phnom Penh its name.",
        target: [0, 4.4, -5.65],
        camera: [4, 10, -13],
      },
      {
        id: "main-vihara",
        title: "The Vihara",
        khmer: "ព្រះវិហារ",
        info: "The vihara the main sanctuary hall carries a tiered, gilded roof with soaring finials, and inside a great seated Buddha before richly painted walls.",
        target: [0, 3.7, -0.8],
        camera: [3, 5.4, 10],
      },
      {
        id: "naga-staircase",
        title: "Naga Staircase",
        khmer: "ជណ្ដើរនាគ",
        info: "The grand ceremonial stairway climbs the hill from the east, its balustrades formed by seven-headed nagas and guarded by lions the sacred approach to the temple.",
        target: [0, 1.25, 6.0],
        camera: [4.0, 3.2, 14.2],
        capture: {
          normal: '/models/wat-phnom-staircase.splat',
          ultra: '/models/wat-phnom-staircase-ultra.splat',
          rotation: [Math.PI / 2, 0, 0],
          position: [0, 1.2, 0],
          scale: 2.5,
          target: [0, 1.35, 0],
          camera: [0, 1.8, 4.4],
          cleanup: {
            normal: '/models/local/staircase-clean-v1/clean-normal.splat',
            ultra: '/models/local/staircase-clean-v1/clean-ultra.splat',
            // The rear approach is incomplete even in the uncropped export.
            // Clean the asset without limiting the visitor's horizontal turn.
            lookLimits: { minPitch: -0.60, maxPitch: 0.22 },
          },
          // Keep the visitor on the photographed central approach. This is a
          // conservative visual route, not a surveyed measurement of the site.
          walk: {
            // drei flips raw Y/Z before the group transform: world coordinates
            // are [2.5*x, 1.2+2.5*z, -2.5*y]. These floor estimates use that
            // transform. The old positive-Z approach extended outside the scan.
            // Stop before the upper region where surface estimates get noisy.
            start: [0, 1.15, 0.50],
            end: [0, 1.65, -1.75],
            eyeHeight: 0.30,
            lateralLimit: 0.45,
            heightProfile: [
              { at: 0, groundY: 0.85 },
              { at: 1 / 6, groundY: 0.875 },
              { at: 2 / 6, groundY: 1.00 },
              { at: 3 / 6, groundY: 1.05 },
              { at: 4 / 6, groundY: 1.15 },
              { at: 5 / 6, groundY: 1.225 },
              { at: 1, groundY: 1.35 },
            ],
            startYaw: 0,
          },
        },
      },
      {
        id: "flower-clock",
        title: "The Flower Clock",
        khmer: "នាឡិកាផ្កា",
        info: "At the foot of the hill a working clock is planted into a circular flower garden a beloved landmark and meeting point in the park around Wat Phnom.",
        target: [0, 0.1, 12.6],
        camera: [1.1, 5.8, 15.8],
        capture: {
          normal: '/models/local/wat-phnom-clock-preview-v1/wat-phnom-clock.splat',
          ultra: '/models/local/wat-phnom-clock-preview-v1/wat-phnom-clock-ultra.splat',
          rotation: [Math.PI / 2, 0, 0], position: [0, 0, 0], scale: 12,
          target: [-.36, -.85, -.6], camera: [-.36, 15, 17],
          cleanup: {
            normal: '/models/local/clock-walk-clean-v1/clean-normal.splat',
            ultra: '/models/local/clock-walk-clean-v1/clean-ultra.splat',
            lookLimits: { minPitch: -1.15, maxPitch: .8 },
          },
          // Estimated from the capture's clock edge and nearby ground plane;
          // not a survey or a reconstruction of unphotographed park paths.
          walkAround: {
            center: [-.36, -.6], innerRadius: 7.45, outerRadius: 9.1,
            start: [-.36, 7.6],
            ground: { height: -.63, slopeX: .046, slopeZ: .072 },
            eyeHeight: 1.2, speed: 1.8, startYaw: 0, startPitch: -.26,
          },
        },
      },
      {
        id: "city-overlook",
        title: "City Overlook",
        khmer: "ទិដ្ឋភាពរាជធានី",
        info: "From the hilltop the temple looks out over Phnom Penh the wooded park below giving way to the boulevards and skyline of Cambodia's capital.",
        target: [0, 1.0, 15],
        camera: [1.6, 3.5, 3.2],
      },
    ],
  },
  {
    id: "sambor-prei-kuk",
    name: "Sambor Prei Kuk",
    khmer: "សំបូរព្រៃគុក",
    province: "Kampong Thom",
    blurb:
      "The archaeological site of ancient Ishanapura, capital of the Chenla Empire, featuring pre-Angkorian brick temples scattered through serene forest.",
    lat: 12.8708,
    lng: 105.0431,
    model: "/models/local/sambor-prei-kuk-refined-v2/sambor-prei-kuk-normal.glb",
    heritageUltraModel: "/models/local/sambor-prei-kuk-refined-v2/sambor-prei-kuk-ultra.glb",
    overview: { id: 'overview', title: 'Sambor Prei Kuk', info: '', target: [0, 4.7, 0], camera: [6, 6.5, 14] },
    aerial: true,
    // The authored floor spans Y=-0.24..0 after the 0.5 viewer scale.
    sceneryGroundY: -0.35,
    sceneryShadowNormalBias: 0.04,
    live: true,
    pois: [
      {
        id: "prasat-sambor",
        title: "Prasat Sambor",
        khmer: "ប្រាសាទសំបូរ",
        info: "The principal north temple group, dedicated to an incarnation of Shiva (Gambhireshvara), featuring well-preserved 7th-century brick carvings.",
        target: [-2, 2.7, -17.5],
        camera: [-.5, 3.2, -12.5],
      },
      {
        id: "prasat-tao",
        title: "Prasat Tao (Lion Temple)",
        khmer: "ប្រាសាទតោ",
        info: "The largest of the central complexes, famed for the magnificent, intricately carved stone lion sculptures guarding its doorways.",
        target: [0, 2.5, -1],
        camera: [3.8, 3.2, 8],
      },
      {
        id: "prasat-yeay-poan",
        title: "Prasat Yeay Poan",
        khmer: "ប្រាសាទយាយពាន់",
        info: "The southern temple group contains square and octagonal brick sanctuaries in a wooded setting. This model presents a simplified study, with compressed distances between the groups.",
        target: [2.5, 2.7, 17],
        camera: [3, 3.3, 21.5],
      },
      {
        id: "flying-palaces",
        title: "The Flying Palaces",
        khmer: "វិមានអាកាស",
        info: "The brick towers of Ishanapura carry carved 'flying palaces' miniature heavenly mansions with tiny inhabitants looking out among the earliest reliefs in which Khmer architecture depicts itself. The octagonal tower plan here is unique in Southeast Asia.",
        target: [-10.6, 1.8, -10.4],
        camera: [-15.5, 4, -1],
      },
      {
        id: "forest-groups",
        title: "Temple Groups & Forest",
        info: "Illustrative Blender model: seven representative sanctuaries in compressed north, central and south clearings. Tree locations, carvings and dimensions are approximate; this is not a surveyed site plan or a complete reconstruction.",
        target: [0, 1, 0],
        camera: [23, 28, 33],
      },
    ],
  },
  {
    id: "koh-ker",
    name: "Koh Ker",
    khmer: "កោះកេរ",
    province: "Preah Vihear",
    blurb:
      "A remote and striking ancient capital of the Khmer Empire, famous for Prasat Thom, a massive seven-tiered sandstone pyramid.",
    lat: 13.7833,
    lng: 104.5333,
    model: "/models/local/koh-ker-refined-v2/koh-ker-normal.glb",
    heritageUltraModel: "/models/local/koh-ker-refined-v2/koh-ker-ultra.glb",
    overview: { id: 'overview', title: 'Koh Ker overview', info: '', target: [0, 1.5, 0], camera: [9, 8, 12] },
    aerial: true,
    live: true,
    pois: [
      {
        id: "prasat-thom",
        title: "Prasat Thom",
        khmer: "ប្រាសាទធំ",
        info: "The centerpiece of Koh Ker, a colossal 36-metre-tall, seven-tiered sandstone pyramid. It offers sweeping views of the surrounding forest from its peak.",
        target: [0, 2, 0],
        camera: [6.8, 5.5, 9],
      },
      {
        id: "summit-shrine",
        title: "The Summit Shrine",
        khmer: "ទីសក្ការៈកំពូល",
        info: "The shrine at the pyramid's summit held the state god of Jayavarman IV's capital, Tribhuvanesvara 'lord of the threefold world', most likely in the form of a colossal linga raised high above the forest.",
        target: [0, 4.1, 0],
        camera: [2.8, 6.4, 3.4],
      },
      {
        id: "brief-capital",
        title: "A Capital for One Generation",
        khmer: "អតីតរាជធានី",
        info: "For a single generation (928–944) the empire's capital moved here from Angkor under Jayavarman IV. Scores of sanctuaries were raised in barely two decades famous for the largest and boldest sculpture the Khmer Empire ever produced.",
        target: [0, 1.4, 0],
        camera: [-10, 9, 13],
      },
    ],
  },
  {
    id: "banteay-chhmar",
    name: "Banteay Chhmar",
    khmer: "បន្ទាយឆ្មារ",
    province: "Banteay Meanchey",
    blurb:
      "A massive, remote 12th-century temple complex famed for its face towers and an adventurous, lost-in-the-jungle atmosphere.",
    lat: 14.071,
    lng: 103.111,
    model: "/models/local/banteay-chhmar-refined-v4/banteay-chhmar-normal.glb",
    heritageUltraModel: "/models/local/banteay-chhmar-refined-v4/banteay-chhmar-ultra.glb",
    // Authored terrain spans Y=-0.12..0; avoid a coplanar background at Y=0.
    sceneryGroundY: -0.2,
    sceneryShadowNormalBias: 0.04,
    overview: { id: 'overview', title: 'Banteay Chhmar towers', info: '', target: [-.48, .66, -.24], camera: [1.8, 1.56, 2.76] },
    aerial: true,
    live: true,
    pois: [
      {
        id: "face-towers",
        title: "Massive Face Towers",
        info: "Similar to Bayon, featuring the enigmatic faces of Lokeshvara.",
        target: [0, .80, 0],
        camera: [1.2, 1.2, 1.8],
      },
      {
        id: "satellite-temples",
        title: "Enclosing Galleries",
        info: "This illustrative model shows galleries surrounding the face-tower courtyards. The wider site's satellite temples are not represented in this compact scene.",
        target: [7.44, .216, 2.88],
        camera: [9.24, 2.4, 5.4],
      },
      {
        id: "site-layout",
        title: "Temple Layout",
        info: "An overview of this illustrative study shows the long ruin complex, enclosing galleries and pools. Individual stones, vegetation and surviving structures are approximate, not a surveyed reconstruction.",
        target: [-.96, .24, -1.2],
        camera: [20.88, 22.32, 25.2],
      },
    ],
  },
  {
    id: "preah-khan",
    name: "Preah Khan",
    khmer: "ប្រាសាទព្រះខ័ន",
    province: "Siem Reap",
    blurb:
      "A sprawling 12th-century complex built by King Jayavarman VII that once functioned as a Buddhist university and city.",
    lat: 13.461,
    lng: 103.871,
    model: "/models/local/preah-khan-refined-v2/preah-khan-normal.glb",
    heritageUltraModel: "/models/local/preah-khan-refined-v2/preah-khan-ultra.glb",
    overview: { id: 'overview', title: 'Preah Khan', info: '', target: [0, 1.7, -2], camera: [27, 27, 33] },
    sceneryGroundY: -0.55,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    aerial: true,
    live: true,
    nudge: [-0.8, -0.9],
    pois: [
      {
        id: "labyrinthine-galleries",
        title: "Labyrinthine Galleries",
        info: "A maze of successive rectangular galleries, connecting corridors, and courtyards.",
        target: [0, 1.6, -3],
        camera: [0.35, 1.55, 8.6],
      },
      {
        id: "column-pavilion",
        title: "Two-storey Column Pavilion",
        info: "A distinctive two-storey structure with round columns stands within Preah Khan. This simplified teaching model shows its column-and-floor arrangement, not a measured reconstruction.",
        target: [7.4, 2.6, 5.4],
        camera: [3.2, 3.2, 7.8],
      },
      {
        id: "hall-of-dancers",
        title: "Hall of Dancers",
        info: "The real hall takes its name from carved dancing figures. This illustrative model shows the roofless hall and column arrangement; its sacred figure reliefs are not reconstructed.",
        target: [0, 1.7, 5.4],
        camera: [-6.5, 4.6, 7.5],
      },
    ],
  },
  {
    id: "beng-mealea",
    name: "Beng Mealea",
    khmer: "បឹងមាលា",
    province: "Siem Reap",
    blurb:
      "The quintessential Jungle Temple, where nature has extensively reclaimed the 12th-century sandstone structures.",
    lat: 13.475,
    lng: 104.225,
    model: "/models/local/beng-mealea-refined-v2/beng-mealea-normal.glb",
    heritageUltraModel: "/models/local/beng-mealea-refined-v2/beng-mealea-ultra.glb",
    overview: { id: 'overview', title: 'Beng Mealea', info: '', target: [0, 1.3, -2], camera: [29, 30, 35] },
    sceneryGroundY: -0.55,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    aerial: true,
    live: true,
    pois: [
      {
        id: "overgrown-ruins",
        title: "Overgrown Ruins",
        info: "Massive stone blocks scattered in heaps, with tree roots weaving through collapsed galleries, towers, and walls.",
        target: [0, 1, -6.8],
        camera: [1.3, 3, -2.4],
      },
      {
        id: "root-covered-windows",
        title: "Roots and Stone Windows",
        info: "Tree roots spread across surviving sandstone walls and baluster windows. Their placement here is illustrative, not a measured record of individual trees or carvings.",
        target: [6.5, 1.6, 0],
        camera: [6.6, 2.6, 4.7],
      },
      {
        id: "visitor-walkway",
        title: "Walkway Through the Ruins",
        info: "Wooden walkways help visitors explore the fragile ruins. This simplified route is for the digital model, not a map of the current on-site visitor path.",
        target: [0, 1.2, 7],
        camera: [0.15, 1.65, 15.3],
      },
    ],
  },
  {
    id: "phnom-kulen",
    name: "Phnom Kulen",
    khmer: "ភ្នំគូលែន",
    province: "Siem Reap",
    blurb: "Explore the mountain plateau and its separate sacred, archaeological and natural landmarks. This regional study shows selected places, not every site.",
    lat: 13.566, lng: 104.116, nudge: [0.6, -1.0],
    model: "/models/local/phnom-kulen-region-v3/phnom-kulen-normal.glb",
    heritageUltraModel: "/models/local/phnom-kulen-region-v3/phnom-kulen-ultra.glb",
    overview: { id: 'overview', title: 'Phnom Kulen mountain area', info: '', target: [0, 3, 0], camera: [43, 49, 58] },
    sceneryGroundY: -0.55,
    sceneryShadowNormalBias: 0.025,
    overviewOnly: true,
    aerial: true,
    live: true,
    pois: KULEN_POIS,
  },
  {
    id: "pre-rup",
    name: "Pre Rup",
    khmer: "ប្រាសាទប្រែរូប", // Site name; native-language editorial review pending.
    province: "Siem Reap",
    blurb: "A brick temple-mountain at Angkor, with stepped laterite terraces and five towers on its upper platform.",
    lat: 13.43547,
    lng: 103.92045,
    model: "/models/local/pre-rup-refined-v2/pre-rup-normal.glb",
    heritageUltraModel: "/models/local/pre-rup-refined-v2/pre-rup-ultra.glb",
    overview: { id: 'overview', title: 'Pre Rup', info: '', target: [0, 3.4, 1], camera: [27, 28, 36] },
    aerial: true,
    terrainWalking: true,
    walkStart: [0, 1.29, 13.95],
    sceneryGroundY: -0.48,
    sceneryShadowNormalBias: 0.025,
    live: true,
    pois: [
      {
        id: "terraced-ascent",
        title: "Terraced Ascent",
        info: "Three ascending terraces support Pre Rup's upper sanctuaries. The lower tiers use laterite, with sandstone on the upper platform and stairs. This original Blender study simplifies dimensions and weathering; it is not a surveyed reconstruction or a real-world access guide.",
        target: [0, 6.5, 0],
        camera: [0, 1.6, 15.5],
      },
      {
        id: "five-sanctuaries",
        title: "Five Upper Sanctuaries",
        info: "Five towers occupy the upper platform, with a central sanctuary and four corner towers. The brick forms shown here are illustrative; fine carvings and conservation details are not reproduced.",
        target: [0, 9.5, 0],
        camera: [10, 10, 12],
      },
      {
        id: "eastern-towers",
        title: "Eastern Tower Ruins",
        info: "Two groups of tower bases flank the eastern approach. Five towers survive, with one position represented by its base. Their unequal, damaged upper forms distinguish this forecourt from the five sanctuaries on the pyramid. Damage and spacing here are approximate.",
        target: [8, 3.4, 20.3],
        camera: [2, 2.2, 23.2],
      },
      {
        id: "courtyard-libraries",
        title: "Libraries and Stone Basin",
        info: "Two library-type buildings flank the eastern axis. A rectangular stone basin stands before the main stair. Its original purpose is uncertain; the popular funerary interpretation should not be treated as established fact. Decorative figures and inscriptions are not reproduced in this study.",
        target: [0, .4, 14.65],
        camera: [3, 2, 15.2],
      },
    ],
  },
  {
    id: "oudong",
    name: "Oudong",
    khmer: "ឧដុង្គ",
    province: "Kampong Speu",
    blurb:
      "The former royal capital of Cambodia, known for its sacred hill crowned with historic stupas housing the ashes of former Khmer kings.",
    lat: 11.815,
    lng: 104.743,
    model: "/models/local/oudong-refined-v2/oudong-normal.glb",
    heritageUltraModel: "/models/local/oudong-refined-v2/oudong-ultra.glb",
    overview: { id: 'overview', title: 'Oudong', info: '', target: [0, 3, -5], camera: [24, 25, 32] },
    aerial: true,
    sceneryGroundY: -0.35,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    live: true,
    pois: [
      {
        id: "oudong-mountain",
        title: "Oudong Mountain",
        info: "The 'Mountain of the Royal Treasures', accessed by a climb of over 500 steps, offering scenic views.",
        target: [0, 7, -2],
        camera: [0, 3, 15],
      },
      {
        id: "royal-stupas",
        title: "Royal Stupas",
        info: "Various stupas on the hill containing the remains of kings, each featuring distinct architectural styles and carvings.",
        target: [0, 7.5, -12],
        camera: [0, 9, -5],
      },
    ],
  },
];

export const SPOTS: Spot[] = SITE_DEFINITIONS.map((site) => ({
  ...site,
  pois: site.pois?.map((poi) => ({ ...poi, ...(site.heritageUltraModel ? HERITAGE_HOTSPOTS[site.id]?.[poi.id] : undefined) })),
}));
