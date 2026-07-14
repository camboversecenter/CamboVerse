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
    sites: {
      "angkor-wat":
        "You are standing at Angkor Wat's very birth: Suryavarman II raises it around 1113 as a temple to Vishnu, its towers gleaming with gilt and its galleries freshly carved.",
      "wat-phnom":
        "This hill by the Mekong is not yet a temple in the Angkor age — Phnom Penh's story is still centuries away.",
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
    sites: {
      "angkor-wat":
        "Angkor Wat is never truly abandoned — Buddhist monks tend it, and it becomes a revered Theravada temple visited by pilgrims.",
      "wat-phnom":
        "Wat Phnom's story begins here: by legend, in 1372 Lady Penh finds sacred images in the river and raises a shrine on this hill — giving Phnom Penh (‘Penh's hill’) its name.",
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
    sites: {
      "angkor-wat":
        "French explorers document Angkor Wat and clear the forest from its galleries; restoration begins and the temple's fame spreads around the world.",
      "wat-phnom":
        "The French lay out their capital around this hill, and Wat Phnom's great white stupa is rebuilt to its present form (1926) — the city literally centred on it.",
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
    sites: {
      "angkor-wat":
        "Angkor Wat becomes a UNESCO World Heritage Site (1992); careful conservation and millions of visitors return — and now you can walk it here, from anywhere on Earth.",
      "wat-phnom":
        "Wat Phnom remains a beloved landmark and gathering place at the heart of a fast-growing Phnom Penh — its flower clock ticking beside the modern skyline.",
    },
  },
];
