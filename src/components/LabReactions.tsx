import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, PointLight } from "three";
import { MOLECULE, Structure, Readout, type MoleculeSpec } from "./LabChemistry";
import type { MachineProps } from "./LabMachines";

/**
 * Experiments — reactions you can watch happen, over and over.
 *
 * Every other exhibit in the Lab is a *thing*. These are *events*: reactants
 * approach, bonds break and reform, products separate, energy goes in or comes
 * out. The loop is the point, because the single hardest idea in school
 * chemistry is that atoms are rearranged rather than created or destroyed —
 * and the way to make that land is to let a student count the atoms before and
 * count them again after.
 *
 * ## These are models, not recipes
 *
 * Nothing here tells anyone how to make anything. They are molecular animations
 * of reactions that are already in every science syllabus, and each exhibit says
 * plainly that the real versions are dangerous. A fire, a strong acid and a
 * strong alkali are all things to understand and not things to improvise with.
 */

type Side = { spec: MoleculeSpec; count: number; at: [number, number, number] };

export type ReactionDef = {
  /** The balanced equation, written out for the readout. */
  equation: string;
  left: Side[];
  right: Side[];
  /** Positive releases energy (a flame, warmth); negative needs it supplied. */
  energyOut: boolean;
  /** What the energy looks like: a flame, a glow, or nothing visible. */
  effect?: "flame" | "warm" | "none";
  note: string;
};

/**
 * The reaction clock.
 *
 * One cycle: reactants drift in, meet, flash, products drift out, hold, repeat.
 * Phases are fractions of the cycle rather than seconds, so the whole thing
 * speeds up and slows down together with the knob.
 *
 * **Nothing here re-renders React.** The first version read the phase during
 * render and had to force an update every frame, which re-mounts every atom in
 * the scene sixty times a second. Positions and visibility are set on refs
 * inside `useFrame` instead, and the component renders once.
 */
const PHASE = { react: 0.44, part: 0.56 };

/** Where a molecule sits at time `p`: out at its start, in at the middle, out again. */
function place(
  p: number, start: [number, number, number], side: "left" | "right",
): [number, number, number] {
  const meet: [number, number, number] = [start[0] * 0.16, start[1] * 0.55, start[2] * 0.4];
  const ease = (k: number) => k * k * (3 - 2 * k);
  if (side === "left") {
    if (p < PHASE.react) return lerp3(start, meet, ease(Math.min(1, p / PHASE.react)));
    return meet;
  }
  if (p < PHASE.react) return meet;
  return lerp3(meet, start, ease(Math.min(1, (p - PHASE.react) / (PHASE.part - PHASE.react))));
}

function lerp3(
  a: [number, number, number], b: [number, number, number], k: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** A flame: a few emissive cones that flicker. Cheap, and unmistakable. */
function Flame({ phase, kind }: { phase: { current: number }; kind: "flame" | "warm" }) {
  const wrap = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const strength = Math.max(0, 1 - Math.abs(phase.current - PHASE.react) / 0.14);
    const g = wrap.current;
    if (g) {
      g.visible = strength > 0.02;
      const flick = kind === "flame" ? 1 + Math.sin(t.current * 24) * 0.12 : 1;
      g.scale.setScalar(Math.max(0.001, strength * flick));
    }
    if (light.current) light.current.intensity = strength * 2600;
  });
  return (
    <group ref={wrap} visible={false}>
      <pointLight ref={light} color="#ffb14a" distance={300} decay={2} />
      {kind === "flame"
        ? [
          { r: 17, h: 52, c: "#ff8a2a", o: 0.5 },
          { r: 10, h: 36, c: "#ffd05a", o: 0.72 },
          { r: 5, h: 22, c: "#fff3c4", o: 0.95 },
        ].map((f, i) => (
          <mesh key={i} position={[0, f.h * 0.34, 0]}>
            <coneGeometry args={[f.r, f.h, 14]} />
            <meshBasicMaterial color={f.c} transparent opacity={f.o} depthWrite={false} />
          </mesh>
        ))
        : (
          <mesh>
            <sphereGeometry args={[36, 16, 12]} />
            <meshBasicMaterial color="#ff9a5a" transparent opacity={0.38} depthWrite={false} />
          </mesh>
        )}
    </group>
  );
}

/**
 * One reaction, looping.
 *
 * Reactants and products are both always in the scene; what changes is which is
 * visible. The swap happens under the flash, so the moment of change is covered
 * — and a student can count the same atoms on either side of it.
 */
export function Reaction({
  def, layer, detail, onPick, selected, running, knob,
}: MachineProps & { def: ReactionDef }) {
  const phase = useRef(0);
  const leftRefs = useRef<Group[]>([]);
  const rightRefs = useRef<Group[]>([]);

  const leftGroups = useMemo(() => expand(def.left), [def]);
  const rightGroups = useMemo(() => expand(def.right), [def]);

  useFrame((_, dt) => {
    if (running) phase.current = (phase.current + dt * (0.1 + knob / 320)) % 1;
    const p = phase.current;
    leftGroups.forEach((g, i) => {
      const n = leftRefs.current[i];
      if (!n) return;
      n.position.set(...place(p, g.at, "left"));
      n.visible = p < PHASE.react;
    });
    rightGroups.forEach((g, i) => {
      const n = rightRefs.current[i];
      if (!n) return;
      n.position.set(...place(p, g.at, "right"));
      n.visible = p >= PHASE.react;
    });
  });

  return (
    <group>
      {leftGroups.map((g, i) => (
        <group key={`l${i}`} ref={(n) => { if (n) leftRefs.current[i] = n; }} position={g.at}>
          <Structure
            atoms={g.spec.atoms} bonds={g.spec.bonds} layer={layer} detail={detail}
            running={running} onPick={onPick} selected={selected}
          />
        </group>
      ))}

      {rightGroups.map((g, i) => (
        <group key={`r${i}`} ref={(n) => { if (n) rightRefs.current[i] = n; }}
          position={g.at} visible={false}>
          <Structure
            atoms={g.spec.atoms} bonds={g.spec.bonds} layer={layer} detail={detail}
            running={running} onPick={onPick} selected={selected}
          />
        </group>
      ))}

      {def.effect && def.effect !== "none" && <Flame phase={phase} kind={def.effect} />}

      <Readout at={[0, 116, 0]}>
        <b>{def.equation}</b>
        <span>{def.energyOut ? "energy comes out — this one gets hot" : "energy has to be put in"}</span>
      </Readout>
      <Readout at={[0, -112, 0]}><span>{def.note}</span></Readout>
    </group>
  );
}

/** `count` copies of a molecule, fanned out so they do not sit inside each other. */
function expand(sides: Side[]): { spec: MoleculeSpec; at: [number, number, number] }[] {
  const out: { spec: MoleculeSpec; at: [number, number, number] }[] = [];
  for (const s of sides) {
    for (let i = 0; i < s.count; i++) {
      // space-filling radii are large; 46 units left two O2 molecules overlapping
      const spread = (i - (s.count - 1) / 2) * 66;
      out.push({ spec: s.spec, at: [s.at[0], s.at[1] + spread, s.at[2]] });
    }
  }
  return out;
}

/* ------------------------------------------------------------ the three --- */

const L = -118;
const R = 118;

export const REACTIONS: Record<string, ReactionDef> = {
  burn: {
    equation: "CH₄ + 2 O₂  →  CO₂ + 2 H₂O",
    left: [
      { spec: MOLECULE.CH4, count: 1, at: [L, 62, 0] },
      { spec: MOLECULE.O2, count: 2, at: [L, -48, 0] },
    ],
    right: [
      { spec: MOLECULE.CO2, count: 1, at: [R, 62, 0] },
      { spec: MOLECULE.H2O, count: 2, at: [R, -48, 0] },
    ],
    energyOut: true,
    effect: "flame",
    note: "Count the atoms: 1 carbon, 4 hydrogens and 4 oxygens, before and after.",
  },
  makeWater: {
    equation: "2 H₂ + O₂  →  2 H₂O",
    left: [
      { spec: MOLECULE.H2, count: 2, at: [L, 52, 0] },
      { spec: MOLECULE.O2, count: 1, at: [L, -56, 0] },
    ],
    right: [{ spec: MOLECULE.H2O, count: 2, at: [R, 4, 0] }],
    energyOut: true,
    effect: "flame",
    note: "Run it backwards and you have electrolysis — which needs electricity put in.",
  },
  neutralise: {
    equation: "HCl + NaOH  →  Na⁺ + Cl⁻ + H₂O",
    left: [
      { spec: MOLECULE.HCl, count: 1, at: [L, 52, 0] },
      { spec: MOLECULE.NaOH, count: 1, at: [L, -52, 0] },
    ],
    right: [
      { spec: MOLECULE.NaIon, count: 1, at: [R, 66, 0] },
      { spec: MOLECULE.ClIon, count: 1, at: [R, 6, 0] },
      { spec: MOLECULE.H2O, count: 1, at: [R, -60, 0] },
    ],
    energyOut: true,
    effect: "warm",
    note: "The salt does not come out as molecules — it stays as separate ions in the water.",
  },
};

export function BurnMethane(props: MachineProps) {
  return <Reaction {...props} def={REACTIONS.burn} />;
}
export function MakeWater(props: MachineProps) {
  return <Reaction {...props} def={REACTIONS.makeWater} />;
}
export function Neutralise(props: MachineProps) {
  return <Reaction {...props} def={REACTIONS.neutralise} />;
}
