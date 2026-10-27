/**
 * 🧪 **Bench chemistry** the reagents on the shelf and what happens when you
 * put two of them together.
 *
 * This is the data behind the mixing station in the Experience Room. The point
 * is that a student picks two bottles themselves and finds out what they make,
 * rather than pressing one button labelled "run". So the table has to contain
 * pairs that do nothing as well as pairs that do something a combination that
 * fizzles is a real result, and hiding it would turn discovery into guessing.
 *
 * Everything here is schoolroom chemistry: the equations balance, the colours
 * are the ones you would actually see, and no reaction needs equipment the room
 * does not show.
 */

export type Phase = "gas" | "liquid" | "solid";

export interface Reagent {
  id: string;
  formula: string;
  name: string;
  phase: Phase;
  /** Colour of the reagent in its bottle and in the vessel. */
  color: string;
  /** Shown in the in-room detail panel. */
  about: string;
  hazard?: string;
  /** pH when dissolved / in solution. null = not applicable (solid metals, gases). */
  pH?: number;
  /** Safety Data Sheet info for the bottle label. */
  sds?: {
    hazardDiamond: [number, number, number, number];
    firstAid: string;
    handling: string;
  };
}

/** How the mixing vessel should behave while a reaction plays. */
export type EffectKind =
  | "synthesis"    // gases combine, flash, liquid collects
  | "combustion"   // burns with a flame
  | "neutralise"   // indicator sweeps colour, vessel warms
  | "precipitate"  // a solid drops out of solution
  | "gas";         // vigorous fizzing, gas driven off

export interface Recipe {
  id: string;
  /** Unordered set of inputs - order does not matter. 2-4 reagents. */
  inputs: string[];
  name: string;
  type: string;
  equation: string;
  effect: EffectKind;
  /** Colour the mixture ends up. */
  productColor: string;
  /** Colour of the solid, for precipitate reactions. */
  precipitateColor?: string;
  /** One line, shown while it runs. */
  observation: string;
  /** The in-room explanation - why this happens. */
  explain: string;
  /** Warmth given out, drives the glow. 0–1. */
  heat: number;
  duration: number;
  /** Stoichiometric mole ratio matching inputs order. Default all 1s. */
  ratio?: number[];
  /** Default unit for each input - "mL" for liquids/gases, "g" for solids. */
  units?: string[];
  /** Energy profile for the reaction energy diagram. kJ/mol. */
  energy?: {
    activation: number;
    enthalpy: number;
  };
  /** Reagent IDs unlocked as products after this reaction completes. */
  products?: string[];
}

/** Result of computing how much of each reagent is used given amounts. */
export interface MixResult {
  recipe: Recipe;
  amountA: number;
  amountB: number;
  amounts: number[];
  /** Which input ran out first: index, or -1 = perfectly balanced. */
  limiting: number;
  /** Fraction of maximum possible product (0–1). */
  yield: number;
  /** How much of the excess reagent is left over. */
  excess: number;
  /** A sentence describing what happens at these amounts. */
  note: string;
}

export const REAGENTS: Reagent[] = [
  {
    id: "h2", formula: "H₂", name: "Hydrogen", phase: "gas", color: "#dfe9f5",
    about: "The lightest gas there is. Colourless and invisible in the jar, and it burns readily in air - which is the whole reason it is kept away from flames.",
    hazard: "Flammable",
    sds: { hazardDiamond: [0, 4, 0, 0], firstAid: "Move to fresh air if inhaled.", handling: "Keep away from ignition sources. Use in well-ventilated area." },
  },
  {
    id: "o2", formula: "O₂", name: "Oxygen", phase: "gas", color: "#cfe4f7",
    about: "About a fifth of the air you are breathing. It does not burn itself, but almost nothing else burns without it.",
    sds: { hazardDiamond: [0, 0, 0, 1], firstAid: "No special first aid needed.", handling: "Keep away from flammable materials. Supports combustion." },
  },
  {
    id: "ch4", formula: "CH₄", name: "Methane", phase: "gas", color: "#e2efe6",
    about: "The main thing in natural gas - one carbon holding four hydrogens. Burn it cleanly and you get only carbon dioxide and water.",
    hazard: "Flammable",
    sds: { hazardDiamond: [1, 4, 0, 0], firstAid: "Move to fresh air if inhaled. Simple asphyxiant.", handling: "Extremely flammable gas. Keep away from heat and sparks." },
  },
  {
    id: "hcl", formula: "HCl", name: "Hydrochloric acid", phase: "liquid", color: "#e8f2ee",
    about: "A strong acid, and the same acid your stomach makes. In water it splits completely into H⁺ and Cl⁻, which is what makes it strong.",
    hazard: "Corrosive", pH: 1,
    sds: { hazardDiamond: [3, 0, 1, 0], firstAid: "Flush skin with water for 15 minutes. If swallowed, do not induce vomiting.", handling: "Use in fume hood. Wear gloves and goggles. Avoid breathing vapour." },
  },
  {
    id: "naoh", formula: "NaOH", name: "Sodium hydroxide", phase: "liquid", color: "#eef4f1",
    about: "A strong base, sold as caustic soda. It feels soapy because it is busy turning the fat on your skin into soap - which is also why it burns.",
    hazard: "Corrosive", pH: 14,
    sds: { hazardDiamond: [3, 0, 1, 0], firstAid: "Flush affected area with water immediately. Seek medical help for eye contact.", handling: "Wear gloves, goggles, and apron. Highly corrosive to skin." },
  },
  {
    id: "agno3", formula: "AgNO₃", name: "Silver nitrate", phase: "liquid", color: "#eef0f3",
    about: "Clear in the bottle, but it is the standard test for chloride: add it to salt water and a white solid appears at once.",
    hazard: "Stains skin", pH: 5,
    sds: { hazardDiamond: [2, 0, 0, 0], firstAid: "Wash stained skin with salt solution then water.", handling: "Stains skin black on contact. Wear gloves. Keep in dark bottles." },
  },
  {
    id: "nacl", formula: "NaCl", name: "Salt solution", phase: "liquid", color: "#eaf3f6",
    about: "Ordinary table salt dissolved in water. The sodium and chloride drift apart in solution, which is why the chloride is free to react.",
    pH: 7,
    sds: { hazardDiamond: [0, 0, 0, 0], firstAid: "Rinse eyes with water if contact occurs.", handling: "No special precautions needed for dilute solutions." },
  },
  {
    id: "cuso4", formula: "CuSO₄", name: "Copper(II) sulfate", phase: "liquid", color: "#2f7fd0",
    about: "The deep blue comes from the copper ion. Any reaction that takes the copper out of solution takes the blue with it.",
    hazard: "Harmful", pH: 4,
    sds: { hazardDiamond: [2, 0, 0, 0], firstAid: "If swallowed, rinse mouth and drink water. Seek medical attention.", handling: "Harmful if swallowed. Avoid contact with skin and eyes. Wear gloves." },
  },
  {
    id: "zn", formula: "Zn", name: "Zinc", phase: "solid", color: "#9aa5ab",
    about: "A dull grey metal, reactive enough to push hydrogen out of an acid but slow enough to watch it happen.",
    sds: { hazardDiamond: [1, 0, 0, 0], firstAid: "Wash hands after handling.", handling: "Keep dry. Dust is flammable - avoid grinding near flame." },
  },
  {
    id: "na2co3", formula: "Na₂CO₃", name: "Sodium carbonate", phase: "liquid", color: "#edf3f8",
    about: "Washing soda dissolved in water. It is a mild base - add acid and the carbonate escapes as carbon dioxide, the same gas in fizzy drinks.",
    pH: 11.5,
    sds: { hazardDiamond: [1, 0, 0, 0], firstAid: "Flush eyes with water. Wash skin if irritated.", handling: "Mild irritant. Wear goggles when handling powder form." },
  },
  {
    id: "fe", formula: "Fe", name: "Iron filings", phase: "solid", color: "#6b6e70",
    about: "Tiny shavings of iron. They react with copper sulfate because iron is more reactive than copper - it pushes copper out and takes its place.",
    sds: { hazardDiamond: [0, 1, 1, 0], firstAid: "Flush eyes with water if filings enter.", handling: "Fine filings can ignite. Keep away from flame. Avoid eye contact." },
  },
  {
    id: "baco2", formula: "Ba(OH)₂", name: "Barium hydroxide", phase: "liquid", color: "#e8eef4",
    about: "A strong base used in the classic endothermic demo. Mix it with ammonium thiocyanate and the beaker gets so cold it freezes to the bench.",
    hazard: "Harmful", pH: 13,
    sds: { hazardDiamond: [3, 0, 0, 0], firstAid: "Flush skin and eyes with water for 15 minutes. Seek medical help.", handling: "Harmful if swallowed or inhaled. Wear gloves and goggles." },
  },
  {
    id: "nh4scn", formula: "NH₄SCN", name: "Ammonium thiocyanate", phase: "solid", color: "#e4e4de",
    about: "A white crystalline salt. On its own it is unremarkable, but with barium hydroxide it produces a reaction that absorbs heat so strongly it can freeze water on contact.",
    sds: { hazardDiamond: [2, 1, 0, 0], firstAid: "Wash skin with soap and water. If swallowed, seek medical attention.", handling: "Harmful if swallowed. Produces toxic fumes if heated strongly." },
  },
  {
    id: "h2o2", formula: "H₂O₂", name: "Hydrogen peroxide", phase: "liquid", color: "#deeaf5",
    about: "Water with one extra oxygen. It slowly falls apart into water and oxygen gas. Add a catalyst and that slow process becomes explosive - the basis of elephant toothpaste.",
    pH: 4.5,
    sds: { hazardDiamond: [2, 0, 1, 1], firstAid: "Flush eyes or skin with water immediately. Oxidiser.", handling: "Oxidiser - keep away from organic materials. Wear goggles." },
  },
  {
    id: "ki", formula: "KI", name: "Potassium iodide", phase: "liquid", color: "#f0ecd8",
    about: "Clear in the bottle, but it is the catalyst that makes hydrogen peroxide decompose fast enough to shoot foam out of a flask.",
    pH: 7,
    sds: { hazardDiamond: [1, 0, 0, 0], firstAid: "Rinse eyes with water. Wash skin if irritated.", handling: "Avoid prolonged skin contact. Store in dark bottles." },
  },
  {
    id: "pb", formula: "Pb(NO₃)₂", name: "Lead(II) nitrate", phase: "liquid", color: "#edeff2",
    about: "Clear and colourless, but mix it with potassium iodide and a brilliant yellow solid crashes out - the 'golden rain' demonstration.",
    hazard: "Toxic", pH: 3.5,
    sds: { hazardDiamond: [3, 0, 1, 0], firstAid: "If swallowed, seek medical attention immediately. Toxic.", handling: "TOXIC. Wear gloves and goggles. Wash hands thoroughly after use. Use in fume hood." },
  },
  {
    id: "na", formula: "Na", name: "Sodium metal", phase: "solid", color: "#c5c5c0",
    about: "Soft enough to cut with a knife, but drop it in water and it fizzes, melts, and can catch fire. Alkali metals sit on the far left of the periodic table for a reason.",
    hazard: "Flammable",
    sds: { hazardDiamond: [3, 3, 2, 2], firstAid: "Do NOT use water on burns - smother with dry sand. Seek medical help.", handling: "Store under oil. NEVER touch with wet hands. Reacts violently with water." },
  },
  {
    id: "h2o", formula: "H₂O", name: "Water", phase: "liquid", color: "#a8d4e6",
    about: "The most familiar liquid. Unreactive with most things on this shelf, but drop an alkali metal in and you will see why group 1 is called 'the alkali metals'.",
    pH: 7,
    sds: { hazardDiamond: [0, 0, 0, 0], firstAid: "No hazards.", handling: "No special precautions." },
  },
  {
    id: "mgrib", formula: "Mg", name: "Magnesium ribbon", phase: "solid", color: "#d0d4d0",
    about: "A light silvery metal that burns with an intense white light - bright enough to damage your eyes. Once lit it is almost impossible to extinguish.",
    hazard: "Flammable",
    sds: { hazardDiamond: [0, 1, 1, 0], firstAid: "Do not look directly at burning magnesium. Cool burns with water.", handling: "Flammable solid. Keep away from flame. Do not grind near ignition sources." },
  },

  // ── Product reagents - unlocked by completing reactions ───────
  {
    id: "salt-water", formula: "NaCl(aq)", name: "Salt water", phase: "liquid", color: "#d6ecf0",
    about: "Ordinary salt dissolved in water - the product of neutralising hydrochloric acid with sodium hydroxide. Evaporate it and you get table salt.",
    pH: 7,
  },
  {
    id: "soap-base", formula: "NaOH(dilute)", name: "Dilute lye", phase: "liquid", color: "#eaf0ed",
    about: "Dilute sodium hydroxide left over after neutralisation. Too weak to burn, but strong enough to turn fat into soap - the oldest chemical process humans ever figured out.",
    pH: 10,
  },
  {
    id: "coconut-oil", formula: "C₃H₅(OOC-R)₃", name: "Coconut oil", phase: "liquid", color: "#f5f0d8",
    about: "A natural fat made of triglycerides. Mix it with lye and the fat molecules split apart - the fatty acid tails grab sodium and become soap. This is saponification.",
  },
  {
    id: "soap", formula: "RCOONa", name: "Soap", phase: "solid", color: "#faf6e8",
    about: "Real soap - sodium salts of fatty acids. One end of the molecule loves water, the other loves grease. That is why soap lifts dirt off your hands.",
  },
  {
    id: "co2", formula: "CO₂", name: "Carbon dioxide", phase: "gas", color: "#e8e8e8",
    about: "The gas in your breath and in fizzy drinks. Heavier than air, so it sinks and can smother a flame. Plants breathe it in; you breathe it out.",
  },
  {
    id: "citric", formula: "C₆H₈O₇", name: "Citric acid", phase: "solid", color: "#f8f4d0",
    about: "The sour taste in lemons. A weak organic acid used in bath bombs, fizzy sweets, and as a food preservative.",
    pH: 2.2,
  },
  {
    id: "bath-bomb", formula: "NaHCO₃+C₆H₈O₇", name: "Bath bomb mix", phase: "solid", color: "#f0c8e8",
    about: "Baking soda and citric acid pressed together. Drop it in water and the acid activates the bicarbonate, releasing carbon dioxide - the fizz that makes bath time fun.",
  },
  {
    id: "slime-glue", formula: "PVA", name: "PVA glue", phase: "liquid", color: "#f4f4f0",
    about: "White school glue - polyvinyl acetate dissolved in water. The long polymer chains are what give slime its stretch when you cross-link them with borax.",
  },
  {
    id: "borax", formula: "Na₂B₄O₇", name: "Borax solution", phase: "liquid", color: "#e8f0f4",
    about: "Sodium borate in water. The borate ions act as cross-linkers - they grab two polymer chains at once and tie them together, turning runny glue into stretchy slime.",
    pH: 9.2,
  },
  {
    id: "slime", formula: "PVA-borate", name: "Slime", phase: "liquid", color: "#44dd88",
    about: "A non-Newtonian fluid. Pull it slowly and it stretches; yank it and it snaps. The cross-links between polymer chains are weak enough to break and reform, which is why it flows but also bounces.",
  },
  {
    id: "vinegar", formula: "CH₃COOH", name: "Vinegar", phase: "liquid", color: "#f0ead8",
    about: "Acetic acid diluted in water - the sour stuff in chips and pickles. A weak acid, but strong enough to react with baking soda and make a volcano fizz.",
    pH: 2.4,
  },
  {
    id: "baking-soda", formula: "NaHCO₃", name: "Baking soda", phase: "solid", color: "#f8f8f4",
    about: "Sodium bicarbonate - it reacts with acids to release carbon dioxide, which is why it makes cakes rise and volcanoes erupt in science fairs.",
    pH: 8.3,
  },
  {
    id: "toothpaste-gel", formula: "gel", name: "Toothpaste", phase: "liquid", color: "#c8e8f8",
    about: "A mixture of mild abrasive, fluoride, and foaming agent. The baking soda version is a classic DIY recipe - the gentle fizz helps lift stains.",
  },
  {
    id: "invisible-ink", formula: "C₆H₈O₇(dilute)", name: "Invisible ink", phase: "liquid", color: "#f8f6f0",
    about: "Lemon juice or dilute citric acid on paper. Invisible when dry, but heat it and the acid chars the paper fibres brown before the rest of the page - your secret message appears.",
  },

  // ── Reagents for multi-element recipes ───────────────────────
  {
    id: "dish-soap", formula: "C₁₂H₂₅SO₄Na", name: "Dish soap", phase: "liquid", color: "#a8d8ea",
    about: "Sodium lauryl sulfate in water. A surfactant that traps gas in bubbles - essential for elephant toothpaste and foam volcanoes.",
  },
  {
    id: "food-color", formula: "dye", name: "Food colouring", phase: "liquid", color: "#e040a0",
    about: "Water-soluble dye. Adds no chemistry but makes every experiment easier to see and a lot more fun.",
  },
  {
    id: "cornstarch", formula: "(C₆H₁₀O₅)ₙ", name: "Cornstarch", phase: "solid", color: "#f8f4e8",
    about: "A long-chain polysaccharide. Mix it with water and it becomes a non-Newtonian fluid that is solid under pressure and liquid when you relax.",
  },
  {
    id: "elephant-foam", formula: "foam", name: "Elephant toothpaste", phase: "liquid", color: "#ffb0d0",
    about: "A tower of oxygen-filled foam. The potassium iodide decomposes hydrogen peroxide so fast that the soap traps the released oxygen into a massive column of foam.",
  },
  {
    id: "oobleck", formula: "suspension", name: "Oobleck", phase: "liquid", color: "#e8e0c8",
    about: "A non-Newtonian fluid. Punch it and it acts solid; let your hand rest and it swallows your fingers. The starch grains jam under force and flow when released.",
  },
  {
    id: "bouncy-ball", formula: "polymer", name: "Bouncy ball", phase: "solid", color: "#44bb88",
    about: "A cross-linked polymer ball. The borax bridges PVA chains, and the cornstarch fills gaps to make it solid enough to bounce instead of just squish.",
  },
  {
    id: "rainbow-foam", formula: "foam", name: "Rainbow foam", phase: "liquid", color: "#ff8844",
    about: "Colourful foaming eruption. The vinegar reacts with baking soda to release CO₂, and the soap traps it in colourful bubbles that overflow like a rainbow volcano.",
  },
];

export const RECIPES: Recipe[] = [
  {
    id: "water",
    inputs: ["h2", "o2"],
    name: "Synthesis of water",
    type: "Synthesis",
    equation: "2 H₂ + O₂ → 2 H₂O",
    effect: "synthesis",
    productColor: "#8ecae6",
    observation: "The mixture ignites with a sharp pop and water condenses on the glass.",
    explain:
      "Two gases you cannot see make the most ordinary liquid there is. The bond energy released is large, which is why it goes off with a bang rather than quietly. Run it backwards with electricity and you get electrolysis.",
    heat: 1,
    duration: 7,
    ratio: [2, 1],
    energy: { activation: 50, enthalpy: -572 },
  },
  {
    id: "methane",
    inputs: ["ch4", "o2"],
    name: "Combustion of methane",
    type: "Combustion",
    equation: "CH₄ + 2 O₂ → CO₂ + 2 H₂O",
    effect: "combustion",
    productColor: "#cfe0dd",
    observation: "It burns with a clean blue flame; the glass mists with water.",
    explain:
      "A complete burn - enough oxygen for every carbon and hydrogen. The flame is blue because nothing is left unburnt. Starve it of oxygen and you get a yellow, sooty flame and carbon monoxide instead.",
    heat: 1,
    duration: 8,
    ratio: [1, 2],
    energy: { activation: 45, enthalpy: -890 },
  },
  {
    id: "neutralise",
    inputs: ["hcl", "naoh"],
    name: "Acid and base neutralisation",
    type: "Neutralisation",
    equation: "HCl + NaOH → NaCl + H₂O",
    effect: "neutralise",
    productColor: "#4cbf62",
    observation: "The indicator runs red through orange to green, and the flask warms.",
    explain:
      "The H⁺ from the acid and the OH⁻ from the base join to make water, and that is the whole reaction - the sodium and chloride just watch. What you are left with is salt water. The warmth you can feel through the glass is the bond forming.",
    heat: 0.55,
    duration: 8,
    energy: { activation: 20, enthalpy: -57 },
    products: ["salt-water", "soap-base"],
  },
  {
    id: "silver-chloride",
    inputs: ["agno3", "nacl"],
    name: "Silver chloride precipitate",
    type: "Precipitation",
    equation: "AgNO₃ + NaCl → AgCl↓ + NaNO₃",
    effect: "precipitate",
    productColor: "#dfe6ea",
    precipitateColor: "#fbfdfe",
    observation: "A white curdy solid forms instantly and settles out.",
    explain:
      "Silver and chloride will not stay dissolved together, so they drop out as a solid the moment they meet. This is the standard test for a chloride. Leave the solid in sunlight and it darkens - the same chemistry that made photographic film work.",
    heat: 0.1,
    duration: 7,
    energy: { activation: 15, enthalpy: -65 },
  },
  {
    id: "copper-hydroxide",
    inputs: ["cuso4", "naoh"],
    name: "Copper(II) hydroxide precipitate",
    type: "Precipitation",
    equation: "CuSO₄ + 2 NaOH → Cu(OH)₂↓ + Na₂SO₄",
    effect: "precipitate",
    productColor: "#9fc4d8",
    precipitateColor: "#3f9fd6",
    observation: "A pale blue gel forms and slowly sinks through the liquid.",
    explain:
      "The hydroxide pulls the copper out of solution as a jelly-like solid, and the blue goes with it - the liquid left above is almost colourless. Warm that gel and it turns black as it loses water to become copper(II) oxide.",
    heat: 0.15,
    duration: 7,
    ratio: [1, 2],
    energy: { activation: 18, enthalpy: -50 },
  },
  {
    id: "zinc-acid",
    inputs: ["zn", "hcl"],
    name: "Zinc in hydrochloric acid",
    type: "Displacement",
    equation: "Zn + 2 HCl → ZnCl₂ + H₂↑",
    effect: "gas",
    productColor: "#dbe7ea",
    observation: "The metal fizzes hard and a stream of bubbles drives off hydrogen.",
    explain:
      "Zinc is reactive enough to push hydrogen out of the acid and take its place. The bubbles are hydrogen gas - catch them in a tube and a lit splint gives the squeaky pop. The metal shrinks as it goes into solution.",
    heat: 0.4,
    duration: 8,
    ratio: [1, 2],
    energy: { activation: 30, enthalpy: -153 },
  },
  {
    id: "acid-carbonate",
    inputs: ["hcl", "na2co3"],
    name: "Acid and carbonate fizz",
    type: "Acid-carbonate",
    equation: "2 HCl + Na₂CO₃ → 2 NaCl + H₂O + CO₂↑",
    effect: "gas",
    productColor: "#dce8ea",
    observation: "The solution erupts in a rush of bubbles as carbon dioxide escapes.",
    explain:
      "The acid donates protons to the carbonate, which falls apart into water and CO₂. The gas cannot stay dissolved so it fizzes out - the same reason a shaken cola sprays. What is left is just salt water.",
    heat: 0.2,
    duration: 7,
    ratio: [2, 1],
    energy: { activation: 25, enthalpy: -22 },
    products: ["co2"],
  },
  {
    id: "iron-copper",
    inputs: ["fe", "cuso4"],
    name: "Iron displaces copper",
    type: "Displacement",
    equation: "Fe + CuSO₄ → FeSO₄ + Cu",
    effect: "precipitate",
    productColor: "#8bbf9c",
    precipitateColor: "#c47030",
    observation: "The blue fades and a reddish-brown coating of copper appears on the iron.",
    explain:
      "Iron is more reactive than copper - it wants the sulfate more. So the iron goes into solution (turning the liquid green) and pushes the copper back out as a solid. You can see the reactivity series in action: a more reactive metal displaces a less reactive one.",
    heat: 0.25,
    duration: 9,
    energy: { activation: 22, enthalpy: -147 },
  },
  {
    id: "endothermic",
    inputs: ["baco2", "nh4scn"],
    name: "Endothermic reaction",
    type: "Endothermic",
    equation: "Ba(OH)₂ + 2 NH₄SCN → Ba(SCN)₂ + 2 NH₃ + 2 H₂O",
    effect: "gas",
    productColor: "#cdd8e4",
    observation: "The beaker turns ice-cold and a sharp smell of ammonia rises from the top.",
    explain:
      "Most reactions on this bench give out heat, but this one absorbs it - the beaker gets so cold it can freeze a wet board underneath. The ammonia smell is the giveaway: the reaction breaks ammonium apart, which takes energy from the surroundings. Endothermic reactions are rarer and stranger.",
    heat: 0,
    duration: 9,
    ratio: [1, 2],
    energy: { activation: 35, enthalpy: 170 },
  },
  {
    id: "elephant-toothpaste",
    inputs: ["h2o2", "ki"],
    name: "Elephant toothpaste",
    type: "Catalytic decomposition",
    equation: "2 H₂O₂ → 2 H₂O + O₂↑ (catalysed by KI)",
    effect: "gas",
    productColor: "#d8ecf4",
    observation: "A tower of foam erupts from the vessel as oxygen is released violently.",
    explain:
      "Hydrogen peroxide normally breaks down slowly. The iodide ion acts as a catalyst - it speeds the reaction without being used up. The oxygen comes out so fast it whips the liquid into a column of foam. In the full demo you add soap and food colouring, which is why it looks like toothpaste for an elephant.",
    heat: 0.5,
    duration: 8,
    ratio: [2, 1],
    energy: { activation: 75, enthalpy: -196 },
  },
  {
    id: "golden-rain",
    inputs: ["pb", "ki"],
    name: "Lead iodide - golden rain",
    type: "Precipitation",
    equation: "Pb(NO₃)₂ + 2 KI → PbI₂↓ + 2 KNO₃",
    effect: "precipitate",
    productColor: "#f0e8b8",
    precipitateColor: "#f0d020",
    observation: "A shower of bright yellow crystals falls through the liquid like golden rain.",
    explain:
      "Lead and iodide cannot stay dissolved together - they form lead iodide, one of the most photogenic precipitates in chemistry. Heat the mixture and the yellow solid dissolves; let it cool slowly and it recrystallises as shimmering golden flakes, which is the 'golden rain' version of this classic demo.",
    heat: 0.08,
    duration: 8,
    ratio: [1, 2],
    energy: { activation: 12, enthalpy: -85 },
  },
  {
    id: "sodium-water",
    inputs: ["na", "h2o"],
    name: "Sodium in water",
    type: "Violent reaction",
    equation: "2 Na + 2 H₂O → 2 NaOH + H₂↑",
    effect: "combustion",
    productColor: "#cce0ec",
    observation: "The metal darts across the surface, fizzing and melting, and a yellow flame bursts out.",
    explain:
      "Sodium gives up its outer electron to water so eagerly that the heat melts the metal into a ball and ignites the hydrogen it produces. The yellow flame is the signature sodium colour - the same one in street lights. Move down group 1 to potassium and the reaction is even more violent.",
    heat: 1,
    duration: 7,
    ratio: [2, 2],
    energy: { activation: 10, enthalpy: -368 },
  },
  {
    id: "magnesium-acid",
    inputs: ["mgrib", "hcl"],
    name: "Magnesium in acid",
    type: "Displacement",
    equation: "Mg + 2 HCl → MgCl₂ + H₂↑",
    effect: "gas",
    productColor: "#dbe9ec",
    observation: "The ribbon dissolves quickly with vigorous fizzing as hydrogen streams off.",
    explain:
      "Magnesium is higher in the reactivity series than hydrogen, so it takes chloride's partner and kicks hydrogen out as a gas. The reaction is fast enough that the metal visibly shrinks. Collect the gas in a test tube and it gives the classic squeaky pop with a lit splint.",
    heat: 0.55,
    duration: 7,
    ratio: [1, 2],
    energy: { activation: 28, enthalpy: -462 },
  },
  {
    id: "magnesium-burn",
    inputs: ["mgrib", "o2"],
    name: "Magnesium combustion",
    type: "Combustion",
    equation: "2 Mg + O₂ → 2 MgO",
    effect: "combustion",
    productColor: "#f0f0f0",
    observation: "An intense white flame, almost too bright to look at, leaves a white ash.",
    explain:
      "Magnesium burns with a dazzling white light because the reaction releases a huge amount of energy. The product is magnesium oxide - a white powder. This is why magnesium is used in fireworks and flares. Once lit, it burns hot enough to split water and even carbon dioxide, so it cannot be put out with a regular extinguisher.",
    heat: 1,
    duration: 6,
    ratio: [2, 1],
    energy: { activation: 40, enthalpy: -1204 },
  },

  // ── Chain recipes - use products from earlier reactions ────────
  {
    id: "make-soap",
    inputs: ["soap-base", "coconut-oil"],
    name: "Saponification - making soap",
    type: "Saponification",
    equation: "Fat + NaOH → Soap + Glycerol",
    effect: "synthesis",
    productColor: "#faf6e8",
    observation: "The oil thickens and turns opaque as fat molecules split into soap.",
    explain:
      "This is how soap has been made for 5,000 years. The lye breaks the fat into glycerol and fatty acid chains that grab a sodium ion. One end of the soap molecule dissolves in water, the other dissolves in grease - which is why it lifts dirt off your skin.",
    heat: 0.3,
    duration: 10,
    products: ["soap"],
  },
  {
    id: "make-slime",
    inputs: ["slime-glue", "borax"],
    name: "Making slime",
    type: "Cross-linking",
    equation: "PVA + Na₂B₄O₇ → PVA-borate gel",
    effect: "synthesis",
    productColor: "#44dd88",
    observation: "The glue thickens, stretches, and turns into a wobbly blob of slime.",
    explain:
      "The borate ions act as tiny bridges between the long PVA polymer chains. Each bridge connects two chains, building a network. Pull slowly and the bridges have time to break and reform - the slime stretches. Pull fast and they all break at once - it snaps. A non-Newtonian fluid you can hold in your hands.",
    heat: 0,
    duration: 8,
    products: ["slime"],
  },
  {
    id: "volcano",
    inputs: ["vinegar", "baking-soda"],
    name: "Volcano eruption",
    type: "Acid-base",
    equation: "CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑",
    effect: "gas",
    productColor: "#e8ddd0",
    observation: "A foaming eruption of bubbles overflows the vessel like a mini volcano.",
    explain:
      "The classic science-fair volcano. The acetic acid in vinegar reacts with the bicarbonate to release carbon dioxide gas. The reaction is fast and the gas has nowhere to go but up, carrying liquid with it. Add dish soap and food colouring for the full lava effect.",
    heat: 0.1,
    duration: 7,
    products: ["co2"],
  },
  {
    id: "bath-bomb-fizz",
    inputs: ["citric", "baking-soda"],
    name: "Bath bomb reaction",
    type: "Acid-base",
    equation: "C₆H₈O₇ + 3 NaHCO₃ → Na₃C₆H₅O₇ + 3 H₂O + 3 CO₂↑",
    effect: "gas",
    productColor: "#f0c8e8",
    observation: "Fizzing erupts as the dry powders hit water, releasing clouds of bubbles.",
    explain:
      "A bath bomb keeps its acid and base apart as dry powders. Water dissolves them both at once and the reaction fires - citric acid donates protons to the bicarbonate, which decomposes into water and CO₂. The fizz, the fragrance, and the colour are all released together.",
    heat: 0.05,
    duration: 8,
    ratio: [1, 3],
    products: ["bath-bomb"],
  },
  {
    id: "invisible-ink",
    inputs: ["citric", "h2o"],
    name: "Making invisible ink",
    type: "Dissolution",
    equation: "C₆H₈O₇ + H₂O → C₆H₈O₇(aq)",
    effect: "synthesis",
    productColor: "#f8f6f0",
    observation: "The crystals dissolve into a clear, almost invisible solution.",
    explain:
      "Citric acid dissolved in water makes a classic invisible ink. Write with it on paper and it dries invisible. Hold the paper over a heat source and the acid chars the cellulose fibres before the rest of the page, revealing your secret message in brown. Lemon juice works the same way.",
    heat: 0,
    duration: 5,
    products: ["invisible-ink"],
  },
  {
    id: "make-toothpaste",
    inputs: ["baking-soda", "coconut-oil"],
    name: "DIY toothpaste",
    type: "Mixing",
    equation: "NaHCO₃ + oil → paste",
    effect: "synthesis",
    productColor: "#c8e8f8",
    observation: "The powder and oil combine into a smooth, minty-looking paste.",
    explain:
      "The simplest toothpaste is just a mild abrasive (baking soda) mixed with a carrier (coconut oil). The baking soda scrubs and neutralises mouth acids; the oil holds it together and has mild antibacterial properties. Commercial toothpaste adds fluoride, flavour, and foaming agents, but the principle is the same.",
    heat: 0,
    duration: 6,
    products: ["toothpaste-gel"],
  },

  // ── Multi-element recipes (3-4 inputs) ────────────────────────
  {
    id: "elephant-toothpaste-deluxe",
    inputs: ["h2o2", "ki", "dish-soap"],
    name: "Elephant toothpaste",
    type: "Catalytic decomposition",
    equation: "2 H₂O₂ → 2 H₂O + O₂ (catalysed by KI, foamed by soap)",
    effect: "gas",
    productColor: "#ffb0d0",
    observation: "A massive column of warm foam erupts from the vessel and keeps growing.",
    explain:
      "Potassium iodide is a catalyst - it speeds up the decomposition of hydrogen peroxide into water and oxygen without being used up itself. Normally H₂O₂ breaks down slowly, but the iodide ion donates an electron that lowers the activation energy dramatically. The soap traps the released oxygen in bubbles, and because the reaction is exothermic, the foam is warm to the touch. This is the most popular chemistry demonstration in the world.",
    heat: 0.6,
    duration: 6,
    ratio: [2, 1, 1],
    energy: { activation: 10, enthalpy: -98 },
    products: ["elephant-foam"],
  },
  {
    id: "oobleck",
    inputs: ["cornstarch", "h2o", "food-color"],
    name: "Oobleck - non-Newtonian fluid",
    type: "Physical mixture",
    equation: "starch + H₂O + dye → non-Newtonian suspension",
    effect: "synthesis",
    productColor: "#e8d8c0",
    observation: "The powder absorbs the water and turns into a strange goo that flows like liquid but resists sudden force like a solid.",
    explain:
      "This is not a chemical reaction - no bonds break or form. The starch grains are suspended in water, not dissolved. At rest they slide past each other and the mixture flows. Apply sudden force and the grains jam together, transmitting the force like a solid. Release the pressure and they unjam. This shear-thickening behaviour is the hallmark of a non-Newtonian fluid. The food colouring is just for fun - it does not change the physics.",
    heat: 0,
    duration: 8,
    products: ["oobleck"],
  },
  {
    id: "bouncy-ball-mix",
    inputs: ["slime-glue", "borax", "cornstarch"],
    name: "DIY bouncy ball",
    type: "Cross-linking",
    equation: "PVA + borate + starch → cross-linked polymer ball",
    effect: "synthesis",
    productColor: "#44bb88",
    observation: "The mixture thickens rapidly, and when you roll it between your palms it forms a solid ball that actually bounces.",
    explain:
      "This builds on the slime recipe but adds cornstarch as a filler. The borax still cross-links the PVA chains, but the starch grains pack into the gaps between polymer strands, making the result dense enough to hold its shape as a ball instead of sagging like slime. The cross-links store elastic energy when the ball deforms on impact, then spring back - that is why it bounces. More starch means a harder, bouncier ball; less gives a softer one.",
    heat: 0,
    duration: 10,
    products: ["bouncy-ball"],
  },
  {
    id: "rainbow-volcano",
    inputs: ["vinegar", "baking-soda", "dish-soap", "food-color"],
    name: "Rainbow volcano",
    type: "Acid-base + foaming",
    equation: "CH₃COOH + NaHCO₃ + soap + dye → coloured foam + CO₂",
    effect: "gas",
    productColor: "#ff8844",
    observation: "A colourful eruption of fizzing foam overflows the beaker like a miniature volcano, trailing ribbons of colour.",
    explain:
      "The core reaction is the same as the plain volcano - acetic acid meets bicarbonate and releases CO₂. But the dish soap traps the gas into long-lasting bubbles instead of letting it pop at the surface, and the food colouring streaks through the foam. Layer different colours and you get a rainbow lava flow. The whole thing is safe enough to do on a kitchen table, which is why it has been the star of every science fair since science fairs were invented.",
    heat: 0.1,
    duration: 8,
    ratio: [1, 1, 1, 1],
    products: ["rainbow-foam"],
  },
];

/** IDs of reagents that only appear on the shelf after being unlocked by a reaction. */
export const PRODUCT_IDS = new Set(
  RECIPES.flatMap((r) => r.products ?? [])
);

const recipeKey = (...ids: string[]) => [...ids].sort().join("+");

const BY_KEY = new Map<string, Recipe>();
for (const r of RECIPES) BY_KEY.set(recipeKey(...r.inputs), r);

/** Find a recipe that uses exactly these inputs (any order), or null. */
export function findRecipe(...slots: (string | null)[]): Recipe | null {
  const ids = slots.filter((s): s is string => !!s);
  if (ids.length < 2) return null;
  return BY_KEY.get(recipeKey(...ids)) ?? null;
}

/** Reagents that give a reaction with the given filled slots - drives on-shelf hints. */
export function partnersOf(...filled: (string | null)[]): Set<string> {
  const ids = filled.filter((s): s is string => !!s);
  if (ids.length === 0) return new Set();
  const out = new Set<string>();
  for (const r of RECIPES) {
    const missing = r.inputs.filter((inp) => !ids.includes(inp));
    if (missing.length === 1 && r.inputs.length - missing.length === ids.length) {
      out.add(missing[0]);
    }
  }
  return out;
}

/** All recipes that use `id` as an input - drives chain-reaction suggestions. */
export function recipesFor(id: string): Recipe[] {
  return RECIPES.filter((r) => r.inputs.includes(id));
}

export const reagentById = (id: string | null): Reagent | null =>
  id ? REAGENTS.find((r) => r.id === id) ?? null : null;

export function unitFor(r: Reagent): string {
  return r.phase === "solid" ? "g" : "mL";
}

export function computeMix(
  recipe: Recipe, amountA: number, amountB: number,
  amountC = 10, amountD = 10,
): MixResult {
  const amounts = [amountA, amountB, amountC, amountD].slice(0, recipe.inputs.length);
  const ratios = recipe.inputs.map((_, i) => (recipe.ratio as number[] | undefined)?.[i] ?? 1);
  const moles = amounts.map((a, i) => a / ratios[i]);

  const minMoles = Math.min(...moles);
  const maxMoles = Math.max(...moles);
  const allEqual = moles.every((m) => Math.abs(m - moles[0]) < 0.01);
  const limiting = allEqual ? -1 : moles.indexOf(minMoles);
  const yld = maxMoles > 0 ? minMoles / maxMoles : 0;

  const limName = limiting >= 0 ? (reagentById(recipe.inputs[limiting])?.formula ?? recipe.inputs[limiting]) : "";
  let excess = 0;
  let note: string;
  if (limiting === -1) {
    note = `Perfect ratio: all reagents are used up completely. Maximum product.`;
  } else {
    const excessIdx = moles.indexOf(maxMoles);
    excess = amounts[excessIdx] - minMoles * ratios[excessIdx];
    const exName = reagentById(recipe.inputs[excessIdx])?.formula ?? recipe.inputs[excessIdx];
    note = `${limName} is the limiting reagent and runs out first. ${excess.toFixed(1)} ${unitFor(reagentById(recipe.inputs[excessIdx])!)} of ${exName} left over unreacted.`;
  }

  return { recipe, amountA, amountB, amounts, limiting, yield: yld, excess, note };
}

/* ── Achievements ─────────────────────────────────────────────── */

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (ctx: AchievementCtx) => boolean;
  progress?: (ctx: AchievementCtx) => string;
}

export interface AchievementCtx {
  discovered: Set<string>;
  perfectStoich: number;
  totalMixes: number;
  quizPassed: boolean;
  precipitates: number;
  combustions: number;
  endothermicDone: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-mix",
    icon: "\u{1F9EA}",
    title: "First Reaction",
    description: "Complete your first successful reaction.",
    check: (c) => c.totalMixes >= 1,
  },
  {
    id: "first-precipitate",
    icon: "\u{1F48E}",
    title: "Solid Evidence",
    description: "Produce your first precipitate.",
    check: (c) => c.precipitates >= 1,
  },
  {
    id: "perfect-stoich",
    icon: "\u{2696}\u{FE0F}",
    title: "Perfect Stoichiometry",
    description: "Mix reagents in the exact stoichiometric ratio.",
    check: (c) => c.perfectStoich >= 1,
  },
  {
    id: "five-reactions",
    icon: "\u{1F525}",
    title: "Lab Regular",
    description: "Complete 5 different reactions.",
    check: (c) => c.discovered.size >= 5,
    progress: (c) => `${Math.min(c.discovered.size, 5)}/5 reactions`,
  },
  {
    id: "all-reactions",
    icon: "\u{1F3C6}",
    title: "Master Chemist",
    description: "Discover every reaction in the lab.",
    check: (c) => c.discovered.size >= RECIPES.length,
    progress: (c) => `${c.discovered.size}/${RECIPES.length} reactions`,
  },
  {
    id: "safety-first",
    icon: "\u{1F6E1}\u{FE0F}",
    title: "Safety First",
    description: "Pass the lab safety quiz.",
    check: (c) => c.quizPassed,
  },
  {
    id: "fire-starter",
    icon: "\u{1F6F0}\u{FE0F}",
    title: "Fire Starter",
    description: "Complete 3 combustion reactions.",
    check: (c) => c.combustions >= 3,
    progress: (c) => `${Math.min(c.combustions, 3)}/3 combustions`,
  },
  {
    id: "chill-factor",
    icon: "\u{2744}\u{FE0F}",
    title: "Chill Factor",
    description: "Run the endothermic reaction (barium hydroxide + ammonium thiocyanate).",
    check: (c) => c.endothermicDone,
  },
];

/* ── Safety Quiz ──────────────────────────────────────────────── */

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const SAFETY_QUIZ: QuizQuestion[] = [
  {
    question: "What should you ALWAYS wear when handling chemicals?",
    options: ["Hat and scarf", "Safety goggles and gloves", "Headphones", "Sunglasses"],
    correct: 1,
    explanation: "Safety goggles protect your eyes and gloves protect your skin from chemical splashes and burns.",
  },
  {
    question: "A chemical splashes in your eye. What do you do FIRST?",
    options: ["Rub your eye", "Tell a friend", "Flush with water for 15 minutes", "Continue the experiment"],
    correct: 2,
    explanation: "Immediately flushing with water dilutes the chemical and reduces damage. Time is critical.",
  },
  {
    question: "What does a CORROSIVE hazard symbol mean?",
    options: [
      "The substance is flammable",
      "The substance can destroy skin and metals",
      "The substance is radioactive",
      "The substance smells bad",
    ],
    correct: 1,
    explanation: "Corrosive substances like strong acids and bases can cause severe burns to skin and damage metals.",
  },
  {
    question: "How should you smell a chemical in the lab?",
    options: [
      "Put your nose right over the container",
      "Waft the vapour gently towards your nose",
      "Taste it instead",
      "Ask someone else to smell it",
    ],
    correct: 1,
    explanation: "Wafting (fanning vapour toward you with your hand) lets you detect the smell without inhaling concentrated fumes.",
  },
  {
    question: "Sodium metal must be stored under oil. Why?",
    options: [
      "To keep it shiny",
      "It reacts violently with water and moisture in air",
      "Oil makes it heavier",
      "It dissolves in oil",
    ],
    correct: 1,
    explanation: "Sodium reacts violently with water, even moisture in the air. Oil creates a barrier that prevents contact with water.",
  },
];

/* ── Phase 2 - Flame test data ────────────────────────────────── */

export interface FlameTestEntry {
  ion: string;
  name: string;
  color: string;
  wavelength: string;
  hex: string;
}

export const FLAME_TESTS: FlameTestEntry[] = [
  { ion: "Li⁺", name: "Lithium", color: "Crimson red", wavelength: "670 nm", hex: "#dc143c" },
  { ion: "Na⁺", name: "Sodium", color: "Intense yellow", wavelength: "589 nm", hex: "#ffd700" },
  { ion: "K⁺", name: "Potassium", color: "Lilac / violet", wavelength: "766 nm", hex: "#b87ae0" },
  { ion: "Ca²⁺", name: "Calcium", color: "Brick red / orange", wavelength: "622 nm", hex: "#e05820" },
  { ion: "Ba²⁺", name: "Barium", color: "Apple green", wavelength: "554 nm", hex: "#50c850" },
  { ion: "Cu²⁺", name: "Copper", color: "Blue-green", wavelength: "510 nm", hex: "#20b0a0" },
  { ion: "Sr²⁺", name: "Strontium", color: "Crimson / scarlet", wavelength: "640 nm", hex: "#e03040" },
];

/* ── Phase 2 - Electrolysis data ──────────────────────────────── */

export interface ElectrolysisSetup {
  id: string;
  electrolyte: string;
  formula: string;
  cathode: string;
  anode: string;
  equation: string;
  observation: string;
  explain: string;
}

export const ELECTROLYSIS_SETUPS: ElectrolysisSetup[] = [
  {
    id: "water",
    electrolyte: "Acidified water",
    formula: "H₂O (+ H₂SO₄)",
    cathode: "Hydrogen gas (H₂)",
    anode: "Oxygen gas (O₂)",
    equation: "2 H₂O → 2 H₂ + O₂",
    observation: "Bubbles form at both electrodes. Twice as much gas collects at the cathode (hydrogen) as at the anode (oxygen).",
    explain: "Electricity splits water into its elements. The 2:1 volume ratio proves the formula H₂O. This is the reverse of burning hydrogen.",
  },
  {
    id: "brine",
    electrolyte: "Brine (concentrated NaCl)",
    formula: "NaCl (aq)",
    cathode: "Hydrogen gas (H₂)",
    anode: "Chlorine gas (Cl₂)",
    equation: "2 NaCl + 2 H₂O → 2 NaOH + H₂ + Cl₂",
    observation: "Bubbles at both electrodes. The anode gas bleaches damp litmus paper (chlorine). The remaining solution turns alkaline.",
    explain: "Industry does this on a huge scale (chlor-alkali process) to make chlorine for disinfectants and sodium hydroxide for soap.",
  },
  {
    id: "cuso4",
    electrolyte: "Copper sulfate solution",
    formula: "CuSO₄ (aq)",
    cathode: "Copper metal deposits",
    anode: "Oxygen gas (O₂)",
    equation: "2 CuSO₄ + 2 H₂O → 2 Cu + 2 H₂SO₄ + O₂",
    observation: "A pink-brown coating of copper grows on the cathode. The blue colour fades as copper leaves the solution.",
    explain: "Copper ions gain electrons at the cathode and plate out as metal. This is how copper is purified industrially - impure copper at the anode dissolves while pure copper deposits at the cathode.",
  },
];

/* ── Phase 2 - Mystery substance challenges ───────────────────── */

export interface MysteryChallenge {
  id: string;
  label: string;
  appearance: string;
  clues: string[];
  tests: { test: string; result: string }[];
  answer: string;
  options: string[];
  explanation: string;
}

export const MYSTERY_CHALLENGES: MysteryChallenge[] = [
  {
    id: "m1",
    label: "Mystery powder A",
    appearance: "White crystalline solid, dissolves easily in water",
    clues: ["Neutral pH in solution", "No flame colour change", "Does not react with acid"],
    tests: [
      { test: "Add silver nitrate solution", result: "White precipitate forms" },
      { test: "Flame test", result: "Intense yellow flame" },
    ],
    answer: "nacl",
    options: ["nacl", "na2co3", "cuso4", "borax", "cornstarch"],
    explanation: "The white precipitate with silver nitrate confirms chloride ions. The yellow flame confirms sodium. It is sodium chloride (table salt).",
  },
  {
    id: "m2",
    label: "Mystery liquid B",
    appearance: "Colourless liquid, sharp smell",
    clues: ["pH 1-2 (strongly acidic)", "Fumes in moist air"],
    tests: [
      { test: "Add sodium carbonate", result: "Vigorous fizzing (CO₂ released)" },
      { test: "Add silver nitrate", result: "White precipitate" },
    ],
    answer: "hcl",
    options: ["hcl", "vinegar", "naoh", "h2o2", "h2o"],
    explanation: "Strong acid that fizzes with carbonate and gives a white precipitate with silver nitrate (AgCl). It is hydrochloric acid.",
  },
  {
    id: "m3",
    label: "Mystery solution C",
    appearance: "Blue solution",
    clues: ["pH around 4", "Contains a transition metal ion"],
    tests: [
      { test: "Add NaOH", result: "Blue gel-like precipitate" },
      { test: "Add iron filings", result: "Reddish-brown coating on iron, blue colour fades" },
    ],
    answer: "cuso4",
    options: ["cuso4", "agno3", "pb", "ki", "naoh"],
    explanation: "The blue colour, blue precipitate with NaOH, and displacement by iron all point to copper(II) sulfate.",
  },
  {
    id: "m4",
    label: "Mystery metal D",
    appearance: "Grey granular solid, dull metallic lustre",
    clues: ["Does not react with cold water", "More reactive than copper but less than sodium"],
    tests: [
      { test: "Add dilute HCl", result: "Steady stream of bubbles (hydrogen gas)" },
      { test: "Place in CuSO₄ solution", result: "Metal becomes coated with reddish copper" },
    ],
    answer: "zn",
    options: ["zn", "fe", "mgrib", "na", "cornstarch"],
    explanation: "It reacts with acid to produce hydrogen and displaces copper from CuSO₄, confirming it sits above copper in the reactivity series. It is zinc.",
  },
  {
    id: "m5",
    label: "Mystery powder E",
    appearance: "White powder, feels soapy between fingers",
    clues: ["pH 11-12 (strongly alkaline)", "Dissolves in water to give a clear solution"],
    tests: [
      { test: "Add dilute HCl", result: "Fizzes vigorously, producing a gas that turns limewater milky" },
      { test: "Flame test", result: "Intense yellow flame" },
    ],
    answer: "na2co3",
    options: ["na2co3", "nacl", "borax", "cornstarch", "naoh"],
    explanation: "The alkaline pH, fizzing with acid that produces CO₂ (turns limewater milky), and yellow flame all confirm sodium carbonate (washing soda).",
  },
  {
    id: "m6",
    label: "Mystery liquid F",
    appearance: "Colourless liquid, slightly thicker than water",
    clues: ["Slowly produces bubbles on standing", "Acts as a bleaching agent"],
    tests: [
      { test: "Add manganese dioxide (MnO₂)", result: "Rapid fizzing, glowing splint relights (oxygen produced)" },
      { test: "Add potassium iodide solution", result: "Dramatic foam eruption (elephant toothpaste)" },
    ],
    answer: "h2o2",
    options: ["h2o2", "h2o", "hcl", "vinegar", "naoh"],
    explanation: "Decomposes to water and oxygen when catalysed. The glowing-splint test confirms oxygen. The foam with KI is the classic elephant-toothpaste demonstration. It is hydrogen peroxide.",
  },
  {
    id: "m7",
    label: "Mystery solid G",
    appearance: "Shiny silver ribbon, very light for its size",
    clues: ["Burns extremely brightly when ignited", "Reacts slowly with cold water"],
    tests: [
      { test: "Ignite with Bunsen flame", result: "Dazzling white light, white ash remains (MgO)" },
      { test: "Add dilute HCl", result: "Rapid fizzing, metal dissolves completely" },
    ],
    answer: "mgrib",
    options: ["mgrib", "zn", "fe", "na", "nacl"],
    explanation: "The brilliant white flame producing white MgO ash is the signature of magnesium. Its vigorous reaction with acid and light weight confirm magnesium ribbon.",
  },
];

/* ── Phase 2 - Periodic table elements (first 36) ─────────────── */

export interface PTElement {
  z: number;
  symbol: string;
  name: string;
  mass: number;
  group: number;
  period: number;
  category: string;
  color: string;
}

export const PT_ELEMENTS: PTElement[] = [
  { z: 1, symbol: "H", name: "Hydrogen", mass: 1.008, group: 1, period: 1, category: "nonmetal", color: "#80d0f0" },
  { z: 2, symbol: "He", name: "Helium", mass: 4.003, group: 18, period: 1, category: "noble gas", color: "#d0a0f0" },
  { z: 3, symbol: "Li", name: "Lithium", mass: 6.941, group: 1, period: 2, category: "alkali metal", color: "#f0a0a0" },
  { z: 4, symbol: "Be", name: "Beryllium", mass: 9.012, group: 2, period: 2, category: "alkaline earth", color: "#f0d080" },
  { z: 5, symbol: "B", name: "Boron", mass: 10.81, group: 13, period: 2, category: "metalloid", color: "#c0d0a0" },
  { z: 6, symbol: "C", name: "Carbon", mass: 12.01, group: 14, period: 2, category: "nonmetal", color: "#80d0f0" },
  { z: 7, symbol: "N", name: "Nitrogen", mass: 14.01, group: 15, period: 2, category: "nonmetal", color: "#80d0f0" },
  { z: 8, symbol: "O", name: "Oxygen", mass: 16.00, group: 16, period: 2, category: "nonmetal", color: "#80d0f0" },
  { z: 9, symbol: "F", name: "Fluorine", mass: 19.00, group: 17, period: 2, category: "halogen", color: "#a0f0d0" },
  { z: 10, symbol: "Ne", name: "Neon", mass: 20.18, group: 18, period: 2, category: "noble gas", color: "#d0a0f0" },
  { z: 11, symbol: "Na", name: "Sodium", mass: 22.99, group: 1, period: 3, category: "alkali metal", color: "#f0a0a0" },
  { z: 12, symbol: "Mg", name: "Magnesium", mass: 24.31, group: 2, period: 3, category: "alkaline earth", color: "#f0d080" },
  { z: 13, symbol: "Al", name: "Aluminium", mass: 26.98, group: 13, period: 3, category: "post-transition", color: "#c0c0c0" },
  { z: 14, symbol: "Si", name: "Silicon", mass: 28.09, group: 14, period: 3, category: "metalloid", color: "#c0d0a0" },
  { z: 15, symbol: "P", name: "Phosphorus", mass: 30.97, group: 15, period: 3, category: "nonmetal", color: "#80d0f0" },
  { z: 16, symbol: "S", name: "Sulfur", mass: 32.07, group: 16, period: 3, category: "nonmetal", color: "#80d0f0" },
  { z: 17, symbol: "Cl", name: "Chlorine", mass: 35.45, group: 17, period: 3, category: "halogen", color: "#a0f0d0" },
  { z: 18, symbol: "Ar", name: "Argon", mass: 39.95, group: 18, period: 3, category: "noble gas", color: "#d0a0f0" },
  { z: 19, symbol: "K", name: "Potassium", mass: 39.10, group: 1, period: 4, category: "alkali metal", color: "#f0a0a0" },
  { z: 20, symbol: "Ca", name: "Calcium", mass: 40.08, group: 2, period: 4, category: "alkaline earth", color: "#f0d080" },
  { z: 21, symbol: "Sc", name: "Scandium", mass: 44.96, group: 3, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 22, symbol: "Ti", name: "Titanium", mass: 47.87, group: 4, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 23, symbol: "V", name: "Vanadium", mass: 50.94, group: 5, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 24, symbol: "Cr", name: "Chromium", mass: 52.00, group: 6, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 25, symbol: "Mn", name: "Manganese", mass: 54.94, group: 7, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 26, symbol: "Fe", name: "Iron", mass: 55.85, group: 8, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 27, symbol: "Co", name: "Cobalt", mass: 58.93, group: 9, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 28, symbol: "Ni", name: "Nickel", mass: 58.69, group: 10, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 29, symbol: "Cu", name: "Copper", mass: 63.55, group: 11, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 30, symbol: "Zn", name: "Zinc", mass: 65.38, group: 12, period: 4, category: "transition metal", color: "#f0c0c0" },
  { z: 31, symbol: "Ga", name: "Gallium", mass: 69.72, group: 13, period: 4, category: "post-transition", color: "#c0c0c0" },
  { z: 32, symbol: "Ge", name: "Germanium", mass: 72.63, group: 14, period: 4, category: "metalloid", color: "#c0d0a0" },
  { z: 33, symbol: "As", name: "Arsenic", mass: 74.92, group: 15, period: 4, category: "metalloid", color: "#c0d0a0" },
  { z: 34, symbol: "Se", name: "Selenium", mass: 78.97, group: 16, period: 4, category: "nonmetal", color: "#80d0f0" },
  { z: 35, symbol: "Br", name: "Bromine", mass: 79.90, group: 17, period: 4, category: "halogen", color: "#a0f0d0" },
  { z: 36, symbol: "Kr", name: "Krypton", mass: 83.80, group: 18, period: 4, category: "noble gas", color: "#d0a0f0" },
];

/* ── Phase 3 - Gas laws presets ───────────────────────────────── */

export interface GasLawPreset {
  id: string;
  name: string;
  description: string;
  P: number;
  V: number;
  n: number;
  T: number;
}

export const GAS_LAW_PRESETS: GasLawPreset[] = [
  { id: "stp", name: "Standard (STP)", description: "1 mol of ideal gas at 0 C and 1 atm occupies 22.4 L", P: 1, V: 22.4, n: 1, T: 273 },
  { id: "room", name: "Room temperature", description: "1 mol at 25 C and 1 atm occupies 24.5 L", P: 1, V: 24.5, n: 1, T: 298 },
  { id: "high-p", name: "High pressure", description: "Compress the gas to 10 atm. Volume drops to about 2.4 L", P: 10, V: 2.44, n: 1, T: 298 },
  { id: "hot", name: "Heated gas", description: "Heat to 500 K at 1 atm. Volume expands to 41.0 L", P: 1, V: 41.0, n: 1, T: 500 },
];

export const R_CONST = 0.08206;

/* ── Phase 3 - Chromatography ─────────────────────────────────── */

export interface ChromPigment {
  name: string;
  color: string;
  rf: number;
}

export interface ChromSample {
  id: string;
  name: string;
  pigments: ChromPigment[];
}

export const CHROM_SAMPLES: ChromSample[] = [
  {
    id: "leaf",
    name: "Leaf extract",
    pigments: [
      { name: "Carotene", color: "#f0c020", rf: 0.95 },
      { name: "Xanthophyll", color: "#d0a020", rf: 0.70 },
      { name: "Chlorophyll a", color: "#308040", rf: 0.55 },
      { name: "Chlorophyll b", color: "#60a030", rf: 0.42 },
    ],
  },
  {
    id: "ink",
    name: "Black ink",
    pigments: [
      { name: "Yellow dye", color: "#e0d020", rf: 0.85 },
      { name: "Red dye", color: "#d04040", rf: 0.60 },
      { name: "Blue dye", color: "#3060c0", rf: 0.35 },
    ],
  },
  {
    id: "food",
    name: "Food colouring mix",
    pigments: [
      { name: "Tartrazine (E102)", color: "#f0d020", rf: 0.90 },
      { name: "Sunset yellow (E110)", color: "#e08020", rf: 0.72 },
      { name: "Allura red (E129)", color: "#c03030", rf: 0.50 },
      { name: "Brilliant blue (E133)", color: "#2040c0", rf: 0.30 },
    ],
  },
];

/* ── Phase 3 - Distillation ───────────────────────────────────── */

export interface DistillationMix {
  id: string;
  name: string;
  components: { name: string; bp: number; color: string; percent: number }[];
  explanation: string;
}

export const DISTILLATION_MIXES: DistillationMix[] = [
  {
    id: "saltwater",
    name: "Salt water",
    components: [
      { name: "Water", bp: 100, color: "#a8d4e6", percent: 96 },
      { name: "Salt (NaCl)", bp: 1413, color: "#e0e0e0", percent: 4 },
    ],
    explanation: "Water boils at 100 C and leaves the salt behind. The steam condenses in the condenser as pure distilled water. This is how desalination works.",
  },
  {
    id: "ethanol-water",
    name: "Ethanol-water",
    components: [
      { name: "Ethanol", bp: 78, color: "#e0d8c0", percent: 40 },
      { name: "Water", bp: 100, color: "#a8d4e6", percent: 60 },
    ],
    explanation: "Ethanol boils at 78 C, so it distils first. But water vapour comes with it. Multiple distillation runs are needed for high purity. This is the principle behind spirits production.",
  },
  {
    id: "crude-oil",
    name: "Crude oil (simplified)",
    components: [
      { name: "Petrol", bp: 40, color: "#f0e0a0", percent: 25 },
      { name: "Kerosene", bp: 175, color: "#d0c080", percent: 20 },
      { name: "Diesel", bp: 250, color: "#b09060", percent: 30 },
      { name: "Bitumen", bp: 400, color: "#404040", percent: 25 },
    ],
    explanation: "In a refinery, crude oil is heated and the fractions separate by boiling point. Lighter fractions (petrol) rise highest in the fractionating column. Each fraction has different uses.",
  },
];

/* ── Experiment station quizzes ──────────────────────────────── */

export const FLAME_QUIZ: QuizQuestion[] = [
  {
    question: "Why do different metals produce different flame colours?",
    options: [
      "The metals burn at different temperatures",
      "Electrons jump to excited states and emit specific wavelengths when they fall back",
      "The metals reflect different colours of light",
      "The flame reacts with oxygen differently each time",
    ],
    correct: 1,
    explanation: "Each metal has unique electron energy levels. When heated, electrons are excited to higher levels and emit photons of characteristic wavelengths as they return to ground state.",
  },
  {
    question: "A green flame in a flame test most likely indicates the presence of which metal?",
    options: ["Sodium", "Potassium", "Copper", "Lithium"],
    correct: 2,
    explanation: "Copper compounds produce a green-blue flame. Sodium gives yellow, potassium gives lilac, and lithium gives crimson red.",
  },
  {
    question: "Why must the wire loop be cleaned between each flame test?",
    options: [
      "To cool the wire down",
      "To prevent contamination from the previous sample",
      "To make the wire shinier",
      "To remove the oxide layer",
    ],
    correct: 1,
    explanation: "Residue from a previous sample would mix colours and give a false result. The loop is dipped in hydrochloric acid and heated until the flame is clean.",
  },
];

export const ELECTRO_QUIZ: QuizQuestion[] = [
  {
    question: "In the electrolysis of water, why is a small amount of acid or salt added?",
    options: [
      "To make the water change colour",
      "To increase the electrical conductivity of the water",
      "To speed up evaporation",
      "To lower the boiling point",
    ],
    correct: 1,
    explanation: "Pure water is a poor conductor. Adding an electrolyte (acid or dissolved salt) provides ions that carry the current through the solution.",
  },
  {
    question: "During electrolysis of water, which gas forms at the cathode (negative electrode)?",
    options: ["Oxygen", "Chlorine", "Hydrogen", "Carbon dioxide"],
    correct: 2,
    explanation: "Positive hydrogen ions (H+) are attracted to the negative cathode, where they gain electrons and form hydrogen gas. Oxygen forms at the anode.",
  },
  {
    question: "What is the volume ratio of hydrogen to oxygen produced by electrolysis of water?",
    options: ["1:1", "1:2", "2:1", "3:1"],
    correct: 2,
    explanation: "Water is H2O, so for every molecule of oxygen produced, two molecules of hydrogen are released, giving a 2:1 volume ratio.",
  },
];

export const CHROM_QUIZ: QuizQuestion[] = [
  {
    question: "What does the Rf value of a substance tell you?",
    options: [
      "The colour of the substance",
      "How far the substance travels relative to the solvent front",
      "The mass of the substance",
      "The boiling point of the substance",
    ],
    correct: 1,
    explanation: "Rf (retention factor) = distance moved by substance / distance moved by solvent front. It helps identify substances because each has a characteristic Rf under the same conditions.",
  },
  {
    question: "Why do different pigments in ink separate during chromatography?",
    options: [
      "They have different colours",
      "They evaporate at different rates",
      "They have different solubilities and attractions to the paper",
      "The paper pushes them apart",
    ],
    correct: 2,
    explanation: "Pigments that are more soluble in the solvent travel further. Those more attracted to the paper (stationary phase) stay closer to the origin. This differential affinity causes separation.",
  },
];

export const DISTILL_QUIZ: QuizQuestion[] = [
  {
    question: "Why does ethanol distil off before water when a mixture is heated?",
    options: [
      "Ethanol is denser than water",
      "Ethanol has a lower boiling point (78 C) than water (100 C)",
      "Ethanol is lighter in colour",
      "Water does not evaporate",
    ],
    correct: 1,
    explanation: "Ethanol boils at 78 C, so it vaporises first when the mixture is heated. The vapour is then cooled and collected as a separate liquid (the distillate).",
  },
  {
    question: "What is the purpose of the condenser in a distillation setup?",
    options: [
      "To heat the liquid faster",
      "To cool vapour back into liquid for collection",
      "To filter out impurities",
      "To measure the temperature",
    ],
    correct: 1,
    explanation: "The condenser has cold water flowing around it. When hot vapour passes through, it cools and condenses back into liquid, which is collected in the receiving flask.",
  },
];

export const MYSTERY_QUIZ: QuizQuestion[] = [
  {
    question: "Which test would best distinguish between an acid and an alkali?",
    options: [
      "Flame test",
      "Adding universal indicator or litmus paper",
      "Measuring the mass",
      "Checking the colour",
    ],
    correct: 1,
    explanation: "Universal indicator changes colour across the pH range: red for strong acids, green for neutral, and purple for strong alkalis. Litmus paper turns red in acid and blue in alkali.",
  },
  {
    question: "A white precipitate forms when silver nitrate is added to a solution. What does this indicate?",
    options: [
      "The solution contains a sulfate",
      "The solution contains a carbonate",
      "The solution contains a halide (chloride, bromide, or iodide)",
      "The solution is pure water",
    ],
    correct: 2,
    explanation: "Silver nitrate reacts with halide ions to form insoluble silver halides. Silver chloride is white, silver bromide is cream, and silver iodide is yellow.",
  },
];

export const CALO_QUIZ: QuizQuestion[] = [
  {
    question: "In a calorimetry experiment, the water temperature rises. What type of reaction occurred?",
    options: [
      "Endothermic - the reaction absorbed energy",
      "Exothermic - the reaction released energy",
      "Neutral - no energy was transferred",
      "Catalytic - a catalyst was used",
    ],
    correct: 1,
    explanation: "When the temperature rises, the reaction released heat energy into the surroundings (the water). Exothermic reactions have a negative enthalpy change (delta-H < 0).",
  },
  {
    question: "Why is water used as the surrounding liquid in a simple calorimeter?",
    options: [
      "Water is cheap and easy to find",
      "Water has a high specific heat capacity, so it absorbs energy measurably",
      "Water does not react with any chemicals",
      "Water is transparent so you can see the reaction",
    ],
    correct: 1,
    explanation: "Water's high specific heat capacity (4.18 J/g/K) means it absorbs a lot of energy per degree of temperature change, making measurements more accurate and reliable.",
  },
  {
    question: "The formula q = mc delta-T is used in calorimetry. What does 'm' represent?",
    options: [
      "The mass of the reactant",
      "The mass of the water (surroundings)",
      "The molar mass of the product",
      "The number of moles",
    ],
    correct: 1,
    explanation: "In q = mc(delta-T), m is the mass of the water surrounding the reaction. c is the specific heat capacity, and delta-T is the temperature change.",
  },
];

export const GAS_QUIZ: QuizQuestion[] = [
  {
    question: "According to Boyle's Law, if you halve the volume of a gas at constant temperature, what happens to the pressure?",
    options: [
      "It halves",
      "It doubles",
      "It stays the same",
      "It quadruples",
    ],
    correct: 1,
    explanation: "Boyle's Law states PV = constant (at fixed T and n). Halving V means P must double to keep the product PV the same. Pressure and volume are inversely proportional.",
  },
  {
    question: "What happens to the volume of a gas if its temperature is doubled (in Kelvin) at constant pressure?",
    options: [
      "It halves",
      "It doubles",
      "It stays the same",
      "It depends on the gas",
    ],
    correct: 1,
    explanation: "Charles's Law: V/T = constant at fixed P and n. Doubling the absolute temperature doubles the volume. This is why hot-air balloons float - heating the air inside expands it.",
  },
  {
    question: "In the ideal gas equation PV = nRT, what does 'n' represent?",
    options: [
      "The number of gas particles",
      "The number of moles of gas",
      "The pressure in newtons",
      "Avogadro's number",
    ],
    correct: 1,
    explanation: "n is the amount of substance in moles. R is the universal gas constant (0.0821 L atm / mol K or 8.314 J / mol K). More moles means more particles, increasing pressure or volume.",
  },
];

export const COLLISION_QUIZ: QuizQuestion[] = [
  {
    question: "According to collision theory, what two conditions must be met for a reaction to occur?",
    options: [
      "Particles must be the same size and shape",
      "Particles must collide with sufficient energy and correct orientation",
      "Particles must be at the same temperature and pressure",
      "Particles must be in the same phase (all solid or all liquid)",
    ],
    correct: 1,
    explanation: "Not every collision leads to a reaction. Particles must collide with at least the activation energy (Ea) and in the correct orientation so that bonds can break and reform.",
  },
  {
    question: "Why does increasing temperature speed up most chemical reactions?",
    options: [
      "It makes the particles smaller",
      "It gives particles more kinetic energy, so more collisions exceed the activation energy",
      "It removes the need for a catalyst",
      "It changes the products of the reaction",
    ],
    correct: 1,
    explanation: "Higher temperature means particles move faster and collide more often. Crucially, a greater proportion of collisions have energy above the activation energy threshold.",
  },
  {
    question: "How does a catalyst increase the rate of a reaction?",
    options: [
      "It increases the temperature of the reaction",
      "It provides an alternative pathway with a lower activation energy",
      "It increases the concentration of reactants",
      "It makes the particles collide more often",
    ],
    correct: 1,
    explanation: "A catalyst offers a different reaction mechanism with a lower activation energy. More particles can reach this lower threshold, so more collisions are successful without needing extra heat.",
  },
];

/* ── Guided Lab Procedures ──────────────────────────────────── */

export interface LabStep {
  title: string;
  instruction: string;
  action: "select" | "adjust" | "pour" | "observe" | "record";
  /** Reagent to select, or null for non-select steps. */
  reagent?: string;
  /** Slot to fill. */
  slot?: "A" | "B";
  /** Target amount, if adjusting. */
  targetAmount?: number;
  tip?: string;
}

export interface LabProcedure {
  id: string;
  title: string;
  subtitle: string;
  goal: string;
  safety: string;
  steps: LabStep[];
  conclusion: string;
}

export const LAB_PROCEDURES: LabProcedure[] = [
  {
    id: "acid-base-titration",
    title: "Acid-Base Neutralisation",
    subtitle: "HCl + NaOH",
    goal: "Neutralise hydrochloric acid with sodium hydroxide and observe the indicator colour change.",
    safety: "Both HCl and NaOH are corrosive. Wear goggles and gloves. Rinse any spills with water immediately.",
    steps: [
      {
        title: "Select the acid",
        instruction: "Pick hydrochloric acid (HCl) from the reagent shelf and place it in slot A.",
        action: "select",
        reagent: "hcl",
        slot: "A",
        tip: "HCl is a strong acid with pH around 1. It fully dissociates in water.",
      },
      {
        title: "Select the base",
        instruction: "Pick sodium hydroxide (NaOH) from the shelf and place it in slot B.",
        action: "select",
        reagent: "naoh",
        slot: "B",
        tip: "NaOH is a strong base with pH around 14. It provides OH- ions.",
      },
      {
        title: "Set acid amount",
        instruction: "Adjust the HCl amount to 10 mL. This is your analyte -- the substance being analysed.",
        action: "adjust",
        slot: "A",
        targetAmount: 10,
        tip: "In a real titration, you would measure this precisely with a pipette.",
      },
      {
        title: "Set base amount",
        instruction: "Adjust NaOH to 10 mL. At equal volumes and concentrations, you should get perfect neutralisation.",
        action: "adjust",
        slot: "B",
        targetAmount: 10,
        tip: "In a real lab, NaOH is added drop by drop from a burette until the endpoint is reached.",
      },
      {
        title: "Pour and observe",
        instruction: "Click 'Pour together' and watch the reaction. The acid and base combine to form salt and water.",
        action: "pour",
        tip: "The equation is: HCl + NaOH -> NaCl + H2O. This is a neutralisation reaction.",
      },
      {
        title: "Read the result",
        instruction: "Observe the energy diagram. Is this reaction exothermic or endothermic? Note the temperature change in the calorimeter.",
        action: "observe",
        tip: "Neutralisation reactions are exothermic -- they release heat. The solution warms up slightly.",
      },
      {
        title: "Record your finding",
        instruction: "Check your lab notebook -- the reaction should show a perfect stoichiometric ratio with no excess reagent.",
        action: "record",
        tip: "A 1:1 mole ratio means equal amounts react completely. This is the equivalence point of the titration.",
      },
    ],
    conclusion: "You have performed a neutralisation titration. At the equivalence point, the acid and base completely react to form a neutral salt solution (NaCl) and water. The reaction is exothermic, releasing about 57 kJ/mol of heat.",
  },
  {
    id: "precipitate-test",
    title: "Precipitate Formation",
    subtitle: "AgNO3 + NaCl",
    goal: "Mix silver nitrate with salt solution to produce a white precipitate of silver chloride.",
    safety: "Silver nitrate stains skin permanently. Wear gloves and handle with care.",
    steps: [
      {
        title: "Select silver nitrate",
        instruction: "Pick silver nitrate (AgNO3) from the shelf and place it in slot A.",
        action: "select",
        reagent: "agno3",
        slot: "A",
        tip: "Silver nitrate is a soluble salt that provides Ag+ ions in solution.",
      },
      {
        title: "Select salt solution",
        instruction: "Pick sodium chloride solution (NaCl) from the shelf and place it in slot B.",
        action: "select",
        reagent: "nacl",
        slot: "B",
        tip: "NaCl dissolves fully, providing Na+ and Cl- ions.",
      },
      {
        title: "Set amounts",
        instruction: "Set both amounts to 10 mL for a balanced reaction.",
        action: "adjust",
        slot: "A",
        targetAmount: 10,
      },
      {
        title: "Pour and observe",
        instruction: "Click 'Pour together'. Watch for the white solid forming in the solution.",
        action: "pour",
        tip: "The curdy white precipitate is silver chloride (AgCl), which is insoluble in water.",
      },
      {
        title: "Identify the precipitate",
        instruction: "The white solid is silver chloride. This is how chemists test for chloride ions in an unknown solution.",
        action: "observe",
        tip: "AgNO3 + NaCl -> AgCl(s) + NaNO3. The (s) means solid -- it drops out of the solution.",
      },
    ],
    conclusion: "You have performed a precipitation reaction. When two soluble salts are mixed and one combination of ions is insoluble, it drops out as a solid precipitate. This is the basis of qualitative analysis -- identifying unknown ions.",
  },
  {
    id: "combustion-analysis",
    title: "Combustion of Methane",
    subtitle: "O2 + CH4",
    goal: "Burn methane in oxygen and identify the products: carbon dioxide and water.",
    safety: "Methane is flammable. Keep away from open flames until ready. Ensure good ventilation.",
    steps: [
      {
        title: "Select oxygen",
        instruction: "Pick oxygen (O2) from the shelf and place it in slot A.",
        action: "select",
        reagent: "o2",
        slot: "A",
        tip: "Oxygen supports combustion but does not burn itself.",
      },
      {
        title: "Select methane",
        instruction: "Pick methane (CH4) from the shelf and place it in slot B.",
        action: "select",
        reagent: "ch4",
        slot: "B",
        tip: "Methane is the simplest hydrocarbon -- one carbon bonded to four hydrogens.",
      },
      {
        title: "Set oxygen amount",
        instruction: "Set O2 to 20 mL. Methane needs 2 moles of oxygen per mole of fuel for complete combustion.",
        action: "adjust",
        slot: "A",
        targetAmount: 20,
        tip: "The ratio is 2:1 (O2:CH4). Too little oxygen causes incomplete combustion, producing carbon monoxide.",
      },
      {
        title: "Set methane amount",
        instruction: "Set CH4 to 10 mL.",
        action: "adjust",
        slot: "B",
        targetAmount: 10,
      },
      {
        title: "Ignite",
        instruction: "Click 'Pour together' to ignite the mixture. Watch the flame and products.",
        action: "pour",
        tip: "Complete combustion: CH4 + 2O2 -> CO2 + 2H2O. The flame burns blue-yellow.",
      },
      {
        title: "Analyse the products",
        instruction: "Check the energy diagram. Combustion is strongly exothermic -- this is why we burn methane for cooking and heating.",
        action: "observe",
        tip: "The enthalpy change is about -890 kJ/mol. That energy was stored in the C-H bonds.",
      },
    ],
    conclusion: "Complete combustion of methane produces carbon dioxide and water, releasing significant energy. This is why natural gas (mostly methane) is used as a fuel. Incomplete combustion (insufficient oxygen) would produce carbon monoxide instead -- a poisonous gas.",
  },
];

/* ── Reaction Speed Comparison ──────────────────────────────── */

export interface SpeedTrial {
  id: string;
  title: string;
  description: string;
  reactionA: { inputs: [string, string]; label: string };
  reactionB: { inputs: [string, string]; label: string };
  variable: string;
  explanation: string;
  question: string;
  answer: string;
}

export const SPEED_TRIALS: SpeedTrial[] = [
  {
    id: "catalyst-effect",
    title: "With vs Without Catalyst",
    description: "Compare hydrogen peroxide decomposition with and without potassium iodide catalyst.",
    reactionA: { inputs: ["h2o2", "ki"], label: "H2O2 + KI (catalysed)" },
    reactionB: { inputs: ["h2o2", "h2o"], label: "H2O2 + H2O (no catalyst)" },
    variable: "Catalyst",
    explanation: "KI acts as a catalyst, lowering the activation energy from ~75 kJ/mol to ~10 kJ/mol. The reaction happens much faster because more molecules have enough energy to react.",
    question: "Which reaction completes faster?",
    answer: "The catalysed reaction (H2O2 + KI) is dramatically faster. The catalyst provides an alternative pathway with lower activation energy, so more collisions are successful.",
  },
  {
    id: "surface-area",
    title: "Solid Metal vs Solution",
    description: "Compare how zinc and iron react with hydrochloric acid -- both are displacement reactions, but they differ in reactivity.",
    reactionA: { inputs: ["zn", "hcl"], label: "Zn + HCl (more reactive)" },
    reactionB: { inputs: ["fe", "cuso4"], label: "Fe + CuSO4 (less reactive)" },
    variable: "Reactivity",
    explanation: "Zinc is higher in the reactivity series than iron. More reactive metals lose electrons more easily, so the reaction proceeds faster and more vigorously.",
    question: "Which metal reacts more vigorously?",
    answer: "Zinc reacts faster with HCl than iron does with CuSO4. Zinc is more reactive (loses electrons more readily), and HCl is a strong acid providing abundant H+ ions.",
  },
  {
    id: "exo-vs-endo",
    title: "Exothermic vs Endothermic",
    description: "Compare a reaction that releases heat with one that absorbs it.",
    reactionA: { inputs: ["hcl", "naoh"], label: "HCl + NaOH (exothermic)" },
    reactionB: { inputs: ["baco2", "nh4scn"], label: "Ba(OH)2 + NH4SCN (endothermic)" },
    variable: "Energy direction",
    explanation: "Neutralisation releases energy (the solution heats up), while the barium reaction absorbs so much energy that the flask gets cold enough to freeze water on its surface.",
    question: "Which reaction heats up its surroundings?",
    answer: "HCl + NaOH is exothermic (releases heat, temperature rises). Ba(OH)2 + NH4SCN is endothermic (absorbs heat, temperature drops dramatically -- sometimes below 0 C).",
  },
  {
    id: "gas-production",
    title: "Fast Fizz vs Slow Fizz",
    description: "Compare two acid-carbonate reactions: vinegar with baking soda vs HCl with sodium carbonate.",
    reactionA: { inputs: ["vinegar", "baking-soda"], label: "Vinegar + baking soda (weak acid)" },
    reactionB: { inputs: ["hcl", "na2co3"], label: "HCl + Na2CO3 (strong acid)" },
    variable: "Acid strength",
    explanation: "HCl is a strong acid (fully dissociates) while vinegar (acetic acid) is weak (partially dissociates). More H+ ions available means faster reaction with the carbonate.",
    question: "Which produces gas faster?",
    answer: "HCl + Na2CO3 fizzes faster because HCl is a strong acid providing more H+ ions at once. Vinegar is a weak acid -- it releases H+ slowly, so the fizzing is gentler.",
  },
];

/* ══ pH Meter / Indicator Station ═══════════════════════════════ */

export interface PhIndicator {
  id: string;
  name: string;
  lowColor: string;
  highColor: string;
  midColor?: string;
  rangeLow: number;
  rangeHigh: number;
  description: string;
}

export const PH_INDICATORS: PhIndicator[] = [
  { id: "litmus", name: "Litmus paper", lowColor: "#e03030", highColor: "#3060d0", rangeLow: 0, rangeHigh: 14, description: "Red in acid, blue in base. The simplest indicator -- shows acid or base but not exact pH." },
  { id: "phenolphthalein", name: "Phenolphthalein", lowColor: "transparent", highColor: "#d040a0", midColor: "transparent", rangeLow: 8.2, rangeHigh: 10, description: "Colourless below pH 8.2, pink/magenta above pH 10. Used as the endpoint indicator in acid-base titrations." },
  { id: "methyl-orange", name: "Methyl orange", lowColor: "#e04020", highColor: "#ffcc00", rangeLow: 3.1, rangeHigh: 4.4, description: "Red below pH 3.1, yellow above pH 4.4. Good for detecting strong acids." },
  { id: "bromothymol", name: "Bromothymol blue", lowColor: "#d0c020", highColor: "#2060c0", midColor: "#40a060", rangeLow: 6.0, rangeHigh: 7.6, description: "Yellow in acid, green near neutral, blue in base. Useful for distinguishing weak acids from neutral solutions." },
  { id: "universal", name: "Universal indicator", lowColor: "#e02020", highColor: "#6020a0", midColor: "#40b040", rangeLow: 0, rangeHigh: 14, description: "A mixture of indicators that gives a continuous colour spectrum across the whole pH range. The rainbow of chemistry." },
];

export function indicatorColor(indicator: PhIndicator, pH: number): string {
  if (pH <= indicator.rangeLow) return indicator.lowColor;
  if (pH >= indicator.rangeHigh) return indicator.highColor;
  const t = (pH - indicator.rangeLow) / (indicator.rangeHigh - indicator.rangeLow);
  if (indicator.midColor) {
    if (t < 0.5) {
      return indicator.lowColor === "transparent" ? indicator.midColor : blendHex(indicator.lowColor, indicator.midColor, t * 2);
    }
    return blendHex(indicator.midColor, indicator.highColor, (t - 0.5) * 2);
  }
  if (indicator.lowColor === "transparent") return indicator.highColor;
  if (indicator.highColor === "transparent") return indicator.lowColor;
  return blendHex(indicator.lowColor, indicator.highColor, t);
}

function blendHex(a: string, b: string, t: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(h: string): [number, number, number] {
  const m = h.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [128, 128, 128];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export const PH_SCALE_COLORS = [
  "#e02020", "#e04020", "#e06020", "#e09020", "#d0b020",
  "#a0c020", "#40b040", "#20a060", "#2090a0", "#2070c0",
  "#3060d0", "#4050c0", "#5040b0", "#6030a0", "#6020a0",
];

export const PH_QUIZ: QuizQuestion[] = [
  {
    question: "What does pH measure?",
    options: ["Temperature of a solution", "Concentration of hydrogen ions (H+)", "How fast a reaction occurs", "The density of a liquid"],
    correct: 1,
    explanation: "pH measures the concentration of hydrogen ions (H+) in a solution. More H+ means lower pH (more acidic).",
  },
  {
    question: "A solution has pH 3. How does it compare to pH 5?",
    options: ["10 times more acidic", "100 times more acidic", "2 times more acidic", "The same acidity"],
    correct: 1,
    explanation: "Each pH unit represents a 10-fold change in H+ concentration. pH 3 has 10 x 10 = 100 times more H+ than pH 5.",
  },
  {
    question: "Why does phenolphthalein only change colour above pH 8?",
    options: ["It is broken below pH 8", "Its molecular structure only rearranges in basic conditions", "It evaporates in acid", "It reacts with water below pH 8"],
    correct: 1,
    explanation: "Phenolphthalein changes from a lactone (colourless) to a quinoid form (pink) only when OH- ions are plentiful enough to shift the equilibrium, which happens above pH 8.2.",
  },
];

/* ══ Interactive Titration ══════════════════════════════════════ */

export interface TitrationSetup {
  id: string;
  title: string;
  description: string;
  acidId: string;
  baseId: string;
  acidConc: number;
  baseConc: number;
  flaskVol: number;
  buretteVol: number;
  indicator: string;
  endpoint: string;
}

export const TITRATION_SETUPS: TitrationSetup[] = [
  {
    id: "strong-strong",
    title: "Strong acid + Strong base",
    description: "Titrate HCl with NaOH. The classic acid-base titration with a sharp endpoint at pH 7.",
    acidId: "hcl", baseId: "naoh",
    acidConc: 0.1, baseConc: 0.1,
    flaskVol: 25, buretteVol: 50,
    indicator: "phenolphthalein",
    endpoint: "The solution turns pink when all the HCl has been neutralised and the first excess NaOH is added.",
  },
  {
    id: "weak-strong",
    title: "Weak acid + Strong base",
    description: "Titrate vinegar (acetic acid) with NaOH. The endpoint is above pH 7 because the conjugate base is basic.",
    acidId: "vinegar", baseId: "naoh",
    acidConc: 0.1, baseConc: 0.1,
    flaskVol: 25, buretteVol: 50,
    indicator: "phenolphthalein",
    endpoint: "The equivalence point is around pH 8.7, not 7, because the acetate ion (conjugate base) is weakly basic.",
  },
  {
    id: "strong-weak",
    title: "Strong acid + Weak base",
    description: "Titrate HCl with baking soda (NaHCO3) solution. The endpoint is below pH 7.",
    acidId: "hcl", baseId: "baking-soda",
    acidConc: 0.1, baseConc: 0.1,
    flaskVol: 25, buretteVol: 50,
    indicator: "methyl-orange",
    endpoint: "The equivalence point is around pH 5.3 because the carbonic acid product is weakly acidic. Methyl orange is a better indicator here than phenolphthalein.",
  },
];

export function titrationPH(
  setup: TitrationSetup,
  addedVol: number,
): number {
  const nAcid = setup.acidConc * setup.flaskVol;
  const nBase = setup.baseConc * addedVol;
  const totalVol = setup.flaskVol + addedVol;

  const isWeakAcid = setup.acidId === "vinegar";
  const isWeakBase = setup.baseId === "baking-soda";
  const Ka = 1.8e-5;
  const Kb = 2.4e-8;

  if (nBase < nAcid * 0.999) {
    const excessAcid = nAcid - nBase;
    if (isWeakAcid) {
      if (nBase === 0) {
        const cA = nAcid / totalVol;
        const h = Math.sqrt(Ka * cA);
        return -Math.log10(Math.max(h, 1e-14));
      }
      const cA = excessAcid / totalVol;
      const cSalt = nBase / totalVol;
      return -Math.log10(Ka) + Math.log10(cSalt / cA);
    }
    const h = excessAcid / totalVol;
    return -Math.log10(Math.max(h, 1e-14));
  }

  if (nBase > nAcid * 1.001) {
    const excessBase = nBase - nAcid;
    if (isWeakBase) {
      const cB = excessBase / totalVol;
      const oh = Math.sqrt(Kb * cB);
      return 14 + Math.log10(Math.max(oh, 1e-14));
    }
    const oh = excessBase / totalVol;
    return 14 + Math.log10(Math.max(oh, 1e-14));
  }

  if (isWeakAcid) return 8.72;
  if (isWeakBase) return 5.27;
  return 7.0;
}

export const TITRATION_QUIZ: QuizQuestion[] = [
  {
    question: "In a titration, what is the equivalence point?",
    options: [
      "When the indicator changes colour",
      "When moles of acid exactly equal moles of base",
      "When pH reaches 7",
      "When the burette is empty",
    ],
    correct: 1,
    explanation: "The equivalence point is when the moles of acid and base are exactly equal. The indicator colour change (end point) is used to estimate it, but they are not always identical.",
  },
  {
    question: "Why is the equivalence point of a weak acid + strong base titration above pH 7?",
    options: [
      "The base is stronger",
      "The conjugate base of the weak acid is basic",
      "Indicators always change above pH 7",
      "More base is needed",
    ],
    correct: 1,
    explanation: "At the equivalence point, all the weak acid has been converted to its conjugate base. Since the conjugate base of a weak acid is itself weakly basic, the solution pH is above 7.",
  },
  {
    question: "Why is phenolphthalein a good indicator for strong acid + strong base titrations?",
    options: [
      "It is the cheapest indicator",
      "The pH change at the endpoint is so steep that any indicator would work",
      "It only works at pH 7",
      "It reacts with NaOH",
    ],
    correct: 1,
    explanation: "In a strong-strong titration, the pH jumps from about 3 to 11 with a single drop near the equivalence point. The jump is so dramatic that almost any indicator with a transition in that range will give a sharp endpoint.",
  },
];

/* ══ Rate-of-Reaction Graphs ═══════════════════════════════════ */

export interface RateScenario {
  id: string;
  title: string;
  description: string;
  yLabel: string;
  curves: { label: string; color: string; k: number; order: number; c0: number }[];
  xMax: number;
  explanation: string;
}

export const RATE_SCENARIOS: RateScenario[] = [
  {
    id: "temp-effect",
    title: "Temperature effect",
    description: "The same reaction at 25 C, 40 C, and 60 C. Higher temperature means faster rate.",
    yLabel: "Concentration (mol/L)",
    curves: [
      { label: "25 °C", color: "#4488dd", k: 0.05, order: 1, c0: 1.0 },
      { label: "40 °C", color: "#ddaa22", k: 0.15, order: 1, c0: 1.0 },
      { label: "60 °C", color: "#dd4444", k: 0.45, order: 1, c0: 1.0 },
    ],
    xMax: 60,
    explanation: "A 10 °C rise roughly doubles the rate constant. At 60 °C the reactant is consumed about 9 times faster than at 25 °C because more molecules exceed the activation energy.",
  },
  {
    id: "conc-effect",
    title: "Concentration effect",
    description: "Starting with different initial concentrations of reactant A. More reactant means faster initial rate.",
    yLabel: "Concentration (mol/L)",
    curves: [
      { label: "[A]₀ = 0.5 M", color: "#66bb66", k: 0.1, order: 1, c0: 0.5 },
      { label: "[A]₀ = 1.0 M", color: "#4488dd", k: 0.1, order: 1, c0: 1.0 },
      { label: "[A]₀ = 2.0 M", color: "#dd4444", k: 0.1, order: 1, c0: 2.0 },
    ],
    xMax: 60,
    explanation: "For a first-order reaction, the half-life is the same regardless of initial concentration. The curves all have the same shape, just shifted vertically.",
  },
  {
    id: "catalyst-effect",
    title: "With and without catalyst",
    description: "A catalyst lowers activation energy, increasing the rate constant without being consumed.",
    yLabel: "Concentration (mol/L)",
    curves: [
      { label: "No catalyst", color: "#4488dd", k: 0.04, order: 1, c0: 1.0 },
      { label: "With catalyst", color: "#44dd88", k: 0.25, order: 1, c0: 1.0 },
    ],
    xMax: 60,
    explanation: "The catalyst provides an alternative reaction pathway with lower activation energy. Both reactions reach the same equilibrium, but the catalysed one gets there much faster.",
  },
  {
    id: "order-comparison",
    title: "Reaction order",
    description: "Compare zero-order, first-order, and second-order kinetics with the same rate constant.",
    yLabel: "Concentration (mol/L)",
    curves: [
      { label: "Zero order", color: "#dd8844", k: 0.015, order: 0, c0: 1.0 },
      { label: "First order", color: "#4488dd", k: 0.06, order: 1, c0: 1.0 },
      { label: "Second order", color: "#aa44dd", k: 0.15, order: 2, c0: 1.0 },
    ],
    xMax: 60,
    explanation: "Zero-order: concentration drops linearly (constant rate). First-order: exponential decay (rate proportional to concentration). Second-order: the curve is steeper initially but slows dramatically as concentration drops.",
  },
];

export function rateConcentration(k: number, order: number, c0: number, t: number): number {
  if (order === 0) return Math.max(0, c0 - k * t);
  if (order === 1) return c0 * Math.exp(-k * t);
  if (order === 2) return c0 / (1 + c0 * k * t);
  return c0;
}

export const RATE_QUIZ: QuizQuestion[] = [
  {
    question: "For a first-order reaction, what happens to the half-life when you double the initial concentration?",
    options: ["It doubles", "It halves", "It stays the same", "It quadruples"],
    correct: 2,
    explanation: "The half-life of a first-order reaction is t½ = ln(2)/k, which depends only on the rate constant, not on concentration. This is unique to first-order kinetics.",
  },
  {
    question: "A catalyst speeds up a reaction by:",
    options: [
      "Increasing the temperature",
      "Lowering the activation energy",
      "Increasing the concentration",
      "Changing the equilibrium position",
    ],
    correct: 1,
    explanation: "A catalyst provides an alternative pathway with lower activation energy. It speeds up both forward and reverse reactions equally, so it does not change the equilibrium position.",
  },
  {
    question: "Which graph shape indicates a zero-order reaction?",
    options: [
      "Exponential decay curve",
      "Straight line with negative slope",
      "Curve that levels off slowly",
      "S-shaped curve",
    ],
    correct: 1,
    explanation: "In a zero-order reaction, the rate is constant regardless of concentration, so concentration decreases linearly with time: [A] = [A]₀ - kt.",
  },
];

/* ── Molarity & Dilution Calculator ────────────────────────────── */

export interface MolarityPreset {
  id: string;
  title: string;
  description: string;
  solute: string;
  molarMass: number;
  unit: string;
}

export const MOLARITY_PRESETS: MolarityPreset[] = [
  { id: "nacl", title: "NaCl", description: "Sodium chloride (table salt)", solute: "NaCl", molarMass: 58.44, unit: "g/mol" },
  { id: "naoh", title: "NaOH", description: "Sodium hydroxide (caustic soda)", solute: "NaOH", molarMass: 40.00, unit: "g/mol" },
  { id: "hcl", title: "HCl", description: "Hydrochloric acid", solute: "HCl", molarMass: 36.46, unit: "g/mol" },
  { id: "cuso4", title: "CuSO₄", description: "Copper(II) sulfate", solute: "CuSO₄", molarMass: 159.61, unit: "g/mol" },
  { id: "glucose", title: "C₆H₁₂O₆", description: "Glucose", solute: "C₆H₁₂O₆", molarMass: 180.16, unit: "g/mol" },
  { id: "h2so4", title: "H₂SO₄", description: "Sulfuric acid", solute: "H₂SO₄", molarMass: 98.08, unit: "g/mol" },
];

export function calcMolarity(massG: number, molarMass: number, volumeL: number): number {
  if (molarMass <= 0 || volumeL <= 0) return 0;
  return (massG / molarMass) / volumeL;
}

export function calcMassNeeded(molarity: number, molarMass: number, volumeL: number): number {
  return molarity * molarMass * volumeL;
}

export function calcDilution(c1: number, v1: number, c2: number): number {
  if (c2 <= 0) return 0;
  return (c1 * v1) / c2;
}

export const MOLARITY_QUIZ: QuizQuestion[] = [
  {
    question: "What is molarity?",
    options: [
      "Grams of solute per litre of solution",
      "Moles of solute per litre of solution",
      "Moles of solute per kilogram of solvent",
      "Volume of solute per volume of solution",
    ],
    correct: 1,
    explanation: "Molarity (M) is defined as the number of moles of solute divided by the volume of solution in litres. It is the most common concentration unit in chemistry.",
  },
  {
    question: "If you dissolve 5.844 g of NaCl (molar mass 58.44 g/mol) in water to make 500 mL of solution, what is the molarity?",
    options: ["0.05 M", "0.1 M", "0.2 M", "1.0 M"],
    correct: 2,
    explanation: "Moles = 5.844 / 58.44 = 0.1 mol. Volume = 0.5 L. Molarity = 0.1 / 0.5 = 0.2 M.",
  },
  {
    question: "Using C₁V₁ = C₂V₂, if you dilute 25 mL of 2.0 M HCl to 0.5 M, what final volume do you need?",
    options: ["50 mL", "75 mL", "100 mL", "200 mL"],
    correct: 2,
    explanation: "C₁V₁ = C₂V₂ gives 2.0 x 25 = 0.5 x V₂, so V₂ = 50 / 0.5 = 100 mL.",
  },
];

/* ── Standalone Calorimetry Experiments ─────────────────────────── */

export interface CaloExperiment {
  id: string;
  title: string;
  description: string;
  type: "exothermic" | "endothermic";
  startTemp: number;
  endTemp: number;
  massWater: number;
  deltaH: string;
  explanation: string;
}

export const CALO_EXPERIMENTS: CaloExperiment[] = [
  {
    id: "neutralise",
    title: "HCl + NaOH neutralisation",
    description: "Mix equal volumes of 1 M hydrochloric acid and 1 M sodium hydroxide",
    type: "exothermic",
    startTemp: 22,
    endTemp: 35.8,
    massWater: 100,
    deltaH: "-57.1 kJ/mol",
    explanation: "Neutralisation releases heat as H+ and OH- combine to form water. The enthalpy of neutralisation for strong acid + strong base is about -57 kJ/mol.",
  },
  {
    id: "dissolve-naoh",
    title: "Dissolving NaOH in water",
    description: "Add 4 g of solid NaOH to 100 mL of water",
    type: "exothermic",
    startTemp: 22,
    endTemp: 31.6,
    massWater: 100,
    deltaH: "-44.5 kJ/mol",
    explanation: "Dissolving NaOH is highly exothermic. The strong ion-dipole interactions between Na+/OH- and water molecules release more energy than is needed to break the crystal lattice.",
  },
  {
    id: "dissolve-nh4no3",
    title: "Dissolving NH₄NO₃ in water",
    description: "Add 8 g of ammonium nitrate to 100 mL of water (cold pack)",
    type: "endothermic",
    startTemp: 22,
    endTemp: 12.4,
    massWater: 100,
    deltaH: "+25.7 kJ/mol",
    explanation: "Dissolving ammonium nitrate is endothermic - it absorbs heat from the water, cooling it down. This is the reaction used in instant cold packs.",
  },
  {
    id: "mg-hcl",
    title: "Mg + HCl reaction",
    description: "Add a strip of magnesium ribbon to excess dilute HCl",
    type: "exothermic",
    startTemp: 22,
    endTemp: 48.2,
    massWater: 50,
    deltaH: "-462 kJ/mol",
    explanation: "Magnesium reacts vigorously with acid: Mg + 2HCl -> MgCl₂ + H₂. The large negative enthalpy shows this is a very exothermic reaction.",
  },
  {
    id: "citric-bicarb",
    title: "Citric acid + NaHCO₃",
    description: "Mix citric acid solution with sodium bicarbonate (baking soda fizz)",
    type: "endothermic",
    startTemp: 22,
    endTemp: 16.1,
    massWater: 100,
    deltaH: "+30.5 kJ/mol",
    explanation: "The reaction between citric acid and baking soda produces CO₂ gas and absorbs heat. This endothermic process makes the mixture noticeably colder.",
  },
];

export function caloTempCurve(exp: CaloExperiment, steps: number): number[] {
  const data: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (t < 0.1) {
      data.push(exp.startTemp);
    } else if (t < 0.5) {
      const progress = (t - 0.1) / 0.4;
      const ease = 1 - Math.pow(1 - progress, 3);
      data.push(exp.startTemp + (exp.endTemp - exp.startTemp) * ease);
    } else {
      const drift = (t - 0.5) / 0.5;
      const finalTemp = exp.endTemp + (exp.startTemp - exp.endTemp) * drift * 0.15;
      data.push(finalTemp);
    }
  }
  return data;
}

/* ── Electron Configuration Viewer ─────────────────────────────── */

export interface Subshell {
  n: number;
  l: string;
  max: number;
}

const FILL_ORDER: Subshell[] = [
  { n: 1, l: "s", max: 2 },
  { n: 2, l: "s", max: 2 }, { n: 2, l: "p", max: 6 },
  { n: 3, l: "s", max: 2 }, { n: 3, l: "p", max: 6 },
  { n: 4, l: "s", max: 2 }, { n: 3, l: "d", max: 10 },
  { n: 4, l: "p", max: 6 },
  { n: 5, l: "s", max: 2 }, { n: 4, l: "d", max: 10 },
  { n: 5, l: "p", max: 6 },
];

export interface ElectronShell {
  label: string;
  electrons: number;
  max: number;
}

export function electronConfiguration(z: number): ElectronShell[] {
  const shells: ElectronShell[] = [];
  let remaining = z;
  for (const sub of FILL_ORDER) {
    if (remaining <= 0) break;
    const e = Math.min(remaining, sub.max);
    shells.push({ label: `${sub.n}${sub.l}`, electrons: e, max: sub.max });
    remaining -= e;
  }
  return shells;
}

export function electronConfigString(z: number): string {
  return electronConfiguration(z).map(s => `${s.label}${toSuperscript(s.electrons)}`).join(" ");
}

function toSuperscript(n: number): string {
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return String(n).split("").map(d => sup[+d]).join("");
}

export function shellElectrons(z: number): number[] {
  const shells = [0, 0, 0, 0, 0];
  for (const sub of electronConfiguration(z)) {
    const n = parseInt(sub.label[0]);
    shells[n - 1] += sub.electrons;
  }
  return shells.filter(e => e > 0);
}

export const ELECTRON_QUIZ: QuizQuestion[] = [
  {
    question: "What is the maximum number of electrons in the 2p subshell?",
    options: ["2", "6", "8", "10"],
    correct: 1,
    explanation: "A p subshell has 3 orbitals, each holding 2 electrons, so the maximum is 6.",
  },
  {
    question: "What is the electron configuration of oxygen (Z=8)?",
    options: ["1s² 2s² 2p²", "1s² 2s² 2p⁴", "1s² 2s² 2p⁶", "1s² 2s¹ 2p⁵"],
    correct: 1,
    explanation: "Oxygen has 8 electrons: 2 fill the 1s, 2 fill the 2s, and the remaining 4 go into the 2p subshell.",
  },
  {
    question: "Which principle determines the order in which subshells are filled?",
    options: [
      "Hund's rule",
      "Pauli exclusion principle",
      "Aufbau principle",
      "Heisenberg uncertainty principle",
    ],
    correct: 2,
    explanation: "The Aufbau (building up) principle states that electrons fill lower-energy subshells first, following the n+l rule (1s, 2s, 2p, 3s, 3p, 4s, 3d, etc.).",
  },
];
