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
    pois: [
      {
        id: "heart-of-angkor-thom",
        title: "Heart of Angkor Thom",
        khmer: "បេះដូងអង្គរធំ",
        info: "The Bayon stands at the exact centre of Angkor Thom, Jayavarman VII's walled capital of the late 12th century — three kilometres on a side, entered through five monumental gates whose towers echo these same serene faces.",
        target: [0, 1.2, 0],
        camera: [-4.4, 3.4, 5.2],
      },
      {
        id: "bas-relief-galleries",
        title: "Bas-relief Galleries",
        khmer: "ថែវចម្លាក់",
        info: "The outer gallery carries over a kilometre of bas-reliefs with thousands of figures — not only gods and battles (including the naval battle against the Cham on the Tonlé Sap) but everyday Khmer life: markets, cockfights, cooking pots, games.",
        target: [0, 0.5, 1.86],
        camera: [1.3, 1.1, 4.2],
      },
      {
        id: "face-towers",
        title: "The Face Towers",
        khmer: "ប៉មព្រះភ័ក្ត្រ",
        info: "Colossal serene faces gaze out in all four directions from the towers — traditionally counted as 54 towers bearing over 200 faces, of which around 37 towers still stand. No other temple on Earth looks like this.",
        target: [0.93, 1.5, 0.9],
        camera: [2.5, 1.8, 2.9],
      },
      {
        id: "smile-of-angkor",
        title: "The Smile of Angkor",
        khmer: "ស្នាមញញឹមអង្គរ",
        info: "Whose faces are they? Scholars still debate — the bodhisattva of compassion Avalokiteshvara, King Jayavarman VII himself, or both fused into one. Their gentle half-smile has become known as 'the smile of Angkor'.",
        target: [-1.18, 1.4, 0],
        camera: [-2.9, 1.7, 2.2],
      },
      {
        id: "central-sanctuary",
        title: "Central Sanctuary",
        khmer: "ប្រាសាទកណ្ដាល",
        info: "Unusually for a Khmer temple, the central sanctuary is circular. A great statue of the Buddha sheltered by the naga once sat here; smashed in a later Hindu reaction, it was recovered from the sanctuary shaft in 1933 and restored.",
        target: [0, 2.1, 0],
        camera: [2.4, 2.6, 4.6],
      },
    ],
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
    pois: [
      {
        id: "rajavihara",
        title: "Rajavihara — the Royal Monastery",
        khmer: "រាជវិហារ",
        info: "Jayavarman VII founded this temple in 1186 as Rajavihara, 'the royal monastery', dedicating its central image to his mother in the form of Prajnaparamita, the perfection of wisdom. Its founding stele records thousands of attendants — a living monastery-city, not a silent ruin.",
        target: [0.3, 1.2, 0],
        camera: [2.1, 1.5, 2.6],
      },
      {
        id: "galleried-enclosures",
        title: "The Galleried Enclosures",
        khmer: "កំពែងថែវ",
        info: "Unlike the temple-mountains, Ta Prohm is a 'flat' monastery: rings of galleried enclosures, courtyards and towers spreading wide under the canopy — a plan built for a great community of monks, teachers and students.",
        target: [-1.68, 0.8, 0],
        camera: [-3.2, 1.3, 1.9],
      },
      {
        id: "strangler-roots",
        title: "The Strangler Roots",
        khmer: "ឫសឈើយក្ស",
        info: "Giant silk-cotton and strangler-fig trees grip the walls, their roots poured like wax over lintels and galleries. Nowhere else is the embrace of temple and forest so complete — this is the image that made Ta Prohm famous.",
        target: [0.72, 1.2, 1.32],
        camera: [2.0, 1.4, 3.4],
      },
      {
        id: "fallen-stones",
        title: "Fallen Stones",
        khmer: "គំនរថ្ម",
        info: "Tumbled blocks lie where the forest brought them down. Conservators made a deliberate choice here: to stabilise rather than rebuild, keeping Ta Prohm much as the early explorers found it — the one great temple left to show how the forest held Angkor.",
        target: [1.32, 0.55, -0.72],
        camera: [2.7, 1.1, 0.9],
      },
      {
        id: "movie-star-temple",
        title: "A Movie-Star Temple",
        khmer: "ប្រាសាទតារាភាពយន្ត",
        info: "Ta Prohm reached the world's screens in 2001, when scenes of Lara Croft: Tomb Raider were filmed among these roots — and the 'Tomb Raider tree' has drawn visitors from around the world ever since.",
        target: [-1.14, 1.3, -0.96],
        camera: [-2.7, 1.6, 0.6],
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
    model: "/models/banteay-srei.glb",
    live: true,
    pois: [
      {
        id: "pink-sandstone",
        title: "Rose-Pink Sandstone",
        khmer: "ថ្មភក់ផ្កាឈូក",
        info: "Banteay Srei is carved from hard rose-pink sandstone that holds detail like wood. Its ornament is so deep and so fine that it is often called the 'jewel of Khmer art' — a masterwork in miniature, its doorways barely shoulder-high.",
        target: [0, 1.1, -0.19],
        camera: [1.5, 1.3, 2.1],
      },
      {
        id: "counselors-temple",
        title: "A Counselor's Temple",
        khmer: "ប្រាសាទព្រាហ្មណ៍",
        info: "Uniquely, this temple was raised not by a king but by a brahmin: Yajnavaraha, counselor to King Rajendravarman and tutor to the future Jayavarman V, consecrated it to Shiva in 967 under the name Tribhuvanamahesvara — 'great lord of the threefold world'.",
        target: [-0.9, 1.0, -0.19],
        camera: [-2.0, 1.3, 1.7],
      },
      {
        id: "two-libraries",
        title: "The Two Libraries",
        khmer: "បណ្ណាល័យទាំងពីរ",
        info: "The pediments of the two libraries are among the most celebrated carvings in all Khmer art: the demon-king Ravana shaking Mount Kailasa as Shiva sits enthroned above, and Indra pouring rain over the burning Khandava forest.",
        target: [0.81, 0.85, 0.87],
        camera: [2.0, 1.2, 2.5],
      },
      {
        id: "citadel-of-women",
        title: "Citadel of the Women",
        khmer: "បន្ទាយស្រី",
        info: "The modern name means 'citadel of the women' — folk tradition says the carving is too fine to have been cut by the hand of a man. Kneeling guardian figures with animal heads watch its courtyards; today's are replicas, the originals kept safe in museums.",
        target: [0, 0.65, 1.24],
        camera: [0.8, 1.1, 3.1],
      },
      {
        id: "stolen-returned-reborn",
        title: "Stolen, Returned, Reborn",
        khmer: "រស់ឡើងវិញ",
        info: "In 1923 the young André Malraux — later France's minister of culture — was arrested for removing its devata carvings, which were recovered. The scandal spurred protection, and in the 1930s Banteay Srei became the first Angkor monument restored by anastylosis: dismantled and rebuilt stone by original stone.",
        target: [0.9, 1.0, -0.19],
        camera: [2.1, 1.4, 1.2],
      },
    ],
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
    pois: [
      {
        id: "long-ascent",
        title: "The Long Ascent",
        khmer: "ផ្លូវឡើងភ្នំ",
        info: "Most Khmer temples face east; Preah Vihear instead runs 800 metres along a north–south axis, climbing the ridge through a chain of stairways and causeways — a pilgrimage built into the mountain itself.",
        target: [0, 1.5, 1.6],
        camera: [1.5, 2.2, 3.4],
      },
      {
        id: "five-gopuras",
        title: "The Five Gopuras",
        khmer: "គោបុរៈទាំងប្រាំ",
        info: "Five cross-shaped gopura pavilions mark the stages of the ascent, each framing the sky until the sanctuary finally appears. Their pediments carry superb carvings — including a famous Churning of the Sea of Milk.",
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
        info: "Behind the sanctuary the world simply ends: from a summit 525 metres high, a sheer cliff of the Dângrêk escarpment falls away to the Cambodian plain unrolled far below — one of the great views of Southeast Asia.",
        target: [0, 1.2, -2.6],
        camera: [0.8, 2.4, -0.4],
      },
      {
        id: "world-heritage",
        title: "World Heritage on the Heights",
        khmer: "បេតិកភណ្ឌពិភពលោក",
        info: "The International Court of Justice affirmed in 1962 that the temple stands on Cambodian soil, and in 2008 Preah Vihear was inscribed as a UNESCO World Heritage Site — a clifftop sanctuary shared with the world.",
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
      "The royal residence and the Silver Pagoda in the capital, Phnom Penh — living Khmer heritage.",
    lat: 11.5645,
    lng: 104.9284,
    model: "/models/royal-palace.glb",
    live: true,
    pois: [
      {
        id: "facing-chaktomuk",
        title: "Facing Chaktomuk",
        khmer: "ទន្លេចតុមុខ",
        info: "King Norodom moved the capital from Oudong and began this palace in 1866, siting it to face the Chaktomuk — the 'four faces', where the Mekong, Bassac and Tonlé Sap rivers meet. It remains the residence of Cambodia's kings today.",
        target: [0, 0.85, 1.8],
        camera: [0.6, 1.7, 4.4],
      },
      {
        id: "throne-hall",
        title: "The Throne Hall",
        khmer: "ព្រះទីនាំងទេវាវិនិច្ឆ័យ",
        info: "The Throne Hall — Preah Tineang Tevea Vinichhay, the hall of divine judgement — is where coronations and great royal ceremonies are held. The present building, inaugurated in 1919, replaced an earlier wooden hall.",
        target: [0, 1.3, 0.4],
        camera: [1.7, 1.6, 2.9],
      },
      {
        id: "golden-spire",
        title: "The Golden Spire",
        khmer: "កំពូលមាស",
        info: "The Throne Hall's gilded spire rises 59 metres, crowned with a four-faced pinnacle that echoes the Bayon — the serene gaze of Angkor watching over the modern capital.",
        target: [0, 3.6, 0],
        camera: [2.8, 3.4, 4.6],
      },
      {
        id: "moonlight-pavilion",
        title: "Moonlight Pavilion",
        khmer: "ព្រះទីនាំងច័ន្ទឆាយា",
        info: "The open-air Chanchhaya Pavilion — 'moonlight' — sits on the palace wall facing the river. Royal dancers have performed here by night, and kings have addressed the city from its balcony.",
        target: [-1.7, 0.8, 1.8],
        camera: [-2.9, 1.5, 3.5],
      },
      {
        id: "silver-pagoda",
        title: "The Silver Pagoda",
        khmer: "វត្តព្រះកែវមរកត",
        info: "Beside the palace stands Wat Preah Keo Morakot, the Silver Pagoda, floored with thousands of solid-silver tiles. It keeps the Emerald Buddha and a life-size gold Buddha set with more than two thousand diamonds.",
        target: [2.3, 0.7, 1.0],
        camera: [3.6, 1.5, 2.8],
      },
    ],
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
  {
    id: "sambor-prei-kuk",
    name: "Sambor Prei Kuk",
    khmer: "សំបូរព្រៃគុក",
    province: "Kampong Thom",
    blurb:
      "The archaeological site of ancient Ishanapura, capital of the Chenla Empire, featuring pre-Angkorian brick temples scattered through serene forest.",
    lat: 12.8708,
    lng: 105.0431,
    model: "/models/sambor-prei-kuk.glb",
    live: true,
    pois: [
      {
        id: "prasat-sambor",
        title: "Prasat Sambor",
        khmer: "ប្រាសាទសំបូរ",
        info: "The principal north temple group, dedicated to an incarnation of Shiva (Gambhireshvara), featuring well-preserved 7th-century brick carvings.",
        target: [0, 1.5, -2],
        camera: [3, 2, 5],
      },
      {
        id: "prasat-tao",
        title: "Prasat Tao (Lion Temple)",
        khmer: "ប្រាសាទតោ",
        info: "The largest of the central complexes, famed for the magnificent, intricately carved stone lion sculptures guarding its doorways.",
        target: [0, 1.0, -1],
        camera: [4, 1.5, 4],
      },
      {
        id: "prasat-yeay-poan",
        title: "Prasat Yeay Poan",
        khmer: "ប្រាសាទយាយពាន់",
        info: "A deeply atmospheric southern temple group where ancient tree roots grow into and embrace the 7th-century brick gateways.",
        target: [0, 2.0, 0],
        camera: [2, 1.5, 3],
      },
      {
        id: "flying-palaces",
        title: "The Flying Palaces",
        khmer: "វិមានអាកាស",
        info: "The brick towers of Ishanapura carry carved 'flying palaces' — miniature heavenly mansions with tiny inhabitants looking out — among the earliest reliefs in which Khmer architecture depicts itself. The octagonal tower plan here is unique in Southeast Asia.",
        target: [0, 1.6, 0],
        camera: [2.6, 1.8, 3.4],
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
    model: "/models/koh-ker.glb",
    live: true,
    pois: [
      {
        id: "prasat-thom",
        title: "Prasat Thom",
        khmer: "ប្រាសាទធំ",
        info: "The centerpiece of Koh Ker, a colossal 36-metre-tall, seven-tiered sandstone pyramid. It offers sweeping views of the surrounding forest from its peak.",
        target: [0, 2.5, 0],
        camera: [4, 1.5, 6],
      },
      {
        id: "summit-shrine",
        title: "The Summit Shrine",
        khmer: "ទីសក្ការៈកំពូល",
        info: "The shrine at the pyramid's summit held the state god of Jayavarman IV's capital, Tribhuvanesvara — 'lord of the threefold world', most likely in the form of a colossal linga raised high above the forest.",
        target: [0, 3.6, 0],
        camera: [1.8, 4.2, 3.0],
      },
      {
        id: "brief-capital",
        title: "A Capital for One Generation",
        khmer: "អតីតរាជធានី",
        info: "For a single generation (928–944) the empire's capital moved here from Angkor under Jayavarman IV. Scores of sanctuaries were raised in barely two decades — famous for the largest and boldest sculpture the Khmer Empire ever produced.",
        target: [0, 1.5, 0],
        camera: [-4.5, 2.5, 5.0],
      },
    ],
  },
];
