/**
 * 🔬 **Learning Lab** — anything a student can turn around, take apart and be
 * asked about.
 *
 * The Lab is the **container**, not a subject. Human anatomy is simply what it
 * was opened with, because organs are the clearest case of "a thing you cannot
 * bring into a classroom". Physics apparatus, machines, molecules, the solar
 * system, a rice mill, an irrigation pump — anything that is better understood
 * by handling it than by reading about it belongs here, under its own subject.
 *
 * The shape is deliberately three levels, so adding a subject is data and
 * adding an exhibit is data plus one model function:
 *
 *     SUBJECT  (Biology, Physics, Engineering, …)
 *       └── topic   ("Circulatory system", "Simple machines", …)
 *             └── EXHIBIT  (the heart, a lever, a water pump)
 *
 * ## Everything is procedural
 *
 * Geometry is authored in code from description — not traced from a scan, a
 * photograph, a CAD file or a copyrighted illustration. That is a licensing
 * decision as much as a technical one (a Digital Public Good cannot ship an
 * atlas figure it does not own) and it is what keeps an exhibit inside the
 * ~$150-Android budget.
 *
 * ## What these models are, and are not
 *
 * **Schematic teaching models.** Proportions, structure and behaviour follow
 * the standard account of the thing, but they are not measurements, not derived
 * from imaging or survey, and not accurate enough for anything professional.
 * Every exhibit page says so without being asked.
 *
 * ## Khmer terminology
 *
 * Cambodian students are the point, so Khmer is not a translation layer bolted
 * on afterwards — it is a field on every part. Where a term is left `null` it
 * means nobody has verified it yet, and the interface says "Khmer term needed"
 * rather than showing a guess. **Do not fill these in from a machine
 * translation.** A wrong technical term in a teaching tool is worse than a
 * missing one. See `docs/LAB.md` for the list waiting on a reviewer.
 */

/**
 * A field of study. Subjects with no exhibits yet are still listed — the empty
 * shelf is the invitation, and a contributor can see exactly where their work
 * would go.
 */
export interface Subject {
  id: string;
  name: string;
  khmer: string | null;
  /** One line on the hub card. */
  blurb: string;
  icon: string;
}

export const SUBJECTS: Subject[] = [
  {
    id: "biology", name: "Biology and the human body", khmer: "ជីវវិទ្យា",
    blurb: "Organs, systems and living structures — the things a classroom cannot put on a bench.",
    icon: "🫀",
  },
  {
    id: "physics", name: "Physics and machines", khmer: "រូបវិទ្យា",
    blurb: "Levers, pulleys, engines, circuits. Mechanisms are far easier to understand turning than drawn.",
    icon: "⚙️",
  },
  {
    id: "chemistry", name: "Chemistry", khmer: "គីមីវិទ្យា",
    blurb: "Molecules and crystal structures, where the shape IS the explanation.",
    icon: "🧪",
  },
  {
    id: "earth", name: "Earth and sky", khmer: null,
    blurb: "The monsoon, the Mekong flood pulse, the solar system, the seasons.",
    icon: "🌏",
  },
  {
    id: "agri", name: "Agriculture and engineering", khmer: null,
    blurb: "Pumps, mills, irrigation, solar. The applied side, and the closest to Cambodian working life.",
    icon: "🌾",
  },
];

export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id) ?? null;

/**
 * The three views every exhibit offers. The ids are generic on purpose:
 *   - `whole`   — as it looks from outside
 *   - `cutaway` — the outside made see-through, the insides visible
 *   - `frame`   — only the internal network: vessels, airways, linkages, bonds
 */
export type LabLayer = "whole" | "cutaway" | "frame";

export interface LabPart {
  id: string;
  /** English name — the one used in Cambodian science textbooks in English. */
  name: string;
  /**
   * Khmer name, or `null` when no Khmer-speaking reviewer has confirmed one.
   * Never guess: the interface handles `null` honestly.
   */
  khmer: string | null;
  /** One or two sentences. What it is, and what it does. */
  blurb: string;
  /** The layer this part is visible in — tapping its name switches to it. */
  layer: LabLayer;
  /** Roughly where its label should float, in specimen space (1 unit ≈ 1 cm). */
  at: [number, number, number];
}

export interface QuizItem {
  q: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** Shown after answering, right or wrong. Teaching, not scoring. */
  why: string;
}

export interface Specimen {
  id: string;
  name: string;
  khmer: string | null;
  /** One line under the title. */
  english: string;
  /** Which `Subject` this belongs to, by id. */
  subject: string;
  /** The grouping within a subject: "Circulatory system", "Simple machines", … */
  topic: string;
  /**
   * What the layer buttons say. An organ peels back to chambers and vessels; an
   * engine peels back to moving parts; a molecule switches representation. The
   * three slots are always the same shape, but only the exhibit knows what to
   * call them — hard-coding "Tubes only" made the Lab an anatomy viewer.
   */
  layers: { id: LabLayer; label: string; hint: string }[];
  /** A couple of paragraphs for the specimen page. */
  about: string[];
  parts: LabPart[];
  quiz: QuizItem[];
  /**
   * The exhibit's full bounding **height** in its own units. Exhibits are
   * modelled at **1 unit ≈ 1 cm**, which keeps the numbers in the model
   * functions reading as the measurements they are.
   */
  sizeU: number;
  /**
   * The y of the model's visual centre, if it is not a little above the origin.
   * The body is modelled from the navel, so its centre is 0; an organ modelled
   * from its base sits above. Framing aims here, and getting it wrong points the
   * camera at a figure's chest and cuts its feet off.
   */
  centreU?: number;
  /**
   * Its full bounding **width**. Framing needs both: on a portrait phone the
   * horizontal field of view is barely 29° against the 45° vertical, so width
   * is almost always the binding constraint and sizing off height alone leaves
   * the exhibit hanging off the sides.
   */
  spanU: number;
  /** Real-world size, said plainly, because a model on a screen has no scale. */
  reallife: string;
  /**
   * Whether tapping a part pulls it clear of the exhibit to be examined. Set by
   * the model component's own support for it — see `LabBody`. An exhibit that
   * is already a single object has nothing to extract.
   */
  extractable?: boolean;
}

export const SPECIMENS: Specimen[] = [
  {
    id: "human-body",
    name: "The human body",
    khmer: "រាងកាយមនុស្ស",
    english: "A whole figure — peel back the skin, pull an organ out to look at it",
    subject: "biology",
    topic: "The body as a whole",
    layers: [
      { id: "whole", label: "Skin", hint: "The figure as you see a person" },
      { id: "cutaway", label: "Organs", hint: "Skin to a ghost, organs in place" },
      { id: "frame", label: "Skeleton", hint: "Bones only" },
    ],
    about: [
      "Start with the whole figure, then use the layer buttons to look inside. On the Organs layer the skin fades to a ghost so you can still see where everything sits relative to the body.",
      "Tap any organ to pull it out. It floats clear of the body, turns slowly so you can see every side, and leaves its space empty behind it — which is half the point, because knowing where an organ lives is as useful as knowing its shape.",
      "The body faces you, so its right side is on your left. That is how every anatomy diagram is drawn, and it is why the liver appears on the left of your screen.",
    ],
    parts: [
      {
        id: "skin", name: "Skin", khmer: "ស្បែក",
        blurb: "The body's largest organ, and the first one people forget is an organ at all. It keeps water in, keeps infection out, and does much of the work of holding your temperature steady.",
        layer: "whole", at: [0, 30, 14],
      },
      {
        id: "brain", name: "Brain", khmer: "ខួរក្បាល",
        blurb: "About 1.4 kg, and using roughly a fifth of the body's energy while being a fiftieth of its weight. The folds are there to fit more surface into the skull.",
        layer: "cutaway", at: [0, 82, 0],
      },
      {
        id: "heart", name: "Heart", khmer: "បេះដូង",
        blurb: "Sits between the lungs, tilted so its point aims down and to the left. Beats roughly 100,000 times a day without being asked. Open the heart's own exhibit to see inside it.",
        layer: "cutaway", at: [6, 34, 10],
      },
      {
        id: "lungs", name: "Lungs", khmer: "សួត",
        blurb: "Two spongy bags either side of the heart. The right has three lobes, the left only two — the heart takes the space where the third would be.",
        layer: "cutaway", at: [-16, 38, 6],
      },
      {
        id: "airways", name: "Windpipe and bronchi", khmer: "បំពង់ខ្យល់",
        blurb: "Air's route in: down the windpipe, then a split into each lung and about twenty more splits after that.",
        layer: "cutaway", at: [0, 47, 6],
      },
      {
        id: "liver", name: "Liver", khmer: "ថ្លើម",
        blurb: "The largest internal organ, tucked under the ribs on the body's right. It cleans the blood, stores sugar, and makes the bile that helps digest fat. It is the only organ that regrows.",
        layer: "cutaway", at: [-16, 14, 8],
      },
      {
        id: "stomach", name: "Stomach", khmer: "ក្រពះ",
        blurb: "A muscular bag on the left that mixes food with acid strong enough to dissolve metal, and is stopped from digesting itself only by a layer of mucus it rebuilds constantly.",
        layer: "cutaway", at: [14, 14, 6],
      },
      {
        id: "intestines", name: "Intestines", khmer: "ពោះវៀន",
        blurb: "About seven metres of tube, coiled to fit. Almost everything your body takes from food, it takes here.",
        layer: "cutaway", at: [0, -4, 12],
      },
      {
        id: "kidneys", name: "Kidneys", khmer: "តម្រងនោម",
        blurb: "A pair at the back, either side of the spine. Between them they filter your entire blood volume about forty times a day.",
        layer: "cutaway", at: [-14, 2, -12],
      },
      {
        id: "bladder", name: "Bladder", khmer: null,
        blurb: "A stretchy bag sitting low in the pelvis that holds what the kidneys have filtered out until you decide otherwise.",
        layer: "cutaway", at: [0, -24, 10],
      },
      {
        id: "skeleton", name: "Skeleton", khmer: "គ្រោងឆ្អឹង",
        blurb: "206 bones in an adult — a baby starts with about 270 and fuses some together while growing. It is scaffolding, armour and a factory: most of your blood cells are made inside the big bones.",
        layer: "frame", at: [0, 44, -14],
      },
    ],
    quiz: [
      {
        q: "The liver sits mostly on which side of the body?",
        options: ["The body's left", "The body's right", "Exactly in the middle", "Behind the spine"],
        answer: 1,
        why: "The body's right, tucked under the lower ribs. Because the figure faces you, that puts it on the LEFT of your screen — the same flip every anatomy diagram has.",
      },
      {
        q: "Which of these is an organ?",
        options: ["Skin", "Blood", "Bone marrow only", "None of them"],
        answer: 0,
        why: "Skin is the body's largest organ. People rarely think of it as one because it is on the outside.",
      },
      {
        q: "Roughly how many bones does an adult skeleton have?",
        options: ["About 60", "About 206", "About 500", "It varies with height"],
        answer: 1,
        why: "About 206. A newborn has roughly 270; several fuse together during growth, which is why the adult count is lower.",
      },
    ],
    sizeU: 180,
    spanU: 62,
    centreU: 0,
    extractable: true,
    reallife: "Modelled at 175 cm — an average adult. Every organ inside is at life size relative to it.",
  },
  {
    id: "heart",
    name: "The human heart",
    khmer: "បេះដូង",
    english: "A four-chambered pump, and the vessels leaving it",
    subject: "biology",
    topic: "Circulatory system",
    layers: [
      { id: "whole", label: "Whole", hint: "The heart as it looks from outside" },
      { id: "cutaway", label: "Chambers", hint: "Make the muscle see-through and show the four chambers" },
      { id: "frame", label: "Vessels", hint: "Just the great vessels" },
    ],
    about: [
      "The heart is two pumps in one muscle. The right side takes blood that has been round the body and pushes it to the lungs; the left side takes it back from the lungs and pushes it out to everything else. They beat together, so it feels like one pump.",
      "It sits behind the breastbone, tilted so the pointed end — the apex — aims down and to the left. That tilt is why you feel a heartbeat on the left of your chest even though the heart itself is close to the middle.",
      "Turn the model, then use the layer buttons to make the muscle see-through and look at the four chambers inside it.",
    ],
    parts: [
      {
        id: "myocardium", name: "Heart muscle (myocardium)", khmer: null,
        blurb: "The muscular wall that does the squeezing. It is far thicker on the left, because the left side has to push blood all the way round the body.",
        layer: "whole", at: [0, -1, 4.5],
      },
      {
        id: "lv", name: "Left ventricle", khmer: null,
        blurb: "The strongest chamber. It pushes blood into the aorta and out to the whole body — its wall is roughly three times thicker than the right ventricle's.",
        layer: "cutaway", at: [-2.4, -2.6, 1.6],
      },
      {
        id: "rv", name: "Right ventricle", khmer: null,
        blurb: "Pushes blood the short distance to the lungs, so it needs much less force and has a thinner wall.",
        layer: "cutaway", at: [3.0, -2.2, 2.2],
      },
      {
        id: "la", name: "Left atrium", khmer: null,
        blurb: "Receives blood coming back from the lungs through the four pulmonary veins, and passes it down into the left ventricle.",
        layer: "cutaway", at: [-2.8, 3.0, -0.6],
      },
      {
        id: "ra", name: "Right atrium", khmer: null,
        blurb: "Receives blood returning from the body through the two venae cavae, and passes it down into the right ventricle.",
        layer: "cutaway", at: [3.4, 3.0, 0.4],
      },
      {
        id: "aorta", name: "Aorta", khmer: null,
        blurb: "The body's largest artery. It leaves the left ventricle, arches over, and carries oxygen-rich blood down through the chest and abdomen.",
        layer: "frame", at: [-0.6, 8.6, -0.4],
      },
      {
        id: "pulmonary-trunk", name: "Pulmonary trunk", khmer: null,
        blurb: "Carries oxygen-poor blood from the right ventricle to the lungs. It is the one artery in the body that carries blood *away* from the heart without oxygen in it.",
        layer: "frame", at: [1.4, 6.6, 2.2],
      },
      {
        id: "vena-cava", name: "Venae cavae", khmer: null,
        blurb: "The two great veins bringing blood back from the body — one from above the heart, one from below — both emptying into the right atrium.",
        layer: "frame", at: [5.4, 6.0, -0.8],
      },
      {
        id: "coronary", name: "Coronary arteries", khmer: null,
        blurb: "The heart's own blood supply, running in grooves across its surface. A blockage here is what a heart attack is.",
        layer: "whole", at: [-3.6, 0.6, 3.4],
      },
    ],
    quiz: [
      {
        q: "Which chamber has the thickest muscular wall?",
        options: ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium"],
        answer: 0,
        why: "The left ventricle pushes blood round the entire body, so it needs the most force. The right ventricle only has to reach the lungs.",
      },
      {
        q: "The pulmonary trunk carries blood that is…",
        options: ["Rich in oxygen", "Poor in oxygen", "Neither — it carries air", "Only carried at night"],
        answer: 1,
        why: "It takes blood from the right ventricle to the lungs to collect oxygen. It is an artery carrying oxygen-poor blood, which is the exception to the usual rule.",
      },
      {
        q: "Blood returning from the body enters the heart at the…",
        options: ["Left atrium", "Left ventricle", "Right atrium", "Aorta"],
        answer: 2,
        why: "The venae cavae empty into the right atrium. Blood returning from the lungs is the one that enters the left atrium.",
      },
    ],
    sizeU: 17,
    spanU: 13,
    reallife: "About the size of your closed fist — roughly 12 cm tall and 250–350 g.",
  },
  {
    id: "lungs",
    name: "The lungs and airways",
    khmer: "សួត",
    english: "Two lungs, the windpipe, and the branching tree inside them",
    subject: "biology",
    topic: "Respiratory system",
    layers: [
      { id: "whole", label: "Whole", hint: "The lungs as they look from outside" },
      { id: "cutaway", label: "See through", hint: "Make the lungs see-through and show the airways inside" },
      { id: "frame", label: "Airways", hint: "Just the windpipe and the bronchial tree" },
    ],
    about: [
      "Air comes in through the windpipe, which splits into two main branches — one per lung — and then keeps splitting, about twenty times over, until the tubes are thinner than a hair. At the very end are millions of tiny air sacs where oxygen crosses into the blood.",
      "The two lungs are not the same. The right has three lobes; the left has two, and a scoop taken out of its front edge where the heart sits. That notch is why the left lung is the smaller of the pair.",
      "Use the layer buttons to make the lungs see-through and watch the branching tree inside them.",
    ],
    parts: [
      {
        id: "trachea", name: "Windpipe (trachea)", khmer: "បំពង់ខ្យល់",
        blurb: "The tube from the throat down into the chest, held open by rings of cartilage so it cannot collapse when you breathe in hard.",
        layer: "frame", at: [0, 11.5, 0],
      },
      {
        id: "bronchi", name: "Main bronchi", khmer: null,
        blurb: "The windpipe's first split — one tube into each lung. The right one is wider and more upright, which is why something swallowed the wrong way usually ends up in the right lung.",
        layer: "frame", at: [-3.4, 6.6, 0],
      },
      {
        id: "tree", name: "Bronchial tree", khmer: null,
        blurb: "Each bronchus divides again and again, roughly twenty times over, spreading air through the whole lung. Laid flat, the airway surface would cover a tennis court.",
        layer: "frame", at: [4.6, 2.0, 0],
      },
      {
        id: "right-lung", name: "Right lung", khmer: "សួតខាងស្តាំ",
        blurb: "The larger lung, in three lobes — upper, middle and lower — divided by two deep fissures.",
        layer: "whole", at: [-7.5, 1.0, 2.5],
      },
      {
        id: "left-lung", name: "Left lung", khmer: "សួតខាងឆ្វេង",
        blurb: "Two lobes rather than three, and smaller, because the heart takes a bite out of its front edge — the cardiac notch.",
        layer: "whole", at: [7.5, 1.0, 2.5],
      },
      {
        id: "notch", name: "Cardiac notch", khmer: null,
        blurb: "The scoop in the front edge of the left lung where the heart sits against it. Anatomy making room for a neighbour.",
        layer: "whole", at: [3.4, -0.5, 4.2],
      },
    ],
    quiz: [
      {
        q: "Why does the left lung have only two lobes?",
        options: [
          "It is younger than the right",
          "The heart takes up space on the left",
          "It only breathes out",
          "The third lobe forms after birth",
        ],
        answer: 1,
        why: "The heart sits slightly left of centre, so the left lung gives up a lobe and carries the cardiac notch to make room for it.",
      },
      {
        q: "Roughly how many times does the airway branch between the windpipe and the air sacs?",
        options: ["About 3 times", "About 20 times", "About 200 times", "It does not branch"],
        answer: 1,
        why: "Around twenty generations of branching. Each split makes the tubes narrower but there are far more of them, so the total surface for gas exchange becomes enormous.",
      },
    ],
    sizeU: 24,
    spanU: 23,
    reallife: "Each lung is roughly 25 cm tall. Together they hold about 6 litres of air when full.",
  },
];

export const specimenById = (id: string) => SPECIMENS.find((s) => s.id === id) ?? null;

/** Exhibits in a subject, in registry order. */
export const specimensOfSubject = (subjectId: string) =>
  SPECIMENS.filter((s) => s.subject === subjectId);

/** The topics present within a subject, in the order they first appear. */
export function topicsOfSubject(subjectId: string): string[] {
  const seen: string[] = [];
  for (const s of specimensOfSubject(subjectId)) if (!seen.includes(s.topic)) seen.push(s.topic);
  return seen;
}

/* ------------------------------------------------------------- the tutor --- */

/**
 * The seam for a future AI tutor. Nothing implements this yet — the Lab works
 * entirely without one, and it should keep working without one, because an
 * offline student on a slow connection is the normal case, not the edge case.
 *
 * When a model is wired in, it answers *about the specimen in front of the
 * student*, in their language, and it must be told plainly that these are
 * schematic teaching models so it does not invent clinical detail.
 */
export interface LabTutor {
  ask(input: {
    specimen: Specimen;
    /** The part the student has selected, if any. */
    part: LabPart | null;
    question: string;
    lang: "en" | "km";
  }): Promise<string>;
}

/** No tutor configured. The Lab checks for null and simply omits the affordance. */
export const labTutor: LabTutor | null = null;
