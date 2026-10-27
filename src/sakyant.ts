/** Educational motif studies. See docs/SAK-YANT-REFERENCES.md for provenance. */
export interface Yantra {
  id: string;
  name: string;
  khmer: string;
  english: string;
  meaning: string;
  placement: string;
  form: string;
  context: string;
  reference: string;
}

/** A starting set of the most recognisable yant. Masters know many more. */
export const YANTRAS: Yantra[] = [
  {
    id: "gaoyord",
    name: "Gao Yord",
    khmer: "ប្រាំបួនកំពូល",
    english: "The Nine Spires",
    meaning:
      "A nine-spire design associated with protection in several Sak Yant lineages. Some teachers use it as a foundational yant; arrangements and teachings differ.",
    placement: "Nape of the neck",
    form: "Nine rising finials above a stepped grid. The empty cells mark inscription spaces; they are not blank traditional mantras.",
    context: "Gao Yord is a Thai name used in regional references. This original structural study is not a certified Khmer master's pattern.",
    reference: "https://www.sak-yant.com/108-sacred-yant/gao-yord/",
  },
  {
    id: "hahtaew",
    name: "Hah Taew",
    khmer: "ប្រាំជួរ",
    english: "The Five Lines",
    meaning:
      "Five columns of sacred writing, often associated with protection and good fortune. Their exact text and interpretation belong to a teacher's tradition.",
    placement: "Upper back or shoulder; consult the practitioner",
    form: "Five vertical inscription spaces with fine ascending finials. The open columns deliberately omit the sacred writing.",
    context: "Hah Taew is a Thai name. This is a layout study of a widely circulated regional form, not five translated or invented blessings.",
    reference: "https://www.sakyanttattoo.nl/en/blog/hah-taew-five-lines-meaning",
  },
  {
    id: "paedtidt",
    name: "Paed Tidt",
    khmer: "ប្រាំបីទិស",
    english: "The Eight Directions",
    meaning:
      "An eight-direction diagram associated by practitioners with protection during travel. The protective meaning is a traditional belief.",
    placement: "Chest or upper back",
    form: "Eight evenly spaced axes, concentric rings and tapering finials. Inscribed bands are left open, with original geometric ornament inside.",
    context: "Paed Tidt is a Thai name for an eight-direction form. Lettering and details vary across examples; the drawing is a study, not a transcription.",
    reference: "https://www.sak-yant.com/108-sacred-yant/round-yantra/yant-paed-tidt-%E0%B8%A2%E0%B8%B1%E0%B8%99%E0%B8%95%E0%B9%8C-%E0%B9%81%E0%B8%9B%E0%B8%94-%E0%B8%97%E0%B8%B4%E0%B8%A8/",
  },
  {
    id: "unalome",
    name: "Unalome",
    khmer: "ឧណ្ណាឡោម",
    english: "The Spiral Finial",
    meaning:
      "A coil rising through tapering loops to a fine point. Related finials appear above many yant; interpretations and forms depend on the tradition.",
    placement: "Often incorporated as a finial; ask a practitioner about placement",
    form: "A continuous open spiral, narrowing loops and a slender terminal line. Smooth curves remain clear when enlarged.",
    context: "This is an original ornament study informed by finials in documented yant. It does not establish a universal meaning or prescribe sacred placement.",
    reference: "https://www.sak-yant.com/108-sacred-yant/gao-yord/",
  },
  {
    id: "khla",
    name: "Tiger · Khla",
    khmer: "ខ្លា",
    english: "The Sacred Tiger",
    meaning:
      "Tiger motifs are associated with strength, courage and authority in practitioner traditions. Single and paired tigers are different compositions.",
    placement: "Back, chest or upper arm",
    form: "A low, muscular crouch with extended clawed paws, a snarling muzzle, sweeping tail and tapered stripes following the shoulders and haunches.",
    context: "An AI-assisted original tattoo illustration informed by regional animal-yant references. It is not a transcription of Suea Phaen or Suea Koo, and contains no mantra. Downloads embed the detailed raster drawing.",
    reference: "https://www.sak-yant.com/sak-yant/about-sacred-yant/yantsueapaen1/",
  },
  {
    id: "neak",
    name: "Naga · Neak",
    khmer: "នាគ",
    english: "The Sacred Serpent",
    meaning:
      "The naga is an important serpent figure in Khmer art. Buddhist imagery includes Muchalinda sheltering the meditating Buddha with his hood and coils.",
    placement: "Placement and form should be discussed with the practitioner",
    form: "A single-headed serpent with a fierce side-profile muzzle, fangs, a layered flame crest, overlapping scales, belly plates and continuous sweeping coils.",
    context: "An AI-assisted original illustration informed by a contemporary Thai tattoo studio's naga examples. This is not a historical Khmer pattern or the multi-headed Muchalinda sculpture. Downloads embed the detailed raster drawing.",
    reference: "https://www.bkktattoostudio13.com/sak-yant-snake-naga-tattoos-designs-meaning.html",
  },
];

export interface Precept {
  khmer: string;
  text: string;
}

/** English summaries of the Buddhist Five Precepts; Khmer translations need review. */
export const PRECEPTS: Precept[] = [
  { khmer: "", text: "Refrain from taking life." },
  { khmer: "", text: "Refrain from taking what is not given." },
  { khmer: "", text: "Refrain from sexual misconduct." },
  { khmer: "", text: "Refrain from false speech." },
  { khmer: "", text: "Refrain from intoxicants that lead to heedlessness." },
];

/** Short "about" notes shown on the education panel. */
export const ABOUT = [
  {
    title: "A living Khmer tradition",
    khmer: "",
    text: "Cambodian practitioners preserve and teach Sak Yant through their own lineages. Related tattoo traditions exist across the region. The Thai names of some designs in this gallery are not evidence that every pictured form is a Khmer design.",
  },
  {
    title: "Blessed by a master",
    khmer: "ប្រសិទ្ធិដោយគ្រូ",
    text: "For practitioners, Sak Yant includes teaching, ritual and sacred writing as well as the drawing. A digital picture cannot reproduce that relationship. Methods, inscriptions and interpretations vary between teachers.",
  },
  {
    title: "A living blessing",
    khmer: "ពរជ័យរស់",
    text: "Some teachers connect receiving a yant with ethical commitments, including the Buddhist Five Precepts. Ask the practitioner about their tradition rather than treating one online explanation as universal.",
  },
];

/** Independent learning resource. No partnership or provider verification is implied. */
export const REFERRAL = {
  org: "Federation of Khmer Sakyantra",
  url: "https://www.federationofkhmersakyantra.com/",
  note: "Learn directly from Cambodian practitioners about their tradition, inscriptions and ceremonies. The Federation's website is an independent starting point for learning; CamboVerse has not verified or endorsed individual providers.",
  studios: [] as { name: string; city: string; url?: string }[],
};

export const SAKYANT_CREDENTIAL = "sakyant:learned";

export { drawYantra } from "./sakyantArtwork";
