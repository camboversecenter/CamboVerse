import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { MathUtils } from "three";

/**
 * A procedural, articulated Kun Khmer boxer built entirely from primitives —
 * no external model, so it costs nothing to download and runs on a low-end
 * phone. It demonstrates each of the seven techniques by lerping its joint
 * rotations toward a per-move target pose, striking on a trigger and returning
 * to a bouncing fighting stance. A `hurt` pose lets it recoil when struck, so
 * two fighters can spar in the ring.
 *
 * `move` selects the technique (or `guard`/`hurt`); `trigger` is a counter —
 * increment it to replay the current pose. `facing` turns the fighter to face
 * its opponent. This mirrors the two-fighter ring of the CamboVerse "Kun Khmer
 * Fight 3D" reference (Apache-2.0, camboversecenter/kunkhmer).
 */
export interface Palette {
  skin: string;
  trunk: string;
  glove: string;
  band: string;
}

const RED: Palette = { skin: "#c98a5a", trunk: "#e0562f", glove: "#e0562f", band: "#d9b44a" };
const BLUE: Palette = { skin: "#b07d52", trunk: "#2f6ae0", glove: "#2f6ae0", band: "#cfd6e0" };
export const PALETTES = { red: RED, blue: BLUE };

// A single strike lasts ~STRIKE seconds: extend on the way out, retract back.
const STRIKE = 0.62;

interface Joints {
  root: Group | null;
  torso: Group | null;
  hips: Group | null;
  lShoulder: Group | null;
  lElbow: Group | null;
  rShoulder: Group | null;
  rElbow: Group | null;
  lHip: Group | null;
  lKnee: Group | null;
  rHip: Group | null;
  rKnee: Group | null;
}

/** Target joint angles (radians) for a given move at extension `e` (0..1). */
function poseFor(move: string, e: number): Record<keyof Joints, [number, number, number]> {
  // Neutral guard: fists up by the face, slight forward lean, knees soft.
  const P: Record<keyof Joints, [number, number, number]> = {
    root: [0, 0, 0],
    torso: [0.05, 0, 0],
    hips: [0, 0, 0],
    lShoulder: [-1.15, 0, 0.5],
    lElbow: [-1.9, 0, 0],
    rShoulder: [-1.15, 0, -0.5],
    rElbow: [-1.9, 0, 0],
    lHip: [0.12, 0, 0.12],
    lKnee: [-0.28, 0, 0],
    rHip: [0.12, 0, -0.12],
    rKnee: [-0.28, 0, 0],
  };

  switch (move) {
    case "mat": // straight punch — right cross drives forward, hips rotate
      P.rShoulder = [-1.5 - e * 0.1, 0, -0.15 + e * 0.15];
      P.rElbow = [-1.9 + e * 1.85, 0, 0];
      P.torso = [0.05, -e * 0.5, 0];
      P.hips = [0, -e * 0.35, 0];
      break;
    case "mokkeng": // uppercut — right fist rises from below
      P.torso = [0.05 - e * 0.15, -e * 0.25, 0];
      P.rShoulder = [-0.5 - e * 0.9, 0, -0.35];
      P.rElbow = [-2.3, 0, 0];
      P.hips = [0, -e * 0.2, 0];
      break;
    case "ti": // roundhouse kick — right leg swings out and up
      P.root = [0, 0, -e * 0.28];
      P.torso = [0.05, 0, e * 0.45];
      P.rHip = [-0.2, -e * 0.5, -0.2 - e * 1.15];
      P.rKnee = [-0.28 + e * 0.2, 0, 0];
      P.lHip = [0.12 + e * 0.15, 0, 0.12];
      P.lShoulder = [-1.15, 0, 0.9]; // arm out for balance
      break;
    case "sok": // elbow strike — horizontal, arm folded tight
      P.rShoulder = [-1.6, -e * 0.7, -0.2];
      P.rElbow = [-2.5, 0, 0];
      P.torso = [0.05, -e * 0.6, 0];
      P.hips = [0, -e * 0.4, 0];
      break;
    case "kumpleang": // knee — right knee drives up into the clinch
      P.torso = [0.05 + e * 0.28, 0, 0];
      P.rHip = [0.12 + e * 1.5, 0, -0.12];
      P.rKnee = [-0.28 - e * 1.5, 0, 0];
      P.lShoulder = [-1.3, 0, 0.35]; // hands pull down (clinch)
      P.rShoulder = [-1.3, 0, -0.35];
      break;
    case "rung": // block — high tight guard, both fists to the face
      P.lShoulder = [-1.7, 0, 0.35];
      P.lElbow = [-2.4, 0, 0];
      P.rShoulder = [-1.7, 0, -0.35];
      P.rElbow = [-2.4, 0, 0];
      P.torso = [0.18 * e + 0.05, 0, 0];
      break;
    case "romiel": // dodge — lean and roll the torso to the side
      P.root = [0, 0, e * 0.4];
      P.torso = [0.05 + e * 0.2, e * 0.4, e * 0.3];
      P.hips = [0, e * 0.2, 0];
      break;
    case "hurt": // struck — snap back, guard breaks open
      P.root = [0, 0, -e * 0.12];
      P.torso = [0.05 - e * 0.55, e * 0.2, -e * 0.18];
      P.lShoulder = [-0.8 + e * 0.2, 0, 0.7];
      P.rShoulder = [-0.8 + e * 0.2, 0, -0.7];
      P.lElbow = [-1.5, 0, 0];
      P.rElbow = [-1.5, 0, 0];
      break;
    // "guard" (or any unknown id) → neutral fighting stance above.
  }
  return P;
}

export function Fighter({
  move,
  trigger,
  facing = 0,
  palette = "red",
  position = [0, 0, 0],
}: {
  move: string;
  trigger: number;
  facing?: number;
  palette?: keyof typeof PALETTES;
  position?: [number, number, number];
}) {
  const pal = PALETTES[palette];
  const j = useRef<Joints>({
    root: null, torso: null, hips: null,
    lShoulder: null, lElbow: null, rShoulder: null, rElbow: null,
    lHip: null, lKnee: null, rHip: null, rKnee: null,
  });

  // Strike timeline: reset to 0 whenever the trigger changes, then count up.
  const t = useRef(STRIKE); // start finished (idle)
  const lastTrigger = useRef(trigger);
  const clock = useRef(0);

  useFrame((_, dt) => {
    if (trigger !== lastTrigger.current) {
      lastTrigger.current = trigger;
      t.current = 0;
    }
    t.current = Math.min(STRIKE, t.current + dt);
    clock.current += dt;

    // Extension follows a smooth out-and-back: 0 → 1 → 0.
    const phase = t.current / STRIKE; // 0..1
    const e = Math.sin(Math.min(phase, 1) * Math.PI); // 0 at ends, 1 mid-strike

    const target = poseFor(move, e);
    const cur = j.current;
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent lerp factor

    // Idle bounce: a gentle bob and sway when not mid-strike.
    const idle = 1 - e;
    const bob = Math.sin(clock.current * 3.4) * 0.04 * idle;
    const sway = Math.sin(clock.current * 1.7) * 0.05 * idle;

    (Object.keys(target) as (keyof Joints)[]).forEach((name) => {
      const g = cur[name];
      if (!g) return;
      let [rx, ry, rz] = target[name];
      if (name === "torso") ry += sway;
      g.rotation.x = MathUtils.lerp(g.rotation.x, rx, k);
      g.rotation.y = MathUtils.lerp(g.rotation.y, ry, k);
      g.rotation.z = MathUtils.lerp(g.rotation.z, rz, k);
    });
    // Footwork along the fighter's forward axis (local +z faces the opponent):
    // striking techniques step in to close the distance, a struck fighter is
    // knocked back, and guard/block/dodge hold their ground.
    const striking = move !== "hurt" && move !== "rung" && move !== "romiel" && move !== "guard";
    const lunge = move === "hurt" ? -0.18 * e : striking ? 0.34 * e : 0;
    if (cur.root) {
      cur.root.position.y = MathUtils.lerp(cur.root.position.y, bob, k);
      cur.root.position.z = MathUtils.lerp(cur.root.position.z, lunge, k);
    }
  });

  const set = (name: keyof Joints) => (el: Group | null) => {
    j.current[name] = el;
  };

  // Limb builder: an upper segment pivoting at the shoulder/hip, with a lower
  // segment pivoting at the elbow/knee, ending in a fist/foot.
  const limb = (
    upperRef: (el: Group | null) => void,
    lowerRef: (el: Group | null) => void,
    upperLen: number,
    lowerLen: number,
    endColor: string,
  ) => (
    <group ref={upperRef}>
      <mesh position={[0, -upperLen / 2, 0]} castShadow>
        <capsuleGeometry args={[0.075, upperLen, 4, 8]} />
        <meshStandardMaterial color={pal.skin} roughness={0.7} />
      </mesh>
      <group position={[0, -upperLen, 0]} ref={lowerRef}>
        <mesh position={[0, -lowerLen / 2, 0]} castShadow>
          <capsuleGeometry args={[0.07, lowerLen, 4, 8]} />
          <meshStandardMaterial color={pal.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, -lowerLen - 0.02, 0]} castShadow>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color={endColor} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group position={position} rotation={[0, facing, 0]}>
      <group ref={set("root")}>
        {/* Legs hang from the hips. */}
        <group position={[0, 0.92, 0]} ref={set("hips")}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.26, 0.24]} />
            <meshStandardMaterial color={pal.trunk} roughness={0.7} />
          </mesh>
          <group position={[-0.14, -0.1, 0]}>
            {limb(set("lHip"), set("lKnee"), 0.44, 0.42, pal.skin)}
          </group>
          <group position={[0.14, -0.1, 0]}>
            {limb(set("rHip"), set("rKnee"), 0.44, 0.42, pal.skin)}
          </group>

          {/* Torso pivots at the waist; arms + head ride on it. */}
          <group position={[0, 0.13, 0]} ref={set("torso")}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <capsuleGeometry args={[0.19, 0.4, 6, 12]} />
              <meshStandardMaterial color={pal.skin} roughness={0.75} />
            </mesh>
            {/* Head with a simple mongkol headband. */}
            <group position={[0, 0.72, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.16, 16, 16]} />
                <meshStandardMaterial color={pal.skin} roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.15, 0.03, 8, 20]} />
                <meshStandardMaterial color={pal.band} roughness={0.5} />
              </mesh>
            </group>
            {/* Arms — fists wrapped (katt chieng), rendered as gloves. */}
            <group position={[-0.24, 0.5, 0]}>
              {limb(set("lShoulder"), set("lElbow"), 0.3, 0.3, pal.glove)}
            </group>
            <group position={[0.24, 0.5, 0]}>
              {limb(set("rShoulder"), set("rElbow"), 0.3, 0.3, pal.glove)}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
