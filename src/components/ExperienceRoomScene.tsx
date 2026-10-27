import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, RepeatWrapping,
  SRGBColorSpace, DoubleSide, AdditiveBlending, Vector3, Group, Color,
  PointLight, Box3, SpriteMaterial, Sprite,
} from "three";
import type { MutableRefObject } from "react";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { REAGENTS, RECIPES, reagentById, type Recipe, type Reagent } from "../chemistry";
import { TheSpecimen } from "./LabExhibit";
import type { LabLayer } from "../lab";

/* ── Room dimensions ────────────────────────────────────────────── */
const W = 12;
const D = 10;
const H = 3.6;
const WALL_T = 0.15;
const BENCH_H = 0.95;
const BENCH_D = 0.7;
const BENCH_Z = -D / 2 + 0.8;
const TOP_Y = BENCH_H + 0.03;

/* ── Station definitions ────────────────────────────────────────── */
export interface Station {
  id: string;
  label: string;
  icon: string;
  at: [number, number, number];
  description: string;
  /** "mix" opens the bench; everything else opens an in-room reading panel. */
  kind: "mix" | "info";
  /** Explanation shown in the room - no need to leave to read it. */
  detail?: string;
  /** Optional deeper 3D exhibit, offered but never forced. */
  specimen?: string;
  /** Loads these two reagents straight into the bench. */
  preset?: [string, string];
  /** A specimen rendered on this station's table, standing in the room. */
  model?: { id: string; at: [number, number, number]; size: number };
}

export const STATIONS: Station[] = [
  {
    id: "mix-bench", label: "Mixing station", icon: "⚗️", kind: "mix",
    at: [0, BENCH_H + 0.45, BENCH_Z + 0.95],
    description: "Take two reagents off the shelf and see what they make",
  },
  {
    id: "fire-bench", label: "Bunsen burner", icon: "🔥", kind: "info",
    at: [-3.2, BENCH_H + 0.45, BENCH_Z + 0.95],
    description: "Heating, and what a flame's colour tells you",
    preset: ["ch4", "o2"],
    specimen: "burn-methane",
    detail:
      "Air comes in at the collar near the base and mixes with the gas on the way up. Open the collar and you get a hot blue flame with plenty of oxygen - a complete burn. Close it and the gas burns halfway, giving the cooler yellow flame that leaves soot on the glass. The yellow one is easy to see, which is why it is the safety flame you leave it on between jobs.",
  },
  {
    id: "acid-bench", label: "Titration stand", icon: "🧫", kind: "info",
    at: [3.2, BENCH_H + 0.45, BENCH_Z + 0.95],
    description: "Measuring exactly how much it takes to neutralise",
    preset: ["hcl", "naoh"],
    specimen: "neutralise",
    detail:
      "The burette lets you add acid one drop at a time and read off exactly how much went in. You stop at the moment the indicator changes - the end point. Knowing the volume and the concentration of what you added tells you the concentration of what was in the flask, which is the whole reason for doing it this carefully.",
  },
  {
    id: "molecule-table", label: "Molecule viewer", icon: "🧬", kind: "info",
    at: [-4.2, BENCH_H + 0.45, 0],
    description: "How atoms sit together in a molecule",
    specimen: "water",
    model: { id: "water", at: [-4.2, TOP_Y, 0], size: 0.72 },
    detail:
      "A molecule is not a flat diagram - the angles are real and they decide how the substance behaves. Water's two hydrogens sit at about 104.5°, not opposite each other, so one side of the molecule is a little negative and the other a little positive. That lopsidedness is why water dissolves salt, why ice floats, and why it takes so much heat to boil.",
  },
  {
    id: "crystal-table", label: "Crystal viewer", icon: "💎", kind: "info",
    at: [4.2, BENCH_H + 0.45, 0],
    description: "Why the same atoms can make very different solids",
    specimen: "salt",
    model: { id: "salt", at: [4.2, TOP_Y, 0], size: 0.72 },
    detail:
      "In salt, sodium and chloride alternate in a cube that repeats in every direction - there is no single 'salt molecule', just the pattern. Carbon shows the point even better: the same atoms give diamond, the hardest thing you can hold, or graphite, soft enough to write with. Nothing changes but the arrangement.",
  },
  {
    id: "whiteboard", label: "Atoms are conserved", icon: "📋", kind: "info",
    at: [0, 2.2, -D / 2 + 0.6],
    description: "The rule every equation on this board obeys",
    detail:
      "Count the atoms on the left of any equation here, then count them on the right. They match every time. A reaction rearranges atoms into new partners; it never makes or destroys them. That is why equations have to be balanced - an unbalanced one is describing something that cannot happen.",
  },
  {
    id: "flame-corner", label: "Flame test lab", icon: "🔥", kind: "info",
    at: [-4.2, BENCH_H + 0.45, 3.0],
    description: "Identify metals by the colour they give a flame",
    detail:
      "Each metal ion emits light at specific wavelengths when heated. Sodium glows yellow, copper green, lithium red. The electrons absorb heat energy, jump to a higher orbit, then fall back and release the extra energy as visible light. The colour depends on the gap between orbits, which is different for each element.",
  },
  {
    id: "distill-corner", label: "Distillation setup", icon: "🧪", kind: "info",
    at: [4.2, BENCH_H + 0.45, 3.0],
    description: "Separate liquids by their boiling points",
    detail:
      "Heating a mixture of liquids makes the lowest-boiling component evaporate first. The vapour travels through the condenser, cools back to liquid, and drips into the collection flask. Keep raising the temperature and each component comes over in turn. This is how crude oil is split into petrol, diesel, and kerosene at a refinery.",
  },
  {
    id: "analysis-wall", label: "Analysis station", icon: "📊", kind: "info",
    at: [0, BENCH_H + 0.45, D / 2 - 1.2],
    description: "Charts, graphs, and calculation tools",
    detail:
      "The analysis station brings together the tools a working chemist uses every day: the periodic table to look up element properties, gas-law calculators to predict volume and pressure changes, rate graphs to see how concentration changes over time, and electron configuration diagrams to understand why elements behave the way they do.",
  },
];

/* ── Shared materials ───────────────────────────────────────────── */
const mFloor = new MeshStandardMaterial({ color: "#4a6670", roughness: 0.85 });
const mWall = new MeshStandardMaterial({ color: "#5e7e87", roughness: 0.75 });
const mBackWall = new MeshStandardMaterial({ color: "#4a6872", roughness: 0.7 });
const mCeiling = new MeshStandardMaterial({ color: "#8aa0a6", roughness: 0.6 });
const mBench = new MeshStandardMaterial({ color: "#d9e4dc", roughness: 0.35, metalness: 0.05 });
const mBenchLeg = new MeshStandardMaterial({ color: "#7a8e8c", roughness: 0.5, metalness: 0.4 });
const mShelf = new MeshStandardMaterial({ color: "#b8ccc4", roughness: 0.55 });
const mDoor = new MeshStandardMaterial({ color: "#3e5c55", roughness: 0.6 });
const mWindow = new MeshStandardMaterial({ color: "#a5d8e8", roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35, side: DoubleSide });
const mFrame = new MeshStandardMaterial({ color: "#6e8f96", roughness: 0.5, metalness: 0.3 });
const mBoard = new MeshStandardMaterial({ color: "#2a3d3a", roughness: 0.9 });
const mBoardFrame = new MeshStandardMaterial({ color: "#8a7a5c", roughness: 0.65 });
/** Thin, barely-there glass reads better than thick tinted glass at this scale. */
const mGlass = new MeshStandardMaterial({
  color: "#dcf0f5", roughness: 0.04, metalness: 0,
  transparent: true, opacity: 0.22, side: DoubleSide,
});
const mPipe = new MeshStandardMaterial({ color: "#889898", roughness: 0.4, metalness: 0.6 });
const mSteel = new MeshStandardMaterial({ color: "#9aa8ac", roughness: 0.32, metalness: 0.75 });
const mStoolSeat = new MeshStandardMaterial({ color: "#3a4e48", roughness: 0.5 });
const mCabinetBody = new MeshStandardMaterial({ color: "#607a76", roughness: 0.6 });
const mCabinetDoor = new MeshStandardMaterial({ color: "#c5ddd6", roughness: 0.3, transparent: true, opacity: 0.4 });
const mEmissive = new MeshBasicMaterial({ color: "#fffbe8" });
const mSafety = new MeshStandardMaterial({ color: "#e8c840", roughness: 0.7 });
const mSafetyStripe = new MeshStandardMaterial({ color: "#222222", roughness: 0.8 });
const mExtinguisher = new MeshStandardMaterial({ color: "#cc2020", roughness: 0.5, metalness: 0.3 });
const mCork = new MeshStandardMaterial({ color: "#b98a52", roughness: 0.85 });

const mGlowIdle = new MeshBasicMaterial({ color: "#d0ffcc", transparent: true, opacity: 0.28 });
const mGlowActive = new MeshBasicMaterial({ color: "#80ffc0", transparent: true, opacity: 0.7 });
const mBubble = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5 });
const mSteam = new MeshBasicMaterial({ color: "#dff0f5", transparent: true, opacity: 0.22 });
/** Additive blending is what makes a flame read as light rather than plastic. */
const mFlameOuter = new MeshBasicMaterial({ color: "#ff9a3c", transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false });
const mFlameMid = new MeshBasicMaterial({ color: "#ffd27a", transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false });
const mFlameCore = new MeshBasicMaterial({ color: "#7fd4ff", transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false });
const mFlash = new MeshBasicMaterial({ color: "#fffbe0", transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });

/* ── Floor ──────────────────────────────────────────────────────── */
function useCheckerTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#54727c"; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#3f5d67"; ctx.fillRect(0, 0, 64, 64); ctx.fillRect(64, 64, 64, 64);
    ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 3;
    for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) ctx.strokeRect(x, y, 64, 64);
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(W / 2, D / 2);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}

function RoomShell() {
  const tex = useCheckerTexture();
  const floorMat = useMemo(
    () => new MeshStandardMaterial({ map: tex ?? undefined, roughness: 0.85 }),
    [tex]
  );
  return (
    <group name="shell">
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[W + 2, 0.5, D + 2]} />
        <primitive object={mFloor} attach="material" />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, WALL_T]} /><primitive object={mBackWall} attach="material" />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[WALL_T, H, D]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[WALL_T, H, D]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[-W / 4 - 0.5, H / 2, D / 2]} receiveShadow>
        <boxGeometry args={[W / 2 - 1, H, WALL_T]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[W / 4 + 0.5, H / 2, D / 2]} receiveShadow>
        <boxGeometry args={[W / 2 - 1, H, WALL_T]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[0, H - 0.4, D / 2]} receiveShadow>
        <boxGeometry args={[2, 0.8, WALL_T]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[W, 0.1, D]} /><primitive object={mCeiling} attach="material" />
      </mesh>
    </group>
  );
}

function Windows() {
  return (
    <group name="windows">
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-W / 2 + 0.02, 2, -2.5 + i * 2.5]}>
          <mesh><boxGeometry args={[0.06, 1.4, 1.6]} /><primitive object={mWindow} attach="material" /></mesh>
          <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.08, 0.06, 1.7]} /><primitive object={mFrame} attach="material" /></mesh>
          <mesh position={[0, -0.75, 0]}><boxGeometry args={[0.08, 0.06, 1.7]} /><primitive object={mFrame} attach="material" /></mesh>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.08, 1.5, 0.05]} /><primitive object={mFrame} attach="material" /></mesh>
        </group>
      ))}
    </group>
  );
}

function Door() {
  return (
    <group name="door" position={[0, 0, D / 2 - 0.05]}>
      <mesh position={[-0.45, 1.25, 0]}><boxGeometry args={[0.9, 2.5, 0.08]} /><primitive object={mDoor} attach="material" /></mesh>
      <mesh position={[0.45, 1.25, 0]}><boxGeometry args={[0.9, 2.5, 0.08]} /><primitive object={mDoor} attach="material" /></mesh>
      <mesh position={[-1, 1.3, 0]}><boxGeometry args={[0.1, 2.6, 0.14]} /><primitive object={mFrame} attach="material" /></mesh>
      <mesh position={[1, 1.3, 0]}><boxGeometry args={[0.1, 2.6, 0.14]} /><primitive object={mFrame} attach="material" /></mesh>
    </group>
  );
}

function Bench({ position, width = 2.2 }: { position: [number, number, number]; width?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.06, BENCH_D]} /><primitive object={mBench} attach="material" />
      </mesh>
      {[[-width / 2 + 0.1, -BENCH_D / 2 + 0.1], [-width / 2 + 0.1, BENCH_D / 2 - 0.1],
        [width / 2 - 0.1, -BENCH_D / 2 + 0.1], [width / 2 - 0.1, BENCH_D / 2 - 0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, BENCH_H / 2 - 0.03, z]}>
          <boxGeometry args={[0.06, BENCH_H - 0.06, 0.06]} /><primitive object={mBenchLeg} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[width - 0.3, 0.03, BENCH_D - 0.15]} /><primitive object={mShelf} attach="material" />
      </mesh>
    </group>
  );
}

function SideTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} /><primitive object={mBench} attach="material" />
      </mesh>
      {[[-0.5, -0.3], [-0.5, 0.3], [0.5, -0.3], [0.5, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, BENCH_H / 2 - 0.02, z]}>
          <cylinderGeometry args={[0.025, 0.025, BENCH_H - 0.05, 6]} /><primitive object={mBenchLeg} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 12]} /><primitive object={mStoolSeat} attach="material" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 6]} /><primitive object={mBenchLeg} attach="material" />
      </mesh>
    </group>
  );
}

function useBoardTexture(discovered: string[]) {
  return useMemo(() => {
    const W_PX = 512, H_PX = 280;
    const c = document.createElement("canvas");
    c.width = W_PX; c.height = H_PX;
    const ctx = c.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#2a3d3a";
    ctx.fillRect(0, 0, W_PX, H_PX);

    ctx.fillStyle = "#c8e0cc";
    ctx.font = "bold 16px monospace";
    ctx.fillText("Reaction Discovery Board", 14, 24);

    ctx.strokeStyle = "rgba(200,224,200,.15)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(14, 32); ctx.lineTo(W_PX - 14, 32);
    ctx.stroke();

    const found = RECIPES.filter((r) => discovered.includes(r.id));
    const noFind = discovered.length === 0;

    if (noFind) {
      ctx.fillStyle = "#6a9a8a";
      ctx.font = "13px monospace";
      ctx.fillText("Mix reagents at the bench to fill", 14, 56);
      ctx.fillText("this board with your discoveries.", 14, 74);
      ctx.fillStyle = "#4e7a6e";
      ctx.font = "12px monospace";
      ctx.fillText(`${RECIPES.length} reactions to find...`, 14, 100);

      ctx.fillStyle = "#5a8a7a";
      ctx.font = "bold 13px monospace";
      ctx.fillText("Suggested experiments:", 14, 130);
      const suggestions = [
        "H₂ + O₂  →  ?",
        "HCl + NaOH  →  ?",
        "Na + H₂O  →  ?",
        "Mg + O₂  →  ?",
      ];
      ctx.font = "12px monospace";
      suggestions.forEach((s, i) => {
        ctx.fillStyle = "#7ab0a0";
        ctx.fillText(`• ${s}`, 24, 152 + i * 20);
      });
    } else {
      ctx.font = "12px monospace";
      let y = 48;
      for (const r of found) {
        if (y > H_PX - 20) break;
        ctx.fillStyle = "#50ddaa";
        ctx.fillText("✓", 14, y);
        ctx.fillStyle = "#a0d8c4";
        ctx.fillText(r.name, 32, y);
        ctx.fillStyle = "#6a9a8a";
        const eq = r.equation.length > 40 ? r.equation.slice(0, 38) + "…" : r.equation;
        ctx.fillText(eq, 32, y + 14);
        y += 34;
      }

      const remaining = RECIPES.length - found.length;
      if (remaining > 0 && y < H_PX - 10) {
        ctx.fillStyle = "#4e7a6e";
        ctx.font = "11px monospace";
        ctx.fillText(`${remaining} more to discover...`, 14, y + 8);
      }
      if (remaining === 0 && y < H_PX - 10) {
        ctx.fillStyle = "#50ddaa";
        ctx.font = "bold 13px monospace";
        ctx.fillText("All reactions discovered!", 14, y + 8);
      }
    }

    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [discovered]);
}

function Whiteboard({ discovered }: { discovered: string[] }) {
  const tex = useBoardTexture(discovered);
  return (
    <group position={[0, 2, -D / 2 + 0.1]}>
      <mesh><boxGeometry args={[2.4, 1.3, 0.05]} /><primitive object={mBoard} attach="material" /></mesh>
      {tex && (
        <mesh position={[0, 0, 0.028]}>
          <planeGeometry args={[2.3, 1.2]} />
          <meshBasicMaterial map={tex} transparent />
        </mesh>
      )}
      <mesh position={[0, 0.68, 0]}><boxGeometry args={[2.5, 0.06, 0.07]} /><primitive object={mBoardFrame} attach="material" /></mesh>
      <mesh position={[0, -0.68, 0]}><boxGeometry args={[2.5, 0.06, 0.07]} /><primitive object={mBoardFrame} attach="material" /></mesh>
      <mesh position={[-1.23, 0, 0]}><boxGeometry args={[0.06, 1.4, 0.07]} /><primitive object={mBoardFrame} attach="material" /></mesh>
      <mesh position={[1.23, 0, 0]}><boxGeometry args={[0.06, 1.4, 0.07]} /><primitive object={mBoardFrame} attach="material" /></mesh>
    </group>
  );
}

function Cabinet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.5, 1.6, 0.4]} /><primitive object={mCabinetBody} attach="material" /></mesh>
      <mesh position={[0, 0, 0.21]}><boxGeometry args={[0.46, 1.5, 0.02]} /><primitive object={mCabinetDoor} attach="material" /></mesh>
      {[-0.5, 0, 0.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}><boxGeometry args={[0.46, 0.02, 0.36]} /><primitive object={mShelf} attach="material" /></mesh>
      ))}
    </group>
  );
}

function SafetyKit() {
  return (
    <group>
      <mesh position={[W / 2 - 0.3, 0.22, 3.5]}>
        <cylinderGeometry args={[0.06, 0.06, 0.44, 8]} /><primitive object={mExtinguisher} attach="material" />
      </mesh>
      <group position={[W / 2 - 0.06, 2.2, 3.5]}>
        <mesh><boxGeometry args={[0.6, 0.4, 0.02]} /><primitive object={mSafety} attach="material" /></mesh>
        {[-0.12, -0.04, 0.04, 0.12].map((y, i) => (
          <mesh key={i} position={[0, y, 0.012]}>
            <boxGeometry args={[0.5, 0.025, 0.005]} /><primitive object={mSafetyStripe} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════
   THE MIXING BENCH
   ══════════════════════════════════════════════════════════════════ */

export interface MixState {
  recipe: Recipe | null;
  p: number;
}

function MixController({
  cmd, state, onChange,
}: {
  cmd: MutableRefObject<Recipe | null>;
  state: MutableRefObject<MixState>;
  onChange: (r: Recipe | null) => void;
}) {
  useFrame((_, dt) => {
    const s = state.current;
    if (cmd.current) {
      s.recipe = cmd.current;
      s.p = 0;
      cmd.current = null;
      onChange(s.recipe);
    }
    if (s.recipe) {
      s.p += dt / s.recipe.duration;
      if (s.p >= 1) {
        s.recipe = null;
        s.p = 0;
        onChange(null);
      }
    }
  });
  return null;
}

/** Build a tiny canvas label texture for a reagent bottle. */
function makeLabelTexture(text: string, chosen: boolean): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = chosen ? "rgba(80,221,170,0.92)" : "rgba(30,50,60,0.85)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 56, 10);
  ctx.fill();
  ctx.fillStyle = chosen ? "#1a2e38" : "#d0ffe8";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const display = text.length > 16 ? text.slice(0, 15) + "…" : text;
  ctx.fillText(display, 128, 32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A single interactive bottle on the rack. */
function RackBottle({
  reagent, position, chosen, onPick,
}: {
  reagent: Reagent;
  position: [number, number, number];
  chosen: boolean;
  onPick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group>(null);
  const labelRef = useRef<Sprite>(null);
  const camera = useThree((s) => s.camera);

  const mat = useMemo(() => new MeshStandardMaterial({
    color: reagent.color, roughness: 0.3,
    transparent: true, opacity: reagent.phase === "gas" ? 0.35 : 0.85,
  }), [reagent.color, reagent.phase]);

  const glowMat = useMemo(() => new MeshBasicMaterial({
    color: chosen ? "#50ddaa" : "#80ffc0",
    transparent: true, opacity: chosen ? 0.5 : 0.3,
  }), [chosen]);

  const labelTex = useMemo(() => makeLabelTexture(reagent.name, chosen), [reagent.name, chosen]);
  const labelMat = useMemo(() => new SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }), [labelTex]);

  const _worldPos = useRef(new Vector3());
  useFrame(() => {
    if (!groupRef.current || !labelRef.current) return;
    groupRef.current.getWorldPosition(_worldPos.current);
    const dist = camera.position.distanceTo(_worldPos.current);
    const show = dist < 3.5;
    labelRef.current.visible = show;
    if (show) {
      const s = Math.min(1, 0.3 + (3.5 - dist) * 0.25);
      labelRef.current.scale.set(s * 0.22, s * 0.055, 1);
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPick(reagent.id);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Clickable hit area - slightly larger than the bottle */}
      <mesh
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ""; }}
      >
        <cylinderGeometry args={[0.04, 0.04, 0.16, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Bottle shell */}
      <mesh><cylinderGeometry args={[0.028, 0.028, 0.12, 10, 1, true]} /><primitive object={mGlass} attach="material" /></mesh>
      {/* Liquid/solid contents */}
      <mesh position={[0, -0.018, 0]}>
        <cylinderGeometry args={[0.025, 0.025, reagent.phase === "solid" ? 0.04 : 0.075, 10]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Cork */}
      <mesh position={[0, 0.065, 0]}><cylinderGeometry args={[0.015, 0.02, 0.025, 8]} /><primitive object={mCork} attach="material" /></mesh>

      {/* Selection / hover glow ring */}
      {(chosen || hovered) && (
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.09, 12]} />
          <primitive object={glowMat} attach="material" />
        </mesh>
      )}

      {/* Floating label sprite */}
      <sprite ref={labelRef} position={[0, 0.14, 0]} material={labelMat} visible={false} />
    </group>
  );
}

/** The shelf of reagent bottles along the back of the bench. */
function ReagentRack({
  onPick, slotA, slotB, slotC, slotD, visibleReagents,
}: {
  onPick: (id: string) => void;
  slotA: string | null;
  slotB: string | null;
  slotC: string | null;
  slotD: string | null;
  visibleReagents: Reagent[];
}) {
  const reagents = visibleReagents ?? REAGENTS;
  const chosenSet = useMemo(() => new Set([slotA, slotB, slotC, slotD].filter(Boolean) as string[]), [slotA, slotB, slotC, slotD]);
  const cols = Math.ceil(reagents.length / 2);
  const spacing = 0.17;
  const shelfW = cols * spacing + 0.12;
  return (
    <group position={[0, TOP_Y, BENCH_Z - 0.24]}>
      {/* Two-tier shelf */}
      <mesh position={[0, 0.005, 0.04]}>
        <boxGeometry args={[shelfW, 0.01, 0.28]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <mesh position={[0, 0.105, -0.06]}>
        <boxGeometry args={[shelfW, 0.01, 0.12]} /><primitive object={mSteel} attach="material" />
      </mesh>
      {reagents.map((r, i) => {
        const row = i < cols ? 0 : 1;
        const col = row === 0 ? i : i - cols;
        const x = -(cols - 1) * spacing * 0.5 + col * spacing;
        const z = row === 0 ? 0.06 : -0.06;
        const y = row === 0 ? 0.01 : 0.11;
        return (
          <RackBottle
            key={r.id}
            reagent={r}
            position={[x, y, z]}
            chosen={chosenSet.has(r.id)}
            onPick={onPick}
          />
        );
      })}
    </group>
  );
}

/** One of the two vials the chosen reagents sit in before they are poured. */
function SlotVial({ x, reagentId }: { x: number; reagentId: string | null }) {
  const r = reagentById(reagentId);
  const mat = useMemo(
    () => new MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, transparent: true, opacity: 0.9 }),
    []
  );
  if (r) {
    mat.color.set(r.color);
    mat.opacity = r.phase === "gas" ? 0.3 : 0.88;
  }
  return (
    <group position={[x, TOP_Y, BENCH_Z + 0.16]}>
      <mesh><cylinderGeometry args={[0.035, 0.035, 0.12, 12, 1, true]} /><primitive object={mGlass} attach="material" /></mesh>
      <mesh position={[0, -0.058, 0]}><cylinderGeometry args={[0.035, 0.035, 0.005, 12]} /><primitive object={mGlass} attach="material" /></mesh>
      {r && (
        <mesh position={[0, -0.025, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.06, 12]} />
          <primitive object={mat} attach="material" />
        </mesh>
      )}
    </group>
  );
}

const C_ACID = new Color("#e0403c");
const C_MID = new Color("#e8a13a");
const _cA = new Color();
const _cB = new Color();

/** The beaker everything happens in. One vessel, five behaviours. */
function MixingVessel({ state }: { state: MutableRefObject<MixState> }) {
  const liquidRef = useRef<Group>(null);
  const bubblesRef = useRef<Group>(null);
  const precipRef = useRef<Group>(null);
  const sedimentRef = useRef<Group>(null);
  const steamRef = useRef<Group>(null);
  const flameRef = useRef<Group>(null);
  const flashRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const wasOn = useRef(false);

  const liquidMat = useMemo(
    () => new MeshStandardMaterial({ color: "#8ecae6", roughness: 0.18, transparent: true, opacity: 0.75 }),
    []
  );
  const sedimentMat = useMemo(
    () => new MeshStandardMaterial({ color: "#ffffff", roughness: 0.65 }),
    []
  );
  const precipMat = useMemo(
    () => new MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, transparent: true, opacity: 0.85 }),
    []
  );

  const bubbleSeeds = useMemo(
    () => Array.from({ length: 14 }, () => ({
      x: (Math.random() - 0.5) * 0.08, z: (Math.random() - 0.5) * 0.08,
      off: Math.random(), spd: 0.5 + Math.random() * 0.7,
    })), []
  );
  const precipSeeds = useMemo(
    () => Array.from({ length: 16 }, () => ({
      x: (Math.random() - 0.5) * 0.09, z: (Math.random() - 0.5) * 0.09,
      off: Math.random() * 0.5, spd: 0.25 + Math.random() * 0.3,
    })), []
  );
  const steamSeeds = useMemo(
    () => Array.from({ length: 9 }, () => ({
      x: (Math.random() - 0.5) * 0.1, z: (Math.random() - 0.5) * 0.1,
      off: Math.random(), spd: 0.2 + Math.random() * 0.22,
    })), []
  );

  const reset = () => {
    if (liquidRef.current) liquidRef.current.scale.y = 0.001;
    if (sedimentRef.current) sedimentRef.current.scale.y = 0.001;
    if (bubblesRef.current) bubblesRef.current.visible = false;
    if (precipRef.current) precipRef.current.visible = false;
    if (steamRef.current) steamRef.current.visible = false;
    if (flameRef.current) flameRef.current.visible = false;
    if (flashRef.current) flashRef.current.visible = false;
    if (lightRef.current) lightRef.current.intensity = 0;
  };

  useFrame((st) => {
    const { recipe, p } = state.current;
    const on = !!recipe;
    if (on !== wasOn.current) {
      wasOn.current = on;
      if (!on) reset();
    }
    if (!recipe) return;

    const t = st.clock.elapsedTime;
    const kind = recipe.effect;

    // Liquid level and colour ─────────────────────────────────────
    let fill = 0.7;
    if (kind === "synthesis") fill = Math.max(0.001, Math.min(0.75, (p - 0.32) / 0.5));
    else if (kind === "combustion") fill = 0.28;
    if (liquidRef.current) {
      liquidRef.current.scale.y = fill;
      liquidRef.current.position.y = -0.055 + fill * 0.075;
    }
    if (kind === "neutralise") {
      // red → orange → green as the acid is used up
      if (p < 0.5) liquidMat.color.lerpColors(C_ACID, C_MID, p / 0.5);
      else liquidMat.color.lerpColors(C_MID, _cA.set(recipe.productColor), Math.min(1, (p - 0.5) / 0.4));
    } else if (kind === "precipitate") {
      liquidMat.color.lerpColors(_cA.set("#cfe0e6"), _cB.set(recipe.productColor), Math.min(1, p / 0.4));
    } else {
      liquidMat.color.set(recipe.productColor);
    }

    // Bubbles - gas is violent, neutralise is gentle ──────────────
    const wantBubbles = kind === "gas" || kind === "neutralise" || (kind === "synthesis" && p < 0.32);
    if (bubblesRef.current) {
      bubblesRef.current.visible = wantBubbles;
      if (wantBubbles) {
        const rate = kind === "gas" ? 2.2 : 0.8;
        const top = fill * 0.15;
        for (let i = 0; i < bubblesRef.current.children.length; i++) {
          const s = bubbleSeeds[i];
          const f = (t * s.spd * rate + s.off) % 1;
          const c = bubblesRef.current.children[i];
          c.position.set(s.x, -0.055 + f * top, s.z);
          c.scale.setScalar(Math.sin(f * Math.PI) * (kind === "gas" ? 1.5 : 0.9) + 0.1);
        }
      }
    }

    // Precipitate - particles form, sink, then pile up ────────────
    if (precipRef.current && sedimentRef.current) {
      const isP = kind === "precipitate";
      precipRef.current.visible = isP;
      if (isP) {
        sedimentMat.color.set(recipe.precipitateColor ?? "#ffffff");
        precipMat.color.set(recipe.precipitateColor ?? "#ffffff");
        for (let i = 0; i < precipRef.current.children.length; i++) {
          const s = precipSeeds[i];
          const local = (p - s.off) / 0.5;
          const c = precipRef.current.children[i];
          if (local <= 0 || local > 1) { c.scale.setScalar(0.001); continue; }
          // ease out as it settles
          const e = 1 - (1 - local) * (1 - local);
          c.position.set(s.x + Math.sin(t * s.spd + i) * 0.006, 0.05 - e * 0.1, s.z);
          c.scale.setScalar(local < 0.15 ? local / 0.15 : 1);
        }
        sedimentRef.current.scale.y = Math.max(0.001, Math.min(1, (p - 0.25) / 0.6));
      } else {
        sedimentRef.current.scale.y = 0.001;
      }
    }

    // Flame ───────────────────────────────────────────────────────
    if (flameRef.current) {
      const isC = kind === "combustion";
      const grow = isC ? Math.min(1, p / 0.1) * (p > 0.88 ? Math.max(0, (1 - p) / 0.12) : 1) : 0;
      flameRef.current.visible = grow > 0.02;
      if (grow > 0.02) {
        // two different frequencies keep the flicker from looking like a pulse
        const fl = 1 + Math.sin(t * 19) * 0.07 + Math.sin(t * 31.7) * 0.04;
        flameRef.current.scale.set(grow * (1 + Math.sin(t * 24) * 0.05), grow * fl, grow * (1 + Math.cos(t * 27) * 0.05));
      }
    }

    // Ignition flash for the synthesis ────────────────────────────
    if (flashRef.current) {
      const d = Math.abs(p - 0.3);
      const s = kind === "synthesis" && d < 0.06 ? (1 - d / 0.06) : 0;
      flashRef.current.visible = s > 0.02;
      flashRef.current.scale.setScalar(Math.max(0.001, s * 2.2));
    }

    // Steam ───────────────────────────────────────────────────────
    const wantSteam =
      (kind === "combustion" && p > 0.15) ||
      (kind === "synthesis" && p > 0.35) ||
      (kind === "neutralise" && p > 0.3);
    if (steamRef.current) {
      steamRef.current.visible = wantSteam;
      if (wantSteam) {
        for (let i = 0; i < steamRef.current.children.length; i++) {
          const s = steamSeeds[i];
          const f = (t * s.spd + s.off) % 1;
          const c = steamRef.current.children[i];
          c.position.set(s.x + Math.sin(f * 3.4 + i) * 0.05, 0.1 + f * 0.55, s.z);
          c.scale.setScalar(0.2 + f * 1.7);
        }
      }
    }

    // Heat glow - the vessel should light its own surroundings ────
    if (lightRef.current) {
      const env = Math.sin(Math.min(1, p / 0.15) * Math.PI * 0.5) * (p > 0.85 ? (1 - p) / 0.15 : 1);
      const flick = kind === "combustion" ? 1 + Math.sin(t * 23) * 0.18 : 1;
      lightRef.current.intensity = recipe.heat * 2.6 * Math.max(0, env) * flick;
      lightRef.current.color.set(kind === "combustion" ? "#ffb066" : "#ffd9a0");
    }
  });

  return (
    <group position={[0, TOP_Y, BENCH_Z + 0.16]}>
      {/* Tripod and gauze under the beaker */}
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12]}>
          <cylinderGeometry args={[0.006, 0.006, 0.1, 6]} /><primitive object={mPipe} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.006, 16]} /><primitive object={mPipe} attach="material" />
      </mesh>

      <group position={[0, 0.2, 0]}>
        {/* Beaker */}
        <mesh><cylinderGeometry args={[0.105, 0.095, 0.24, 20, 1, true]} /><primitive object={mGlass} attach="material" /></mesh>
        <mesh position={[0, -0.118, 0]}><cylinderGeometry args={[0.095, 0.095, 0.006, 20]} /><primitive object={mGlass} attach="material" /></mesh>
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.105, 0.004, 6, 20]} /><primitive object={mGlass} attach="material" /></mesh>

        {/* Liquid - scaled from the base so it fills upward */}
        <group ref={liquidRef} position={[0, -0.055, 0]} scale={[1, 0.001, 1]}>
          <mesh><cylinderGeometry args={[0.093, 0.09, 0.15, 20]} /><primitive object={liquidMat} attach="material" /></mesh>
        </group>

        {/* Settled solid at the bottom */}
        <group ref={sedimentRef} position={[0, -0.112, 0]} scale={[1, 0.001, 1]}>
          <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.09, 0.088, 0.025, 20]} /><primitive object={sedimentMat} attach="material" /></mesh>
        </group>

        <group ref={bubblesRef} visible={false}>
          {bubbleSeeds.map((_, i) => (
            <mesh key={i}><sphereGeometry args={[0.009, 6, 5]} /><primitive object={mBubble} attach="material" /></mesh>
          ))}
        </group>

        <group ref={precipRef} visible={false}>
          {precipSeeds.map((_, i) => (
            <mesh key={i}><sphereGeometry args={[0.011, 6, 5]} /><primitive object={precipMat} attach="material" /></mesh>
          ))}
        </group>

        <group ref={steamRef} visible={false}>
          {steamSeeds.map((_, i) => (
            <mesh key={i}><sphereGeometry args={[0.035, 6, 5]} /><primitive object={mSteam} attach="material" /></mesh>
          ))}
        </group>

        {/* Flame sits above the mouth */}
        <group ref={flameRef} position={[0, 0.16, 0]} visible={false}>
          <mesh position={[0, 0.1, 0]}><coneGeometry args={[0.055, 0.26, 12]} /><primitive object={mFlameOuter} attach="material" /></mesh>
          <mesh position={[0, 0.075, 0]}><coneGeometry args={[0.035, 0.18, 12]} /><primitive object={mFlameMid} attach="material" /></mesh>
          <mesh position={[0, 0.045, 0]}><coneGeometry args={[0.018, 0.09, 10]} /><primitive object={mFlameCore} attach="material" /></mesh>
        </group>

        <group ref={flashRef} position={[0, 0.02, 0]} visible={false}>
          <mesh><sphereGeometry args={[0.06, 12, 10]} /><primitive object={mFlash} attach="material" /></mesh>
        </group>

        <pointLight ref={lightRef} position={[0, 0.12, 0]} intensity={0} distance={3.2} decay={2} />
      </group>
    </group>
  );
}

/* ── Apparatus kept as scenery on the flanking benches ──────────── */
function BurnerBench() {
  return (
    <group position={[-3.2, TOP_Y, BENCH_Z]}>
      <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.09, 0.11, 0.02, 14]} /><primitive object={mSteel} attach="material" /></mesh>
      <mesh position={[0, 0.13, 0]}><cylinderGeometry args={[0.022, 0.026, 0.24, 10]} /><primitive object={mSteel} attach="material" /></mesh>
      <mesh position={[0.03, 0.06, 0]}><boxGeometry args={[0.02, 0.04, 0.02]} /><primitive object={mPipe} attach="material" /></mesh>
    </group>
  );
}

function TitrationBench() {
  return (
    <group position={[3.2, TOP_Y, BENCH_Z]}>
      <mesh position={[-0.2, 0.01, 0]}><boxGeometry args={[0.18, 0.02, 0.18]} /><primitive object={mSteel} attach="material" /></mesh>
      <mesh position={[-0.2, 0.3, 0]}><cylinderGeometry args={[0.012, 0.012, 0.6, 8]} /><primitive object={mSteel} attach="material" /></mesh>
      <mesh position={[-0.1, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <group position={[0, 0.44, 0]}>
        <mesh><cylinderGeometry args={[0.022, 0.022, 0.34, 12, 1, true]} /><primitive object={mGlass} attach="material" /></mesh>
        <mesh position={[0, -0.19, 0]}><cylinderGeometry args={[0.004, 0.002, 0.05, 6]} /><primitive object={mGlass} attach="material" /></mesh>
      </group>
      <mesh position={[0, 0.08, 0]}><coneGeometry args={[0.085, 0.17, 16, 1, true]} /><primitive object={mGlass} attach="material" /></mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SPECIMENS ON THE TABLE
   ══════════════════════════════════════════════════════════════════ */

/**
 * A Lab exhibit standing on a bench in the room.
 *
 * The exhibits are modelled at roughly 1 unit ≈ 1 cm and the room is in metres,
 * so nothing can be placed by hand - a molecule and a lattice are orders of
 * magnitude apart. This measures whatever it is handed and fits it to the space
 * above the table, which also means a new exhibit can be dropped in later
 * without anybody working out a scale factor for it.
 */
function TableSpecimen({
  id, at, size, layer, detail, knob, spin,
}: {
  id: string;
  at: [number, number, number];
  size: number;
  layer: LabLayer;
  detail: "normal" | "ultra";
  knob: number;
  spin: boolean;
}) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const turn = useRef<Group>(null);
  const [fit, setFit] = useState<{ s: number; lift: number } | null>(null);

  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    // Measure with the fitting transform removed, or we would be scaling a
    // number we ourselves produced last frame and drift toward zero.
    o.scale.setScalar(1);
    o.position.set(at[0], at[1], at[2]);
    o.updateWorldMatrix(true, true);
    const b = new Box3().setFromObject(i, true);
    if (b.isEmpty()) return;
    const span = new Vector3();
    b.getSize(span);
    const largest = Math.max(span.x, span.y, span.z);
    if (!largest || !Number.isFinite(largest)) return;
    const s = size / largest;
    // A model that measured badly must stay hidden rather than appear as a wall
    // of geometry the visitor is standing inside.
    if (!Number.isFinite(s) || s <= 0) return;
    setFit({ s, lift: -(b.min.y - at[1]) * s });
  }, [id, layer, knob, at, size]);

  useFrame((_, dt) => {
    if (spin && turn.current) turn.current.rotation.y += dt * 0.35;
  });

  return (
    <group
      ref={outer}
      position={[at[0], at[1] + (fit?.lift ?? 0) + 0.02, at[2]]}
      scale={fit?.s ?? 1}
      visible={fit !== null}
    >
      <group ref={turn}>
        <group ref={inner}>
          <TheSpecimen
            id={id}
            layer={layer}
            detail={detail}
            knob={knob}
            running
            selected={null}
            extracted={null}
            onPick={() => {}}
          />
        </group>
      </group>
    </group>
  );
}

/* ── Station markers ────────────────────────────────────────────── */
function StationMarker({ station, active }: { station: Station; active: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((st) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(st.clock.elapsedTime * 3) * 0.15;
    ref.current.scale.setScalar(active ? s * 1.25 : s);
  });
  return (
    <group ref={ref} position={station.at}>
      <mesh>
        <sphereGeometry args={[0.1, 10, 8]} />
        <primitive object={active ? mGlowActive : mGlowIdle} attach="material" />
      </mesh>
    </group>
  );
}

function DustParticles() {
  const ref = useRef<Group>(null);
  useFrame((st) => {
    if (ref.current) ref.current.rotation.y = st.clock.elapsedTime * 0.012;
  });
  const dots = useMemo(
    () => Array.from({ length: 36 }, () => [
      (Math.random() - 0.5) * W * 0.8,
      Math.random() * H * 0.7 + 0.6,
      (Math.random() - 0.5) * D * 0.8,
    ] as [number, number, number]), []
  );
  return (
    <group ref={ref} name="dust">
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.009, 4, 3]} /><primitive object={mSteam} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

const _tmpVec = new Vector3();
function ProximityTrigger({ onNear }: { onNear: (id: string | null) => void }) {
  const camera = useThree((s) => s.camera);
  const worldPosition = useRef(new Vector3());
  const prev = useRef<string | null>(null);
  useFrame(() => {
    camera.getWorldPosition(worldPosition.current);
    let closest: string | null = null;
    let best = 2.6;
    for (const s of STATIONS) {
      _tmpVec.set(s.at[0], s.at[1], s.at[2]);
      const d = worldPosition.current.distanceTo(_tmpVec);
      if (d < best) { best = d; closest = s.id; }
    }
    if (closest !== prev.current) {
      prev.current = closest;
      onNear(closest);
    }
  });
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCENE
   ══════════════════════════════════════════════════════════════════ */
export function ExperienceRoomScene({
  walkInput, ultra, onNear, mixCmd, onMixChange, slotA, slotB, slotC, slotD, views, discovered, onStep,
  onPickReagent, visibleReagents,
}: {
  walkInput: MutableRefObject<WalkInput>;
  ultra: boolean;
  onNear: (id: string | null) => void;
  mixCmd: MutableRefObject<Recipe | null>;
  onMixChange: (r: Recipe | null) => void;
  slotA: string | null;
  slotB: string | null;
  slotC: string | null;
  slotD: string | null;
  views: Record<string, { layer: LabLayer; knob: number; spin: boolean }>;
  discovered: string[];
  onStep?: () => void;
  onPickReagent?: (id: string) => void;
  visibleReagents?: Reagent[];
}) {
  const [near, setNear] = useState<string | null>(null);
  const solid = useRef<Group>(null);
  const mix = useRef<MixState>({ recipe: null, p: 0 });

  const bounds = useMemo(
    () => ({ minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.5, maxZ: D / 2 - 0.5 }), []
  );
  const start = useMemo(() => [0, 1.65, 2.5] as [number, number, number], []);

  const handleNear = (id: string | null) => {
    setNear(id);
    onNear(id);
  };

  return (
    <>
      <color attach="background" args={["#1a2e38"]} />
      <fog attach="fog" args={["#1a2e38", 11, 26]} />
      <ambientLight intensity={0.4} />
      {/* A sky/ground tint reads more like a real room than flat ambient alone */}
      <hemisphereLight args={["#cfe6f0", "#3d5058", 0.55]} />
      <pointLight position={[0, H - 0.4, 0]} intensity={ultra ? 3.6 : 2.8} distance={14} decay={2}
        color="#fff5e0" castShadow={ultra} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, H - 0.4, -3.2]} intensity={2.2} distance={10} decay={2} color="#fff5e0" />
      <pointLight position={[0, H - 0.4, 3.2]} intensity={2.2} distance={10} decay={2} color="#fff5e0" />

      <FirstPersonControls
        input={walkInput}
        start={start}
        startYaw={0}
        speed={2.8}
        eyeHeight={1.55}
        collision={solid}
        bounds={bounds}
        headBob
        onStep={onStep}
      />

      <group ref={solid} name="solid">
        <RoomShell />
        <Bench position={[-3.2, 0, BENCH_Z]} />
        <Bench position={[0, 0, BENCH_Z]} width={2.6} />
        <Bench position={[3.2, 0, BENCH_Z]} />
        <SideTable position={[-4.2, 0, 0]} />
        <SideTable position={[4.2, 0, 0]} />
        <Cabinet position={[W / 2 - 0.35, 1.2, -3]} />
        <Cabinet position={[W / 2 - 0.35, 1.2, -1]} />
      </group>

      <Windows />
      <Door />
      <Whiteboard discovered={discovered} />
      <SafetyKit />
      <BurnerBench />
      <TitrationBench />
      {[-3.2, 0, 3.2].map((x) => <Stool key={x} position={[x, 0, BENCH_Z + 1.5]} />)}
      <Stool position={[-4.2, 0, 1.0]} />
      <Stool position={[4.2, 0, 1.0]} />

      {[-3.2, 0, 3.2].map((z, i) => (
        <group key={i} position={[0, H - 0.12, z]}>
          <mesh><boxGeometry args={[2.4, 0.06, 0.3]} /><primitive object={mPipe} attach="material" /></mesh>
          <mesh position={[0, -0.04, 0]}><boxGeometry args={[2.2, 0.02, 0.22]} /><primitive object={mEmissive} attach="material" /></mesh>
        </group>
      ))}

      {/* ── The bench you actually work at ────────────────────────── */}
      <ReagentRack
        onPick={onPickReagent ?? (() => {})}
        slotA={slotA}
        slotB={slotB}
        slotC={slotC}
        slotD={slotD}
        visibleReagents={visibleReagents ?? REAGENTS}
      />
      <SlotVial x={-0.55} reagentId={slotA} />
      <SlotVial x={-0.18} reagentId={slotB} />
      {slotC && <SlotVial x={0.18} reagentId={slotC} />}
      {slotD && <SlotVial x={0.55} reagentId={slotD} />}
      <MixingVessel state={mix} />
      <MixController cmd={mixCmd} state={mix} onChange={onMixChange} />

      {/* ── Exhibits standing on their tables, in the room ────────── */}
      {STATIONS.filter((s) => s.model && views[s.id]).map((s) => (
        <TableSpecimen
          key={s.id}
          id={s.model!.id}
          at={s.model!.at}
          size={s.model!.size}
          layer={views[s.id].layer}
          detail={ultra ? "ultra" : "normal"}
          knob={views[s.id].knob}
          spin={views[s.id].spin}
        />
      ))}

      <ProximityTrigger onNear={handleNear} />
      {STATIONS.map((s) => (
        <StationMarker key={s.id} station={s} active={near === s.id} />
      ))}
      {ultra && <DustParticles />}
    </>
  );
}
