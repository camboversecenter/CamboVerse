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
  /**
   * The exhibit this part opens on its own. Set on the body's organs, so a
   * student who wants the kidney can go straight to it rather than squinting at
   * something 4 cm tall inside a 175 cm figure.
   */
  detail?: string;
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
  /**
   * Render one organ from the body's organ set (`LabBody.useOrgans`) rather
   * than a bespoke model. The same geometry the body uses — an organ that
   * looked different depending on which screen you reached it from would
   * quietly teach that there are two of them.
   */
  organOf?: string;
  /** Where this exhibit came from, so its back button says so. */
  parentOf?: string;
  /**
   * This exhibit moves, and gets a Run/Stop control.
   *
   * A machine explained standing still is a diagram. Most of what a four-stroke
   * engine or a gear train has to teach is *sequence* — what happens when, and
   * in what order — which a static model cannot show at all. Motion is to a
   * machine what the layer buttons are to an organ.
   */
  animated?: boolean;
  /**
   * One adjustable number, with a slider. Machines usually have exactly one
   * parameter worth playing with — where the fulcrum sits, how steep the ramp
   * is — and letting a student move it themselves is the difference between
   * being told about mechanical advantage and finding it.
   *
   * The model draws its own readout in the scene, next to the thing that
   * changes, rather than in the panel where it would be a number in a table.
   */
  knob?: { label: string; min: number; max: number; step: number; value: number; unit: string };
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
      { id: "skin", name: "Skin", khmer: "ស្បែក", layer: "whole", at: [0, 30, 14],
        blurb: "The body's largest organ, and the one people forget is an organ at all. It keeps water in, keeps infection out, and does much of the work of holding your temperature steady." },
      { id: "brain", name: "Brain", khmer: "ខួរក្បាល", layer: "cutaway", at: [0, 82, 0], detail: "organ-brain",
        blurb: "About 1.4 kg, using roughly a fifth of the body's energy while being a fiftieth of its weight. The folds are there to fit more surface into the skull." },
      { id: "spinal-cord", name: "Spinal cord", khmer: null, layer: "cutaway", at: [0, 40, -14], detail: "organ-spinal-cord",
        blurb: "The bundle of nerves running down inside the spine, carrying every message between the brain and the rest of you." },
      { id: "thyroid", name: "Thyroid", khmer: null, layer: "cutaway", at: [0, 55, 10], detail: "organ-thyroid",
        blurb: "A small gland in the neck that sets the speed everything else runs at — how fast you burn energy, how fast you grow." },
      { id: "heart", name: "Heart", khmer: "បេះដូង", layer: "cutaway", at: [8, 34, 10], detail: "heart",
        blurb: "Sits between the lungs, tilted so its point aims down and to the left. Beats roughly 100,000 times a day without being asked." },
      { id: "great-vessels", name: "Aorta and vena cava", khmer: null, layer: "cutaway", at: [-8, 46, -12], detail: "organ-great-vessels",
        blurb: "The two largest blood vessels. The aorta leaves the heart and arches over before running down the back of the body; the vena cava brings everything back." },
      { id: "lungs", name: "Lungs", khmer: "សួត", layer: "cutaway", at: [-16, 40, 6], detail: "lungs",
        blurb: "Two spongy bags either side of the heart. The right has three lobes, the left only two — the heart takes the space where the third would be." },
      { id: "airways", name: "Windpipe and bronchi", khmer: "បំពង់ខ្យល់", layer: "cutaway", at: [0, 48, 6], detail: "organ-airways",
        blurb: "Air's route in: down the windpipe, then a split into each lung and about twenty more splits after that." },
      { id: "diaphragm", name: "Diaphragm", khmer: null, layer: "cutaway", at: [-16, 22, 6], detail: "organ-diaphragm",
        blurb: "The dome of muscle under the lungs that actually does the breathing. It flattens to pull air in and relaxes to push it out — you are not lifting your ribs, you are moving this." },
      { id: "oesophagus", name: "Oesophagus", khmer: null, layer: "cutaway", at: [8, 44, -8], detail: "organ-oesophagus",
        blurb: "The tube from throat to stomach. It does not drop food — it squeezes it along, which is why you can swallow upside down." },
      { id: "liver", name: "Liver", khmer: "ថ្លើម", layer: "cutaway", at: [-18, 19, 8], detail: "organ-liver",
        blurb: "The largest internal organ, under the ribs on the body's right. It cleans the blood, stores sugar, and makes bile. The only organ that regrows." },
      { id: "gallbladder", name: "Gallbladder", khmer: null, layer: "cutaway", at: [-12, 10, 10], detail: "organ-gallbladder",
        blurb: "A small bag tucked under the liver that stores the bile the liver makes, and squeezes it out when fatty food arrives." },
      { id: "stomach", name: "Stomach", khmer: "ក្រពះ", layer: "cutaway", at: [16, 16, 6], detail: "organ-stomach",
        blurb: "A muscular bag on the left that mixes food with acid strong enough to dissolve metal, and is stopped from digesting itself only by mucus it rebuilds constantly." },
      { id: "pancreas", name: "Pancreas", khmer: null, layer: "cutaway", at: [10, 6, -10], detail: "organ-pancreas",
        blurb: "Behind the stomach, doing two jobs at once: making the juice that digests your food, and making the insulin that controls your blood sugar." },
      { id: "spleen", name: "Spleen", khmer: null, layer: "cutaway", at: [18, 16, -6], detail: "organ-spleen",
        blurb: "On the left behind the stomach. It filters the blood, retires worn-out red cells, and is part of the immune system." },
      { id: "small-intestine", name: "Small intestine", khmer: "ពោះវៀនតូច", layer: "cutaway", at: [0, 2, 12], detail: "organ-small-intestine",
        blurb: "About six metres of tube, coiled to fit. Almost everything your body takes from food, it takes here." },
      { id: "large-intestine", name: "Large intestine", khmer: "ពោះវៀនធំ", layer: "cutaway", at: [-14, 8, 8], detail: "organ-large-intestine",
        blurb: "The frame around the small intestine: up the right, across, down the left. Shorter and wider, and its job is mostly reclaiming water." },
      { id: "kidneys", name: "Kidneys", khmer: "តម្រងនោម", layer: "cutaway", at: [-16, 4, -12], detail: "organ-kidneys",
        blurb: "A pair at the back, either side of the spine. Between them they filter your entire blood volume about forty times a day." },
      { id: "ureters", name: "Ureters", khmer: null, layer: "cutaway", at: [10, -8, -8], detail: "organ-ureters",
        blurb: "Two narrow tubes carrying what the kidneys have filtered down to the bladder. They squeeze it along rather than letting it trickle." },
      { id: "bladder", name: "Bladder", khmer: null, layer: "cutaway", at: [0, -24, 10], detail: "organ-bladder",
        blurb: "A stretchy bag low in the pelvis that holds what the kidneys filtered out until you decide otherwise." },
      { id: "skeleton", name: "Skeleton", khmer: "គ្រោងឆ្អឹង", layer: "frame", at: [0, 44, -14], detail: "organ-skeleton",
        blurb: "206 bones in an adult — a baby starts with about 270 and fuses some while growing. Scaffolding, armour and a factory: most of your blood cells are made inside the big bones." },
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
  {
    id: "lever",
    name: "The lever",
    khmer: null,
    english: "Move the fulcrum and watch the effort change",
    subject: "physics",
    topic: "Simple machines",
    animated: true,
    knob: { label: "Fulcrum, from the load end", min: 10, max: 110, step: 5, value: 30, unit: " cm" },
    layers: [
      { id: "whole", label: "The lever", hint: "Just the beam, the fulcrum and the load" },
      { id: "cutaway", label: "Forces", hint: "Show the load and the effort in newtons" },
      { id: "frame", label: "Arms", hint: "The two distances that decide everything" },
    ],
    about: [
      "A lever trades distance for force. Push a long way with a small force at one end and the other end moves a short way with a large one. Nothing is created — the work is the same either way.",
      "Slide the fulcrum and watch. Close to the load, the effort arm is long and lifting is easy. Close to the effort, you need more force than the load weighs.",
      "It is the oldest machine there is, and it is in a crowbar, a wheelbarrow, a pair of scissors, an oar, and your own forearm.",
    ],
    parts: [
      { id: "beam", name: "Beam", khmer: null, layer: "whole", at: [30, 10, 0],
        blurb: "The rigid bar. It has to be stiff — if it bends, the effort goes into bending it rather than into lifting the load." },
      { id: "fulcrum", name: "Fulcrum", khmer: null, layer: "whole", at: [0, -22, 0],
        blurb: "The pivot. Where you put it is the whole design: it sets the length of both arms, and their ratio is the advantage." },
      { id: "load", name: "Load", khmer: null, layer: "cutaway", at: [-46, 18, 0],
        blurb: "What you are trying to lift — 100 N here, about the weight of a 10 kg sack of rice." },
      { id: "effort", name: "Effort", khmer: null, layer: "cutaway", at: [52, 18, 0],
        blurb: "The force you apply. With the fulcrum near the load this is much smaller than the load — but you have to move it much further." },
    ],
    quiz: [
      {
        q: "To lift a heavy load with the least effort, the fulcrum should be…",
        options: ["Close to the load", "Close to the effort", "Exactly in the middle", "It makes no difference"],
        answer: 0,
        why: "Close to the load. That makes the effort arm long and the load arm short, and the advantage is one divided by the other.",
      },
      {
        q: "A lever gives you more force. What do you give up?",
        options: ["Nothing", "Distance — the effort moves further", "Time only", "Weight"],
        answer: 1,
        why: "Work is force times distance, and the lever does not change the work. More force at the load means the effort end travels proportionally further.",
      },
    ],
    sizeU: 62,
    spanU: 152,
    centreU: 0,
    reallife: "The beam is 1.2 m — about the length of a crowbar. The load is 100 N, roughly a 10 kg sack.",
  },
  {
    id: "gear-train",
    name: "Gears",
    khmer: null,
    english: "Three meshed gears, and what a ratio actually does",
    subject: "physics",
    topic: "Simple machines",
    animated: true,
    layers: [
      { id: "whole", label: "Running", hint: "The gears as they mesh" },
      { id: "cutaway", label: "Axles", hint: "Show what each gear turns on" },
      { id: "frame", label: "Gears only", hint: "Drop the backing plate" },
    ],
    about: [
      "Two meshed gears always turn opposite ways, and their speeds are set by their tooth counts: ten teeth driving thirty means three turns in for one turn out.",
      "Watch the small red gear and the large brass one. They turn the same way — which surprises most people — because the middle gear reverses the direction twice. That is the only job an idler has.",
      "Slower out means stronger out. A bicycle in low gear, a motorbike pulling away, a rice mill: all the same trade.",
    ],
    parts: [
      { id: "driver", name: "Driver (10 teeth)", khmer: null, layer: "whole", at: [-34, -18, 0],
        blurb: "The input. Every turn of this gear moves ten teeth along, whatever it is meshed with." },
      { id: "idler", name: "Idler (20 teeth)", khmer: null, layer: "whole", at: [0, -28, 0],
        blurb: "In the middle, changing nothing about the final ratio — only the direction. Remove it and the output would run backwards." },
      { id: "driven", name: "Driven (30 teeth)", khmer: null, layer: "whole", at: [40, -38, 0],
        blurb: "The output. Three times slower than the driver, and about three times stronger for it." },
    ],
    quiz: [
      {
        q: "A 10-tooth gear drives a 30-tooth gear. The big gear turns…",
        options: ["3 times faster", "3 times slower", "At the same speed", "Backwards only"],
        answer: 1,
        why: "Three times slower. Each turn of the small gear moves 10 teeth, and the big gear needs 30 to complete one turn.",
      },
      {
        q: "What is the idler gear in the middle for?",
        options: ["To go faster", "To change the ratio", "To reverse the direction", "To store energy"],
        answer: 2,
        why: "Direction only. It adds a second reversal, so input and output turn the same way. It has no effect on the overall ratio.",
      },
    ],
    sizeU: 92,
    spanU: 122,
    centreU: 0,
    reallife: "Gears this size would sit inside a hand drill or a small gearbox.",
  },
  {
    id: "engine",
    name: "Four-stroke engine",
    khmer: null,
    english: "One cylinder, four strokes, two turns of the crank",
    subject: "physics",
    topic: "Engines",
    animated: true,
    knob: { label: "Speed", min: 0, max: 100, step: 5, value: 30, unit: "%" },
    layers: [
      { id: "whole", label: "Assembled", hint: "The engine from outside" },
      { id: "cutaway", label: "Cut away", hint: "See into the cylinder while it runs" },
      { id: "frame", label: "Moving parts", hint: "Just piston, rod and crankshaft" },
    ],
    about: [
      "Four strokes, in order: pull the mixture in, squeeze it, burn it, push the waste out. Then start again. The whole cycle takes TWO turns of the crankshaft, which is the part hardest to see in a drawing and obvious the moment it moves.",
      "Only one of the four strokes actually produces power. The other three are paid for by the flywheel's momentum, which is why a single-cylinder engine thumps and a four-cylinder one hums.",
      "Turn it down to a crawl with the speed slider and watch one valve at a time.",
    ],
    parts: [
      { id: "piston", name: "Piston", khmer: null, layer: "cutaway", at: [-13, 8, 0],
        blurb: "Slides up and down the bore, sealing against the wall with rings. It converts the pressure of burning fuel into a push." },
      { id: "rod", name: "Connecting rod", khmer: null, layer: "cutaway", at: [-13, -8, 0],
        blurb: "Links the piston to the crank. It has to swing as well as push, which is why the piston's motion is not a simple sine wave." },
      { id: "crank", name: "Crankshaft", khmer: null, layer: "frame", at: [0, -30, 0],
        blurb: "Turns the piston's straight-line push into rotation. Its offset sets the stroke length — how far the piston travels." },
      { id: "cylinder", name: "Cylinder", khmer: null, layer: "cutaway", at: [13, 12, 0],
        blurb: "The bore the piston runs in. Its volume, times the number of cylinders, is what people mean by a 125 cc engine." },
      { id: "intake", name: "Intake valve", khmer: null, layer: "cutaway", at: [-12, 30, 0],
        blurb: "Opens on the first stroke to let the fuel and air mixture in, then stays shut for the other three." },
      { id: "exhaust", name: "Exhaust valve", khmer: null, layer: "cutaway", at: [14, 30, 0],
        blurb: "Opens on the last stroke to let the burnt gas out. If the timing of these two is wrong, the engine will not run at all." },
      { id: "plug", name: "Spark plug", khmer: null, layer: "whole", at: [0, 38, 0],
        blurb: "Fires at the top of the compression stroke. A few degrees early or late and the engine loses power or knocks." },
      { id: "block", name: "Engine block", khmer: null, layer: "whole", at: [-18, 6, 0],
        blurb: "The casting everything else lives in. It carries the heat away and holds the crankshaft in line with the bore." },
    ],
    quiz: [
      {
        q: "How many turns of the crankshaft make one complete four-stroke cycle?",
        options: ["Half a turn", "One turn", "Two turns", "Four turns"],
        answer: 2,
        why: "Two. Each stroke is half a turn, and there are four strokes — which is why the valves open only once every other revolution.",
      },
      {
        q: "Which stroke actually produces power?",
        options: ["Intake", "Compression", "Power", "Exhaust"],
        answer: 2,
        why: "Only the third. The other three are driven by momentum stored in the flywheel from the last power stroke.",
      },
      {
        q: "What is the compression stroke for?",
        options: [
          "Cooling the engine",
          "Squeezing the mixture so it burns with more force",
          "Pushing out exhaust",
          "Drawing in fuel",
        ],
        answer: 1,
        why: "Squeezing the fuel and air into a small space makes the burn far more forceful. More compression means more power from the same fuel — up to the point where it ignites early and knocks.",
      },
    ],
    sizeU: 82,
    spanU: 36,
    centreU: 4,
    reallife: "About the size of the single-cylinder engine in a 125 cc motorbike.",
  },
  {
    id: "water",
    name: "Water",
    khmer: "ទឹក",
    english: "H₂O — and why one angle changes everything",
    subject: "chemistry",
    topic: "Molecules",
    animated: true,
    layers: [
      { id: "whole", label: "Space-filling", hint: "How much room the molecule really takes up" },
      { id: "cutaway", label: "Ball and stick", hint: "Which atom is joined to which" },
      { id: "frame", label: "Bonds only", hint: "The shape, with the atoms out of the way" },
    ],
    about: [
      "Two hydrogens and one oxygen — but bent, at about 104.5°, not in a straight line. Two pairs of unshared electrons on the oxygen push the hydrogens down.",
      "That angle is why the molecule has a negative end and a positive end. If water were straight, the two charges would cancel and it would not be polar — and then it would not dissolve salt, would not climb a plant stem, would not hold a raindrop together, and ice would sink.",
      "Use the layer buttons. All three pictures are of the same molecule, and each one is honest about something different.",
    ],
    parts: [
      { id: "oxygen", name: "Oxygen atom", khmer: null, layer: "cutaway", at: [-34, 0, 0],
        blurb: "Pulls the shared electrons toward itself harder than hydrogen does, so it carries a slight negative charge — written δ−." },
      { id: "hydrogen", name: "Hydrogen atoms", khmer: null, layer: "cutaway", at: [34, 34, 0],
        blurb: "Left slightly positive, δ+, because the oxygen has the electrons more of the time. This is what lets water molecules stick to each other." },
      { id: "bond", name: "Covalent bond", khmer: null, layer: "frame", at: [0, 24, 0],
        blurb: "A shared pair of electrons. Sharing rather than transferring is what makes this a molecule rather than a lattice like salt." },
    ],
    quiz: [
      {
        q: "Why is the water molecule bent rather than straight?",
        options: [
          "The hydrogens repel each other",
          "Unshared electron pairs on the oxygen push the bonds down",
          "It is straight — the picture is wrong",
          "Gravity"],
        answer: 1,
        why: "Two lone pairs on the oxygen take up room and push the two bonds closer together, landing them at about 104.5°.",
      },
      {
        q: "If water were a straight molecule, it would…",
        options: ["Boil at a lower temperature and not be polar", "Be exactly the same", "Be a metal", "Not exist"],
        answer: 0,
        why: "The two bond charges would cancel, so it would not be polar — and almost everything water is useful for depends on that polarity.",
      },
    ],
    sizeU: 70,
    spanU: 76,
    centreU: 0,
    reallife: "About 0.28 nanometres across. A teaspoon holds roughly 10²³ of them.",
  },
  {
    id: "methane",
    name: "Methane",
    khmer: null,
    english: "CH₄ — the tetrahedron you cannot draw on paper",
    subject: "chemistry",
    topic: "Molecules",
    animated: true,
    layers: [
      { id: "whole", label: "Space-filling", hint: "How much room the molecule really takes up" },
      { id: "cutaway", label: "Ball and stick", hint: "Which atom is joined to which" },
      { id: "frame", label: "Bonds only", hint: "The shape, with the atoms out of the way" },
    ],
    about: [
      "One carbon, four hydrogens, and four bonds pushing as far away from each other as three dimensions allow. That lands them at 109.5° — a tetrahedron, not a cross.",
      "This is the shape textbooks draw flat and get wrong. Turn the model and watch the four hydrogens stay equally spaced however you look at it. Carbon's willingness to make four bonds in this arrangement is why it builds almost every molecule in living things.",
      "Methane is also biogas: what comes off a sealed pit of animal or kitchen waste, and what many Cambodian farms already cook with.",
    ],
    parts: [
      { id: "carbon", name: "Carbon atom", khmer: null, layer: "cutaway", at: [0, 26, 0],
        blurb: "Four bonds, and the willingness to make them to almost anything — including more carbon. That is the whole basis of organic chemistry." },
      { id: "hydrogen", name: "Hydrogen atoms", khmer: null, layer: "cutaway", at: [30, -26, 0],
        blurb: "One bond each, sitting at the four corners of a tetrahedron around the carbon." },
      { id: "bond", name: "Covalent bonds", khmer: null, layer: "frame", at: [-30, 8, 0],
        blurb: "Four shared electron pairs. They repel one another, and 109.5° is the arrangement that gets them furthest apart." },
    ],
    quiz: [
      {
        q: "Why are methane's bonds at 109.5° rather than 90°?",
        options: [
          "Because carbon is small",
          "Because four things repelling in 3D spread out further than a flat cross",
          "Because of gravity",
          "They are at 90° — the model is wrong"],
        answer: 1,
        why: "Four bonds pushing apart in three dimensions reach a tetrahedron. A flat 90° cross would put them closer together than they need to be.",
      },
      {
        q: "Methane is the main part of…",
        options: ["Biogas", "Table salt", "Rust", "Water vapour"],
        answer: 0,
        why: "Biogas from a sealed pit of animal or kitchen waste is mostly methane — the same molecule that makes up natural gas.",
      },
    ],
    sizeU: 76,
    spanU: 76,
    centreU: 0,
    reallife: "About 0.4 nanometres across. It burns cleanly, which is why biogas is worth capturing.",
  },
  {
    id: "salt",
    name: "Table salt",
    khmer: "អំបិល",
    english: "NaCl — a lattice, and not a molecule at all",
    subject: "chemistry",
    topic: "Crystals and lattices",
    animated: true,
    knob: { label: "Lattice size", min: 2, max: 5, step: 1, value: 3, unit: " across" },
    layers: [
      { id: "whole", label: "Ions touching", hint: "The real sizes, packed as they really pack" },
      { id: "cutaway", label: "Lattice", hint: "Pull the ions apart to see the arrangement" },
      { id: "frame", label: "Grid only", hint: "The repeating pattern by itself" },
    ],
    about: [
      "There is no such thing as a salt molecule. A grain of salt is one enormous repeating grid of sodium and chloride ions, alternating in every direction. \"NaCl\" is a ratio — one sodium for every chloride — not a particle you could pick out.",
      "Every sodium has six chlorides around it and every chloride has six sodiums. Pull the slider out and count. The pattern just keeps going until the grain ends.",
      "This is why salt is hard and has a high melting point, and why it falls apart in water: the whole crystal is held by attraction between charges, and water molecules — being polar — can get in between and pull the ions away.",
    ],
    parts: [
      { id: "sodium", name: "Sodium ion (Na⁺)", khmer: null, layer: "cutaway", at: [-40, 30, 0],
        blurb: "A sodium atom that has given away one electron, so it carries a positive charge — and is noticeably smaller than the atom it came from." },
      { id: "chloride", name: "Chloride ion (Cl⁻)", khmer: null, layer: "cutaway", at: [40, 30, 0],
        blurb: "A chlorine atom that has taken that electron, so it is negative — and larger than the atom it came from. In the space-filling view it dominates." },
      { id: "lattice", name: "The lattice", khmer: null, layer: "frame", at: [0, 44, 0],
        blurb: "Not bonds in the molecular sense: every ion is simply attracted to all its oppositely charged neighbours at once. That is what ionic bonding is." },
    ],
    quiz: [
      {
        q: "How many chloride ions surround each sodium ion?",
        options: ["One", "Two", "Four", "Six"],
        answer: 3,
        why: "Six — one in each direction along the three axes. That is why the crystal is cubic, and why grains of salt are little cubes.",
      },
      {
        q: "\"NaCl\" tells you…",
        options: [
          "That salt exists as pairs of atoms",
          "The ratio of sodium to chloride in the lattice",
          "The number of atoms in a grain",
          "Nothing useful"],
        answer: 1,
        why: "It is a ratio, one to one. There is no NaCl particle — only a lattice that keeps that ratio however large it grows.",
      },
    ],
    sizeU: 210,
    spanU: 230,
    centreU: 0,
    reallife: "The ions sit about 0.28 nanometres apart. A single grain of table salt is roughly a million ions across.",
  },
  {
    id: "carbon",
    name: "Diamond and graphite",
    khmer: null,
    english: "The same atom, arranged two ways",
    subject: "chemistry",
    topic: "Crystals and lattices",
    animated: true,
    layers: [
      { id: "whole", label: "Atoms", hint: "The carbons at their real size" },
      { id: "cutaway", label: "Ball and stick", hint: "Atoms and the bonds between them" },
      { id: "frame", label: "Bonds only", hint: "The two structures, bare" },
    ],
    about: [
      "Both of these are pure carbon. Nothing else is in either of them. One is the hardest natural substance on Earth and the other is soft enough to leave a mark on paper.",
      "In diamond, every carbon is bonded to four others in a rigid three-dimensional network. There is no direction you can push it that does not run straight into a strong bond.",
      "In graphite, every carbon is bonded to only three, in flat sheets. The sheets are strong, but almost nothing holds one sheet to the next — so they slide, and layers come off on the paper. That is what a pencil is doing.",
    ],
    parts: [
      { id: "diamond", name: "Diamond structure", khmer: null, layer: "cutaway", at: [-66, 44, 0],
        blurb: "Four bonds per carbon, arranged tetrahedrally, extending in every direction. Rigid because every direction is braced." },
      { id: "graphite", name: "Graphite structure", khmer: null, layer: "cutaway", at: [66, 44, 0],
        blurb: "Three bonds per carbon, in flat hexagonal sheets. Very strong within a sheet, very weak between them." },
      { id: "bond", name: "Covalent bond", khmer: null, layer: "frame", at: [0, -96, 0],
        blurb: "Identical in both. The bond is not what differs between diamond and graphite — only how many each atom makes, and in what arrangement." },
    ],
    quiz: [
      {
        q: "What is different between diamond and graphite?",
        options: [
          "The atoms",
          "How the atoms are arranged",
          "The temperature",
          "One contains hydrogen"],
        answer: 1,
        why: "Nothing but the arrangement. Both are pure carbon: four bonds in a 3D network versus three bonds in flat sheets.",
      },
      {
        q: "Why does a pencil leave a mark?",
        options: [
          "The graphite melts",
          "Sheets of carbon slide off onto the paper",
          "The bonds break inside each sheet",
          "It is not graphite"],
        answer: 1,
        why: "Almost nothing holds one sheet to the next, so whole layers shear away and stick to the paper. The bonds within each sheet are never broken.",
      },
    ],
    sizeU: 210,
    spanU: 245,
    centreU: 0,
    reallife: "Carbon atoms sit about 0.15 nanometres apart in diamond. Graphite's sheets are more than twice that far apart.",
  },
  {
    id: "organ-brain",
    name: "Brain",
    khmer: "ខួរក្បាល",
    english: "The organ that runs everything else",
    subject: "biology",
    topic: "Nervous system",
    organOf: "brain",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Three pounds of tissue using a fifth of your energy. The wrinkles are not decoration: folding lets far more surface fit inside a skull, and surface is where the thinking happens.",
      "It floats in fluid inside the skull, which is what stops it bruising every time you walk.",
    ],
    parts: [],
    quiz: [
      { q: "What are the brain's folds for?", options: ["Cooling it", "Fitting more surface into the skull", "Holding it in place", "Storing fat"], answer: 1,
        why: "Folding packs a much larger surface into the same volume. The surface layer is where most of the processing happens, so more of it in the same skull is worth having." },
    ],
    sizeU: 16,
    spanU: 20,
    reallife: "About 1.4 kg — roughly 2% of your weight, using about 20% of your energy.",
  },
  {
    id: "organ-spinal-cord",
    name: "Spinal cord",
    khmer: null,
    english: "The cable between brain and body",
    subject: "biology",
    topic: "Nervous system",
    organOf: "spinal-cord",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Every message between your brain and the rest of you travels down this, protected inside the bones of the spine.",
      "Some things never reach the brain at all: pull your hand off something hot and the spinal cord has already decided before you feel it.",
    ],
    parts: [],
    quiz: [
      { q: "Why is the spinal cord inside the spine?", options: ["To keep it warm", "Because bone protects it", "To make you taller", "It is not — it runs outside"], answer: 1,
        why: "The vertebrae form a bony tunnel. Nerve tissue does not heal like skin, so it is worth armouring." },
    ],
    sizeU: 74,
    spanU: 10,
    reallife: "About 45 cm long and roughly as thick as your little finger.",
  },
  {
    id: "organ-thyroid",
    name: "Thyroid",
    khmer: null,
    english: "The gland that sets your speed",
    subject: "biology",
    topic: "Endocrine system",
    organOf: "thyroid",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "A small butterfly-shaped gland across the front of the windpipe. What it releases decides how fast every cell in your body burns energy.",
      "Too little and everything slows down; too much and everything races. In Cambodia, iodised salt exists largely to keep this gland supplied.",
    ],
    parts: [],
    quiz: [
      { q: "What does the thyroid mostly control?", options: ["How fast you burn energy", "How much you sleep", "Your blood type", "How tall you will be"], answer: 0,
        why: "It sets your metabolic rate — the speed the whole body runs at. Growth is affected too, but the rate is the main job." },
    ],
    sizeU: 6,
    spanU: 9,
    reallife: "About 5 cm across and 25 g — small for something that sets the pace of everything.",
  },
  {
    id: "organ-great-vessels",
    name: "Aorta and vena cava",
    khmer: null,
    english: "The body's two largest blood vessels",
    subject: "biology",
    topic: "Circulatory system",
    organOf: "great-vessels",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "The aorta leaves the top of the heart, arches over, and runs down the back of the chest and abdomen. Everything the body receives leaves through it.",
      "The vena cava runs alongside, bringing it all back. Red here means oxygen-rich and blue means oxygen-poor — a convention, not the real colour.",
    ],
    parts: [],
    quiz: [
      { q: "The aorta carries blood…", options: ["To the lungs", "Away from the heart to the body", "From the body to the heart", "Only during exercise"], answer: 1,
        why: "Away from the heart. Arteries carry blood away, veins bring it back — the pulmonary artery is the one exception that carries oxygen-poor blood." },
    ],
    sizeU: 66,
    spanU: 20,
    reallife: "The aorta is about as thick as a garden hose — roughly 2.5 cm across.",
  },
  {
    id: "organ-airways",
    name: "Windpipe and bronchi",
    khmer: "បំពង់ខ្យល់",
    english: "Air's route into the lungs",
    subject: "biology",
    topic: "Respiratory system",
    organOf: "airways",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Down the windpipe, then a split into each lung, then about twenty more splits until the tubes are thinner than a hair.",
      "The right branch is wider and more upright, which is why something swallowed the wrong way usually ends up in the right lung.",
    ],
    parts: [],
    quiz: [
      { q: "Why does an inhaled object usually end up in the right lung?", options: ["The right lung is bigger", "The right bronchus is wider and more upright", "People breathe in on the right", "It does not — the left is more common"], answer: 1,
        why: "Geometry. The right main bronchus leaves the windpipe at a shallower angle, so anything falling takes that route." },
    ],
    sizeU: 22,
    spanU: 18,
    reallife: "The windpipe is about 12 cm long and held open by C-shaped rings of cartilage.",
  },
  {
    id: "organ-diaphragm",
    name: "Diaphragm",
    khmer: null,
    english: "The muscle that does the breathing",
    subject: "biology",
    topic: "Respiratory system",
    organOf: "diaphragm",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "A dome of muscle under the lungs. Flatten it and the chest cavity grows, so air is pulled in; relax it and the dome rises, pushing air out.",
      "You are not really lifting your ribs when you breathe — you are moving this. Hiccups are it twitching.",
    ],
    parts: [],
    quiz: [
      { q: "What actually pulls air into your lungs?", options: ["The lungs expanding on their own", "The diaphragm flattening", "Swallowing air", "The heart pushing"], answer: 1,
        why: "Lungs have no muscle of their own. The diaphragm flattens, the chest cavity gets bigger, pressure drops, and air follows." },
    ],
    sizeU: 14,
    spanU: 32,
    reallife: "A sheet about 35 cm across, separating the chest from the abdomen.",
  },
  {
    id: "organ-oesophagus",
    name: "Oesophagus",
    khmer: null,
    english: "The tube from throat to stomach",
    subject: "biology",
    topic: "Digestive system",
    organOf: "oesophagus",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Not a drainpipe: rings of muscle squeeze along it in a wave, pushing food down whether you are upright, lying flat or upside down.",
      "A ring at the bottom stays shut to keep stomach acid where it belongs. When it leaks, that is heartburn.",
    ],
    parts: [],
    quiz: [
      { q: "How does food get down the oesophagus?", options: ["It falls", "Muscles squeeze it along in a wave", "Water washes it down", "Air pressure"], answer: 1,
        why: "Peristalsis — a travelling wave of muscle contraction. Gravity helps but is not required." },
    ],
    sizeU: 38,
    spanU: 12,
    reallife: "About 25 cm long in an adult.",
  },
  {
    id: "organ-liver",
    name: "Liver",
    khmer: "ថ្លើម",
    english: "The body's chemical works",
    subject: "biology",
    topic: "Digestive system",
    organOf: "liver",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "The largest organ inside you, sitting under the ribs on the body's right. It cleans the blood, stores sugar for later, breaks down medicines and alcohol, and makes bile.",
      "It is also the only organ that regrows. Remove most of it and what is left will rebuild.",
    ],
    parts: [],
    quiz: [
      { q: "Which of these is NOT a job of the liver?", options: ["Storing sugar", "Making bile", "Pumping blood", "Breaking down alcohol"], answer: 2,
        why: "Pumping is the heart's job. The liver does the other three and several hundred more." },
    ],
    sizeU: 14,
    spanU: 22,
    reallife: "About 1.5 kg — the heaviest organ inside the body.",
  },
  {
    id: "organ-gallbladder",
    name: "Gallbladder",
    khmer: null,
    english: "The bile store under the liver",
    subject: "biology",
    topic: "Digestive system",
    organOf: "gallbladder",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "A small green bag holding the bile the liver makes, concentrated and ready. Eat something fatty and it squeezes.",
      "It can be removed and you manage without it — bile just trickles continuously instead of arriving when needed.",
    ],
    parts: [],
    quiz: [
      { q: "What does the gallbladder store?", options: ["Blood", "Bile", "Urine", "Acid"], answer: 1,
        why: "Bile, made by the liver. Its job is timing: releasing a concentrated dose when fatty food arrives." },
    ],
    sizeU: 8,
    spanU: 6,
    reallife: "About 8 cm long and shaped like a small pear.",
  },
  {
    id: "organ-stomach",
    name: "Stomach",
    khmer: "ក្រពះ",
    english: "An acid bag with muscular walls",
    subject: "biology",
    topic: "Digestive system",
    organOf: "stomach",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "It churns food and mixes it with acid strong enough to dissolve metal. What stops it digesting itself is a layer of mucus it rebuilds constantly.",
      "It holds about a litre and a half comfortably. Very little is actually absorbed here — the stomach's job is breaking things down, not taking them in.",
    ],
    parts: [],
    quiz: [
      { q: "Why does the stomach not digest itself?", options: ["Its acid is weak", "A layer of mucus protects it", "It is made of bone", "It only makes acid at night"], answer: 1,
        why: "The lining constantly replaces a mucus barrier. When that barrier fails you get an ulcer." },
    ],
    sizeU: 18,
    spanU: 15,
    reallife: "Holds about 1.5 litres, and stretches to several times its empty size.",
  },
  {
    id: "organ-pancreas",
    name: "Pancreas",
    khmer: null,
    english: "Two glands in one organ",
    subject: "biology",
    topic: "Digestive system",
    organOf: "pancreas",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Behind the stomach, doing two unrelated jobs. Most of it makes the juice that digests your food. Small islands of cells inside it make insulin.",
      "When those islands stop working, that is diabetes — which is why an organ most people cannot point to matters so much.",
    ],
    parts: [],
    quiz: [
      { q: "What does the pancreas make besides digestive juice?", options: ["Bile", "Insulin", "Blood cells", "Adrenaline"], answer: 1,
        why: "Insulin, from small clusters of cells scattered through it. It is the hormone that lets your cells take sugar out of the blood." },
    ],
    sizeU: 8,
    spanU: 20,
    reallife: "About 15 cm long, tucked behind the stomach where you cannot feel it.",
  },
  {
    id: "organ-spleen",
    name: "Spleen",
    khmer: null,
    english: "The blood's filter",
    subject: "biology",
    topic: "Circulatory system",
    organOf: "spleen",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "On the left behind the stomach. It pulls worn-out red blood cells out of circulation and recycles the iron, and it is part of the immune system.",
      "You can live without it, but you are more open to certain infections afterwards.",
    ],
    parts: [],
    quiz: [
      { q: "What does the spleen mainly do?", options: ["Makes bile", "Filters blood and recycles old red cells", "Digests fat", "Stores urine"], answer: 1,
        why: "It filters blood, retires old red cells, and holds a reserve of immune cells." },
    ],
    sizeU: 12,
    spanU: 10,
    reallife: "About 12 cm long — roughly the size of a clenched fist.",
  },
  {
    id: "organ-small-intestine",
    name: "Small intestine",
    khmer: "ពោះវៀនតូច",
    english: "Where food actually becomes you",
    subject: "biology",
    topic: "Digestive system",
    organOf: "small-intestine",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "About six metres of tube, coiled to fit. Almost everything your body takes from food, it takes here.",
      "Its lining is covered in tiny folds and finger-like projections, so the surface available for absorption is enormous — far larger than the tube itself suggests.",
    ],
    parts: [],
    quiz: [
      { q: "Why is the small intestine so long and folded?", options: ["To store food", "To maximise the surface that can absorb", "To make room for the stomach", "To slow you down"], answer: 1,
        why: "Absorption happens across a surface, so more surface means more nutrition from the same meal. Length plus folds plus microscopic projections multiply it enormously." },
    ],
    sizeU: 18,
    spanU: 18,
    reallife: "About 6 m long and 2.5 cm wide — longer than the large intestine despite the name.",
  },
  {
    id: "organ-large-intestine",
    name: "Large intestine",
    khmer: "ពោះវៀនធំ",
    english: "The water-reclaiming frame",
    subject: "biology",
    topic: "Digestive system",
    organOf: "large-intestine",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "It frames the small intestine: up the right side, across, down the left. Wider than the small intestine but much shorter, hence the name.",
      "Its main job is taking back water. It is also home to most of the bacteria you carry, which do real work for you.",
    ],
    parts: [],
    quiz: [
      { q: "What is the large intestine's main job?", options: ["Absorbing nutrients", "Reclaiming water", "Making acid", "Storing bile"], answer: 1,
        why: "Most nutrition has already been absorbed upstream. This stretch reclaims water and forms what is left into waste." },
    ],
    sizeU: 32,
    spanU: 26,
    reallife: "About 1.5 m long and 6 cm wide.",
  },
  {
    id: "organ-kidneys",
    name: "Kidneys",
    khmer: "តម្រងនោម",
    english: "A pair of filters at the back",
    subject: "biology",
    topic: "Urinary system",
    organOf: "kidneys",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Either side of the spine, behind everything else. Between them they filter your entire blood volume about forty times a day.",
      "They do more than filter: they decide how much water you keep, help set your blood pressure, and signal when more red blood cells are needed.",
    ],
    parts: [],
    quiz: [
      { q: "Roughly how often do the kidneys filter all your blood?", options: ["Once a day", "About 40 times a day", "Once a week", "Continuously but only while asleep"], answer: 1,
        why: "Around 40 times a day — about 180 litres filtered, of which nearly all the water is put straight back." },
    ],
    sizeU: 14,
    spanU: 10,
    reallife: "Each about 11 cm long — roughly the size of a computer mouse.",
  },
  {
    id: "organ-ureters",
    name: "Ureters",
    khmer: null,
    english: "The tubes down to the bladder",
    subject: "biology",
    topic: "Urinary system",
    organOf: "ureters",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "Two narrow tubes from the kidneys to the bladder. Like the oesophagus, they squeeze their contents along rather than letting them trickle.",
      "They enter the bladder at an angle, so a full bladder pinches them shut and nothing travels back up.",
    ],
    parts: [],
    quiz: [
      { q: "Why do the ureters enter the bladder at an angle?", options: ["To make them longer", "So a full bladder pinches them shut", "To reach the kidneys", "No reason — it is random"], answer: 1,
        why: "The angle makes a one-way valve. Pressure in a full bladder closes them, so urine cannot be pushed back toward the kidneys." },
    ],
    sizeU: 24,
    spanU: 20,
    reallife: "About 25 cm each, and only 3–4 mm wide.",
  },
  {
    id: "organ-bladder",
    name: "Bladder",
    khmer: null,
    english: "A stretchy holding tank",
    subject: "biology",
    topic: "Urinary system",
    organOf: "bladder",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "It sits low in the pelvis and stretches as it fills. Nerves in its wall report how full it is long before it is actually full.",
      "It holds around 400–600 ml comfortably. The urge starts at about half that.",
    ],
    parts: [],
    quiz: [
      { q: "What tells you the bladder is filling?", options: ["Its weight", "Stretch sensors in its wall", "The kidneys", "The stomach"], answer: 1,
        why: "Nerve endings in the muscular wall respond to stretch, and report earlier and more insistently as it fills." },
    ],
    sizeU: 10,
    spanU: 11,
    reallife: "Holds about half a litre comfortably.",
  },
  {
    id: "organ-skeleton",
    name: "Skeleton",
    khmer: "គ្រោងឆ្អឹង",
    english: "206 bones — scaffolding, armour and a factory",
    subject: "biology",
    topic: "Skeletal system",
    organOf: "skeleton",
    parentOf: "human-body",
    centreU: 0,
    layers: [
      { id: "whole", label: "Whole", hint: "The organ on its own" },
    ],
    about: [
      "It holds you up, protects what is soft, and gives muscles something to pull against. Bone is living tissue, constantly being taken down and rebuilt.",
      "It is also a factory: most of your blood cells are made in the marrow inside the big bones.",
    ],
    parts: [],
    quiz: [
      { q: "Where are most blood cells made?", options: ["In the heart", "In bone marrow", "In the liver", "In the spleen"], answer: 1,
        why: "Bone marrow, especially in the pelvis, ribs, spine and the ends of the long bones. The liver does it before you are born." },
    ],
    sizeU: 180,
    spanU: 62,
    reallife: "206 bones in an adult. A newborn has about 270; several fuse during growth.",
  },
];

export const specimenById = (id: string) => SPECIMENS.find((s) => s.id === id) ?? null;

/**
 * Exhibits listed on the hub for a subject.
 *
 * An exhibit with a `parentOf` is reached by tapping its organ inside the
 * parent — listing all eighteen of them on the hub as well would bury the
 * three that are actually starting points.
 */
export const specimensOfSubject = (subjectId: string) =>
  SPECIMENS.filter((s) => s.subject === subjectId && !s.parentOf);

/** Everything in a subject, children included — for counting, not for listing. */
export const allOfSubject = (subjectId: string) =>
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
