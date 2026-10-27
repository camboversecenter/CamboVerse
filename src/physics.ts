/**
 * Physics & Machines Experience Room - data, formulas, and quiz content.
 */

/* ── Simple machines ──────────────────────────────────────────── */

export interface SimpleMachine {
  id: string;
  name: string;
  icon: string;
  description: string;
  principle: string;
  formula: string;
  example: string;
  maRatio: number;
}

export const SIMPLE_MACHINES: SimpleMachine[] = [
  {
    id: "lever",
    name: "Lever",
    icon: "⚖️",
    description: "A rigid bar that pivots on a fulcrum. Moving the fulcrum closer to the load multiplies your force.",
    principle: "Effort x effort arm = Load x load arm",
    formula: "MA = effort arm / load arm",
    example: "A seesaw, a crowbar, a wheelbarrow",
    maRatio: 3,
  },
  {
    id: "pulley",
    name: "Pulley",
    icon: "🔄",
    description: "A wheel with a rope that redirects or multiplies force. More pulleys in the system means less effort needed.",
    principle: "Each supporting rope segment shares the load equally",
    formula: "MA = number of supporting ropes",
    example: "A flagpole, a crane, a well bucket",
    maRatio: 2,
  },
  {
    id: "inclined-plane",
    name: "Inclined plane",
    icon: "📐",
    description: "A flat surface tilted at an angle. Walking up a ramp is easier than climbing a wall because the distance is longer.",
    principle: "Less force over a longer distance does the same work",
    formula: "MA = length / height",
    example: "A wheelchair ramp, a loading dock, a mountain road",
    maRatio: 4,
  },
  {
    id: "wheel-axle",
    name: "Wheel and axle",
    icon: "☸️",
    description: "A large wheel attached to a smaller axle. Turning the big wheel moves the axle with greater force.",
    principle: "A rotating lever - the wheel radius is the effort arm",
    formula: "MA = wheel radius / axle radius",
    example: "A doorknob, a steering wheel, a screwdriver",
    maRatio: 5,
  },
  {
    id: "screw",
    name: "Screw",
    icon: "🔩",
    description: "An inclined plane wrapped around a cylinder. Each turn advances by one thread pitch.",
    principle: "One full turn moves the screw forward by the pitch distance",
    formula: "MA = circumference / pitch",
    example: "A jar lid, a bolt, a vice",
    maRatio: 6,
  },
  {
    id: "wedge",
    name: "Wedge",
    icon: "🔺",
    description: "Two inclined planes back to back. A thin wedge needs less force but must travel further.",
    principle: "Converts a downward force into two sideways forces",
    formula: "MA = length / width",
    example: "An axe, a knife, a doorstop",
    maRatio: 3,
  },
];

/* ── Newton's Laws ────────────────────────────────────────────── */

export interface NewtonLaw {
  id: string;
  number: number;
  name: string;
  statement: string;
  explanation: string;
  formula?: string;
  example: string;
}

export const NEWTON_LAWS: NewtonLaw[] = [
  {
    id: "n1",
    number: 1,
    name: "Law of Inertia",
    statement: "An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted on by a net external force.",
    explanation: "Things do not change what they are doing on their own. A book on a table stays there until you push it. A ball rolling on a perfectly smooth floor would roll forever. It takes a force - friction, gravity, a push - to change that.",
    example: "A passenger lurches forward when a bus brakes suddenly. The bus stopped, but the passenger's body kept moving.",
  },
  {
    id: "n2",
    number: 2,
    name: "Force equals mass times acceleration",
    statement: "The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass.",
    explanation: "Push something twice as hard and it accelerates twice as fast. But if the object is twice as heavy, the same push only gives half the acceleration. Force, mass, and acceleration are locked together.",
    formula: "F = m x a",
    example: "Kicking a football vs kicking a bowling ball with the same force. The football flies, the bowling ball barely moves.",
  },
  {
    id: "n3",
    number: 3,
    name: "Action and reaction",
    statement: "For every action there is an equal and opposite reaction.",
    explanation: "When you push on a wall, the wall pushes back on you just as hard. A rocket works by throwing exhaust gas downward - the gas pushes the rocket upward. The two forces are always equal, always opposite, and always on different objects.",
    example: "A swimmer pushes water backward with their hands, and the water pushes the swimmer forward.",
  },
];

/* ── Projectile motion ────────────────────────────────────────── */

export interface ProjectilePreset {
  id: string;
  name: string;
  angle: number;
  speed: number;
  description: string;
}

export const PROJECTILE_PRESETS: ProjectilePreset[] = [
  { id: "p1", name: "Low lob", angle: 30, speed: 15, description: "30 degrees, fast and flat" },
  { id: "p2", name: "Perfect 45", angle: 45, speed: 15, description: "Maximum range at 45 degrees" },
  { id: "p3", name: "High arc", angle: 70, speed: 15, description: "70 degrees, high but short" },
  { id: "p4", name: "Cannon shot", angle: 45, speed: 30, description: "45 degrees, doubled speed" },
];

export function projectileTrajectory(angle: number, speed: number, g = 9.81): { x: number; y: number }[] {
  const rad = (angle * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy = speed * Math.sin(rad);
  const tFlight = (2 * vy) / g;
  const pts: { x: number; y: number }[] = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tFlight;
    pts.push({ x: vx * t, y: Math.max(0, vy * t - 0.5 * g * t * t) });
  }
  return pts;
}

export function projectileRange(angle: number, speed: number, g = 9.81): number {
  const rad = (angle * Math.PI) / 180;
  return (speed * speed * Math.sin(2 * rad)) / g;
}

export function projectileMaxHeight(angle: number, speed: number, g = 9.81): number {
  const rad = (angle * Math.PI) / 180;
  const vy = speed * Math.sin(rad);
  return (vy * vy) / (2 * g);
}

export function projectileFlightTime(angle: number, speed: number, g = 9.81): number {
  const rad = (angle * Math.PI) / 180;
  return (2 * speed * Math.sin(rad)) / g;
}

/* ── Circuit builder ──────────────────────────────────────────── */

export interface CircuitComponent {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  description: string;
}

export const CIRCUIT_COMPONENTS: CircuitComponent[] = [
  { id: "battery", name: "Battery", symbol: "V", unit: "V", description: "Provides voltage - the push that drives current through the circuit." },
  { id: "resistor", name: "Resistor", symbol: "R", unit: "ohm", description: "Opposes current flow. Higher resistance means less current for the same voltage." },
  { id: "bulb", name: "Light bulb", symbol: "L", unit: "W", description: "Converts electrical energy to light and heat. Brightness depends on power (P = V x I)." },
  { id: "switch", name: "Switch", symbol: "S", unit: "-", description: "Opens or closes the circuit. An open switch breaks the path and stops all current." },
];

export interface CircuitPreset {
  id: string;
  name: string;
  voltage: number;
  resistors: number[];
  type: "series" | "parallel";
  description: string;
}

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  { id: "c1", name: "Single resistor", voltage: 9, resistors: [100], type: "series", description: "One 100 ohm resistor on a 9V battery" },
  { id: "c2", name: "Series pair", voltage: 9, resistors: [100, 200], type: "series", description: "100 and 200 ohm in series - resistances add up" },
  { id: "c3", name: "Parallel pair", voltage: 9, resistors: [100, 200], type: "parallel", description: "100 and 200 ohm in parallel - total is less than either" },
  { id: "c4", name: "Three in series", voltage: 12, resistors: [100, 150, 250], type: "series", description: "Three resistors in series on 12V" },
  { id: "c5", name: "Three in parallel", voltage: 12, resistors: [100, 150, 300], type: "parallel", description: "Three resistors in parallel on 12V" },
];

export function seriesResistance(resistors: number[]): number {
  return resistors.reduce((a, b) => a + b, 0);
}

export function parallelResistance(resistors: number[]): number {
  const sum = resistors.reduce((a, r) => a + 1 / r, 0);
  return 1 / sum;
}

export function ohmCurrent(voltage: number, resistance: number): number {
  return voltage / resistance;
}

export function ohmPower(voltage: number, current: number): number {
  return voltage * current;
}

export type CellType = "battery" | "resistor" | "bulb" | null;

const RESISTOR_VALUE = 100;

export interface CircuitAnalysis {
  voltage: number;
  totalResistance: number;
  current: number;
  power: number;
  hasBattery: boolean;
  hasBulb: boolean;
  bulbBrightness: number;
  paths: number;
}

export function analyzeCircuitGrid(grid: CellType[][]): CircuitAnalysis {
  let hasBattery = false;
  let hasBulb = false;
  const voltage = 9;

  for (const row of grid) for (const c of row) {
    if (c === "battery") hasBattery = true;
    if (c === "bulb") hasBulb = true;
  }

  if (!hasBattery) {
    return { voltage: 0, totalResistance: 0, current: 0, power: 0, hasBattery: false, hasBulb, bulbBrightness: 0, paths: 0 };
  }

  const rowResistances: number[] = [];
  for (const row of grid) {
    const count = row.filter(c => c === "resistor").length;
    if (count > 0) rowResistances.push(count * RESISTOR_VALUE);
  }

  const paths = rowResistances.length;
  let totalResistance: number;
  if (paths === 0) {
    totalResistance = 0.01;
  } else if (paths === 1) {
    totalResistance = rowResistances[0];
  } else {
    totalResistance = parallelResistance(rowResistances);
  }

  const current = ohmCurrent(voltage, totalResistance);
  const power = ohmPower(voltage, current);
  const bulbBrightness = hasBulb ? Math.min(1, current / 0.1) : 0;

  return { voltage, totalResistance, current, power, hasBattery, hasBulb, bulbBrightness, paths };
}

export function presetToGrid(preset: CircuitPreset): CellType[][] {
  const grid: CellType[][] = Array.from({ length: 4 }, () => Array(6).fill(null));
  grid[0][0] = "battery";
  if (preset.type === "series") {
    preset.resistors.forEach((_, i) => { grid[0][i + 1] = "resistor"; });
    grid[0][preset.resistors.length + 1] = "bulb";
  } else {
    preset.resistors.forEach((_, i) => { grid[i][1] = "resistor"; });
    grid[0][2] = "bulb";
  }
  return grid;
}

/* ── Pendulum / oscillation ───────────────────────────────────── */

export interface PendulumPreset {
  id: string;
  name: string;
  length: number;
  mass: number;
  angle: number;
  description: string;
}

export const PENDULUM_PRESETS: PendulumPreset[] = [
  { id: "pd1", name: "Short pendulum", length: 0.5, mass: 0.2, angle: 30, description: "0.5 m, fast swing" },
  { id: "pd2", name: "Standard", length: 1.0, mass: 0.5, angle: 30, description: "1.0 m, about 2 second period" },
  { id: "pd3", name: "Long pendulum", length: 2.0, mass: 0.5, angle: 30, description: "2.0 m, slow and grand" },
  { id: "pd4", name: "Wide swing", length: 1.0, mass: 0.5, angle: 60, description: "1.0 m, large amplitude" },
];

export function pendulumPeriod(length: number, g = 9.81): number {
  return 2 * Math.PI * Math.sqrt(length / g);
}

export function pendulumFrequency(length: number, g = 9.81): number {
  return 1 / pendulumPeriod(length, g);
}

export function pendulumPosition(length: number, angle0: number, t: number, g = 9.81): number {
  const omega = Math.sqrt(g / length);
  return angle0 * Math.cos(omega * t);
}

/* ── Energy ───────────────────────────────────────────────────── */

export interface EnergyScenario {
  id: string;
  name: string;
  mass: number;
  height: number;
  speed: number;
  description: string;
}

export const ENERGY_SCENARIOS: EnergyScenario[] = [
  { id: "e1", name: "Ball on a shelf", mass: 1, height: 5, speed: 0, description: "1 kg ball sitting 5 m high - all potential energy" },
  { id: "e2", name: "Rolling ball", mass: 1, height: 0, speed: 10, description: "1 kg ball rolling at 10 m/s - all kinetic energy" },
  { id: "e3", name: "Falling ball", mass: 2, height: 10, speed: 0, description: "2 kg ball at 10 m - watch PE convert to KE as it falls" },
  { id: "e4", name: "Roller coaster", mass: 500, height: 30, speed: 0, description: "500 kg cart at 30 m - a real ride" },
];

export function kineticEnergy(mass: number, speed: number): number {
  return 0.5 * mass * speed * speed;
}

export function potentialEnergy(mass: number, height: number, g = 9.81): number {
  return mass * g * height;
}

export function totalEnergy(mass: number, height: number, speed: number, g = 9.81): number {
  return kineticEnergy(mass, speed) + potentialEnergy(mass, height, g);
}

export function fallSpeed(height: number, g = 9.81): number {
  return Math.sqrt(2 * g * height);
}

/* ── Waves ────────────────────────────────────────────────────── */

export interface WavePreset {
  id: string;
  name: string;
  frequency: number;
  amplitude: number;
  wavelength: number;
  description: string;
}

export const WAVE_PRESETS: WavePreset[] = [
  { id: "w1", name: "Low frequency", frequency: 1, amplitude: 40, wavelength: 200, description: "Slow, long wave" },
  { id: "w2", name: "Medium wave", frequency: 3, amplitude: 30, wavelength: 100, description: "Moderate frequency" },
  { id: "w3", name: "High frequency", frequency: 8, amplitude: 20, wavelength: 40, description: "Fast, short wave" },
  { id: "w4", name: "Large amplitude", frequency: 3, amplitude: 60, wavelength: 100, description: "Same frequency, bigger displacement" },
];

export function waveSpeed(frequency: number, wavelength: number): number {
  return frequency * wavelength;
}

/* ── Friction / forces on a slope ─────────────────────────────── */

export interface SlopePreset {
  id: string;
  name: string;
  mass: number;
  angle: number;
  mu: number;
  description: string;
}

export const SLOPE_PRESETS: SlopePreset[] = [
  { id: "s1", name: "Gentle slope, low friction", mass: 5, angle: 15, mu: 0.1, description: "Easy slide" },
  { id: "s2", name: "Steep slope, low friction", mass: 5, angle: 45, mu: 0.1, description: "Fast slide" },
  { id: "s3", name: "Gentle slope, high friction", mass: 5, angle: 15, mu: 0.6, description: "Friction holds it" },
  { id: "s4", name: "Steep slope, high friction", mass: 10, angle: 50, mu: 0.5, description: "Will it slide?" },
];

export function slopeForces(mass: number, angle: number, mu: number, g = 9.81) {
  const rad = (angle * Math.PI) / 180;
  const weight = mass * g;
  const normal = weight * Math.cos(rad);
  const parallel = weight * Math.sin(rad);
  const friction = mu * normal;
  const net = parallel - friction;
  const accel = net > 0 ? net / mass : 0;
  const slides = net > 0;
  return { weight, normal, parallel, friction, net, accel, slides };
}

/* ── Pressure ─────────────────────────────────────────────────── */

export function pressure(force: number, area: number): number {
  return force / area;
}

export function fluidPressure(density: number, depth: number, g = 9.81): number {
  return density * g * depth;
}

/* ── Collisions / momentum ───────────────────────────────────── */

export interface CollisionPreset {
  id: string;
  name: string;
  massA: number;
  massB: number;
  speedA: number;
  speedB: number;
  type: "elastic" | "inelastic";
  description: string;
}

export const COLLISION_PRESETS: CollisionPreset[] = [
  { id: "cp1", name: "Equal masses", massA: 2, massB: 2, speedA: 5, speedB: 0, type: "elastic", description: "Two equal masses - A moving, B at rest. In an elastic collision, A stops and B takes all the speed." },
  { id: "cp2", name: "Heavy hits light", massA: 10, massB: 1, speedA: 3, speedB: 0, type: "elastic", description: "A heavy object hits a light one. The light one flies off fast, the heavy one barely slows." },
  { id: "cp3", name: "Head-on", massA: 3, massB: 3, speedA: 4, speedB: -4, type: "elastic", description: "Equal masses approaching each other. They swap velocities and bounce apart." },
  { id: "cp4", name: "Inelastic merge", massA: 4, massB: 6, speedA: 5, speedB: 0, type: "inelastic", description: "The two objects stick together after impact. Momentum is conserved but kinetic energy is not." },
];

export function momentum(mass: number, speed: number): number {
  return mass * speed;
}

export function elasticCollision(m1: number, v1: number, m2: number, v2: number): { v1f: number; v2f: number } {
  const M = m1 + m2;
  const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / M;
  const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / M;
  return { v1f, v2f };
}

export function inelasticCollision(m1: number, v1: number, m2: number, v2: number): { vf: number } {
  return { vf: (m1 * v1 + m2 * v2) / (m1 + m2) };
}

/* ── Achievements ────────────────────────────────────────────── */

export interface PhysicsAchievementCtx {
  stationsVisited: Set<string>;
  quizPassed: boolean;
  quizzesPerfect: number;
  totalExperiments: number;
  collisionsDone: number;
  allPresetsUsed: Set<string>;
}

export interface PhysicsAchievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (ctx: PhysicsAchievementCtx) => boolean;
  progress?: (ctx: PhysicsAchievementCtx) => string;
}

export const PHYSICS_ACHIEVEMENTS: PhysicsAchievement[] = [
  {
    id: "first-experiment",
    icon: "🧪",
    title: "First Experiment",
    description: "Run your first physics experiment.",
    check: (c) => c.totalExperiments >= 1,
  },
  {
    id: "safety-first",
    icon: "🛡️",
    title: "Safety First",
    description: "Pass the lab safety quiz.",
    check: (c) => c.quizPassed,
  },
  {
    id: "explorer",
    icon: "🧭",
    title: "Explorer",
    description: "Visit at least 5 stations.",
    check: (c) => c.stationsVisited.size >= 5,
    progress: (c) => `${c.stationsVisited.size}/5 stations`,
  },
  {
    id: "full-lab",
    icon: "🏆",
    title: "Full Lab Tour",
    description: "Visit every station in the lab.",
    check: (c) => c.stationsVisited.size >= 10,
    progress: (c) => `${c.stationsVisited.size}/10 stations`,
  },
  {
    id: "quiz-ace",
    icon: "⭐",
    title: "Quiz Ace",
    description: "Get a perfect score on 3 different quizzes.",
    check: (c) => c.quizzesPerfect >= 3,
    progress: (c) => `${c.quizzesPerfect}/3 perfect quizzes`,
  },
  {
    id: "momentum-master",
    icon: "💥",
    title: "Momentum Master",
    description: "Run 5 collision experiments.",
    check: (c) => c.collisionsDone >= 5,
    progress: (c) => `${c.collisionsDone}/5 collisions`,
  },
  {
    id: "thorough-tester",
    icon: "📋",
    title: "Thorough Tester",
    description: "Try at least 15 different presets across all experiments.",
    check: (c) => c.allPresetsUsed.size >= 15,
    progress: (c) => `${c.allPresetsUsed.size}/15 presets`,
  },
  {
    id: "physicist",
    icon: "🎓",
    title: "Physicist",
    description: "Attempt every quiz topic at least once.",
    check: (c) => c.quizzesPerfect >= 0 && c.stationsVisited.size >= 8 && c.totalExperiments >= 10,
    progress: (c) => `${Math.min(c.totalExperiments, 10)}/10 experiments`,
  },
];

/* ── Quiz content ─────────────────────────────────────────────── */

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const MACHINES_QUIZ: QuizQuestion[] = [
  {
    q: "Which simple machine is a ramp an example of?",
    options: ["Lever", "Inclined plane", "Pulley", "Wedge"],
    answer: 1,
    why: "A ramp is an inclined plane. It lets you use less force over a longer distance to raise something to a height.",
  },
  {
    q: "A crowbar is an example of which simple machine?",
    options: ["Screw", "Wheel and axle", "Lever", "Pulley"],
    answer: 2,
    why: "A crowbar is a lever. The fulcrum is near the load, so a small force at the long end lifts a heavy object at the short end.",
  },
  {
    q: "What does mechanical advantage measure?",
    options: ["How fast a machine works", "How much a machine multiplies your force", "The weight of a machine", "The energy a machine uses"],
    answer: 1,
    why: "Mechanical advantage is the ratio of output force to input force. A MA of 3 means the machine triples your force.",
  },
];

export const NEWTON_QUIZ: QuizQuestion[] = [
  {
    q: "A book sits on a table without moving. Which Newton's law explains this?",
    options: ["First law", "Second law", "Third law"],
    answer: 0,
    why: "The first law (inertia): the book stays at rest because the forces on it (gravity down, table pushing up) are balanced - no net force.",
  },
  {
    q: "You push a 10 kg box with 20 N of force on a frictionless surface. What is the acceleration?",
    options: ["0.5 m/s2", "2 m/s2", "10 m/s2", "200 m/s2"],
    answer: 1,
    why: "F = ma, so a = F/m = 20/10 = 2 m/s2. The second law in action.",
  },
  {
    q: "When you jump off a boat onto a dock, the boat moves backward. Which law?",
    options: ["First law", "Second law", "Third law"],
    answer: 2,
    why: "Third law: your feet push backward on the boat (action), and the boat pushes you forward (reaction). Both forces are equal and opposite.",
  },
];

export const PROJECTILE_QUIZ: QuizQuestion[] = [
  {
    q: "At what angle does a projectile travel the farthest (ignoring air resistance)?",
    options: ["30 degrees", "45 degrees", "60 degrees", "90 degrees"],
    answer: 1,
    why: "45 degrees gives the maximum range because it perfectly balances horizontal speed and time in the air.",
  },
  {
    q: "Two balls are launched at 30 and 60 degrees with the same speed. Which lands farther?",
    options: ["30 degrees", "60 degrees", "They land at the same spot"],
    answer: 2,
    why: "30 and 60 are complementary angles (add to 90). They always give the same range at the same launch speed.",
  },
  {
    q: "What happens to the horizontal speed of a projectile in flight (no air)?",
    options: ["It increases", "It decreases", "It stays constant", "It reverses"],
    answer: 2,
    why: "Gravity only acts vertically. With no air resistance, horizontal speed never changes.",
  },
];

export const CIRCUIT_QUIZ: QuizQuestion[] = [
  {
    q: "Two 100 ohm resistors in series have a total resistance of:",
    options: ["50 ohm", "100 ohm", "200 ohm", "400 ohm"],
    answer: 2,
    why: "In series, resistances add: 100 + 100 = 200 ohm. The current has to push through both, one after the other.",
  },
  {
    q: "Two 100 ohm resistors in parallel have a total resistance of:",
    options: ["50 ohm", "100 ohm", "200 ohm", "25 ohm"],
    answer: 0,
    why: "In parallel, 1/R = 1/100 + 1/100 = 2/100, so R = 50 ohm. The current can split, so resistance drops.",
  },
  {
    q: "A 9V battery drives 0.1 A through a circuit. What is the resistance?",
    options: ["0.9 ohm", "9 ohm", "90 ohm", "900 ohm"],
    answer: 2,
    why: "Ohm's law: R = V/I = 9/0.1 = 90 ohm.",
  },
];

export const ENERGY_QUIZ: QuizQuestion[] = [
  {
    q: "A 2 kg ball is held 5 m high. What is its potential energy?",
    options: ["10 J", "49 J", "98 J", "196 J"],
    answer: 2,
    why: "PE = mgh = 2 x 9.81 x 5 = 98.1 J. Gravitational potential energy depends on mass, gravity, and height.",
  },
  {
    q: "As a ball falls, its potential energy:",
    options: ["Disappears", "Converts to kinetic energy", "Stays the same", "Converts to heat only"],
    answer: 1,
    why: "Energy is conserved. As height decreases, PE converts to KE - the ball speeds up.",
  },
  {
    q: "Doubling the speed of an object multiplies its kinetic energy by:",
    options: ["2", "3", "4", "8"],
    answer: 2,
    why: "KE = 0.5 x m x v2. Doubling v gives 0.5 x m x (2v)2 = 4 times the original KE.",
  },
];

export const WAVE_QUIZ: QuizQuestion[] = [
  {
    q: "What happens to wave speed if you double both frequency and wavelength?",
    options: ["It doubles", "It quadruples", "It stays the same", "It halves"],
    answer: 1,
    why: "v = f x wavelength. Doubling both: v = (2f)(2w) = 4fw = 4 times the original speed.",
  },
  {
    q: "What does amplitude measure in a wave?",
    options: ["Speed", "Maximum displacement from rest", "Number of cycles per second", "Distance between peaks"],
    answer: 1,
    why: "Amplitude is the maximum displacement from the rest position. It determines the energy and intensity of the wave.",
  },
  {
    q: "Frequency is measured in:",
    options: ["Metres", "Seconds", "Hertz", "Newtons"],
    answer: 2,
    why: "Hertz (Hz) = cycles per second. A 3 Hz wave completes 3 full cycles every second.",
  },
];

export const PENDULUM_QUIZ: QuizQuestion[] = [
  {
    q: "What affects the period of a simple pendulum?",
    options: ["Mass only", "Length only", "Both mass and length", "Amplitude only"],
    answer: 1,
    why: "For small angles, T = 2 pi sqrt(L/g). Only length and gravity matter - mass and amplitude do not change the period.",
  },
  {
    q: "If you quadruple the length of a pendulum, the period:",
    options: ["Doubles", "Quadruples", "Stays the same", "Halves"],
    answer: 0,
    why: "T is proportional to sqrt(L). sqrt(4L) = 2 sqrt(L), so the period doubles.",
  },
  {
    q: "A pendulum on the Moon (g = 1.6 m/s2) compared to Earth (g = 9.8 m/s2) swings:",
    options: ["Faster", "Slower", "At the same rate"],
    answer: 1,
    why: "Lower gravity means a longer period (T = 2 pi sqrt(L/g)). The pendulum swings about 2.5 times slower on the Moon.",
  },
];

export const SLOPE_QUIZ: QuizQuestion[] = [
  {
    q: "On a frictionless slope, which force component causes the object to slide?",
    options: ["Normal force", "Weight parallel to slope", "Weight perpendicular to slope", "Applied force"],
    answer: 1,
    why: "The component of gravity parallel to the slope surface is what pulls the object downhill. The perpendicular component is balanced by the normal force.",
  },
  {
    q: "Increasing the angle of a slope (with friction) makes an object:",
    options: ["Harder to slide", "Easier to slide", "No change"],
    answer: 1,
    why: "Steeper angle means more gravitational pull along the slope and less normal force, which reduces friction. Both effects make sliding easier.",
  },
  {
    q: "An object on a slope does not slide. What must be true?",
    options: ["Friction > gravity", "Friction >= parallel component of gravity", "There is no gravity", "The slope is vertical"],
    answer: 1,
    why: "Static friction must equal or exceed the component of gravity along the slope. If it cannot, the object slides.",
  },
];

export const MOMENTUM_QUIZ: QuizQuestion[] = [
  {
    q: "A 2 kg ball moving at 3 m/s hits a stationary 2 kg ball in a perfectly elastic collision. What happens?",
    options: ["Both stop", "First stops, second moves at 3 m/s", "Both move at 1.5 m/s", "They bounce back equally"],
    answer: 1,
    why: "In an elastic collision between equal masses where one is stationary, the moving one stops completely and transfers all its momentum and energy to the other.",
  },
  {
    q: "Two objects collide and stick together. This is called:",
    options: ["Elastic collision", "Perfectly inelastic collision", "Superelastic collision", "Static collision"],
    answer: 1,
    why: "A perfectly inelastic collision is one where the objects stick together. Momentum is conserved, but kinetic energy is not - some is converted to heat and deformation.",
  },
  {
    q: "A 5 kg cart at 4 m/s hits a 5 kg stationary cart and they stick. Their combined speed is:",
    options: ["4 m/s", "2 m/s", "1 m/s", "0 m/s"],
    answer: 1,
    why: "Conservation of momentum: 5x4 + 5x0 = (5+5)xv, so v = 20/10 = 2 m/s. The combined mass moves at half the original speed.",
  },
];

/* ── Safety quiz (entrance gate) ──────────────────────────────── */

export const SAFETY_QUIZ: QuizQuestion[] = [
  {
    q: "What should you wear when handling heavy weights in a physics lab?",
    options: ["Sandals", "Closed-toe shoes", "No shoes", "High heels"],
    answer: 1,
    why: "Closed-toe shoes protect your feet from falling weights and equipment.",
  },
  {
    q: "Before using electrical equipment, you should check for:",
    options: ["Brand name", "Damaged cables or exposed wires", "Colour of the plug", "Price tag"],
    answer: 1,
    why: "Damaged insulation can cause electric shock. Always inspect cables before use.",
  },
  {
    q: "A spring launcher should be aimed:",
    options: ["At a classmate", "Away from people", "At the ceiling", "At the door"],
    answer: 1,
    why: "Projectiles must always be aimed at a safe target area, never at people.",
  },
  {
    q: "When working with pulleys, keep hands and fingers:",
    options: ["In the pulley mechanism", "Clear of moving parts", "On the rope near the pulley", "Anywhere"],
    answer: 1,
    why: "Moving ropes and wheels can crush or pinch fingers. Keep hands clear of the mechanism.",
  },
  {
    q: "If a circuit starts smoking, you should:",
    options: ["Add more batteries", "Disconnect the power immediately", "Blow on it", "Ignore it"],
    answer: 1,
    why: "Smoke means overheating. Disconnect power to prevent fire or damage.",
  },
];
