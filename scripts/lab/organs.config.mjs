/**
 * What every real-anatomy model in the Learning Lab is made of.
 *
 * Read by `scripts/lab/build-organs.mjs`. Each model is a list of **parts** —
 * the ids a student taps, matching `src/lab.ts` exactly — and each part is a
 * list of **pieces**: Z-Anatomy structures, a teaching **role** that decides
 * its colour at display time, and a triangle **budget**.
 *
 * ## Where the structures come from
 *
 * Z-Anatomy, https://github.com/LluisV/z-anatomy, CC BY-SA 4.0 — one FBX per
 * body system under `Resources/Models/FBX/`. Every selector below names the
 * file it reads (`src`). Structure names were found with
 * `scripts/lab/survey-fbx.mjs` and group names with `scripts/lab/groups-fbx.mjs`.
 *
 * ## Budgets
 *
 * Output costs roughly **7 bytes per triangle** after compression. The organ
 * screens are close-ups and get detail; the whole body is an overview where
 * every organ is small on screen, so it is built separately and much coarser —
 * loading every close-up file at once to draw one body would be over 2 MB.
 *
 * ## Coordinates
 *
 * Everything is written in Z-Anatomy's own frame — centimetres, Y up, feet near
 * y = 0, the body's left on +X, its front on +Z — so organs, skin and skeleton
 * line up with each other for free. Each exhibit page scales and centres its
 * model at display time.
 */

export const SOURCES = {
  cardio: "CardioVascular41.fbx",
  visceral: "VisceralSystem100.fbx",
  nervous: "NervousSystem100.fbx",
  skeletal: "SkeletalSystem100.fbx",
  muscular: "MuscularSystem100.fbx",
  lymphoid: "LymphoidOrgans100.fbx",
  regions: "Regions of human body100.fbx",
};

/** Exact structure names, each taken as its own geometry only. */
const names = (src, ...list) => ({ src, names: list });
/** Every structure beneath a group, optionally minus subgroups or a name pattern. */
const group = (src, g, opts = {}) => ({ src, group: g, ...opts });
/** A piece: what it is, how it is coloured, and how many triangles it may keep. */
const piece = (name, role, from, budget) => ({ name, role, from: [].concat(from), ...budget });

/* ------------------------------------------------------------- building blocks --- */

const LV = names("cardio", "Left_ventricle", "Inferior_papillary_muscle_of_left_ventricle",
  "Anterior_papillary_muscle_of_left_ventricle", "Anterior_leaflet_of_left_atrioventricular_valve",
  "Posterior_leaflet_of_left_atrioventricular_valve");
const RV = names("cardio", "Right_ventricle", "Inferior_papillary_muscle_of_right_ventricle",
  "Anterior_papillary_muscle_of_right_ventricle", "Septal_papillary_muscle_of_right_ventricle",
  "Anterior_leaflet_of_right_atrioventricular_valve", "Inferior_leaflet_of_right_atrioventricular_valve",
  "Septal_leaflet_of_right_atrioventricular_valve");
const LA = names("cardio", "Left_atrium", "Left_auricle");
const RA = names("cardio", "Right_atrium", "Right_auricle");
const CORONARY = group("cardio", "Arteries_of_heartg");
const CARDIAC_VEINS = names("cardio", "Great_cardiac_vein", "Middle_cardiac_vein", "Small_cardiac_vein",
  "Coronary_sinus", "Anterior_cardiac_veins");
const PULMONARY_VEINS = names("cardio", "Left_superior_pulmonary_vein", "Left_inferior_pulmonary_vein",
  "Right_superior_pulmonary_vein", "Right_inferior_pulmonary_vein");
const PULMONARY_ARTERIES = names("cardio", "Pulmonary_trunk", "Bifurcation_of_pulmonary_trunk",
  "Right_pulmonary_artery", "Left_pulmonary_artery",
  "Anterior_semilunar_leaflet_of_pulmonary_valve", "Left_semilunar_leaflet_of_pulmonary_valve",
  "Right_semilunar_leaflet_of_pulmonary_valve");
const AORTA_ROOT = names("cardio", "Ascending_aorta", "Aortic_arch",
  "Brachiocephalic_trunk", "Left_common_carotid_artery", "Left_subclavian_artery",
  "Left_coronary_leaflet", "Right_coronary_leaflet", "Non-coronary_leaflet");
const AORTA_TRUNK = names("cardio", "Ascending_aorta", "Aortic_arch", "Thoracic_aorta", "Abdominal_aorta",
  "Brachiocephalic_trunk", "Common_iliac_arteryl", "Common_iliac_arteryr");
const VENAE_CAVAE = names("cardio", "Superior_vena_cava",
  "Inferior_vena_cava_(thoracic_part)", "Inferior_vena_cava_(abdominal_part)");

/** The brain's outer surfaces. Deep structures nobody sees from outside are left out. */
const BRAIN = group("nervous", "Braing", {
  excludeGroups: ["Corpus_striatumg", "Walls_of_lateral_ventricleg", "Diencephalong", "Basal_forebraing"],
});
/** White matter is the cord's outside; the grey matter is entirely inside it. */
const SPINAL_CORD = group("nervous", "Spinal_cordg", { excludeGroups: ["Grey_matter_of_spinal_cordg"] });

const LUNG_R = names("visceral", "Superior_lobe_of_right_lung", "Middle_lobe_of_right_lung", "Inferior_lobe_of_right_lung");
const LUNG_L = names("visceral", "Superior_lobe_of_left_lung", "Inferior_lobe_of_left_lung");
const TRACHEA = names("visceral", "Trachea");
const MAIN_BRONCHI = names("visceral", "Right_main_bronchus", "Left_main_bronchus", "Intermediate_bronchusr");
/** Lobar and segmental bronchi: the bronchial group, minus the main bronchi. */
const BRONCHIAL_TREE = group("visceral", "Bronchig", { exclude: /main_bronchus|Intermediate_bronchus/i });

const SMALL_INTESTINE = group("visceral", "Small_intestineg");
/**
 * The colon and appendix, with the three taeniae coli — the muscle bands along
 * its surface that pucker it into pouches, and what makes it read as colon
 * rather than a tube. The source has no separate caecum or rectum.
 */
const LARGE_INTESTINE = group("visceral", "Large_intestineg");
const KIDNEYS = names("visceral", "Kidneyr", "Kidneyl", "Renal_pelvisr", "Renal_pelvisl");

/**
 * Bones only. Every bone in the source carries patches marking where muscles
 * attach (`Tibialis_anterior_muscle…`) — they are why the shoulder girdle alone
 * is 323k triangles — and they are not bone.
 */
const SKELETON = ["Bones_of_lower_limbg", "Bones_of_upper_limbg", "Vertebral_columng", "Craniumg",
  "Extracranial_bones_of_headg", "Thoracic_skeletong", "Teethg"]
  .map((g) => group("skeletal", g, { exclude: /muscle|ligament|tendon|membrane/i }));

/** The skin: Z-Anatomy's 256 body regions tile the whole surface. */
const SKIN = group("regions", "*");

/* ---------------------------------------------------------------------- models --- */

/** Single-organ screens: one part, the organ, at close-up detail. */
const organ = (id, ...pieces) => ({ out: `organ-${id}`, parts: { [id]: pieces } });

export const MODELS = [
  {
    out: "heart",
    // Vessels that leave the heart are cut to stubs at a box around the chambers.
    clip: { around: ["lv", "rv", "la", "ra"], expand: [3, 1, 3], upTo: "Aortic_arch", upPad: 2.5 },
    parts: {
      lv: [piece("lv", "chamber-oxy", LV, { keep: 0.42 })],
      rv: [piece("rv", "chamber-deoxy", RV, { keep: 0.42 })],
      la: [piece("la", "chamber-oxy", LA, { keep: 0.42 })],
      ra: [piece("ra", "chamber-deoxy", RA, { keep: 0.42 })],
      aorta: [piece("aorta", "artery", [AORTA_ROOT, names("cardio", "Thoracic_aorta")], { keep: 0.75 })],
      "pulmonary-trunk": [piece("pulmonary-trunk", "vein", PULMONARY_ARTERIES, { keep: 0.6 })],
      "vena-cava": [piece("vena-cava", "vein", names("cardio", "Superior_vena_cava", "Inferior_vena_cava_(thoracic_part)"), {})],
      coronary: [piece("coronary", "artery", CORONARY, { keep: 0.32 })],
      "cardiac-veins": [piece("cardiac-veins", "vein", CARDIAC_VEINS, { keep: 0.32 })],
      "pulmonary-veins": [piece("pulmonary-veins", "artery", PULMONARY_VEINS, {})],
    },
  },
  {
    out: "lungs",
    parts: {
      "right-lung": [piece("right-lung", "lung", LUNG_R, { tris: 11000 })],
      "left-lung": [piece("left-lung", "lung", LUNG_L, { tris: 9000 })],
      trachea: [piece("trachea", "airway", TRACHEA, { tris: 3000 })],
      bronchi: [piece("bronchi", "airway", MAIN_BRONCHI, {})],
      tree: [piece("tree", "airway", BRONCHIAL_TREE, { tris: 16000 })],
    },
    // The cardiac notch is a shape in the left lung's edge, not a structure of
    // its own; it gets a label anchor on that edge rather than a mesh.
    anchors: { notch: { on: "left-lung", near: [4.5, 126, 9] } },
  },
  organ("brain", piece("brain", "brain", BRAIN, { tris: 80000 })),
  organ("spinal-cord", piece("spinal-cord", "spinal", SPINAL_CORD, { tris: 14000 })),
  organ("thyroid", piece("thyroid", "gland", names("visceral", "Thyroid_gland"), {})),
  {
    out: "organ-great-vessels",
    parts: {
      "great-vessels": [
        piece("aorta", "artery", AORTA_TRUNK, { tris: 7000 }),
        piece("venae-cavae", "vein", VENAE_CAVAE, {}),
      ],
    },
  },
  {
    out: "organ-airways",
    parts: {
      airways: [
        piece("trachea", "airway", TRACHEA, { tris: 3000 }),
        piece("bronchi", "airway", [MAIN_BRONCHI, BRONCHIAL_TREE], { tris: 18000 }),
      ],
    },
  },
  organ("diaphragm", piece("diaphragm", "muscle", names("muscular", "Diaphragm"), { tris: 10000 })),
  organ("oesophagus", piece("oesophagus", "oesophagus", names("visceral", "Oesophagus"), { tris: 6000 })),
  organ("liver", piece("liver", "liver", names("visceral", "Liver"), { tris: 9000 })),
  organ("gallbladder", piece("gallbladder", "gallbladder", names("visceral", "Gallbladder"), {})),
  organ("stomach", piece("stomach", "stomach", names("visceral", "Stomach"), { tris: 7000 })),
  organ("pancreas", piece("pancreas", "pancreas", names("visceral", "Pancreas"), { tris: 4000 })),
  organ("spleen", piece("spleen", "spleen", names("lymphoid", "Spleen"), {})),
  organ("small-intestine", piece("small-intestine", "intestine", SMALL_INTESTINE, { tris: 12000 })),
  organ("large-intestine", piece("large-intestine", "colon", LARGE_INTESTINE, { tris: 16000 })),
  organ("kidneys", piece("kidneys", "kidney", KIDNEYS, { tris: 8000 })),
  organ("ureters", piece("ureters", "ureter", names("visceral", "Ureterr", "Ureterl"), { tris: 4000 })),
  organ("bladder", piece("bladder", "bladder", names("visceral", "Urinary_bladder"), {})),
  organ("skeleton", piece("skeleton", "bone", SKELETON, { tris: 70000, simplify: "each", lockBorder: false, maxError: 0.08 })),
  {
    out: "body",
    // The overview. Every organ is small on screen here, so budgets are tight.
    parts: {
      // The skin's landmark patches sit on top of its regions. Left in, they tore
      // it when simplified and fought it for depth; so they are found by
      // geometry and dropped, and the tiling that is left simplifies as one mesh.
      skin: [piece("skin", "skin", SKIN, { tris: 30000, dropOverlays: true })],
      brain: [piece("brain", "brain", BRAIN, { tris: 7000 })],
      "spinal-cord": [piece("spinal-cord", "spinal", SPINAL_CORD, { tris: 2500 })],
      thyroid: [piece("thyroid", "gland", names("visceral", "Thyroid_gland"), { tris: 600 })],
      heart: [
        piece("chambers", "myocardium", [LV, RV, LA, RA], { tris: 4500 }),
        piece("coronary", "artery", CORONARY, { tris: 900 }),
      ],
      "great-vessels": [
        piece("aorta", "artery", [AORTA_TRUNK, PULMONARY_VEINS], { tris: 2200 }),
        piece("veins", "vein", [VENAE_CAVAE, PULMONARY_ARTERIES], { tris: 1400 }),
      ],
      lungs: [piece("lungs", "lung", [LUNG_R, LUNG_L], { tris: 8000 })],
      airways: [piece("airways", "airway", [TRACHEA, MAIN_BRONCHI, BRONCHIAL_TREE], { tris: 3500 })],
      diaphragm: [piece("diaphragm", "muscle", names("muscular", "Diaphragm"), { tris: 2500 })],
      oesophagus: [piece("oesophagus", "oesophagus", names("visceral", "Oesophagus"), { tris: 1200 })],
      liver: [piece("liver", "liver", names("visceral", "Liver"), { tris: 2500 })],
      gallbladder: [piece("gallbladder", "gallbladder", names("visceral", "Gallbladder"), { tris: 400 })],
      stomach: [piece("stomach", "stomach", names("visceral", "Stomach"), { tris: 2000 })],
      pancreas: [piece("pancreas", "pancreas", names("visceral", "Pancreas"), { tris: 1000 })],
      spleen: [piece("spleen", "spleen", names("lymphoid", "Spleen"), { tris: 600 })],
      "small-intestine": [piece("small-intestine", "intestine", SMALL_INTESTINE, { tris: 4000 })],
      "large-intestine": [piece("large-intestine", "colon", LARGE_INTESTINE, { tris: 4500 })],
      kidneys: [piece("kidneys", "kidney", KIDNEYS, { tris: 2000 })],
      ureters: [piece("ureters", "ureter", names("visceral", "Ureterr", "Ureterl"), { tris: 800 })],
      bladder: [piece("bladder", "bladder", names("visceral", "Urinary_bladder"), { tris: 900 })],
      // Bone by bone, so every bone keeps its share of detail — simplified as
      // one mesh, the smallest features collapse first and the hands vanish.
      // Bones are separate closed shapes, so there are no borders to lock; the
      // looser error is relative to each bone's own size, which a finger bone
      // otherwise never gets down to its share at.
      skeleton: [piece("skeleton", "bone", SKELETON, { tris: 42000, simplify: "each", lockBorder: false, maxError: 0.08 })],
    },
  },
];
