import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MouthTeethContext } from '../mouthStudy';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { XR, useXR } from '@react-three/xr';
import { useLabVR, LabVRButton, LabVRRig } from './LabVR';
import { Box3, CanvasTexture, Group, Mesh, Plane as ThreePlane, Raycaster, Vector2, Vector3 } from 'three';
import { ReviewedOrgan } from './ReviewedOrgan';
import { AnatomyAssetBoundary } from './AnatomyAssetBoundary';
import { anatomyAssetUrl } from '../anatomyAssets';
import { HEAD_LEARNING } from '../headLearning';
import { HeadLearnMore } from './HeadLearnMore';
import { HEAD_ANCHORS, centeredAnchor, studyDistance, showAnnotation, anchoredStudyPosition } from '../anatomyPresentation';
import { Body, useOrgans, type OrganDef } from './LabBody';
import { LabMusclesPilot } from './LabMusclesPilot';
import { LabSkeletonPilot } from './LabSkeletonPilot';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { vessel, type Detail } from './LabOrgans';
import { FirstPersonControls, type WalkInput } from './FirstPersonControls';
import { WalkControls } from './WalkControls';
import { InRoomDetail } from './InRoomDetail';
import './BiologyRoom.css';
import { biologyTransition, biologyParts, canTakeBiologyPart, initialBiologyState, isFittedHeadPart, showBiologyOrgan, type BiologyState, type BiologyLayer } from '../biologyRoomState';
export { initialBiologyState };
const FixedTrayContext = createContext(false);

const parts = [...biologyParts, { id: 'muscles', name: 'Superficial muscles', layer: 'muscles' as const, detail: undefined,
  blurb: 'Blender-authored superficial-muscle illustration with continuous body proportions and directional fibre detail. This is a visual teaching prototype: muscle boundaries and tendons are illustrative, not a medically validated atlas. Individual muscles are not yet separately selectable.' }];
type Props = {
  state: BiologyState; onChange: (state: BiologyState) => void;
  onBack: () => void; onOpenSpecimen: (id: string) => void;
};
const LAYERS = [{ id: 'combined', label: 'Skeleton + organs', icon: '💀' }, { id: 'cutaway', label: 'Organs only', icon: '🫀' }, { id: 'frame', label: 'Skeleton only', icon: '🦴' }, { id: 'muscles', label: 'Muscles', icon: '💪' }] as const;

type AnnotationPin = { label: string; pos: [number, number, number]; info: string };
const ORGAN_ANNOTATIONS: Record<string, AnnotationPin[]> = {
  heart: [
    { label: 'Left ventricle', pos: [6, 28, 14], info: 'Pumps oxygenated blood to the entire body through the aorta' },
    { label: 'Right atrium', pos: [-8, 38, 12], info: 'Receives deoxygenated blood returning from the body' },
    { label: 'Aorta', pos: [2, 44, 8], info: 'The largest artery, carrying blood from the left ventricle' },
    { label: 'Pulmonary artery', pos: [-4, 42, 10], info: 'Carries deoxygenated blood from the right ventricle to the lungs' },
  ],
  brain: [
    { label: 'Cerebrum', pos: [0, 88, 4], info: 'The largest part, responsible for thinking, memory and voluntary movement' },
    { label: 'Cerebellum', pos: [0, 78, -8], info: 'Coordinates balance and fine motor control' },
    { label: 'Brainstem', pos: [0, 76, 0], info: 'Controls breathing, heart rate and other automatic functions' },
  ],
  lungs: [
    { label: 'Right lung (3 lobes)', pos: [-18, 44, 8], info: 'Slightly larger with three lobes: upper, middle and lower' },
    { label: 'Left lung (2 lobes)', pos: [14, 42, 8], info: 'Two lobes only, the heart occupies the missing space' },
    { label: 'Bronchi', pos: [0, 38, 6], info: 'The main airways branching from the trachea into each lung' },
  ],
  liver: [
    { label: 'Right lobe', pos: [-20, 22, 10], info: 'The larger lobe, making up about 60% of the liver' },
    { label: 'Left lobe', pos: [-12, 22, 10], info: 'Smaller lobe, sits over the stomach' },
    { label: 'Portal vein', pos: [-16, 16, 6], info: 'Brings nutrient-rich blood from the digestive tract for processing' },
  ],
  stomach: [
    { label: 'Fundus', pos: [18, 22, 8], info: 'The upper dome that collects swallowed food and gas' },
    { label: 'Body', pos: [16, 14, 8], info: 'The main digestive chamber where acid and enzymes break down food' },
    { label: 'Pylorus', pos: [12, 8, 6], info: 'The exit valve that controls flow into the small intestine' },
  ],
  kidneys: [
    { label: 'Cortex', pos: [-18, 6, -10], info: 'The outer layer where most filtering happens' },
    { label: 'Medulla', pos: [-16, 2, -12], info: 'Inner pyramids that concentrate the filtered waste into urine' },
    { label: 'Renal pelvis', pos: [-14, 4, -14], info: 'Funnel that collects urine and sends it down the ureter' },
  ],
  eyes: [
    { label: 'Cornea', pos: [3, 78, 12], info: 'The clear dome at the front that does most of the focusing' },
    { label: 'Iris & pupil', pos: [3, 76, 10], info: 'The coloured ring that controls how much light enters' },
    { label: 'Lens', pos: [3, 76, 8], info: 'Changes shape to fine-tune focus for near and far objects' },
    { label: 'Retina', pos: [-3, 76, 6], info: 'Light-sensitive lining whose photoreceptors convert light into electrical signals' },
    { label: 'Optic nerve', pos: [-3, 76, 4], info: 'Carries visual signals from the retina to the brain' },
  ],
  ears: [
    { label: 'Outer ear', pos: [-10, 76, 2], info: 'Funnels sound waves into the ear canal' },
    { label: 'Eardrum', pos: [-8, 74, 0], info: 'A thin membrane that vibrates when sound hits it' },
    { label: 'Ossicles', pos: [-6, 74, -2], info: 'Three tiny bones (malleus, incus, stapes) that amplify vibrations' },
    { label: 'Cochlea', pos: [-4, 72, -2], info: 'Spiral tube with hair cells that convert vibration to nerve signals' },
  ],
  nose: [
    { label: 'Nasal cavity', pos: [0, 74, 10], info: 'Air warms and moistens here before reaching the lungs' },
    { label: 'Turbinates', pos: [0, 72, 10], info: 'Bony shelves that increase surface area for filtering and warming' },
    { label: 'Olfactory epithelium', pos: [0, 76, 10], info: 'Sensory tissue high inside the nose that detects odor molecules and sends signals toward the brain' },
  ],
  mouth: [
    { label: 'Tongue', pos: [0, 66, 10], info: 'Moves food and supports speech and taste. Taste buds also occur elsewhere in the mouth and throat' },
    { label: 'Palate', pos: [0, 70, 8], info: 'The roof of the mouth, separating oral and nasal cavities' },
    { label: 'Uvula', pos: [0, 68, 6], info: 'Helps seal the nasal passage during swallowing' },
    { label: 'Salivary glands', pos: [4, 66, 6], info: 'Produce about 1 litre of saliva daily, starting digestion in the mouth' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════
   MICROSCOPE DATA: cell/tissue cross-sections for each organ
   ═══════════════════════════════════════════════════════════════════ */
type MicroscopeSlide = { title: string; description: string; structures: { name: string; color: string; shape: 'circle' | 'oval' | 'rect' | 'irregular'; x: number; y: number; w: number; h: number; label: string }[] };
const MICROSCOPE_SLIDES: Record<string, MicroscopeSlide> = {
  heart: {
    title: 'Cardiac muscle tissue',
    description: 'Branching, striated fibres with intercalated discs that let the cells beat as one. Unlike skeletal muscle, cardiac fibres branch and reconnect.',
    structures: [
      { name: 'Cardiac myocyte', color: '#c94040', shape: 'rect', x: 15, y: 20, w: 70, h: 12, label: 'Striated cardiac fibre' },
      { name: 'Cardiac myocyte', color: '#b83838', shape: 'rect', x: 10, y: 38, w: 65, h: 12, label: 'Branching fibre' },
      { name: 'Cardiac myocyte', color: '#c44444', shape: 'rect', x: 20, y: 56, w: 60, h: 12, label: 'Cross-bridge' },
      { name: 'Intercalated disc', color: '#4060c0', shape: 'rect', x: 50, y: 18, w: 3, h: 14, label: 'Intercalated disc' },
      { name: 'Intercalated disc', color: '#4060c0', shape: 'rect', x: 42, y: 36, w: 3, h: 14, label: 'Intercalated disc' },
      { name: 'Nucleus', color: '#2030a0', shape: 'oval', x: 30, y: 22, w: 8, h: 5, label: 'Nucleus' },
      { name: 'Nucleus', color: '#2030a0', shape: 'oval', x: 25, y: 40, w: 8, h: 5, label: 'Nucleus' },
      { name: 'Capillary', color: '#e06060', shape: 'circle', x: 80, y: 45, w: 6, h: 6, label: 'Capillary' },
    ],
  },
  brain: {
    title: 'Neural tissue (cerebral cortex)',
    description: 'Densely packed neurons with branching dendrites, surrounded by smaller glial cells that support and protect them.',
    structures: [
      { name: 'Pyramidal neuron', color: '#7050b0', shape: 'irregular', x: 35, y: 25, w: 14, h: 18, label: 'Pyramidal neuron' },
      { name: 'Pyramidal neuron', color: '#6848a8', shape: 'irregular', x: 60, y: 40, w: 12, h: 16, label: 'Pyramidal neuron' },
      { name: 'Dendrite', color: '#9070d0', shape: 'rect', x: 30, y: 12, w: 2, h: 14, label: 'Dendrite' },
      { name: 'Dendrite', color: '#9070d0', shape: 'rect', x: 42, y: 15, w: 2, h: 12, label: 'Dendrite' },
      { name: 'Axon', color: '#50a060', shape: 'rect', x: 38, y: 42, w: 2, h: 20, label: 'Axon' },
      { name: 'Glial cell', color: '#6090c0', shape: 'circle', x: 20, y: 50, w: 7, h: 7, label: 'Glial cell' },
      { name: 'Glial cell', color: '#6090c0', shape: 'circle', x: 75, y: 30, w: 6, h: 6, label: 'Astrocyte' },
      { name: 'Nucleus', color: '#303080', shape: 'circle', x: 38, y: 30, w: 5, h: 5, label: 'Nucleus' },
    ],
  },
  lungs: {
    title: 'Alveolar tissue',
    description: 'Tiny air sacs (alveoli) surrounded by capillaries. Oxygen passes through the thin walls into the blood; carbon dioxide passes back out.',
    structures: [
      { name: 'Alveolus', color: '#e8d0d0', shape: 'circle', x: 30, y: 30, w: 25, h: 25, label: 'Alveolus (air sac)' },
      { name: 'Alveolus', color: '#e0c8c8', shape: 'circle', x: 62, y: 25, w: 20, h: 20, label: 'Alveolus' },
      { name: 'Alveolus', color: '#e4cccc', shape: 'circle', x: 45, y: 55, w: 22, h: 22, label: 'Alveolus' },
      { name: 'Capillary', color: '#c04040', shape: 'oval', x: 46, y: 28, w: 8, h: 3, label: 'Capillary' },
      { name: 'Capillary', color: '#c04040', shape: 'oval', x: 55, y: 48, w: 7, h: 3, label: 'Capillary' },
      { name: 'Type I cell', color: '#d8b8b8', shape: 'rect', x: 28, y: 42, w: 10, h: 2, label: 'Type I pneumocyte' },
      { name: 'Type II cell', color: '#a0c0e0', shape: 'circle', x: 22, y: 35, w: 4, h: 4, label: 'Type II (surfactant)' },
    ],
  },
  liver: {
    title: 'Hepatic lobule',
    description: 'Hexagonal lobules with plates of liver cells (hepatocytes) radiating from a central vein. Blood from the portal triad filters through sinusoids.',
    structures: [
      { name: 'Central vein', color: '#4060a0', shape: 'circle', x: 45, y: 42, w: 10, h: 10, label: 'Central vein' },
      { name: 'Hepatocyte plate', color: '#a06040', shape: 'rect', x: 20, y: 40, w: 22, h: 5, label: 'Hepatocyte plate' },
      { name: 'Hepatocyte plate', color: '#a06040', shape: 'rect', x: 58, y: 40, w: 22, h: 5, label: 'Hepatocyte plate' },
      { name: 'Hepatocyte plate', color: '#986038', shape: 'rect', x: 32, y: 22, w: 5, h: 18, label: 'Hepatocyte cord' },
      { name: 'Hepatocyte plate', color: '#986038', shape: 'rect', x: 58, y: 22, w: 5, h: 18, label: 'Hepatocyte cord' },
      { name: 'Sinusoid', color: '#c06060', shape: 'oval', x: 35, y: 32, w: 6, h: 3, label: 'Sinusoid' },
      { name: 'Portal triad', color: '#60a080', shape: 'circle', x: 15, y: 18, w: 8, h: 8, label: 'Portal triad' },
      { name: 'Bile duct', color: '#80c040', shape: 'circle', x: 80, y: 18, w: 6, h: 6, label: 'Bile ductule' },
    ],
  },
  stomach: {
    title: 'Gastric mucosa',
    description: 'Deep gastric pits lined with mucus-secreting cells. At the base, parietal cells make hydrochloric acid and chief cells make pepsinogen.',
    structures: [
      { name: 'Gastric pit', color: '#d8a0a0', shape: 'rect', x: 25, y: 10, w: 8, h: 35, label: 'Gastric pit' },
      { name: 'Gastric pit', color: '#d0a0a0', shape: 'rect', x: 55, y: 10, w: 8, h: 35, label: 'Gastric pit' },
      { name: 'Mucous cell', color: '#c0d8e0', shape: 'oval', x: 22, y: 12, w: 6, h: 4, label: 'Mucous cell' },
      { name: 'Mucous cell', color: '#c0d8e0', shape: 'oval', x: 52, y: 12, w: 6, h: 4, label: 'Mucous cell' },
      { name: 'Parietal cell', color: '#e06080', shape: 'circle', x: 30, y: 38, w: 7, h: 7, label: 'Parietal cell (HCl)' },
      { name: 'Chief cell', color: '#8060c0', shape: 'circle', x: 40, y: 50, w: 7, h: 7, label: 'Chief cell (pepsinogen)' },
      { name: 'Muscularis mucosae', color: '#c08060', shape: 'rect', x: 10, y: 65, w: 80, h: 5, label: 'Muscularis mucosae' },
    ],
  },
  kidneys: {
    title: 'Nephron (renal corpuscle)',
    description: 'The filtering unit: a tuft of capillaries (glomerulus) inside a capsule (Bowman\'s). Blood pressure forces fluid through into the tubule.',
    structures: [
      { name: "Bowman's capsule", color: '#c0d0e8', shape: 'circle', x: 35, y: 30, w: 30, h: 30, label: "Bowman's capsule" },
      { name: 'Glomerulus', color: '#c05050', shape: 'irregular', x: 40, y: 35, w: 18, h: 18, label: 'Glomerulus' },
      { name: 'Afferent arteriole', color: '#e04040', shape: 'rect', x: 25, y: 38, w: 12, h: 3, label: 'Afferent arteriole' },
      { name: 'Efferent arteriole', color: '#4060c0', shape: 'rect', x: 60, y: 38, w: 12, h: 3, label: 'Efferent arteriole' },
      { name: 'Proximal tubule', color: '#a0c0a0', shape: 'rect', x: 55, y: 60, w: 25, h: 5, label: 'Proximal tubule' },
      { name: 'Collecting duct', color: '#80a0c0', shape: 'rect', x: 75, y: 35, w: 5, h: 28, label: 'Collecting duct' },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════
   DISEASE COMPARISON DATA: healthy vs diseased for each organ
   ═══════════════════════════════════════════════════════════════════ */
type DiseaseComparison = { disease: string; healthyDesc: string; diseasedDesc: string; changes: string[]; risk: string };
const DISEASE_DATA: Record<string, DiseaseComparison> = {
  heart: {
    disease: 'Coronary artery disease',
    healthyDesc: 'Smooth, flexible artery walls with wide-open passages for blood flow. Heart muscle receives steady oxygen supply.',
    diseasedDesc: 'Fatty plaques narrow the arteries, restricting blood flow. Heart muscle starves for oxygen, especially during exertion.',
    changes: ['Thickened artery walls', 'Fatty plaque deposits', 'Reduced blood flow', 'Enlarged left ventricle'],
    risk: 'Leading cause of heart attack. Smoking, high cholesterol, and inactivity are major risk factors.',
  },
  brain: {
    disease: 'Stroke (cerebrovascular accident)',
    healthyDesc: 'Dense network of blood vessels delivers oxygen to every region. Neurons fire and communicate freely.',
    diseasedDesc: 'A blocked or burst vessel cuts off blood to a region. Neurons in the affected area begin to die within minutes.',
    changes: ['Blocked cerebral artery', 'Tissue swelling (oedema)', 'Dead tissue zone (infarct)', 'Compressed ventricles'],
    risk: 'Every minute without treatment, about 1.9 million neurons die. High blood pressure is the biggest risk factor.',
  },
  lungs: {
    disease: 'Emphysema (COPD)',
    healthyDesc: 'Millions of tiny alveoli provide a huge surface area for gas exchange. Elastic walls spring back with each breath.',
    diseasedDesc: 'Alveolar walls break down and merge into larger, less efficient sacs. The lungs lose elasticity and trap stale air.',
    changes: ['Destroyed alveolar walls', 'Enlarged air spaces', 'Loss of elastic recoil', 'Flattened diaphragm'],
    risk: 'Smoking is the primary cause. The damage is irreversible once lost, alveoli do not regenerate.',
  },
  liver: {
    disease: 'Cirrhosis',
    healthyDesc: 'Smooth surface with organised lobules. Blood flows freely through sinusoids. The liver regenerates damaged cells efficiently.',
    diseasedDesc: 'Scar tissue replaces healthy cells, forming hard nodules. Blood flow is obstructed, and the liver loses its ability to regenerate.',
    changes: ['Fibrous scar bands', 'Regenerative nodules', 'Shrunken and hardened', 'Portal hypertension'],
    risk: 'Caused by chronic alcohol use, hepatitis B/C, or fatty liver disease. Late-stage cirrhosis may require transplant.',
  },
  stomach: {
    disease: 'Gastric ulcer',
    healthyDesc: 'Intact mucous lining protects the stomach wall from its own acid. The surface constantly rebuilds itself.',
    diseasedDesc: 'The protective mucous layer is breached, exposing the wall to acid. A crater forms that may bleed or perforate.',
    changes: ['Eroded mucous lining', 'Exposed muscle layer', 'Inflammatory infiltrate', 'Bleeding crater'],
    risk: 'H. pylori bacteria and overuse of NSAIDs (aspirin, ibuprofen) are the main causes, not stress or spicy food.',
  },
  kidneys: {
    disease: 'Chronic kidney disease',
    healthyDesc: 'Over a million nephrons filter blood efficiently. Healthy glomeruli have thin, permeable membranes.',
    diseasedDesc: 'Nephrons are progressively destroyed and replaced by scar tissue. Remaining nephrons overwork and eventually fail too.',
    changes: ['Scarred glomeruli', 'Thickened basement membrane', 'Tubular atrophy', 'Interstitial fibrosis'],
    risk: 'Diabetes and high blood pressure cause most cases. Often silent until over 60% of function is lost.',
  },
};

/* ═══════════════════════════════════════════════════════════════════
   ORGAN SOUNDS: ambient audio per organ (Web Audio API oscillators)
   ═══════════════════════════════════════════════════════════════════ */
const ORGAN_SOUND_CONFIG: Record<string, { type: 'heartbeat' | 'breathing' | 'digest' | 'neural' | 'filter'; bpm?: number }> = {
  heart: { type: 'heartbeat', bpm: 72 },
  lungs: { type: 'breathing', bpm: 16 },
  stomach: { type: 'digest' },
  brain: { type: 'neural' },
  kidneys: { type: 'filter' },
  liver: { type: 'digest' },
};

/* ═══════════════════════════════════════════════════════════════════
   LABEL QUIZ: drag labels to correct positions
   ═══════════════════════════════════════════════════════════════════ */
type QuizLabel = { text: string; correctIndex: number };
const LABEL_QUIZ_DATA: Record<string, QuizLabel[]> = {
  heart: [
    { text: 'Left ventricle', correctIndex: 0 },
    { text: 'Right atrium', correctIndex: 1 },
    { text: 'Aorta', correctIndex: 2 },
    { text: 'Pulmonary artery', correctIndex: 3 },
  ],
  brain: [
    { text: 'Cerebrum', correctIndex: 0 },
    { text: 'Cerebellum', correctIndex: 1 },
    { text: 'Brainstem', correctIndex: 2 },
  ],
  lungs: [
    { text: 'Right lung (3 lobes)', correctIndex: 0 },
    { text: 'Left lung (2 lobes)', correctIndex: 1 },
    { text: 'Bronchi', correctIndex: 2 },
  ],
  liver: [
    { text: 'Right lobe', correctIndex: 0 },
    { text: 'Left lobe', correctIndex: 1 },
    { text: 'Portal vein', correctIndex: 2 },
  ],
  stomach: [
    { text: 'Fundus', correctIndex: 0 },
    { text: 'Body', correctIndex: 1 },
    { text: 'Pylorus', correctIndex: 2 },
  ],
  kidneys: [
    { text: 'Cortex', correctIndex: 0 },
    { text: 'Medulla', correctIndex: 1 },
    { text: 'Renal pelvis', correctIndex: 2 },
  ],
};

const LATIN_NAMES: Record<string, string> = {
  heart: 'Cor', brain: 'Cerebrum', eyes: 'Oculi', ears: 'Aures',
  nose: 'Nasus', mouth: 'Os et lingua', lungs: 'Pulmones', liver: 'Hepar',
  stomach: 'Gaster / Ventriculus', kidneys: 'Renes', 'spinal-cord': 'Medulla spinalis',
  thyroid: 'Glandula thyroidea', 'great-vessels': 'Aorta et vena cava',
  airways: 'Trachea et bronchi', diaphragm: 'Diaphragma', oesophagus: 'Oesophagus',
  gallbladder: 'Vesica biliaris', pancreas: 'Pancreas', spleen: 'Lien / Splen',
  'small-intestine': 'Intestinum tenue', 'large-intestine': 'Intestinum crassum',
  ureters: 'Ureteres', bladder: 'Vesica urinaria', skeleton: 'Skeleton',
  muscles: 'Musculi',
};

const LATIN_ANNOTATIONS: Record<string, string[]> = {
  heart: ['Ventriculus sinister', 'Atrium dextrum', 'Aorta', 'Arteria pulmonalis'],
  brain: ['Cerebrum', 'Cerebellum', 'Truncus encephali'],
  eyes: ['Cornea', 'Iris', 'Lens crystallina', 'Retina', 'Nervus opticus'],
  ears: ['Auricula', 'Tympanum', 'Cochlea', 'Canales semicirculares'],
  nose: ['Cavitas nasi', 'Conchae nasales', 'Epithelium olfactorium'],
  mouth: ['Lingua', 'Palatum', 'Uvula', 'Papillae gustatoriae'],
  lungs: ['Pulmo dexter (3 lobi)', 'Pulmo sinister (2 lobi)', 'Bronchi'],
  liver: ['Lobus dexter', 'Lobus sinister', 'Vena portae'],
  stomach: ['Fundus ventriculi', 'Corpus ventriculi', 'Pylorus'],
  kidneys: ['Cortex renalis', 'Medulla renalis', 'Pelvis renalis'],
};

const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function BiologyRoom({ state, onChange, onBack }: Props) {
  const vrSession = useLabVR();
  const store = vrSession.store;
  const [ultra, setUltra] = useState(() => navigator.hardwareConcurrency > 4 && window.innerWidth > 600);
  const [vr, setVr] = useState(false);
  const [spin, setSpin] = useState(false);
  const [turn, setTurn] = useState(0);
  const [query, setQuery] = useState('');
  const [locked, setLocked] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dockTab, setDockTab] = useState<'view' | 'organs' | 'tools'>('view');
  const [moreTools, setMoreTools] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [trayRotX, setTrayRotX] = useState(0);
  const [trayZoom, setTrayZoom] = useState(1);
  const [showPins, setShowPins] = useState(true);
  const [showMouthTeeth, setShowMouthTeeth] = useState(true);
  const [activePin, setActivePin] = useState<number | null>(null);
  const [fixedTray, setFixedTray] = useState(false);
  const [microscopeOpen, setMicroscopeOpen] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizPlacements, setQuizPlacements] = useState<(number | null)[]>([]);
  const [quizDrag, setQuizDrag] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [clipAxis, setClipAxis] = useState<'off' | 'x' | 'y' | 'z'>('off');
  const [clipValue, setClipValue] = useState(0);
  const [antMode, setAntMode] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [peelAmount, setPeelAmount] = useState(0);

  useEffect(() => {
    if (guideStep === 0 && state.layer === 'cutaway') setGuideStep(1);
    else if (guideStep === 1 && state.taken === 'heart') setGuideStep(2);
    else if (guideStep === 2 && state.taken === 'heart' && fixedTray) setGuideStep(3);
    else if (guideStep === 3 && state.taken === 'heart' && activePin !== null) setGuideStep(4);
    else if (guideStep === 4 && state.taken === null) setGuideStep(5);
  }, [guideStep, state.layer, state.taken, fixedTray, activePin]);

  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const roomRef = useRef<HTMLDivElement>(null);
  const pointerLockSupported = useRef(true);
  const dragging = useRef(false);
  const trayDragging = useRef(false);
  const trayHit = useRef(false);
  const rotatePointer = useRef<{ id: number; x: number; y: number } | null>(null);

  const part = parts.find(p => p.id === state.selected) ?? (state.layer === 'muscles' ? parts.find(p => p.id === 'muscles') : undefined);
  const hoveredPart = parts.find(p => p.id === hovered);
  const clearTrayControls = () => {
    setFixedTray(false);
    setMoreTools(false);
    setSpin(false); setTurn(0); setTrayRotX(0); setTrayZoom(1); setActivePin(null);
    setMicroscopeOpen(false); setQuizMode(false); setQuizScore(null); setCompareMode(false); setSoundOn(false);
    setExploded(false); setClipAxis('off'); setClipValue(0); setAntMode(false); setSplitOpen(false); setPeelAmount(0);
    trayHit.current = false; trayDragging.current = false;
    rotatePointer.current = null;
  };
  const pick = (id: string) => {
    if (state.taken === id) {
      onChange(biologyTransition(state, { type: 'select', id }));
    } else {
      const selected = biologyTransition(state, { type: 'select', id });
      onChange(biologyTransition(selected, { type: 'take' }));
      clearTrayControls();
    }
  };
  const changeLayer = (layer: BiologyLayer) => { onChange(biologyTransition(state, { type: 'layer', layer })); clearTrayControls(); };
  const reset = () => { onChange(initialBiologyState); clearTrayControls(); setQuery(''); setSearchOpen(false); };
  const takeable = canTakeBiologyPart(state.selected);
  const take = () => { onChange(biologyTransition(state, { type: 'take' })); clearTrayControls(); };
  const resetAll = reset;

  // Organ ambient sound via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (soundIntervalRef.current) { clearInterval(soundIntervalRef.current); soundIntervalRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (!soundOn || !state.taken) return;
    const cfg = ORGAN_SOUND_CONFIG[state.taken];
    if (!cfg) return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const playTone = (freq: number, dur: number, vol: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + dur * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
    };
    if (cfg.type === 'heartbeat') {
      const ms = 60000 / (cfg.bpm ?? 72);
      const beat = () => { playTone(55, 0.12, 0.3); setTimeout(() => playTone(45, 0.1, 0.2), 120); };
      beat();
      soundIntervalRef.current = window.setInterval(beat, ms);
    } else if (cfg.type === 'breathing') {
      const ms = 60000 / (cfg.bpm ?? 16);
      const breath = () => { playTone(200, 0.8, 0.08, 'sawtooth'); setTimeout(() => playTone(150, 0.9, 0.06, 'sawtooth'), 900); };
      breath();
      soundIntervalRef.current = window.setInterval(breath, ms);
    } else if (cfg.type === 'digest') {
      const gurgle = () => { const f = 80 + Math.random() * 60; playTone(f, 0.4 + Math.random() * 0.3, 0.06, 'sawtooth'); };
      gurgle();
      soundIntervalRef.current = window.setInterval(gurgle, 2000 + Math.random() * 1500);
    } else if (cfg.type === 'neural') {
      const spark = () => { playTone(800 + Math.random() * 400, 0.03, 0.04); };
      soundIntervalRef.current = window.setInterval(spark, 200 + Math.random() * 300);
    } else if (cfg.type === 'filter') {
      const drip = () => { playTone(600, 0.05, 0.05); setTimeout(() => playTone(400, 0.04, 0.03), 80); };
      soundIntervalRef.current = window.setInterval(drip, 1200);
    }
    return () => {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      ctx.close().catch(() => {});
    };
  }, [soundOn, state.taken]);

  // Pointer lock for desktop look
  useEffect(() => {
    if (isTouchDevice) return;
    const onChange = () => setLocked(!!document.pointerLockElement);
    const onMove = (e: MouseEvent) => {
      if (trayDragging.current) {
        setTurn(v => v + e.movementX * 0.008);
        setTrayRotX(v => Math.max(-1.2, Math.min(1.2, v + e.movementY * 0.008)));
        return;
      }
      if (document.pointerLockElement) {
        walkInput.current.look.dx += e.movementX;
        walkInput.current.look.dy += e.movementY;
      } else if (dragging.current) {
        walkInput.current.look.dx += e.movementX;
        walkInput.current.look.dy += e.movementY;
      }
    };
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.bio-ui')) return;
      if (trayHit.current) { trayDragging.current = true; return; }
      if (!document.pointerLockElement) dragging.current = true;
    };
    const onUp = () => { dragging.current = false; trayDragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      if (!trayHit.current) return;
      e.preventDefault();
      setTrayZoom(v => Math.max(0.5, Math.min(3, v - e.deltaY * 0.002)));
    };
    document.addEventListener('pointerlockchange', onChange);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('pointerlockchange', onChange);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('wheel', onWheel);
    };
  }, []);

  const requestLock = useCallback(() => {
    if (isTouchDevice || !pointerLockSupported.current || document.pointerLockElement) return;
    try { roomRef.current?.requestPointerLock(); } catch { pointerLockSupported.current = false; }
  }, []);

  // Touch look fallback
  const lookLast = useRef({ x: 0, y: 0 });
  const lookId = useRef<number | null>(null);
  const onTouchDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.bio-ui')) return;
    if (lookId.current === null) { lookId.current = e.pointerId; lookLast.current = { x: e.clientX, y: e.clientY }; }
  };
  const onTouchMove = (e: React.PointerEvent) => {
    if (e.pointerId === lookId.current) {
      walkInput.current.look.dx += e.clientX - lookLast.current.x;
      walkInput.current.look.dy += e.clientY - lookLast.current.y;
      lookLast.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onTouchUp = (e: React.PointerEvent) => { if (e.pointerId === lookId.current) lookId.current = null; };

  return <div className={`bio-room${part && !searchOpen && !detailId && !vr ? ' bio-room--studying' : ''}`} ref={roomRef}
    onPointerDown={isTouchDevice ? onTouchDown : undefined}
    onPointerMove={isTouchDevice ? onTouchMove : undefined}
    onPointerUp={isTouchDevice ? onTouchUp : undefined}
    onPointerCancel={isTouchDevice ? onTouchUp : undefined}
  >
    {/* Full-screen canvas - unmounted while detail overlay is open to free the WebGL context */}
    <div className="bio-canvas" onClick={vrSession.active ? undefined : requestLock} style={detailId ? { display: 'none' } : undefined}>
      {!detailId && <Canvas shadows={ultra || vr} dpr={ultra || vr ? [1, 1.75] : 1} camera={{ fov: 65, near: .05, far: 30 }}>
        <XR store={store}>
          <FixedTrayContext.Provider value={fixedTray}><MouthTeethContext.Provider value={showMouthTeeth}><BiologyScene state={state} detail={ultra || vr ? 'ultra' : 'normal'} pick={pick} changeLayer={changeLayer}
            take={take} takeable={!!takeable} reset={reset} spin={spin} turn={turn} setSpin={setSpin}
            trayRotX={trayRotX} trayZoom={trayZoom} showPins={showPins} activePin={activePin} onActivePin={setActivePin}
            trayHitRef={trayHit}
            exploded={exploded} clipAxis={clipAxis} clipValue={clipValue} antMode={antMode} splitOpen={splitOpen} peelAmount={peelAmount}
            onVR={setVr} walkInput={walkInput} onHover={setHovered} /></MouthTeethContext.Provider></FixedTrayContext.Provider>
          <LabVRRig start={[-.7, 0, 2.1]} bounds={[-3, 3, -2.5, 3.5]} />
        </XR>
      </Canvas>}
    </div>

    {/* Mobile walk joystick */}
    {isTouchDevice && !detailId && <WalkControls input={walkInput} />}

    {/* Top bar */}
    {!detailId && <div className="bio-top bio-ui" onClick={e => e.stopPropagation()}>
      <button className="backbtn" onClick={() => { if (document.pointerLockElement) document.exitPointerLock?.(); onBack(); }}>← Lab</button>
      <span className="bio-title">🫀 Biology & Anatomy</span>
      <div className="bio-top-right">
        {!vrSession.active && <button onClick={() => { setGuideStep(0); setShowHelp(false); setDockTab('view'); }} aria-label="Start guided heart study">Guide</button>}
        <button disabled={vrSession.active} onClick={() => setUltra(v => !v)}>{ultra || vr ? 'Ultra' : 'Normal'}</button>
        <button onClick={resetAll}>Reset</button>
        <LabVRButton vr={vrSession} />
      </div>
    </div>}

    {/* Help overlay */}
    {showHelp && !detailId && !isTouchDevice && (
      <div className="bio-help bio-ui" onClick={e => e.stopPropagation()}>
        <b>🫀 Biology & Anatomy Room</b>
        <p>Explore the skeleton and organs together. Choose Organs only for an unobstructed view inside the rib cage.</p>
        <div className="bio-help-keys">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd>Mouse</kbd> Look around</span>
          <span><kbd>Shift</kbd> Sprint</span>
          <span><kbd>Space</kbd> Jump</span>
        </div>
        <p>Look at a body part to see its name and info. Click an organ to take it directly to the study tray.</p>
        <button onClick={() => setShowHelp(false)}>Got it</button>
      </div>
    )}

    {guideStep !== null && !detailId && !vrSession.active && (
      <section className="bio-guide bio-ui" aria-label="Guided heart study" onClick={e => e.stopPropagation()}>
        <div className="bio-guide-head">
          <b>Heart study</b>
          <button aria-label="Close guide" onClick={() => setGuideStep(null)}>✕</button>
        </div>
        <small>{guideStep === 5 ? 'Complete' : `Step ${guideStep + 1} of 5`}</small>
        <p aria-live="polite">{[
          'Choose Organs only to see inside the body.',
          'Select the heart in the room or Organs dock to take it out.',
          'Place the heart on the room tray so it stays put as you move.',
          'Choose a heart structure label and read what it does.',
          'Return the heart to the body.',
          'Well done. You can explore another organ or repeat this study.',
        ][guideStep]}</p>
        {guideStep === 0 && <button className="bio-guide-action" onClick={() => setDockTab('view')}>Show view controls</button>}
        {guideStep === 1 && <button className="bio-guide-action" onClick={() => setDockTab('organs')}>Show organs</button>}
        {guideStep === 5 && <button className="bio-guide-action" onClick={() => { reset(); setDockTab('view'); setGuideStep(0); }}>Try again</button>}
      </section>
    )}

    {/* Crosshair */}
    {locked && !detailId && <div className="bio-crosshair" />}

    {/* ── Hover info card: appears on the right when looking at a part ── */}
    {hoveredPart && !part && !searchOpen && !detailId && (
      <div className="bio-hover-card bio-ui" key={hoveredPart.id}>
        <div className="bio-hover-label">{hoveredPart.name}</div>
        {LATIN_NAMES[hoveredPart.id] && <div className="bio-hover-latin">{LATIN_NAMES[hoveredPart.id]}</div>}
        <p className="bio-hover-blurb">{HEAD_LEARNING[hoveredPart.id]?.summary ?? hoveredPart.blurb}</p>
        <span className="bio-hover-hint">Click to take to study tray</span>
      </div>
    )}

    {/* ── Selected part card: persists when an organ is selected/taken ── */}
    {part && !searchOpen && !detailId && (
      <div className="bio-selected-card bio-ui" onClick={e => e.stopPropagation()}>
        <small className="bio-selected-status">{state.taken ? (fixedTray ? 'ON ROOM TRAY' : 'IN ROOM STUDY') : 'SELECTED'}</small>
        <div className="bio-selected-name">{part.name}</div>
        {LATIN_NAMES[part.id] && <div className="bio-hover-latin">{LATIN_NAMES[part.id]}</div>}
        <p className="bio-hover-blurb">{HEAD_LEARNING[part.id]?.summary ?? part.blurb}</p>
        <HeadLearnMore key={part.id} id={part.id} />
        {state.taken === 'mouth' && <button className="bio-selected-action" aria-pressed={showMouthTeeth} onClick={() => setShowMouthTeeth(v => !v)}>{showMouthTeeth ? 'Hide teeth and gums' : 'Show teeth and gums'}</button>}
        {state.taken === 'ears' && <p className="bio-hover-blurb">Studying the right ear. Return restores both ears to the body.</p>}
        {takeable && <button className="bio-selected-action" onClick={take}>{state.taken ? '↩️ Return' : '🫳 Take out'}</button>}
        {state.taken && <>
          <button className="bio-selected-action" onClick={() => setFixedTray(true)} disabled={fixedTray}>Place on room tray</button>
          <p className="bio-hover-blurb">The object stays in the room when you move. Return it to the body to take it again from a new position.</p>
        </>}
        {state.taken && (
          <>
            <div className="bio-selected-tray">
              <button onClick={() => setTurn(v => v - Math.PI / 6)}>↶</button>
              <button onClick={() => setSpin(v => !v)}>{spin ? '⏸' : '🔄'}</button>
              <button onClick={() => setTurn(v => v + Math.PI / 6)}>↷</button>
            </div>
            <div className="bio-tray-controls">
              <div className="bio-rotate-pad" role="group" aria-label="Organ rotation control"
                onPointerDown={e => {
                  if (rotatePointer.current) return;
                  e.preventDefault(); e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  rotatePointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
                  setSpin(false);
                }}
                onPointerMove={e => {
                  const previous = rotatePointer.current;
                  if (!previous || previous.id !== e.pointerId) return;
                  e.stopPropagation();
                  setTurn(v => v + (e.clientX - previous.x) * .008);
                  setTrayRotX(v => Math.max(-1.2, Math.min(1.2, v + (e.clientY - previous.y) * .008)));
                  rotatePointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
                }}
                onPointerUp={e => { if (rotatePointer.current?.id === e.pointerId) rotatePointer.current = null; }}
                onPointerCancel={() => { rotatePointer.current = null; }}
                onLostPointerCapture={() => { rotatePointer.current = null; }}>
                Drag here to rotate the organ
              </div>
              <div className="bio-zoom-row">
                <span className="bio-zoom-label">Zoom</span>
                <input aria-label="Organ zoom" type="range" min={0.5} max={3} step={0.1} value={trayZoom}
                  onChange={e => setTrayZoom(parseFloat(e.target.value))} />
                <span className="bio-zoom-val">{Math.round(trayZoom * 100)}%</span>
              </div>
              <div className="bio-tray-hints">
                <small>Drag organ to rotate · Scroll to zoom</small>
              </div>
              {(clipAxis !== 'off' || splitOpen) && (
                <div className="bio-zoom-row">
                  <span className="bio-zoom-label">{splitOpen ? 'Split' : `Clip ${clipAxis.toUpperCase()}`}</span>
                  <input type="range" min={-1} max={1} step={0.02} value={clipValue}
                    onChange={e => setClipValue(parseFloat(e.target.value))} />
                  <span className="bio-zoom-val">{Math.round(clipValue * 50)}%</span>
                </div>
              )}
              {peelAmount > 0 && (
                <div className="bio-zoom-row">
                  <span className="bio-zoom-label">Peel</span>
                  <input type="range" min={0} max={1} step={0.02} value={peelAmount}
                    onChange={e => setPeelAmount(parseFloat(e.target.value))} />
                  <span className="bio-zoom-val">{Math.round(peelAmount * 100)}%</span>
                </div>
              )}
              {ORGAN_ANNOTATIONS[state.taken] && (
                <button className={`bio-pin-toggle${showPins ? ' on' : ''}`} onClick={() => { setShowPins(v => !v); setActivePin(null); }}>
                  📌 {showPins ? 'Hide' : 'Show'} labels {trayZoom < 1.2 && showPins && !isFittedHeadPart(state.taken) && <span className="bio-pin-hint">(zoom in to see)</span>}
                </button>
              )}
            </div>
            {showPins && ORGAN_ANNOTATIONS[state.taken] && (
              <div className="bio-head-landmarks" role="group" aria-label="Head structure labels">
                <p>Choose a structure to highlight. Rotate or use the study tools to inspect hidden landmarks.</p>
                {ORGAN_ANNOTATIONS[state.taken].map((pin, i) => <button key={pin.label} aria-pressed={activePin === i}
                  onClick={() => setActivePin(activePin === i ? null : i)}>{i + 1}. {pin.label}</button>)}
              </div>
            )}
            {showPins && activePin !== null && ORGAN_ANNOTATIONS[state.taken] && ORGAN_ANNOTATIONS[state.taken][activePin] && (
              <div className="bio-pin-info" aria-live="polite">
                <b>{ORGAN_ANNOTATIONS[state.taken][activePin].label}</b>
                {LATIN_ANNOTATIONS[state.taken]?.[activePin] && <i className="bio-pin-latin">{LATIN_ANNOTATIONS[state.taken][activePin]}</i>}
                <p>{ORGAN_ANNOTATIONS[state.taken][activePin].info}</p>
              </div>
            )}
          </>
        )}
        {part.detail && <button className="bio-selected-action" onClick={() => setDetailId(part.detail!)}>🔬 Detail</button>}
        {state.taken && ORGAN_SOUND_CONFIG[state.taken] && (
          <button className={`bio-selected-action${soundOn ? ' sound-on' : ''}`} onClick={() => setSoundOn(v => !v)}>
            {soundOn ? '🔊 Sound on' : '🔇 Play sound'}
          </button>
        )}
      </div>
    )}

    {/* ── Microscope panel ── */}
    {microscopeOpen && state.taken && MICROSCOPE_SLIDES[state.taken] && !detailId && (() => {
      const slide = MICROSCOPE_SLIDES[state.taken!];
      return <div className="bio-microscope bio-ui" onClick={e => e.stopPropagation()}>
        <div className="bio-panel-bar">
          <b>🔬 {slide.title}</b>
          <button className="bio-x" onClick={() => setMicroscopeOpen(false)}>✕</button>
        </div>
        <div className="bio-microscope-body">
          <svg viewBox="0 0 100 80" className="bio-microscope-svg">
            <defs>
              <radialGradient id="micro-bg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f8f0f0" />
                <stop offset="85%" stopColor="#e0d0d0" />
                <stop offset="100%" stopColor="#000" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="40" r="39" fill="url(#micro-bg)" />
            {slide.structures.map((s, i) => (
              <g key={i}>
                {s.shape === 'circle' && <circle cx={s.x + s.w / 2} cy={s.y + s.h / 2} r={s.w / 2} fill={s.color} opacity={0.8} stroke="#333" strokeWidth={0.3} />}
                {s.shape === 'oval' && <ellipse cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} fill={s.color} opacity={0.8} stroke="#333" strokeWidth={0.3} />}
                {s.shape === 'rect' && <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={1} fill={s.color} opacity={0.8} stroke="#333" strokeWidth={0.3} />}
                {s.shape === 'irregular' && <ellipse cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} fill={s.color} opacity={0.7} stroke="#333" strokeWidth={0.4} />}
                <text x={s.x + s.w / 2} y={s.y - 1.5} textAnchor="middle" fontSize="2.5" fill="#222" fontWeight="600">{s.label}</text>
              </g>
            ))}
          </svg>
          <p className="bio-microscope-desc">{slide.description}</p>
          <div className="bio-microscope-legend">
            {slide.structures.filter((s, i, arr) => arr.findIndex(a => a.name === s.name) === i).map((s, i) => (
              <span key={i} className="bio-legend-item"><span className="bio-legend-dot" style={{ background: s.color }} />{s.name}</span>
            ))}
          </div>
        </div>
      </div>;
    })()}

    {/* ── Label Quiz panel ── */}
    {quizMode && state.taken && LABEL_QUIZ_DATA[state.taken] && !detailId && (() => {
      const labels = LABEL_QUIZ_DATA[state.taken!];
      const pins = ORGAN_ANNOTATIONS[state.taken!] ?? [];
      const checkQuiz = () => {
        let correct = 0;
        quizPlacements.forEach((placed, slotIdx) => {
          if (placed !== null && placed !== undefined) {
            const label = labels[placed];
            if (label && label.correctIndex === slotIdx) correct++;
          }
        });
        setQuizScore({ correct, total: pins.length });
      };
      const resetQuiz = () => { setQuizPlacements([]); setQuizScore(null); setQuizDrag(null); };
      return <div className="bio-quiz-panel bio-ui" onClick={e => e.stopPropagation()}>
        <div className="bio-panel-bar">
          <b>📝 Label the {state.taken}</b>
          <button className="bio-x" onClick={() => { setQuizMode(false); resetQuiz(); }}>✕</button>
        </div>
        <div className="bio-quiz-body">
          {quizScore ? (
            <div className="bio-quiz-result">
              <div className="bio-quiz-score">{quizScore.correct}/{quizScore.total}</div>
              <p>{quizScore.correct === quizScore.total ? 'Perfect! You know this organ well.' : quizScore.correct > 0 ? 'Good effort! Review the labels and try again.' : 'Keep studying! Use the annotation pins to learn the parts first.'}</p>
              <button onClick={resetQuiz}>Try again</button>
            </div>
          ) : (
            <>
              <p className="bio-quiz-instruction">Tap a label, then tap the slot where it belongs. Slots match the annotation pin numbers on the organ.</p>
              <div className="bio-quiz-labels">
                {labels.map((label, i) => {
                  const isPlaced = quizPlacements.includes(i);
                  return <button key={i} className={`bio-quiz-label${quizDrag === i ? ' dragging' : ''}${isPlaced ? ' placed' : ''}`}
                    onClick={() => {
                      if (isPlaced) return;
                      setQuizDrag(quizDrag === i ? null : i);
                    }}
                    disabled={isPlaced}>
                    {label.text}
                  </button>;
                })}
              </div>
              <div className="bio-quiz-slots">
                {pins.map((_, slotIdx) => (
                  <button type="button" key={slotIdx} className={`bio-quiz-slot${quizPlacements[slotIdx] !== undefined && quizPlacements[slotIdx] !== null ? ' filled' : ''}`}
                    onClick={() => {
                      if (quizDrag === null) {
                        if (quizPlacements[slotIdx] !== undefined && quizPlacements[slotIdx] !== null) {
                          const newP = [...quizPlacements]; newP[slotIdx] = null; setQuizPlacements(newP);
                        }
                        return;
                      }
                      const newP = [...quizPlacements]; newP[slotIdx] = quizDrag; setQuizPlacements(newP); setQuizDrag(null);
                    }}>
                    <span className="bio-quiz-slot-num">{slotIdx + 1}</span>
                    <span className="bio-quiz-slot-text">
                      {quizPlacements[slotIdx] !== undefined && quizPlacements[slotIdx] !== null
                        ? labels[quizPlacements[slotIdx]!].text
                        : quizDrag !== null ? 'Drop here' : 'Empty'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="bio-quiz-actions">
                <button onClick={checkQuiz} disabled={quizPlacements.filter(p => p !== null && p !== undefined).length < pins.length}>Check answers</button>
                <button onClick={resetQuiz}>Reset</button>
              </div>
            </>
          )}
        </div>
      </div>;
    })()}

    {/* ── Disease comparison panel ── */}
    {compareMode && state.taken && DISEASE_DATA[state.taken] && !detailId && (() => {
      const d = DISEASE_DATA[state.taken!];
      return <div className="bio-compare bio-ui" onClick={e => e.stopPropagation()}>
        <div className="bio-panel-bar">
          <b>⚕️ Healthy vs {d.disease}</b>
          <button className="bio-x" onClick={() => setCompareMode(false)}>✕</button>
        </div>
        <div className="bio-compare-body">
          <div className="bio-compare-columns">
            <div className="bio-compare-col healthy">
              <div className="bio-compare-badge healthy">Healthy</div>
              <p>{d.healthyDesc}</p>
            </div>
            <div className="bio-compare-col diseased">
              <div className="bio-compare-badge diseased">Diseased</div>
              <p>{d.diseasedDesc}</p>
            </div>
          </div>
          <div className="bio-compare-changes">
            <b>Key changes:</b>
            <ul>{d.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="bio-compare-risk">
            <b>Clinical note:</b>
            <p>{d.risk}</p>
          </div>
        </div>
      </div>;
    })()}

    {/* Station dock */}
    {!searchOpen && !detailId && (
      <div className="bio-dock bio-ui" onClick={e => e.stopPropagation()}>
        <div className="bio-dock-tabs">
          <button className={`bio-dock-tab${dockTab === 'view' ? ' active' : ''}`} onClick={() => setDockTab('view')}>View</button>
          <button className={`bio-dock-tab${dockTab === 'organs' ? ' active' : ''}`} onClick={() => setDockTab('organs')}>Organs</button>
          <button className={`bio-dock-tab${dockTab === 'tools' ? ' active' : ''}`} onClick={() => setDockTab('tools')}>Tools</button>
        </div>
        <div className="bio-stations">
          {dockTab === 'view' && (<>
            {LAYERS.map(l => (
              <button key={l.id} className={`bio-station${state.layer === l.id ? ' active' : ''}`} onClick={() => changeLayer(l.id)}>
                <span>{l.icon}</span><span>{l.label}</span>
              </button>
            ))}
            <button className="bio-station" onClick={()=>{setQuery('');setSearchOpen(true);}}><span>🔍</span><span>Find a structure</span></button>
          </>)}
          {dockTab === 'organs' && (<>
            <button className="bio-station primary" onClick={() => setSearchOpen(true)}>
              <span>🔍</span><span>Search</span>
            </button>
            {parts.map(p => (
              <button key={p.id} className={`bio-station${state.selected === p.id ? ' active' : ''}`} onClick={() => pick(p.id)}>
                <span>{p.layer === 'frame' ? '🦴' : p.layer === 'whole' ? '🧍' : '🫁'}</span><span>{p.name}</span>
              </button>
            ))}
          </>)}
          {dockTab === 'tools' && (<>
            {takeable && (
              <button className="bio-station primary" onClick={take}>
                <span>{state.taken ? '↩️' : '🫳'}</span><span>{state.taken ? 'Return to body' : 'Take to tray'}</span>
              </button>
            )}
            {state.taken && (<>
              <button className="bio-station" onClick={() => setTurn(v => v - Math.PI / 6)}>
                <span>↶</span><span>Rotate left</span>
              </button>
              <button className="bio-station" onClick={() => setTurn(v => v + Math.PI / 6)}>
                <span>↷</span><span>Rotate right</span>
              </button>
              <button className={`bio-station${spin ? ' active' : ''}`} onClick={() => setSpin(v => !v)}>
                <span>🔄</span><span>{spin ? 'Stop spin' : 'Auto-spin'}</span>
              </button>
              <button className="bio-station" onClick={() => setTrayZoom(v => Math.min(3, v + 0.3))}>
                <span>🔍</span><span>Zoom in</span>
              </button>
              <button className="bio-station" onClick={() => setTrayZoom(v => Math.max(0.5, v - 0.3))}>
                <span>🔎</span><span>Zoom out</span>
              </button>
              <button className="bio-station" onClick={() => { setTrayZoom(1); setTrayRotX(0); setTurn(0); setActivePin(null); }}>
                <span>↺</span><span>Reset view</span>
              </button>
              {ORGAN_ANNOTATIONS[state.taken] && (
                <button className={`bio-station${showPins ? ' active' : ''}`} onClick={() => { setShowPins(v => !v); setActivePin(null); }}>
                  <span>📌</span><span>{showPins ? 'Hide labels' : 'Show labels'}</span>
                </button>
              )}
            </>)}
            {state.taken && MICROSCOPE_SLIDES[state.taken] && (
              <button className={`bio-station${microscopeOpen ? ' active' : ''}`} onClick={() => { setMicroscopeOpen(v => !v); setCompareMode(false); setQuizMode(false); }}>
                <span>🔬</span><span>Microscope</span>
              </button>
            )}
            {state.taken && LABEL_QUIZ_DATA[state.taken] && (
              <button className={`bio-station${quizMode ? ' active' : ''}`} onClick={() => { setQuizMode(v => !v); setMicroscopeOpen(false); setCompareMode(false); setQuizPlacements([]); setQuizScore(null); setQuizDrag(null); }}>
                <span>📝</span><span>Quiz</span>
              </button>
            )}
            {state.taken && <button className={`bio-station${moreTools ? ' active' : ''}`}
              aria-expanded={moreTools} onClick={() => setMoreTools(v => !v)}>
              <span>🛠️</span><span>{moreTools ? 'Fewer tools' : 'Advanced tools'}</span>
            </button>}
            {moreTools && <>
            {state.taken && (
              <button className={`bio-station${exploded ? ' active' : ''}`} onClick={() => setExploded(v => !v)}>
                <span>💥</span><span>{exploded ? 'Collapse' : 'Explode'}</span>
              </button>
            )}
            {state.taken && (
              <button className={`bio-station${splitOpen ? ' active' : ''}`} onClick={() => { setSplitOpen(v => !v); if (!splitOpen) setClipValue(0); }}>
                <span>🔪</span><span>{splitOpen ? 'Close split' : 'Split open'}</span>
              </button>
            )}
            {state.taken && (
              <button className={`bio-station${clipAxis !== 'off' ? ' active' : ''}`} onClick={() => setClipAxis(v => v === 'off' ? 'x' : v === 'x' ? 'y' : v === 'y' ? 'z' : 'off')}>
                <span>🔲</span><span>{clipAxis === 'off' ? 'Cross-section' : `Slice ${clipAxis.toUpperCase()}`}</span>
              </button>
            )}
            {state.taken && (
              <button className={`bio-station${peelAmount > 0 ? ' active' : ''}`} onClick={() => setPeelAmount(v => v > 0 ? 0 : 0.3)}>
                <span>🧅</span><span>{peelAmount > 0 ? 'Reset Peel' : 'Layer Peel'}</span>
              </button>
            )}
            {state.taken && (
              <button className={`bio-station${antMode ? ' active' : ''}`} onClick={() => setAntMode(v => !v)}>
                <span>🐜</span><span>{antMode ? 'Exit Ant Mode' : 'Ant Mode'}</span>
              </button>
            )}
            </>}
            {state.taken && DISEASE_DATA[state.taken] && (
              <button className={`bio-station${compareMode ? ' active' : ''}`} onClick={() => { setCompareMode(v => !v); setMicroscopeOpen(false); setQuizMode(false); }}>
                <span>⚕️</span><span>Compare</span>
              </button>
            )}
            {state.taken && ORGAN_SOUND_CONFIG[state.taken] && (
              <button className={`bio-station${soundOn ? ' active' : ''}`} onClick={() => setSoundOn(v => !v)}>
                <span>{soundOn ? '🔊' : '🔇'}</span><span>{soundOn ? 'Sound on' : 'Sound'}</span>
              </button>
            )}
            {part?.detail && (
              <button className="bio-station" onClick={() => setDetailId(part.detail!)}>
                <span>🔬</span><span>Detailed model</span>
              </button>
            )}
          </>)}
        </div>
      </div>
    )}

    {/* Scrim + search panel */}
    {searchOpen && !detailId && <div className="bio-scrim" onClick={() => setSearchOpen(false)} />}
    {searchOpen && !detailId && (
      <div className="bio-panel bio-ui" onClick={e => e.stopPropagation()}>
        <div className="bio-panel-bar">
          <b>🔍 Find a structure</b>
          <button className="bio-x" onClick={() => setSearchOpen(false)}>✕</button>
        </div>
        <div className="bio-panel-body">
          <input className="bio-organ-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Heart, brain, kidneys…" autoFocus />
          <div className="bio-organ-list">
            {parts.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).map(p => (
              <button key={p.id} className={state.selected === p.id ? 'selected' : ''} onClick={() => { pick(p.id); setSearchOpen(false); }}>{p.name}</button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ── In-room detail viewer ── */}
    {detailId && <InRoomDetail key={detailId} specimenId={detailId} detail={ultra ? 'ultra' : 'normal'} onClose={() => setDetailId(null)} onOpenSpecimen={setDetailId} />}

  </div>;
}

/* ═══════════════════════════════════════════════════════════════════
   3D SCENE with crosshair raycasting for hover detection
   ═══════════════════════════════════════════════════════════════════ */

function RoomAsset({ detail }: { detail: Detail }) {
  const { scene } = useGLTF('/models/local/biology-room-v1.glb');
  const copy = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(o => { if ((o as Mesh).isMesh) { o.castShadow = detail === 'ultra'; o.receiveShadow = detail === 'ultra'; } });
    return clone;
  }, [scene, detail]);
  return <primitive object={copy} dispose={null} />;
}
function RoomFallback() {
  return <group><mesh position={[0, -.06, 0]} receiveShadow><boxGeometry args={[7, .12, 6]} /><meshStandardMaterial color="#526166" /></mesh>
    <mesh position={[0, 1.5, -2.5]}><boxGeometry args={[7, 3, .1]} /><meshStandardMaterial color="#9caeaa" /></mesh>
    <mesh position={[.7, .4, .45]}><boxGeometry args={[.9, .8, .7]} /><meshStandardMaterial color="#23434a" /></mesh></group>;
}

function Organ({ defs, taken, selected, turn, spin, pick, detail, organId, trayRotX, trayZoom, showPins, activePin, onActivePin, exploded, clipAxis, clipValue, splitOpen, peelAmount }: {
  defs: OrganDef[]; taken: boolean; selected: boolean; turn: number; spin: boolean; pick: (id: string) => void; detail: Detail; organId: string;
  trayRotX: number; trayZoom: number; showPins: boolean; activePin: number | null; onActivePin: (i: number | null) => void;
  exploded: boolean; clipAxis: 'off' | 'x' | 'y' | 'z'; clipValue: number; splitOpen: boolean; peelAmount: number;
}) {
  const xrSession = useXR(s => s.session);
  const mouthTeeth = useContext(MouthTeethContext);
  const fixedTray = useContext(FixedTrayContext);
  const studyAnchor = useRef<Vector3 | null>(null);
  useEffect(() => { studyAnchor.current = null; }, [taken, xrSession, fixedTray]);
  const ref = useRef<Group>(null);
  const angle = useRef(0);
  const explodeProgress = useRef(0);
  const [approvedBounds, setApprovedBounds] = useState<{ centre: Vector3; diameter: number; scale: number } | null>(null);
  const receiveBounds = useCallback((centre: Vector3, diameter: number) => {
    setApprovedBounds({ centre: centre.clone(), diameter, scale: .48 / diameter });
  }, []);
  const fallbackInfo = useMemo(() => {
    const bounds = new Box3();
    defs.forEach(d => { d.geo.computeBoundingBox(); bounds.union(d.geo.boundingBox!.clone().translate(new Vector3(...d.at))); });
    const centre = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    return { centre, diameter: Math.max(size.x, size.y, size.z), scale: .48 / Math.max(size.x, size.y, size.z) };
  }, [defs]);
  const info = approvedBounds ?? fallbackInfo;
  const pins = ORGAN_ANNOTATIONS[organId] ?? [];

  const clipPlane = useMemo(() => new ThreePlane(new Vector3(1, 0, 0), 0), []);
  const splitPlane = useMemo(() => new ThreePlane(new Vector3(0, 1, 0), 0), []);

  const initialized = useRef(false);
  useEffect(() => {
    if (ref.current) {
      ref.current.userData.organId = organId;
      if (!initialized.current) {
        const home = info.centre.clone().multiplyScalar(.01).add(new Vector3(-.7, .99, 0));
        ref.current.position.copy(home);
        ref.current.scale.setScalar(.01);
        initialized.current = true;
      }
    }
  }, [organId, info]);

  useEffect(() => {
    if (clipAxis === 'off' && !splitOpen) {
      clipPlane.constant = 99999;
      splitPlane.constant = 99999;
      return;
    }
    if (splitOpen) {
      splitPlane.normal.set(0, 1, 0);
      splitPlane.constant = clipValue * info.diameter * 0.5;
    }
    if (clipAxis !== 'off') {
      const normal = clipAxis === 'x' ? new Vector3(1, 0, 0) : clipAxis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
      clipPlane.normal.copy(normal);
      clipPlane.constant = clipValue * info.diameter * 0.5;
    }
  }, [clipAxis, clipValue, splitOpen, info.diameter, clipPlane, splitPlane]);

  useFrame((state3, dt) => {
    if (!ref.current) return;
    const k = 1 - Math.exp(-dt * 9);
    const dest = taken ? new Vector3(.7, 1.12, .45) : info.centre.clone().multiplyScalar(.01).add(new Vector3(-.7, .99, 0));
    // Small screens place the organ in front once; its world anchor then stays
    // fixed through walking, looking, resizing and quality changes.
    if (taken) {
      if (!studyAnchor.current && !fixedTray && !xrSession && state3.size.width <= 760) {
        dest.set(0, 0, -studyDistance(state3.size.width, state3.size.height)).applyQuaternion(state3.camera.quaternion).add(state3.camera.position);
      }
      studyAnchor.current = anchoredStudyPosition(studyAnchor.current, dest);
      dest.copy(studyAnchor.current);
    }
    ref.current.position.lerp(dest, k);
    const zoomedScale = taken ? info.scale * trayZoom : .01;
    ref.current.scale.lerp(new Vector3(zoomedScale, zoomedScale, zoomedScale), k);
    if (taken && spin) angle.current += dt * .35;
    if (!taken) angle.current = 0;
    ref.current.rotation.y += ((taken ? turn + angle.current + (organId === 'ears' ? Math.PI / 2 : 0) : 0) - ref.current.rotation.y) * k;
    ref.current.rotation.x += ((taken ? trayRotX : 0) - ref.current.rotation.x) * k;
    const targetExplode = exploded ? 1 : 0;
    explodeProgress.current += (targetExplode - explodeProgress.current) * Math.min(1, dt * 4);
    state3.gl.localClippingEnabled = (clipAxis !== 'off' || splitOpen);
  });

  const activeClipPlanes = useMemo(() => {
    const planes: ThreePlane[] = [];
    if (clipAxis !== 'off') planes.push(clipPlane);
    if (splitOpen) planes.push(splitPlane);
    return planes.length ? planes : undefined;
  }, [clipAxis, splitOpen, clipPlane, splitPlane]);

  const fallback = isFittedHeadPart(organId) ? null : <>{defs.map((d, i) => {
    const basePos = new Vector3(...d.at).sub(info.centre);
    const explodeDir = basePos.clone().normalize();
    const explodeOffset = explodeDir.multiplyScalar(explodeProgress.current * info.diameter * 0.4);
    const peelOpacity = peelAmount > 0 ? Math.max(0, 1 - peelAmount * (1 + i * 0.3)) : 1;
    return <mesh key={i} geometry={d.geo} position={basePos.clone().add(explodeOffset)}>
      <meshStandardMaterial color={d.color} roughness={.56} emissive={selected ? '#573322' : '#000000'} emissiveIntensity={.24} clippingPlanes={activeClipPlanes} clipShadows transparent={peelAmount > 0} opacity={peelOpacity} />
    </mesh>;
  })}</>;
  const refined = import.meta.env.DEV;
  return <group ref={ref} onClick={e => { e.stopPropagation(); pick(defs[0].id); }}>
    {refined ? <AnatomyAssetBoundary url={anatomyAssetUrl(isFittedHeadPart(organId) ? 'head' : 'organs', detail)}><ReviewedOrgan id={defs[0].id} detail={detail} diameter={info.diameter} selected={selected} showTeeth={taken && organId === 'mouth' && mouthTeeth} studySingleEar={taken && organId === 'ears'} onBounds={receiveBounds} clipPlanes={activeClipPlanes} peelAmount={peelAmount} /></AnatomyAssetBoundary> : fallback}
    {taken && showPins && !exploded && pins.map((pin, i) => showAnnotation(isFittedHeadPart(organId) && !xrSession, i, activePin, trayZoom) && (
      <AnnotationDot key={i} position={centeredAnchor((refined ? HEAD_ANCHORS[organId]?.[i] : undefined) ?? pin.pos, info.centre.toArray())} size={info.diameter / 40} label={pin.label} active={activePin === i} onClick={() => onActivePin(activePin === i ? null : i)} />
    ))}
  </group>;
}

function AnnotationDot({ position, size, label, active, onClick }: { position: [number, number, number]; size: number; label: string; active: boolean; onClick: () => void }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = active ? 'rgba(20,180,160,.92)' : 'rgba(20,80,100,.85)';
    ctx.beginPath(); ctx.roundRect(0, 0, 256, 64, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 32, 236);
    return new CanvasTexture(c);
  }, [label, active]);
  useEffect(() => () => texture.dispose(), [texture]);
  const dotColor = active ? '#14b4a0' : '#40a8c0';
  return <group position={position} scale={size} onClick={e => { e.stopPropagation(); onClick(); }}>
    <mesh>
      <sphereGeometry args={[1.5, 8, 8]} />
      <meshBasicMaterial color={dotColor} />
    </mesh>
    <sprite position={[0, 4, 0]} scale={[18, 4.5, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  </group>;
}


function BiologyScene({ state, detail, pick, changeLayer, take, takeable, reset, spin, setSpin, turn, trayRotX, trayZoom, showPins, activePin, onActivePin, trayHitRef, exploded, clipAxis, clipValue, antMode, splitOpen, peelAmount, onVR, walkInput, onHover }: {
  state: BiologyState; detail: Detail; pick: (id: string) => void; changeLayer: (layer: BiologyLayer) => void;
  take: () => void; takeable: boolean; reset: () => void; spin: boolean; setSpin: (value: boolean) => void;
  turn: number; trayRotX: number; trayZoom: number; showPins: boolean; activePin: number | null; onActivePin: (i: number | null) => void;
  trayHitRef: React.MutableRefObject<boolean>;
  exploded: boolean; clipAxis: 'off' | 'x' | 'y' | 'z'; clipValue: number; antMode: boolean; splitOpen: boolean; peelAmount: number;
  onVR: (value: boolean) => void; walkInput: React.MutableRefObject<WalkInput>;
  onHover: (id: string | null) => void;
}) {
  const session = useXR(s => s.session);
  const camera = useThree(s => s.camera);
  const fidelity = session ? 'ultra' : detail;
  const bodyOrgans = useOrgans(fidelity);
  const airways = useMemo<OrganDef[]>(() => [
    { id: 'airways', geo: vessel([[0, 54, 0], [0, 46, 0], [0, 38, 0]], 1.4, 12, fidelity === 'ultra' ? 14 : 8), at: [0, 0, 0], color: '#d8c9b5' },
    ...([-1, 1] as const).map(side => ({ id: 'airways', geo: vessel([[0, 38, 0], [side * 3, 36, 0], [side * 7, 34, 0]], 1, 10, fidelity === 'ultra' ? 12 : 7), at: [0, 0, 0] as [number, number, number], color: '#d8c9b5' })),
  ], [fidelity]);
  const organs = useMemo(() => [...bodyOrgans, ...airways], [bodyOrgans, airways]);
  const grouped = useMemo(() => Array.from(new Set(organs.map(o => o.id))).map(id => organs.filter(o => o.id === id)), [organs]);
  useEffect(() => { onVR(!!session); }, [session, onVR]);
  useEffect(() => () => { new Set(organs.map(o => o.geo)).forEach(geo => geo.dispose()); }, [organs]);
  const part = parts.find(p => p.id === state.selected) ?? (state.layer === 'muscles' ? parts.find(p => p.id === 'muscles') : undefined);
  const solid = useRef<Group>(null);
  const organGroup = useRef<Group>(null);
  const surfaceGroup = useRef<Group>(null);
  const bounds = useMemo(() => ({ minX: -3, maxX: 3, minZ: -2.5, maxZ: 3.5 }), []);

  const antProgress = useRef(0);
  const savedCamPos = useRef(new Vector3());
  const savedCamNear = useRef(0.05);
  const antEntering = useRef(false);

  useFrame((_, dt) => {
    if (session) return;
    if (antMode && state.taken) {
      if (!antEntering.current) {
        savedCamPos.current.copy(camera.position);
        savedCamNear.current = camera.near;
        antEntering.current = true;
      }
      antProgress.current = Math.min(1, antProgress.current + dt * 1.5);
      const trayPos = new Vector3(.7, 1.12, .45);
      const k = antProgress.current;
      camera.position.lerp(trayPos, k * 0.05);
      camera.near = 0.001;
      camera.far = 2;
      camera.updateProjectionMatrix();
    } else if (antEntering.current) {
      antProgress.current = Math.max(0, antProgress.current - dt * 2);
      if (antProgress.current <= 0.01) {
        camera.near = savedCamNear.current;
        camera.far = 30;
        camera.updateProjectionMatrix();
        antEntering.current = false;
        antProgress.current = 0;
      } else {
        camera.near = 0.001 + (savedCamNear.current - 0.001) * (1 - antProgress.current);
        camera.far = 2 + 28 * (1 - antProgress.current);
        camera.updateProjectionMatrix();
      }
    }
  });

  // Crosshair raycaster: fires from camera center every frame to detect hovered organ
  const hoverRay = useRef(new Raycaster());
  const center = useRef(new Vector2(0, 0));
  const lastHover = useRef<string | null>(null);
  const hoverTimer = useRef(0);

  useFrame((_, dt) => {
    if (session) return;
    hoverTimer.current += dt;
    if (hoverTimer.current < 0.1) return; // throttle to ~10 checks/sec
    hoverTimer.current = 0;

    hoverRay.current.setFromCamera(center.current, camera);
    hoverRay.current.far = 8;
    const targets = [organGroup.current, surfaceGroup.current].filter((g): g is Group => !!g);
    if (!targets.length) {
      if (lastHover.current !== null) { lastHover.current = null; onHover(null); }
      return;
    }
    const hits = hoverRay.current.intersectObjects(targets, true);
    let foundId: string | null = null;
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData.organId) { foundId = obj.userData.organId; break; }
        obj = obj.parent!;
      }
      if (foundId) break;
    }
    if (foundId !== lastHover.current) {
      lastHover.current = foundId;
      onHover(foundId);
    }
  });

  const fallback = <RoomFallback />;
  return <>
    <color attach="background" args={['#1d3038']} />
    <fog attach="fog" args={['#1d3038', 8, 20]} />
    <ambientLight intensity={0.4} />
    <hemisphereLight args={['#eef8ff', '#586557', 1.4]} />
    <directionalLight position={[2, 5, 4]} intensity={2.3} castShadow={fidelity === 'ultra'} shadow-mapSize={[1024, 1024]} shadow-normalBias={.035} shadow-bias={-.0002} />
    <pointLight position={[0, 3, 0]} intensity={2} distance={10} decay={2} color="#fff5e0" />

    {!session && <FirstPersonControls input={walkInput} start={[-.7, 1.55, 3.2]} startYaw={0} speed={2.4} eyeHeight={1.55} collision={solid} bounds={bounds} headBob />}

    <group ref={solid} name="solid">
      {import.meta.env.DEV ? <ModelErrorBoundary fallback={fallback}><Suspense fallback={fallback}><RoomAsset detail={fidelity} /></Suspense></ModelErrorBoundary> : fallback}
    </group>

    <group ref={surfaceGroup} position={[-.7, .99, 0]} scale={.01}
      onPointerOver={e=>{let o=e.object;while(o){if(o.userData.organId===state.taken && state.taken){trayHitRef.current=true;break;}o=o.parent!;}}}
      onPointerOut={()=>{trayHitRef.current=false;}}>
      {(state.layer === 'frame' || state.layer === 'combined') && (import.meta.env.DEV
        ? <LabSkeletonPilot detail={fidelity} onPick={pick} fallback={<Body layer="frame" detail={fidelity} onPick={pick} showOutline={false} />} />
        : <Body layer="frame" detail={fidelity} onPick={pick} selected={state.selected === 'skeleton' ? 'skeleton' : null} extracted={null} showOutline={false} />)}
      {state.layer === 'muscles' && import.meta.env.DEV && <LabMusclesPilot detail={fidelity} onPick={pick} fallback={<group position={[0,35,10]}><WorldCard text="Muscle illustration unavailable.\nPlease reload the local preview." width={90} height={60} /></group>} />}
    </group>
    {state.layer === 'muscles' && !import.meta.env.DEV && <group position={[-.7,1.35,.1]}><WorldCard text="Muscle illustration is a local pilot.\nIt has not been published yet." width={.9} height={.6} /></group>}

    <group ref={organGroup}
      onPointerOver={e => { let o = e.object; while (o) { if (o.userData.organId && o.userData.organId === state.taken) { trayHitRef.current = true; return; } o = o.parent!; } }}
      onPointerOut={() => { trayHitRef.current = false; }}
    >
      {grouped.map(defs => {
        const isTaken = state.taken === defs[0].id;
        if (!showBiologyOrgan(state.layer, defs[0].id, state.taken)) return null;
        return <Organ key={defs[0].id} defs={defs} detail={fidelity} taken={isTaken} selected={state.selected === defs[0].id} turn={turn} spin={spin} pick={pick} organId={defs[0].id} trayRotX={trayRotX} trayZoom={trayZoom} showPins={showPins} activePin={activePin} onActivePin={onActivePin} exploded={isTaken && exploded} clipAxis={isTaken ? clipAxis : 'off'} clipValue={clipValue} splitOpen={isTaken && splitOpen} peelAmount={isTaken ? peelAmount : 0} />;
      })}
    </group>

    {/* ── Decorative lab props ── */}
    <LabProps detail={fidelity} />

    {session && <group position={[.95, 1.9, -.2]}>
      <WorldCard text={`${part?.name ?? 'BIOLOGY & ANATOMY'}\n\n${part?.blurb ?? 'Choose a layer. Click an organ to take it to the study tray.'}\n\nSimplified teaching models. Not clinical reference.`} width={.85} height={.72} />
      {LAYERS.map((l, i) => <group key={l.id} position={[-1.8, -.15 - i * .16, 0]}><WorldCard text={l.label} width={.6} height={.13} action={() => changeLayer(l.id)} /></group>)}
      {takeable && <group position={[0, -.6, 0]}><WorldCard text={state.taken ? 'Return to body' : 'Take to tray'} width={.85} height={.12} action={take} /></group>}
      <group position={[0, -.75, 0]}><WorldCard text={spin ? 'Pause rotation' : 'Rotate study organ'} width={.85} height={.12} action={() => setSpin(!spin)} /></group>
      <group position={[-.23, -.9, 0]}><WorldCard text="Previous part" width={.4} height={.12} action={() => pick(parts[(parts.findIndex(p => p.id === state.selected) + parts.length - 1) % parts.length].id)} /></group>
      <group position={[.23, -.9, 0]}><WorldCard text="Next part" width={.4} height={.12} action={() => pick(parts[(parts.findIndex(p => p.id === state.selected) + 1) % parts.length].id)} /></group>
      <group position={[-.23, -1.05, 0]}><WorldCard text="Reset body" width={.4} height={.12} action={reset} /></group>
      <group position={[.23, -1.05, 0]}><WorldCard text="Exit VR" width={.4} height={.12} action={() => { void session.end(); }} /></group>
    </group>}
  </>;
}


function LabProps({ detail }: { detail: Detail }) {
  const isUltra = detail === 'ultra';
  return <group>
    {/* Microscope on left desk */}
    <group position={[-2.2, .86, .6]}>
      {/* Base */}
      <mesh><boxGeometry args={[.18, .02, .14]} /><meshStandardMaterial color="#1a1a1a" metalness={.6} roughness={.3} /></mesh>
      {/* Arm */}
      <mesh position={[0, .12, -.04]}><boxGeometry args={[.03, .24, .03]} /><meshStandardMaterial color="#2a2a2a" metalness={.5} roughness={.35} /></mesh>
      {/* Head */}
      <mesh position={[0, .24, .02]} rotation={[-.3, 0, 0]}><cylinderGeometry args={[.02, .015, .1, 8]} /><meshStandardMaterial color="#333" metalness={.6} roughness={.3} /></mesh>
      {/* Eyepiece */}
      <mesh position={[0, .28, .04]}><cylinderGeometry args={[.012, .015, .04, 8]} /><meshStandardMaterial color="#222" metalness={.7} roughness={.2} /></mesh>
      {/* Stage */}
      <mesh position={[0, .08, .02]}><boxGeometry args={[.1, .01, .1]} /><meshStandardMaterial color="#383838" metalness={.4} roughness={.4} /></mesh>
    </group>

    {/* Petri dishes on left desk */}
    <group position={[-2.6, .86, .2]}>
      <mesh><cylinderGeometry args={[.06, .06, .015, 16]} /><meshStandardMaterial color="#e0e8e8" transparent opacity={.6} roughness={.1} /></mesh>
      <mesh position={[0, .008, 0]}><cylinderGeometry args={[.055, .055, .005, 16]} /><meshStandardMaterial color="#f0d0d0" roughness={.8} /></mesh>
    </group>
    <group position={[-2.45, .86, .1]}>
      <mesh><cylinderGeometry args={[.05, .05, .015, 16]} /><meshStandardMaterial color="#e0e8e8" transparent opacity={.6} roughness={.1} /></mesh>
      <mesh position={[0, .008, 0]}><cylinderGeometry args={[.045, .045, .005, 16]} /><meshStandardMaterial color="#d0e0f0" roughness={.8} /></mesh>
    </group>

    {/* Test tubes in rack on right desk */}
    <group position={[2.2, .86, -.1]}>
      {/* Rack */}
      <mesh><boxGeometry args={[.2, .02, .06]} /><meshStandardMaterial color="#5a3a20" roughness={.7} /></mesh>
      <mesh position={[0, .06, 0]}><boxGeometry args={[.2, .02, .04]} /><meshStandardMaterial color="#5a3a20" roughness={.7} /></mesh>
      {/* Tubes */}
      {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
        <mesh key={i} position={[x, .06, 0]}>
          <cylinderGeometry args={[.008, .008, .12, 8]} />
          <meshStandardMaterial color={['#e06060', '#60a0e0', '#60c060', '#e0c040'][i]} transparent opacity={.5} roughness={.1} />
        </mesh>
      ))}
    </group>

    {/* Scalpel on tray */}
    <group position={[.7, .86, .8]} rotation={[0, .3, 0]}>
      {/* Blade */}
      <mesh position={[0, .005, 0]} rotation={[0, 0, 0]}><boxGeometry args={[.005, .003, .06]} /><meshStandardMaterial color="#c0c8cc" metalness={.9} roughness={.15} /></mesh>
      {/* Handle */}
      <mesh position={[0, .005, .06]}><boxGeometry args={[.008, .006, .08]} /><meshStandardMaterial color="#607070" metalness={.4} roughness={.5} /></mesh>
    </group>

    {/* Forceps next to scalpel */}
    <group position={[.85, .86, .85]} rotation={[0, .5, 0]}>
      <mesh><boxGeometry args={[.004, .003, .12]} /><meshStandardMaterial color="#b0b8bc" metalness={.8} roughness={.2} /></mesh>
      <mesh position={[.008, 0, 0]}><boxGeometry args={[.004, .003, .12]} /><meshStandardMaterial color="#b0b8bc" metalness={.8} roughness={.2} /></mesh>
    </group>

    {/* Safety goggles on hook */}
    <group position={[-3.2, 1.65, -2.3]}>
      {/* Hook */}
      <mesh><cylinderGeometry args={[.01, .01, .05, 6]} /><meshStandardMaterial color="#888" metalness={.6} roughness={.3} /></mesh>
      {/* Strap */}
      <mesh position={[0, -.06, .02]} rotation={[.3, 0, 0]}><boxGeometry args={[.12, .005, .06]} /><meshStandardMaterial color="#3060a0" roughness={.6} /></mesh>
      {/* Lenses */}
      <mesh position={[-.04, -.06, .05]}><cylinderGeometry args={[.025, .025, .008, 12]} /><meshStandardMaterial color="#d0e8f0" transparent opacity={.4} roughness={.05} /></mesh>
      <mesh position={[.04, -.06, .05]}><cylinderGeometry args={[.025, .025, .008, 12]} /><meshStandardMaterial color="#d0e8f0" transparent opacity={.4} roughness={.05} /></mesh>
    </group>

    {/* Lab coat on hook */}
    <group position={[-3.2, 1.5, -1.8]}>
      {/* Hook */}
      <mesh><cylinderGeometry args={[.01, .01, .05, 6]} /><meshStandardMaterial color="#888" metalness={.6} roughness={.3} /></mesh>
      {/* Coat body */}
      <mesh position={[0, -.3, .02]}><boxGeometry args={[.25, .5, .04]} /><meshStandardMaterial color="#f0f0f0" roughness={.8} /></mesh>
      {/* Collar */}
      <mesh position={[0, -.06, .03]}><boxGeometry args={[.12, .06, .02]} /><meshStandardMaterial color="#e8e8e8" roughness={.7} /></mesh>
    </group>

    {/* Fire extinguisher by the door */}
    <group position={[3.2, .3, 2.8]}>
      {/* Cylinder */}
      <mesh position={[0, .15, 0]}><cylinderGeometry args={[.06, .06, .3, 12]} /><meshStandardMaterial color="#cc2020" roughness={.5} /></mesh>
      {/* Top */}
      <mesh position={[0, .32, 0]}><cylinderGeometry args={[.02, .03, .04, 8]} /><meshStandardMaterial color="#333" metalness={.5} roughness={.3} /></mesh>
      {/* Handle */}
      <mesh position={[.04, .35, 0]}><boxGeometry args={[.06, .01, .02]} /><meshStandardMaterial color="#222" metalness={.6} roughness={.3} /></mesh>
      {/* Hose */}
      {isUltra && <mesh position={[.06, .28, 0]} rotation={[0, 0, -.4]}><cylinderGeometry args={[.006, .006, .12, 6]} /><meshStandardMaterial color="#222" roughness={.6} /></mesh>}
    </group>

    {/* Clipboard on desk */}
    <group position={[1.8, .87, .5]} rotation={[-.1, .2, 0]}>
      <mesh><boxGeometry args={[.16, .002, .22]} /><meshStandardMaterial color="#8B6914" roughness={.7} /></mesh>
      {/* Paper */}
      <mesh position={[0, .002, -.01]}><boxGeometry args={[.14, .001, .19]} /><meshStandardMaterial color="#f8f4e8" roughness={.9} /></mesh>
      {/* Clip */}
      <mesh position={[0, .005, -.1]}><boxGeometry args={[.06, .006, .02]} /><meshStandardMaterial color="#888" metalness={.7} roughness={.3} /></mesh>
    </group>

    {/* Stool near the body */}
    <group position={[-1.8, 0, 1.5]}>
      {/* Seat */}
      <mesh position={[0, .48, 0]}><cylinderGeometry args={[.16, .16, .03, 16]} /><meshStandardMaterial color="#2a3a3a" roughness={.5} /></mesh>
      {/* Pole */}
      <mesh position={[0, .25, 0]}><cylinderGeometry args={[.02, .03, .46, 8]} /><meshStandardMaterial color="#555" metalness={.5} roughness={.3} /></mesh>
      {/* Base star */}
      {[0, 1.26, 2.51, 3.77, 5.03].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * .12, .04, Math.sin(a) * .12]} rotation={[0, a, 0]}>
          <boxGeometry args={[.02, .02, .14]} /><meshStandardMaterial color="#444" metalness={.5} roughness={.3} />
        </mesh>
      ))}
    </group>
  </group>;
}

function WorldCard({ text, width, height, action }: { text: string; width: number; height: number; action?: () => void }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = Math.round(768 * height / width);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = action ? '#195b59' : '#10242d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#edf8f8'; ctx.font = '30px sans-serif';
    let y = 44;
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        if (ctx.measureText(line + word).width > 700) { ctx.fillText(line, 30, y); y += 40; line = ''; }
        line += word + ' ';
      }
      ctx.fillText(line, 30, y); y += 40;
    }
    return new CanvasTexture(canvas);
  }, [text, width, height, action ? true : false]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh onClick={action ? e => { e.stopPropagation(); action(); } : undefined}>
    <planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}
