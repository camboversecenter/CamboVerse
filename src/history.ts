/**
 * "Back in Time" — a journey through the ages of Cambodia. Each era gives the
 * visitor a sense of the generation that lived it: what the land and its people
 * were like, and what was happening at the heritage sites. Educational, and
 * respectful of a difficult modern history.
 *
 * `mood` tints the scene behind the time-travel overlay so each age *feels*
 * different. `atSite` optionally colours the story for the site you're standing in.
 */
export interface Era {
  id: string;
  name: string;
  khmer: string;
  /** Human-readable span. */
  years: string;
  /** Short "which generation" framing. */
  age: string;
  /** Mood colour (scene veil + accents). */
  mood: string;
  blurb: string;
  story: string;
  highlights: string[];
  /** What the specific site was like in this era, keyed by spot id. */
  sites?: Record<string, string>;
  /** A short quiz — answer all correctly to earn this era's learning credential. */
  quiz?: QuizQuestion[];
}

export interface QuizQuestion {
  q: string;
  choices: string[];
  /** Index of the correct choice. */
  answer: number;
}

export const ERAS: Era[] = [
  {
    id: "funan",
    name: "Funan",
    khmer: "នគរភ្នំ",
    years: "1st–6th century",
    age: "The first kingdom",
    mood: "#2f7d78",
    blurb: "Cambodia's earliest known kingdom — a maritime power on the Mekong delta.",
    story:
      "Long before Angkor, the kingdom of Funan traded with India and China from ports like Óc Eo. Indian ideas — Hinduism, Buddhism, Sanskrit and writing — arrived by sea and began to shape Khmer culture. This is the deep root of everything that follows.",
    highlights: ["Maritime trade with India & China", "Arrival of Hindu–Buddhist culture", "Canals and the port of Óc Eo"],
    quiz: [
      { q: "Funan traded by sea mainly with…", choices: ["India and China", "Europe and Africa", "Japan and Korea"], answer: 0 },
      { q: "What arrived through Funan's maritime trade?", choices: ["Hindu–Buddhist culture", "Gunpowder", "The printing press"], answer: 0 },
    ],
  },
  {
    id: "chenla",
    name: "Chenla",
    khmer: "ចេនឡា",
    years: "6th–8th century",
    age: "The rise inland",
    mood: "#6b7c53",
    blurb: "Successor kingdoms that moved power inland and built the first stone temples.",
    story:
      "As Funan faded, the inland kingdoms of Chenla rose along the Mekong. Kings raised the first brick-and-stone Hindu temples and carved elegant Sanskrit inscriptions — the confident beginnings of Khmer temple architecture.",
    highlights: ["First stone temples (Sambor Prei Kuk)", "Sanskrit inscriptions", "Foundations of Khmer kingship"],
    quiz: [
      { q: "Chenla is known for building the first…", choices: ["stone temples", "railways", "glass towers"], answer: 0 },
      { q: "Chenla's inscriptions were written in…", choices: ["Sanskrit", "Latin", "Chinese"], answer: 0 },
    ],
    sites: {
      "sambor-prei-kuk":
        "You stand in Ishanapura at its height — King Ishanavarman I's capital in the early 7th century. Its brick towers are freshly raised, their walls carved with 'flying palaces', and the court receives envoys from distant kingdoms.",
    },
  },
  {
    id: "angkor",
    name: "The Angkor Empire",
    khmer: "ចក្រភពអង្គរ",
    years: "802–1431",
    age: "The golden age",
    mood: "#c8912e",
    blurb: "The Khmer Empire at its height — the greatest city on Earth of its day.",
    story:
      "In 802 Jayavarman II declared a unified empire. Over six centuries the Khmer built Angkor: vast reservoirs, roads, and hundreds of temples. Suryavarman II raised Angkor Wat (~1113); Jayavarman VII built the Bayon with its serene faces. A million people may have lived here — the largest pre-industrial city in the world.",
    highlights: ["Angkor Wat built (~1113)", "The Bayon & Angkor Thom (~1181)", "Immense barays and waterworks", "A metropolis of ~1 million"],
    quiz: [
      { q: "Who built Angkor Wat around 1113?", choices: ["Suryavarman II", "Jayavarman VII", "Lady Penh"], answer: 0 },
      { q: "The Bayon, with its serene stone faces, was built by…", choices: ["Jayavarman VII", "Suryavarman II", "the French"], answer: 0 },
      { q: "Banteay Srei, the 'jewel of Khmer art', was consecrated in 967 by…", choices: ["a brahmin counselor, Yajnavaraha", "a French governor", "Lady Penh"], answer: 0 },
      { q: "For a single generation (928–944) the empire's capital moved to…", choices: ["Koh Ker", "Phnom Penh", "Longvek"], answer: 0 },
    ],
    sites: {
      "angkor-wat":
        "You are standing at Angkor Wat's very birth: Suryavarman II raises it around 1113 as a temple to Vishnu, its towers gleaming with gilt and its galleries freshly carved.",
      "wat-phnom":
        "This hill by the Mekong is not yet a temple in the Angkor age — Phnom Penh's story is still centuries away.",
      bayon:
        "You stand in Jayavarman VII's brand-new capital. Around 1200 the Bayon rises at its exact centre, its face towers freshly cut — the empire at its most confident.",
      "ta-prohm":
        "Rajavihara in its glory: newly consecrated (1186) to the king's mother, humming with monks and students — its stele records thousands who serve here. The forest is still just a forest, beyond the walls.",
      "banteay-srei":
        "Consecrated in 967, more than a century before Angkor Wat — the brahmin Yajnavaraha's carvers are achieving a fineness in pink sandstone that will never be surpassed.",
      "preah-vihear":
        "Pilgrims climb the great stairway to Sikharesvara's clifftop sanctuary — kings from the 9th century onward keep building on the mountain, Suryavarman I and II above all.",
      "koh-ker":
        "For a single generation (928–944) this is the capital of the empire — Jayavarman IV raises the seven-tiered pyramid of Prasat Thom, the boldest structure of its age.",
      "royal-palace":
        "Phnom Penh is a riverside village in the Angkor age — the palace's story begins centuries later, in 1866.",
    },
  },
  {
    id: "middle",
    name: "The Middle Period",
    khmer: "សម័យកណ្ដាល",
    years: "1431–1863",
    age: "After Angkor",
    mood: "#8a6b46",
    blurb: "The court moves south; a smaller kingdom endures between powerful neighbours.",
    story:
      "After the capital left Angkor, power shifted south to Longvek, Oudong and Phnom Penh. Trade with the wider world continued and Theravada Buddhism deepened, but the kingdom was pressed between rising neighbours — a long, resilient middle age.",
    highlights: ["Capitals at Longvek & Oudong", "Theravada Buddhism flourishes", "Maritime trade continues"],
    quiz: [
      { q: "After Angkor, the capital moved south to…", choices: ["Longvek & Oudong", "Bangkok & Hanoi", "Beijing"], answer: 0 },
      { q: "Which religion deepened in this period?", choices: ["Theravada Buddhism", "Islam", "Shinto"], answer: 0 },
    ],
    sites: {
      "angkor-wat":
        "Angkor Wat is never truly abandoned — Buddhist monks tend it, and it becomes a revered Theravada temple visited by pilgrims.",
      "wat-phnom":
        "Wat Phnom's story begins here: by legend, in 1372 Lady Penh finds sacred images in the river and raises a shrine on this hill — giving Phnom Penh (‘Penh's hill’) its name.",
      bayon:
        "The court has gone south; the forest closes gently over Angkor Thom. The Bayon's faces gaze out of the green — never forgotten, still visited by monks and pilgrims.",
      "ta-prohm":
        "The great monastery falls quiet, and the giant trees take root in its walls — the famous embrace of stone and forest begins in these centuries.",
      "royal-palace":
        "King Ponhea Yat brings the court to Phnom Penh in the 15th century — the city's first royal age. Capitals move between Longvek, Oudong and Phnom Penh; the present palace is still to come.",
    },
  },
  {
    id: "french",
    name: "French Protectorate",
    khmer: "អាណាព្យាបាលបារាំង",
    years: "1863–1953",
    age: "Colonial era",
    mood: "#5b6b82",
    blurb: "Cambodia under French rule — and the world's rediscovery of Angkor.",
    story:
      "In 1863 Cambodia became a French protectorate. Roads, schools and the modern city of Phnom Penh took shape, while French and Khmer scholars mapped and began restoring Angkor, bringing it to global attention. National feeling grew toward the century's end.",
    highlights: ["Angkor studied & restored", "Modern Phnom Penh develops", "Rising Khmer nationalism"],
    quiz: [
      { q: "In which year did Cambodia become a French protectorate?", choices: ["1863", "1953", "1431"], answer: 0 },
      { q: "What happened to Angkor in this era?", choices: ["It was studied and restored", "It was demolished", "It was moved to France"], answer: 0 },
      { q: "The first Angkor temple rebuilt stone-by-stone by anastylosis (1930s) was…", choices: ["Banteay Srei", "Angkor Wat", "the Bayon"], answer: 0 },
    ],
    sites: {
      "angkor-wat":
        "French explorers document Angkor Wat and clear the forest from its galleries; restoration begins and the temple's fame spreads around the world.",
      "wat-phnom":
        "The French lay out their capital around this hill, and Wat Phnom's great white stupa is rebuilt to its present form (1926) — the city literally centred on it.",
      "banteay-srei":
        "Rediscovered in 1914. After André Malraux is arrested in 1923 for removing its carvings, protection tightens — and in the 1930s it becomes the first Angkor temple rebuilt by anastylosis.",
      "royal-palace":
        "King Norodom moves the capital from Oudong in 1866 and raises this palace facing the four-armed river; the Throne Hall in its present form is inaugurated in 1919.",
    },
  },
  {
    id: "independence",
    name: "Independence & Sangkum",
    khmer: "ឯករាជ្យ",
    years: "1953–1970",
    age: "Your grandparents' time",
    mood: "#c96f7a",
    blurb: "A newly independent nation — and a golden age of Khmer arts.",
    story:
      "Cambodia won full independence in 1953 under King Norodom Sihanouk. The Sangkum years brought a flourishing of Khmer cinema, music and architecture (the New Khmer style) — an optimistic, creative generation and a proud young nation.",
    highlights: ["Independence in 1953", "Golden age of film & music", "New Khmer architecture"],
    quiz: [
      { q: "Cambodia won full independence in…", choices: ["1953", "1863", "1979"], answer: 0 },
      { q: "The Sangkum years are remembered as a golden age of…", choices: ["film and music", "space travel", "steam trains"], answer: 0 },
    ],
  },
  {
    id: "war",
    name: "War & the Khmer Rouge",
    khmer: "សង្គ្រាម និងខ្មែរក្រហម",
    years: "1970–1979",
    age: "A generation of tragedy",
    mood: "#5c5c5c",
    blurb: "Civil war and the Khmer Rouge — remembered so it is never repeated.",
    story:
      "Civil war gave way in 1975 to the Khmer Rouge, whose brutal rule until 1979 caused the deaths of some 1.7–2 million Cambodians and immense loss to families, culture and knowledge. It is remembered with sorrow and dignity — a history carried by survivors and honoured so future generations learn from it.",
    highlights: ["1975–1979 Khmer Rouge period", "Immense human loss", "Remembrance & resilience"],
    quiz: [
      { q: "The Khmer Rouge ruled Cambodia from…", choices: ["1975 to 1979", "1953 to 1970", "1992 to 2000"], answer: 0 },
      { q: "This difficult history is honoured so that…", choices: ["future generations learn from it", "it is forgotten", "it is repeated"], answer: 0 },
    ],
  },
  {
    id: "modern",
    name: "Modern Cambodia",
    khmer: "កម្ពុជាសម័យទំនើប",
    years: "1979–today",
    age: "Your generation",
    mood: "#4c8a3f",
    blurb: "Recovery and rebirth — heritage restored and a nation looking forward.",
    story:
      "From 1979 Cambodia slowly rebuilt. Peace, the return of the monarchy, and UNESCO World Heritage status for Angkor (1992) renewed national pride. Today a young, connected generation carries Khmer heritage into the digital age — the very journey CamboVerse is part of.",
    highlights: ["Angkor named UNESCO World Heritage (1992)", "Peace & reconstruction", "A young, digital generation"],
    quiz: [
      { q: "Angkor was named a UNESCO World Heritage Site in…", choices: ["1992", "1863", "1431"], answer: 0 },
      { q: "Today's generation carries Khmer heritage into…", choices: ["the digital age", "the stone age", "the ice age"], answer: 0 },
      { q: "Preah Vihear was inscribed as a UNESCO World Heritage Site in…", choices: ["2008", "1992", "1953"], answer: 0 },
    ],
    sites: {
      "angkor-wat":
        "Angkor Wat becomes a UNESCO World Heritage Site (1992); careful conservation and millions of visitors return — and now you can walk it here, from anywhere on Earth.",
      "wat-phnom":
        "Wat Phnom remains a beloved landmark and gathering place at the heart of a fast-growing Phnom Penh — its flower clock ticking beside the modern skyline.",
      bayon:
        "Conservation teams from around the world care for the Bayon's faces within the Angkor World Heritage Site — smiling now at millions of visitors a year.",
      "ta-prohm":
        "Conservators stabilise Ta Prohm while deliberately keeping its famous trees; in 2001 Tomb Raider carries its image to screens around the world.",
      "preah-vihear":
        "The ICJ affirms the temple as Cambodia's in 1962, and in 2008 it is inscribed as a UNESCO World Heritage Site — the clifftop sanctuary a symbol of national pride.",
      "royal-palace":
        "With the monarchy restored in 1993, the palace is again the living centre of royal ceremony — and the Silver Pagoda's treasures welcome visitors from around the world.",
    },
  },
];
