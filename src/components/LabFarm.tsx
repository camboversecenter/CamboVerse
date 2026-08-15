import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, InstancedMesh, Matrix4, Object3D, type Group, type Mesh } from "three";
import { Readout } from "./LabChemistry";
import type { MachineProps } from "./LabMachines";

/**
 * Agriculture and engineering — the shelf closest to how people here actually
 * live and work.
 *
 * Every other subject in the Lab explains something a student will meet in an
 * exam. This one explains machines they may already have in the village: a pump
 * somebody pedals to get water onto a dry field, and a pit that turns animal
 * waste into the gas a family cooks on. Both are cheap, both are widespread in
 * Cambodia, and both are almost never explained — they are just there.
 *
 * Units are the Lab's usual **1 unit ≈ 1 cm**.
 */

const STEEL = "#93a0aa";
const STEEL_DARK = "#5f6b76";
const BAMBOO = "#b48a4e";
const WATER = "#3f88b8";
const SLURRY = "#6b5a3a";
const EARTH = "#5a4a3c";
const GAS = "#cfe3a8";

function hl(isSel: boolean, anySel: boolean) {
  return {
    emissive: isSel ? "#ffd9a0" : "#000000",
    emissiveIntensity: isSel ? 0.45 : 0,
    transparent: anySel && !isSel,
    opacity: anySel && !isSel ? 0.35 : 1,
    depthWrite: !(anySel && !isSel),
  };
}

/* --------------------------------------------------------- treadle pump --- */

/**
 * A treadle pump: two cylinders, two pedals, and a person's weight.
 *
 * The mechanism is a pair of lift pumps worked alternately, which is why it can
 * deliver a steady flow instead of a pulse — one cylinder is always pushing
 * while the other is filling. Everything about it is deliberately simple enough
 * to repair in a village: no seals that cannot be re-cut, no parts that are not
 * pipe.
 *
 * The valves are the part worth watching. Each cylinder has one at the bottom
 * that only opens upward, so water that has been lifted cannot fall back. Take
 * those away and the whole thing moves water up and down and delivers nothing.
 */
export function TreadlePump({ layer, onPick, selected, running, knob }: MachineProps) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const jet = useRef<Mesh>(null);
  const t = useRef(0);

  const STROKE = 26;
  const litres = (knob / 100) * 90 + 10;    // a real treadle pump does 1–2 l/s

  useFrame((_, dt) => {
    if (running) t.current += dt * (0.4 + knob / 90);
    const a = t.current;
    const swing = Math.sin(a);
    if (beam.current) beam.current.rotation.z = swing * 0.19;
    if (left.current) left.current.position.y = 14 + swing * STROKE * 0.5;
    if (right.current) right.current.position.y = 14 - swing * STROKE * 0.5;
    // the spout only runs while a piston is on its delivery stroke
    if (jet.current) {
      const flow = Math.max(0, Math.abs(Math.cos(a))) * (running ? 1 : 0);
      jet.current.scale.set(1, Math.max(0.001, flow), 1);
      jet.current.visible = flow > 0.05;
    }
  });

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); onPick(id);
  };
  const any = !!selected;
  const cut = layer !== "whole";
  const pipesOnly = layer === "frame";

  return (
    <group position={[0, -20, 0]}>
      {/* the water being pumped from — a pond, a canal, a shallow well */}
      {!pipesOnly && (
        <mesh position={[0, -44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 120]} />
          <meshPhysicalMaterial color={WATER} roughness={0.18} transparent opacity={0.7}
            side={DoubleSide} />
        </mesh>
      )}

      {/* frame */}
      {!pipesOnly && [-1, 1].map((s) => (
        <mesh key={s} position={[s * 26, 12, 0]} onClick={pick("frame")} castShadow>
          <boxGeometry args={[4, 76, 4]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.5} metalness={0.6}
            {...hl(selected === "frame", any)} />
        </mesh>
      ))}

      {/* the two cylinders */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 13, 6, 0]} onClick={pick("cylinder")}>
          <cylinderGeometry args={[6.5, 6.5, 56, 20, 1, true]} />
          <meshPhysicalMaterial
            color={STEEL} roughness={0.35} metalness={0.7} side={DoubleSide}
            {...(cut
              ? { transparent: true, opacity: selected === "cylinder" ? 0.5 : 0.2, depthWrite: false }
              : hl(selected === "cylinder", any))}
          />
        </mesh>
      ))}

      {/* pistons and their rods, moving in opposition */}
      {([["left", left, -1], ["right", right, 1]] as const).map(([k, ref, s]) => (
        <group key={k} ref={ref} position={[s * 13, 14, 0]}>
          <mesh onClick={pick("piston")} castShadow>
            <cylinderGeometry args={[6.2, 6.2, 7, 18]} />
            <meshPhysicalMaterial color={BAMBOO} roughness={0.55}
              {...hl(selected === "piston", any)} />
          </mesh>
          <mesh position={[0, 22, 0]}>
            <cylinderGeometry args={[1.3, 1.3, 40, 10]} />
            <meshPhysicalMaterial color={STEEL_DARK} roughness={0.4} metalness={0.8}
              {...hl(selected === "piston", any)} />
          </mesh>
        </group>
      ))}

      {/* foot valves — the reason the water stays up */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 13, -21, 0]} onClick={pick("valve")}>
          <cylinderGeometry args={[5.6, 4.2, 4, 16]} />
          <meshPhysicalMaterial color="#b5563f" roughness={0.4} metalness={0.4}
            {...hl(selected === "valve", any)} />
        </mesh>
      ))}

      {/* suction pipes down into the water, and the delivery spout */}
      <group onClick={pick("pipes")}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 13, -34, 0]}>
            <cylinderGeometry args={[3.4, 3.4, 26, 14]} />
            <meshPhysicalMaterial color={STEEL_DARK} roughness={0.45} metalness={0.6}
              {...hl(selected === "pipes", any)} />
          </mesh>
        ))}
        <mesh position={[0, 34, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[3.4, 3.4, 26, 14]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.45} metalness={0.6}
            {...hl(selected === "pipes", any)} />
        </mesh>
        <mesh position={[16, 30, 0]}>
          <cylinderGeometry args={[3.4, 3.4, 12, 14]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.45} metalness={0.6}
            {...hl(selected === "pipes", any)} />
        </mesh>
      </group>

      {/* water leaving the spout, only while a piston is delivering */}
      <mesh ref={jet} position={[16, 12, 0]}>
        <cylinderGeometry args={[2.6, 3.4, 24, 12]} />
        <meshPhysicalMaterial color={WATER} roughness={0.12} transmission={0.6}
          thickness={2} transparent opacity={0.8} />
      </mesh>

      {/* the treadles somebody stands on */}
      {!pipesOnly && (
        <group ref={beam} position={[0, 50, 0]} onClick={pick("treadle")}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 22, s * 3.4, 0]} rotation={[0, 0, 0]} castShadow>
              <boxGeometry args={[52, 3, 11]} />
              <meshPhysicalMaterial color={BAMBOO} roughness={0.7}
                {...hl(selected === "treadle", any)} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[2.4, 2.4, 16, 12]} />
            <meshPhysicalMaterial color={STEEL_DARK} roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      )}

      <Readout at={[0, 84, 0]}>
        <b>{Math.round(litres)} litres a minute</b>
        <span>one person, no fuel, water lifted about 7 metres</span>
      </Readout>
      {cut && <Readout at={[-46, -22, 0]}>foot valve — opens upward only</Readout>}
    </group>
  );
}

/* ------------------------------------------------------------- digester --- */

/**
 * A household biogas digester: waste in one end, gas and fertiliser out the
 * other.
 *
 * This is the exhibit that ties the Lab together. What comes out of the pit is
 * methane — the same molecule that has its own exhibit — and burning it on the
 * stove is the same reaction as the "Making fire" experiment. A student can
 * follow one substance from a heap of manure to a blue flame under a pot
 * without leaving the Lab.
 *
 * Thousands of these are already buried behind Cambodian houses. Almost nobody
 * is ever shown what is happening inside one.
 */
export function BiogasDigester({ layer, detail, onPick, selected, running, knob }: MachineProps) {
  const bubbles = useRef<InstancedMesh>(null);
  const flame = useRef<Group>(null);
  const t = useRef(0);
  const COUNT = detail === "ultra" ? 40 : 18;

  const seeds = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => ({
      x: ((i * 37) % 100) / 100 - 0.5,
      z: ((i * 61) % 100) / 100 - 0.5,
      phase: ((i * 53) % 100) / 100,
      size: 0.7 + (((i * 29) % 100) / 100) * 0.9,
    })),
    [COUNT],
  );

  const dummy = useMemo(() => new Object3D(), []);
  const m = useMemo(() => new Matrix4(), []);

  useFrame((_, dt) => {
    if (running) t.current += dt * (0.15 + knob / 260);
    const mesh = bubbles.current;
    if (mesh) {
      seeds.forEach((s, i) => {
        const p = (t.current + s.phase) % 1;
        dummy.position.set(s.x * 44, -30 + p * 38, s.z * 44);
        dummy.scale.setScalar(s.size * (0.4 + p * 0.8));
        dummy.updateMatrix();
        m.copy(dummy.matrix);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (flame.current) {
      const f = running ? 1 + Math.sin(t.current * 26) * 0.14 : 0.001;
      flame.current.scale.setScalar(f);
      flame.current.visible = running;
    }
  });

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); onPick(id);
  };
  const any = !!selected;
  const cut = layer !== "whole";
  const m3 = (knob / 100) * 3 + 0.4;

  return (
    <group position={[0, -6, 0]}>
      {/* ground */}
      {!cut && (
        <mesh position={[0, 6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[210, 150]} />
          <meshStandardMaterial color={EARTH} roughness={1} />
        </mesh>
      )}

      {/* the buried tank: a dome over a pit */}
      <group onClick={pick("tank")}>
        <mesh position={[0, -18, 0]}>
          <cylinderGeometry args={[34, 30, 34, 28, 1, true]} />
          <meshPhysicalMaterial
            color="#8b8377" roughness={0.85} side={DoubleSide}
            {...(cut
              ? { transparent: true, opacity: 0.18, depthWrite: false }
              : hl(selected === "tank", any))}
          />
        </mesh>
        <mesh position={[0, -1, 0]}>
          <sphereGeometry args={[34, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#9a9184" roughness={0.85} side={DoubleSide}
            {...(cut
              ? { transparent: true, opacity: 0.18, depthWrite: false }
              : hl(selected === "tank", any))}
          />
        </mesh>
      </group>

      {/* slurry, and the gas collecting above it */}
      {cut && (
        <>
          <mesh position={[0, -22, 0]} onClick={pick("slurry")}>
            <cylinderGeometry args={[32, 29, 26, 24]} />
            <meshPhysicalMaterial
              color={SLURRY} roughness={0.8}
              {...hl(selected === "slurry", any)}
              transparent
              opacity={selected && selected !== "slurry" ? 0.3 : 0.85}
            />
          </mesh>
          <mesh position={[0, 4, 0]} onClick={pick("gas")}>
            <sphereGeometry args={[30, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial
              color={GAS} roughness={0.1}
              {...hl(selected === "gas", any)}
              transparent
              opacity={selected === "gas" ? 0.5 : 0.28}
            />
          </mesh>
          <instancedMesh ref={bubbles} args={[undefined, undefined, COUNT]}>
            <sphereGeometry args={[2.2, 8, 6]} />
            <meshPhysicalMaterial color={GAS} roughness={0.05} transparent opacity={0.75} />
          </instancedMesh>
        </>
      )}

      {/* inlet, where the waste goes in */}
      <group onClick={pick("inlet")}>
        <mesh position={[-46, 2, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[7, 7, 34, 14]} />
          <meshPhysicalMaterial color="#8b8377" roughness={0.85}
            {...hl(selected === "inlet", any)} />
        </mesh>
      </group>

      {/* outlet, where the fertiliser comes out */}
      <group onClick={pick("outlet")}>
        <mesh position={[46, 2, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[7, 7, 34, 14]} />
          <meshPhysicalMaterial color="#8b8377" roughness={0.85}
            {...hl(selected === "outlet", any)} />
        </mesh>
      </group>

      {/* gas pipe up to a stove */}
      <group onClick={pick("stove")}>
        <mesh position={[0, 30, 0]}>
          <cylinderGeometry args={[2.2, 2.2, 34, 12]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.4} metalness={0.7}
            {...hl(selected === "stove", any)} />
        </mesh>
        <mesh position={[26, 47, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[2.2, 2.2, 52, 12]} />
          <meshPhysicalMaterial color={STEEL_DARK} roughness={0.4} metalness={0.7}
            {...hl(selected === "stove", any)} />
        </mesh>
        <mesh position={[52, 42, 0]} castShadow>
          <cylinderGeometry args={[12, 13, 8, 20]} />
          <meshPhysicalMaterial color={STEEL} roughness={0.45} metalness={0.6}
            {...hl(selected === "stove", any)} />
        </mesh>
      </group>

      {/* the flame it is all for */}
      <group ref={flame} position={[52, 48, 0]}>
        {[
          { r: 7, h: 16, c: "#5aa8ff", o: 0.55 },
          { r: 3.6, h: 10, c: "#c9e6ff", o: 0.85 },
        ].map((f, i) => (
          <mesh key={i} position={[0, f.h * 0.4, 0]}>
            <coneGeometry args={[f.r, f.h, 12]} />
            <meshBasicMaterial color={f.c} transparent opacity={f.o} depthWrite={false} />
          </mesh>
        ))}
        <pointLight color="#7ec0ff" intensity={900} distance={130} decay={2} />
      </group>

      <Readout at={[0, 82, 0]}>
        <b>{m3.toFixed(1)} m³ of gas a day</b>
        <span>enough to cook {Math.max(1, Math.round(m3 * 2))} meals for a family</span>
      </Readout>
      {cut && <Readout at={[-58, -34, 0]}>bacteria at work, no air</Readout>}
    </group>
  );
}
