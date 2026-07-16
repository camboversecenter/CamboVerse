/**
 * Kun Khmer (កុនខ្មែរ) — Cambodia's ancient martial art — as "play and learn"
 * data for the CamboVerse dojo: the core techniques (with a procedural fighter
 * to demonstrate them) and a short cultural briefing.
 *
 * Move names and the control scheme are aligned with the CamboVerse "Kun Khmer
 * Fight 3D" reference game (Apache-2.0, camboversecenter/kunkhmer). This is an
 * educational adaptation, not a copy of that codebase.
 */
export interface KunMove {
  id: string;
  /** Romanised Khmer name. */
  name: string;
  /** Khmer script. */
  khmer: string;
  /** English. */
  english: string;
  /** What it is / how it's used. */
  desc: string;
  /** Keyboard key to perform it (single key). */
  key: string;
  /** Accent colour. */
  color: string;
}

export const KUN_MOVES: KunMove[] = [
  { id: "mat", name: "Mat", khmer: "ដាល់", english: "Punch", desc: "A straight punch with the wrapped fist — the jab and cross of Kun Khmer.", key: "u", color: "#e0562f" },
  { id: "mokkeng", name: "Mok Keng", khmer: "ម៉ុកឃីង", english: "Uppercut", desc: "A rising punch driven up from below, under the opponent's guard.", key: "j", color: "#e08a2f" },
  { id: "ti", name: "Ti", khmer: "ទាត់", english: "Kick", desc: "A powerful roundhouse or front kick with the shin or foot.", key: "i", color: "#2f8ae0" },
  { id: "sok", name: "Sok", khmer: "កែងដៃ", english: "Elbow", desc: "The elbow strike — Kun Khmer's signature, feared for its cutting power.", key: "o", color: "#c8912e" },
  { id: "kumpleang", name: "Kumpleang", khmer: "ភ្លៅ", english: "Knee", desc: "A driving knee to the body in the clinch — close-range and devastating.", key: "p", color: "#8b3fd0" },
  { id: "rung", name: "Rung", khmer: "រាំង", english: "Block", desc: "Guard up: forearms and shins raised to absorb and deflect strikes.", key: " ", color: "#4c8a3f" },
  { id: "romiel", name: "Romiel", khmer: "រមៀល", english: "Dodge", desc: "A quick lean and roll of the body to slip a strike and reset.", key: "h", color: "#6f8aa8" },
];

export function moveById(id: string): KunMove | undefined {
  return KUN_MOVES.find((m) => m.id === id);
}

export interface KunFact {
  title: string;
  khmer?: string;
  body: string;
}

export const KUN_ABOUT: KunFact[] = [
  {
    title: "An ancient art",
    khmer: "ក្បាច់គុនបុរាណខ្មែរ",
    body: "Kun Khmer (also Kbach Kun Boran Khmer) is one of the world's oldest striking martial arts. Its stances and strikes are carved into the bas-reliefs of Angkor — the Bayon and Banteay Chhmar show warriors fighting bare-fisted centuries ago.",
  },
  {
    title: "The art of eight limbs",
    body: "Fighters strike with fists, feet, knees, and — most famously — elbows, making it a close, powerful art. Traditionally the hands were bound in hemp rope (katt chieng) before modern gloves.",
  },
  {
    title: "The pre-fight ritual",
    khmer: "គុនគ្រូ",
    body: "Before fighting, each boxer performs the Kun Kru — a graceful ritual dance honouring their teacher, ancestors, and the ring — wearing the sacred mongkol headband and prajed armbands for protection and respect.",
  },
  {
    title: "The music of the ring",
    khmer: "វង់ភ្លេងព្រៃ",
    body: "A live ensemble — the sralai (oboe), skor (drums), and cymbals — plays the sarama, its tempo rising and falling with the fight, driving the fighters and the crowd.",
  },
];

/** The learning credential earned by completing a training round. */
export const KUN_CREDENTIAL = "kun-khmer:training";
