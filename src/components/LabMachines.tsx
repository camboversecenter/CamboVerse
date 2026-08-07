import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  BufferGeometry, CylinderGeometry, DoubleSide, Group, Mesh, Shape, ExtrudeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Detail } from "./LabOrgans";
import type { LabLayer } from "../lab";

/**
 * Machines for the 🔬 Learning Lab.
 *
 * Organs are soft and continuous; machines are hard, repetitive and — the part
 * that matters — **they move**. A four-stroke engine standing still is a
 * cross-section in a textbook. Almost everything it has to teach is *sequence*:
 * which valve is open, which way the crank is turning, what the piston is doing
 * while that happens. So every machine here takes a `running` flag and animates
 * itself, and every one draws its own readout in the scene beside the part that
 * is changing rather than in a table somewhere else.
 *
 * Units are the Lab's usual **1 unit ≈ 1 cm**.
 */

export type MachineProps = {
  layer: LabLayer;
  detail: Detail;
  onPick: (id: string) => void;
  selected: string | null;
  running: boolean;
  /** The exhibit's single adjustable number, from the panel slider. */
  knob: number;
};

const STEEL = "#8e99a4";
const STEEL_DARK = "#5d6873";
const BRASS = "#c9a349";
const PAINT = "#b23a34";
const WOOD = "#a9784a";
const GROUND = "#3c4750";

/** The selected part lifts; everything else steps back. Same language as the body. */
function hl(isSel: boolean, anySel: boolean) {
  return {
    emissive: isSel ? "#ffd9a0" : "#000000",
    emissiveIntensity: isSel ? 0.45 : 0,
    transparent: anySel && !isSel,
    opacity: anySel && !isSel ? 0.35 : 1,
    depthWrite: !(anySel && !isSel),
  };
}

/** A number floating beside the thing it describes. */
function Readout({ at, children }: { at: [number, number, number]; children: React.ReactNode }) {
  return (
    <Html position={at} center occlude={false} zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}>
      <div className="lab-readout">{children}</div>
    </Html>
  );
}

/* ----------------------------------------------------------------- lever --- */

/**
 * A lever, with the fulcrum where the student puts it.
 *
 * The whole of mechanical advantage is in one relationship — how far the effort
 * is from the pivot versus how far the load is — and it is far more convincing
 * to slide the fulcrum and watch the number fall than to be told the formula.
 * The beam tilts to whichever side is winning, so an unbalanced lever *looks*
 * unbalanced.
 */
export function Lever({ layer, onPick, selected, running, knob }: MachineProps) {
  const beam = useRef<Group>(null);
  const t = useRef(0);

  const BEAM = 120;                       // cm, end to end
  const LOAD_N = 100;                     // the weight on the left, in newtons
  const fulcrum = knob;                   // cm from the left end
  const loadArm = Math.max(1, fulcrum);
  const effortArm = Math.max(1, BEAM - fulcrum);
  const advantage = effortArm / loadArm;
  const effortN = LOAD_N / advantage;

  useFrame((_, dt) => {
    if (running) t.current += dt;
    const g = beam.current;
    if (!g) return;
    // The beam settles toward the side that is winning, and rocks a little while
    // it runs so it reads as a balance rather than a fixed diagram.
    const bias = Math.max(-0.22, Math.min(0.22, (effortN - LOAD_N) / 400));
    const rock = running ? Math.sin(t.current * 1.6) * 0.05 : 0;
    const target = bias + rock;
    g.rotation.z += (target - g.rotation.z) * (1 - Math.exp(-dt * 6));
  });

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); onPick(id);
  };
  const any = !!selected;
  const showForces = layer !== "whole";

  return (
    <group>
      {/* ground */}
      <mesh position={[0, -13, 0]} receiveShadow>
        <boxGeometry args={[150, 3, 44]} />
        <meshStandardMaterial color={GROUND} roughness={0.95} />
      </mesh>

      {/* fulcrum — moves with the slider */}
      <group position={[fulcrum - BEAM / 2, 0, 0]}>
        <mesh position={[0, -6, 0]} onClick={pick("fulcrum")} castShadow>
          <cylinderGeometry args={[0.6, 9, 11.5, 4]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.45} metalness={0.7}
            {...hl(selected === "fulcrum", any)} />
        </mesh>
        <Readout at={[0, -17, 0]}>{fulcrum} cm</Readout>
      </group>

      {/* the beam, and what sits on each end */}
      <group ref={beam} position={[fulcrum - BEAM / 2, 0.6, 0]}>
        <mesh position={[BEAM / 2 - fulcrum, 0, 0]} onClick={pick("beam")} castShadow>
          <boxGeometry args={[BEAM, 2.6, 9]} />
          <meshPhysicalMaterial color={WOOD} roughness={0.75}
            {...hl(selected === "beam", any)} />
        </mesh>

        <group position={[-fulcrum, 5.5, 0]} onClick={pick("load")}>
          <mesh castShadow>
            <boxGeometry args={[13, 9, 13]} />
            <meshPhysicalMaterial color={PAINT} roughness={0.6}
              {...hl(selected === "load", any)} />
          </mesh>
          {showForces && <Readout at={[0, 11, 0]}>load {LOAD_N} N</Readout>}
        </group>

        <group position={[BEAM - fulcrum, 4.5, 0]} onClick={pick("effort")}>
          <mesh castShadow>
            <cylinderGeometry args={[3.4, 3.4, 7, 16]} />
            <meshPhysicalMaterial color={BRASS} roughness={0.35} metalness={0.75}
              {...hl(selected === "effort", any)} />
          </mesh>
          {showForces && <Readout at={[0, 10, 0]}>effort {effortN.toFixed(0)} N</Readout>}
        </group>
      </group>

      <Readout at={[0, -26, 0]}>
        <b>{advantage.toFixed(1)}× advantage</b>
        <span>{loadArm} cm load arm · {effortArm} cm effort arm</span>
      </Readout>
    </group>
  );
}

/* ------------------------------------------------------------ gear train --- */

/** A spur gear: a disc with `teeth` teeth standing off its rim. */
function gearGeometry(teeth: number, radius: number, thick: number, seg: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  // CylinderGeometry is indexed and ExtrudeGeometry is not, and mergeGeometries
  // refuses a mix. Drop the index rather than build one.
  const hub = new CylinderGeometry(radius, radius, thick, Math.max(16, seg));
  hub.rotateX(Math.PI / 2);
  parts.push(hub.toNonIndexed());
  hub.dispose();
  const toothW = (Math.PI * 2 * radius) / teeth * 0.45;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const shape = new Shape();
    const h = radius * 0.16;
    shape.moveTo(-toothW / 2, 0);
    shape.lineTo(toothW / 2, 0);
    shape.lineTo(toothW * 0.32, h);
    shape.lineTo(-toothW * 0.32, h);
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    g.translate(0, radius - 0.1, -thick / 2);
    g.rotateZ(-a);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false) ?? new BufferGeometry();
  for (const p of parts) p.dispose();
  return merged;
}

/**
 * Three meshed gears.
 *
 * Two things a still picture cannot show, and this can: neighbouring gears turn
 * in **opposite** directions, and a small gear driving a large one turns many
 * times for each turn of the large one. The idler in the middle is there to make
 * the first point unmissable — the output turns the same way as the input, which
 * surprises people until they count the reversals.
 */
export function GearTrain({ layer, detail, onPick, selected, running }: MachineProps) {
  const seg = detail === "ultra" ? 40 : 20;
  const A = { teeth: 10, r: 9 };
  const B = { teeth: 20, r: 18 };
  const C = { teeth: 30, r: 27 };

  const gA = useMemo(() => gearGeometry(A.teeth, A.r, 6, seg), [seg]);
  const gB = useMemo(() => gearGeometry(B.teeth, B.r, 6, seg), [seg]);
  const gC = useMemo(() => gearGeometry(C.teeth, C.r, 6, seg), [seg]);

  const rA = useRef<Mesh>(null);
  const rB = useRef<Mesh>(null);
  const rC = useRef<Mesh>(null);

  useFrame((_, dt) => {
    if (!running) return;
    const w = dt * 1.1;                       // the driver's speed
    if (rA.current) rA.current.rotation.z += w;
    // Meshed gears turn opposite ways, at speeds inverse to their tooth counts.
    if (rB.current) rB.current.rotation.z -= w * (A.teeth / B.teeth);
    if (rC.current) rC.current.rotation.z += w * (A.teeth / C.teeth);
  });

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); onPick(id);
  };
  const any = !!selected;
  const xB = A.r + B.r;
  const xC = xB + B.r + C.r;

  return (
    <group position={[-xC / 2, 0, 0]}>
      {layer !== "frame" && (
        <mesh position={[xC / 2, 0, -6]} receiveShadow>
          <boxGeometry args={[xC + 70, 84, 3]} />
          <meshStandardMaterial color={GROUND} roughness={0.9} />
        </mesh>
      )}

      {[
        { id: "driver", ref: rA, geo: gA, x: 0, spec: A, color: PAINT },
        { id: "idler", ref: rB, geo: gB, x: xB, spec: B, color: STEEL },
        { id: "driven", ref: rC, geo: gC, x: xC, spec: C, color: BRASS },
      ].map((g) => (
        <group key={g.id} position={[g.x, 0, 0]} onClick={pick(g.id)}>
          <mesh ref={g.ref as never} geometry={g.geo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={g.color} roughness={0.34} metalness={0.72}
              {...hl(selected === g.id, any)}
            />
          </mesh>
          {layer !== "whole" && (
            <mesh>
              <cylinderGeometry args={[1.4, 1.4, 16, 12]} />
              <meshPhysicalMaterial color={STEEL_DARK} roughness={0.4} metalness={0.8} />
            </mesh>
          )}
          <Readout at={[0, -g.spec.r - 7, 0]}>{g.spec.teeth} teeth</Readout>
        </group>
      ))}

      <Readout at={[xC / 2, -56, 0]}>
        <b>{A.teeth}:{C.teeth} — output turns {(C.teeth / A.teeth).toFixed(0)}× slower</b>
        <span>and the same way round, because the idler reverses it twice</span>
      </Readout>
    </group>
  );
}

/* ---------------------------------------------------------------- engine --- */

const STROKES = ["Intake", "Compression", "Power", "Exhaust"] as const;

/**
 * A single-cylinder four-stroke engine.
 *
 * The best argument in the Lab for animating a machine. Four strokes over **two**
 * turns of the crankshaft, with the valves opening on one stroke each — a
 * sequence that is genuinely hard to hold in your head from a diagram and
 * obvious after ten seconds of watching.
 *
 * The stroke names appear beside the cylinder as they happen, so the label and
 * the motion teach each other.
 */
export function Engine({ layer, detail, onPick, selected, running, knob }: MachineProps) {
  const seg = detail === "ultra" ? 28 : 14;
  const crank = useRef<Group>(null);
  const piston = useRef<Group>(null);
  const rod = useRef<Group>(null);
  const valveIn = useRef<Group>(null);
  const valveEx = useRef<Group>(null);
  const angle = useRef(0);
  // The stroke name is the lesson, so it lives in React state and re-renders
  // when it changes — four times per cycle, which is nothing.
  const [stroke, setStroke] = useState(0);
  const strokeRef = useRef(0);

  const STROKE_LEN = 16;      // cm of piston travel
  const CRANK_R = STROKE_LEN / 2;
  const ROD = 28;

  useFrame((_, dt) => {
    if (running) angle.current += dt * (0.6 + knob / 900) * Math.PI;
    const a = angle.current;

    // piston position from crank angle — the real relationship, not a sine wave
    const y = CRANK_R * Math.cos(a) + Math.sqrt(ROD * ROD - (CRANK_R * Math.sin(a)) ** 2);
    if (piston.current) piston.current.position.y = y - ROD + 6;
    if (crank.current) crank.current.rotation.z = -a;
    if (rod.current) {
      const px = 0;
      const py = y - ROD + 6;
      const cx = Math.sin(a) * CRANK_R;
      const cy = -18 + Math.cos(a) * CRANK_R;
      rod.current.position.set((px + cx) / 2, (py + cy) / 2, 0);
      rod.current.rotation.z = Math.atan2(cy - py, cx - px) - Math.PI / 2;
      const len = Math.hypot(cx - px, cy - py);
      rod.current.scale.y = len / ROD;
    }

    // four strokes over two revolutions
    const phase = ((a / (Math.PI * 2)) % 2 + 2) % 2;
    const s = Math.floor(phase * 2) % 4;
    if (s !== strokeRef.current) { strokeRef.current = s; setStroke(s); }
    const open = (want: number) => (s === want ? 1 : 0);
    if (valveIn.current) {
      valveIn.current.position.y += (26 - open(0) * 2.6 - valveIn.current.position.y) * (1 - Math.exp(-dt * 12));
    }
    if (valveEx.current) {
      valveEx.current.position.y += (26 - open(3) * 2.6 - valveEx.current.position.y) * (1 - Math.exp(-dt * 12));
    }
  });

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); onPick(id);
  };
  const any = !!selected;
  const cut = layer !== "whole";

  return (
    <group position={[0, 4, 0]}>
      {/* the block — solid when whole, a shell you see into when cut away */}
      {layer !== "frame" && (
        <mesh position={[0, 6, 0]} onClick={pick("block")} castShadow>
          <boxGeometry args={[22, 40, 20]} />
          <meshPhysicalMaterial
            color={STEEL} roughness={0.45} metalness={0.6}
            side={cut ? DoubleSide : undefined}
            {...(cut
              ? { transparent: true, opacity: 0.16, depthWrite: false }
              : hl(selected === "block", any))}
          />
        </mesh>
      )}

      {/* cylinder bore */}
      <mesh position={[0, 8, 0]} onClick={pick("cylinder")}>
        <cylinderGeometry args={[7.2, 7.2, 30, seg, 1, true]} />
        <meshPhysicalMaterial
          color={STEEL_DARK} roughness={0.3} metalness={0.8} side={DoubleSide}
          {...(cut
            ? { transparent: true, opacity: selected === "cylinder" ? 0.55 : 0.22, depthWrite: false }
            : hl(selected === "cylinder", any))}
        />
      </mesh>

      {/* piston */}
      <group ref={piston} onClick={pick("piston")}>
        <mesh castShadow>
          <cylinderGeometry args={[6.9, 6.9, 9, seg]} />
          <meshPhysicalMaterial color={BRASS} roughness={0.3} metalness={0.85}
            {...hl(selected === "piston", any)} />
        </mesh>
      </group>

      {/* connecting rod */}
      <group ref={rod} onClick={pick("rod")}>
        <mesh castShadow>
          <boxGeometry args={[3, ROD, 2.4]} />
          <meshPhysicalMaterial color={STEEL} roughness={0.35} metalness={0.8}
            {...hl(selected === "rod", any)} />
        </mesh>
      </group>

      {/* crankshaft */}
      <group ref={crank} position={[0, -18, 0]} onClick={pick("crank")}>
        <mesh>
          <cylinderGeometry args={[3.4, 3.4, 9, seg]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.35} metalness={0.85}
            {...hl(selected === "crank", any)} />
        </mesh>
        <mesh position={[0, CRANK_R, 0]}>
          <boxGeometry args={[3, CRANK_R * 2, 8]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.35} metalness={0.85}
            {...hl(selected === "crank", any)} />
        </mesh>
      </group>

      {/* valves — the one that matters is the one that is open */}
      {[
        { id: "intake", ref: valveIn, x: -4.2, color: "#4a86b4" },
        { id: "exhaust", ref: valveEx, x: 4.2, color: "#b4574a" },
      ].map((v) => (
        <group key={v.id} ref={v.ref as never} position={[v.x, 26, 0]} onClick={pick(v.id)}>
          <mesh>
            <cylinderGeometry args={[0.9, 0.9, 14, 10]} />
            <meshPhysicalMaterial color={STEEL} roughness={0.3} metalness={0.85}
              {...hl(selected === v.id, any)} />
          </mesh>
          <mesh position={[0, -7.4, 0]}>
            <cylinderGeometry args={[3.1, 2.4, 1.6, 12]} />
            <meshPhysicalMaterial color={v.color} roughness={0.3} metalness={0.8}
              {...hl(selected === v.id, any)} />
          </mesh>
        </group>
      ))}

      {/* spark plug */}
      <group position={[0, 30, 0]} onClick={pick("plug")}>
        <mesh castShadow>
          <cylinderGeometry args={[1.5, 1.5, 6, 12]} />
          <meshPhysicalMaterial color="#d8d2c4" roughness={0.5}
            {...hl(selected === "plug", any)} />
        </mesh>
      </group>

      <Readout at={[0, -42, 0]}>
        <b>{STROKES[stroke]}</b>
        <span>stroke {stroke + 1} of 4 · two crank turns per cycle</span>
      </Readout>
    </group>
  );
}
