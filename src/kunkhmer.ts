/**
 * Kun Khmer (កុនខ្មែរ) Cambodia's ancient martial art as "play and learn"
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
  { id: "mat", name: "Mat", khmer: "ដាល់", english: "Punch", desc: "A straight punch. Watch the glove travel forward, then return to the guard.", key: "u", color: "#e0562f" },
  { id: "mokkeng", name: "Mok Keng", khmer: "ម៉ុកឃីង", english: "Uppercut", desc: "A rising punch driven up from below, under the opponent's guard.", key: "j", color: "#e08a2f" },
  { id: "ti", name: "Ti", khmer: "ទាត់", english: "Kick", desc: "A simplified roundhouse demonstration. Watch the hip turn and the leg sweep before returning to stance.", key: "i", color: "#2f8ae0" },
  { id: "sok", name: "Sok", khmer: "កែងដៃ", english: "Elbow", desc: "A close-range strike with a folded arm. Watch the elbow move with the turning torso.", key: "o", color: "#c8912e" },
  { id: "kumpleang", name: "Kumpleang", khmer: "ភ្លៅ", english: "Knee", desc: "A raised-knee demonstration. Notice the bent leg and the supporting leg; a full clinch is not modelled here.", key: "p", color: "#8b3fd0" },
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
    title: "Cambodian ring sport",
    khmer: "ក្បាច់គុនបុរាណខ្មែរ",
    body: "Kun Khmer, also known as Pradal Serey, is Cambodia’s striking ring sport. It belongs to a living martial-arts culture. Kun Lbokator is a related but distinct tradition; its UNESCO inscription should not be presented as an inscription of this ring sport.",
  },
  {
    title: "Four striking families",
    body: "Punches, kicks, elbows and knees are central to Kun Khmer, alongside defence and clinch work. This collection shows seven simplified examples, not the complete technique system or competition rules.",
  },
  {
    title: "The pre-fight ritual",
    khmer: "គុនគ្រូ",
    body: "Pre-bout observances express respect for teachers and tradition. Their forms and terminology deserve guidance from Cambodian practitioners. The training animations here do not reproduce a ritual performance.",
  },
  {
    title: "The music of the ring",
    khmer: "វង់ភ្លេងព្រៃ",
    body: "Traditional music is part of the atmosphere of Cambodian boxing. This demo uses generated bells and movement sounds only; these effects are not recordings of a traditional ensemble.",
  },
];

/** The learning credential earned by completing a training round. */
export const KUN_CREDENTIAL = "kun-khmer:training";
