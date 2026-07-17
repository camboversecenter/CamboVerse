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

ARTIFACTS.push({
  id: "roneat",
  khmer: "រនាតឯក",
  name: "Roneat Ek",
  english: "Lead Khmer xylophone",
  category: "Traditional instrument",
  blurb: "The lead xylophone of the Pinpeat — tuned bars over a carved, boat-shaped resonator.",
  story:
    "រនាតឯក (Roneat Ek) is the leading xylophone of the Pinpeat, Cambodia's classical ensemble for temple, court, and shadow-puppet (Sbek Thom) music. Twenty-one tuned bars of bamboo or hardwood are suspended by cord over a graceful boat-shaped wooden resonator — often richly carved and gilded, with ends that sweep up like naga tails. The player strikes the bars with two mallets: hard mallets for a bright, ringing tone, padded ones for a soft, mellow sound. As the 'ek' (leader), it carries the fast, ornamented melody the ensemble follows, answered by its deeper-toned partner, the Roneat Thung.",
  utilities: [
    "21 tuned bars of bamboo or hardwood, struck with two mallets",
    "The carved, gilded boat-shaped body resonates and warms the sound",
    "Leads the melody in the Pinpeat ensemble (temple, court, shadow theatre)",
    "Hard mallets give a bright tone; padded mallets a mellow one",
    "Paired with the lower-pitched Roneat Thung",
  ],
  origin: "The Pinpeat ensemble — Cambodia's classical court and temple music.",
  model: "/models/roneat.glb",
  pois: [
    {
      id: "bars",
      title: "The tuned bars",
      khmer: "ដងសំឡេង",
      info: "Twenty-one bars of bamboo or hardwood, each shaved to a precise pitch and hung on cords. Longer, thicker bars sound lower. The player strikes them with two mallets to carry the melody.",
      target: [0, 1.57, 0],
      camera: [0.6, 2.5, 2.6],
    },
    {
      id: "body",
      title: "The resonator",
      khmer: "តួធុង",
      info: "The hollow, boat-shaped wooden body sits beneath the bars and resonates their sound, giving the Roneat Ek its warm, ringing voice. It is often beautifully carved and gilded.",
      target: [0, 1.2, 0],
      camera: [2.6, 1.7, 3.0],
    },
    {
      id: "ends",
      title: "The naga-tail ends",
      khmer: "ក្បាច់ចុង",
      info: "The ends of the body sweep upward in carved, gilded flourishes like naga tails — a reminder that a Khmer instrument is also a work of art and devotion, not only a tool for sound.",
      target: [1.28, 1.72, 0],
      camera: [3.2, 2.1, 2.6],
    },
    {
      id: "mallets",
      title: "The mallets",
      khmer: "ដៃវាយ",
      info: "Two mallets play the bars. Hard, unpadded heads give a bright, brilliant tone for lively pieces; padded heads give a soft, mellow sound for gentle ones.",
      target: [0.15, 1.63, 0.3],
      camera: [1.6, 2.2, 2.8],
    },
  ],
});

ARTIFACTS.push({
  id: "skor",
  khmer: "ស្គរ",
  name: "Skor",
  english: "Khmer barrel drum",
  category: "Traditional instrument",
  blurb: "The two-headed barrel drum that gives Khmer music its pulse.",
  story:
    "ស្គរ (skor) are the drums that give Khmer music its pulse. This two-headed barrel drum is carved from a single log of hardwood and headed at both ends with stretched animal hide, laced and tensioned with cord to tune its pitch. In the Pinpeat ensemble the drums mark the rhythm the whole group locks to; drums also lead ceremonies and weddings, spur on the racing paddlers of the Water Festival (Bon Om Touk), and drive the ring at Kun Khmer boxing. Played with the hands or with sticks, one drummer can voice both a high, sharp 'crack' and a deep 'boom' from the two heads.",
  utilities: [
    "A two-headed barrel drum carved from hardwood, headed with animal hide",
    "Cord lacing tensions the skins and tunes the pitch",
    "Keeps the rhythm the Pinpeat ensemble locks to",
    "Also drives weddings, the Water Festival, and Kun Khmer boxing",
    "Played with the hands or sticks — high and low tones from the two heads",
  ],
  origin: "Central to the Pinpeat ensemble and to Khmer ceremony, festival, and sport.",
  model: "/models/skor.glb",
  pois: [
    {
      id: "head",
      title: "The drumhead",
      khmer: "ស្បែក",
      info: "Each end is a head of stretched animal hide. Struck with the hand or a stick, it sounds the beat; the tighter the skin, the higher the pitch.",
      target: [0.9, 1.25, 0],
      camera: [3.0, 1.7, 2.4],
    },
    {
      id: "barrel",
      title: "The barrel body",
      khmer: "តួស្គរ",
      info: "The body is a hardwood barrel, traditionally hollowed from a single log. Its shape and cavity resonate the beat into a full, deep tone.",
      target: [0, 1.25, 0],
      camera: [2.6, 1.7, 3.1],
    },
    {
      id: "lacing",
      title: "The lacing",
      khmer: "ខ្សែស្ទឹង",
      info: "Cords laced between the two heads pull the skins tight. Tightening or loosening the lacing tunes the drum — the drummer's way of setting its voice.",
      target: [0, 1.6, 0.5],
      camera: [2.2, 2.1, 3.0],
    },
    {
      id: "role",
      title: "The pulse of the music",
      khmer: "ចង្វាក់",
      info: "In the Pinpeat, the skor keeps the rhythm the whole ensemble follows. Beyond the ensemble, drums lead weddings and festivals, race the Water Festival boats, and drive Kun Khmer boxing.",
      target: [0, 1.25, 0],
      camera: [2.4, 1.9, 3.3],
    },
  ],
});

ARTIFACTS.push({
  id: "roteh-koh",
  khmer: "រទេះគោ",
  name: "Roteh Koh",
  english: "Khmer ox-cart",
  category: "Traditional transport",
  blurb: "The iconic wooden ox-cart that has transported rice and people across the Cambodian countryside for centuries.",
  story:
    "The រទេះគោ (Roteh Koh) is the traditional ox-drawn cart of Cambodia. Built entirely of hardwood by village craftsmen, its large spoked wheels and sturdy bed were designed to navigate the deep ruts, mud, and dust of rural roads where modern vehicles might fail. Pulled by a pair of strong oxen (or water buffalo), it has carried harvests of rice, supplies, and families for generations. Though modern tractors are replacing it today, the ox-cart remains a powerful symbol of Khmer agricultural life and rural endurance.",
  utilities: [
    "Used for transporting rice harvests, firewood, and goods",
    "Navigates deep mud and rough country roads better than many vehicles",
    "Pulled by a matched pair of oxen or water buffalo",
    "Hand-built entirely of local hardwoods by skilled village wrights",
  ],
  origin: "Constructed in rural villages across Cambodia, though increasingly rare today.",
  model: "/models/roteh-koh.glb",
  pois: [
    {
      id: "wheels",
      title: "The wooden wheels",
      khmer: "កង់រទេះ",
      info: "Large, sturdy wooden wheels lift the cart high above deep mud and flooded roads. Historically made with a massive wooden hub and spokes, bound by an iron rim.",
      target: [0.6, 0.5, 0],
      camera: [1.8, 1.0, 1.5],
    },
    {
      id: "bed",
      title: "The cart bed",
      khmer: "ទ្រុងរទេះ",
      info: "The slatted wooden bed carries heavy loads of unhusked rice (paddy), tools, or passengers. Side rails keep the cargo secure on bumpy trails.",
      target: [0, 0.6, 0.3],
      camera: [1.5, 1.6, 2.2],
    },
    {
      id: "yoke",
      title: "The drawpole & yoke",
      khmer: "នឹម",
      info: "A long central drawpole extends forward, terminating in a wooden crossbar yoke. This rests on the necks of two oxen, transferring their pulling power to the cart.",
      target: [0, 0.5, -2.1],
      camera: [1.2, 1.2, -3.5],
    },
  ],
});

ARTIFACTS.push({
  id: "krama",
  khmer: "ក្រមា",
  name: "Krama",
  english: "Traditional woven scarf",
  category: "Traditional clothing",
  blurb: "The iconic checkered scarf of Cambodia — worn, wrapped, tied, and used for everything.",
  story:
    "The ក្រមា (krama) is the national symbol of Khmer identity. This sturdy, checkered cotton scarf is woven on wooden handlooms in villages across the country, most classically in red-and-white or blue-and-white. It is infinitely versatile: a farmer wraps it around their head to block the sun, a mother fashions it into a hammock for her baby, a martial artist ties it around their waist, and bathers use it as a towel or modesty wrap. Softening with every wash, a good krama lasts for years. It is a piece of clothing, a tool, a bag, and a symbol of rural pride all woven into one.",
  utilities: [
    "Worn as a sun-shield, sweatband, or dust mask in the fields",
    "Tied as a sturdy baby hammock or carrying sling",
    "Used as a bathing wrap or quick-drying towel",
    "Woven by hand on traditional wooden looms in Khmer villages",
  ],
  origin: "Woven in villages nationwide, especially in Takeo and Kampong Cham provinces.",
  model: "/models/krama.glb",
  pois: [
    {
      id: "checkers",
      title: "The checkered weave",
      khmer: "ក្រឡា",
      info: "The classic krama is woven in a grid of red-and-white or blue-and-white. The sturdy cotton weave softens with age and absorbs water quickly.",
      target: [0, 0.55, 0],
      camera: [0, 1.2, 1.2],
    },
    {
      id: "folds",
      title: "The folds",
      khmer: "ផ្នត់",
      info: "Lightweight but large, a krama can be folded small to pack, or opened wide to wrap around the shoulders or waist.",
      target: [0.4, 0.5, 0],
      camera: [1.2, 0.8, 1.0],
    },
  ],
});

export function artifactById(id: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.id === id);
}
