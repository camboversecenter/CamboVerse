import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { KhmerGame } from '../games';
const SARONGS = ['#b65c47','#467b9c','#6e8f54','#c4a162','#927698','#b87b55','#65a59a'];
const SceneDetail = createContext({ ultra: false, motion: false });

export function GameScene({ game, ultra, motion }: { game: KhmerGame; ultra: boolean; motion: boolean }) {
  return <SceneDetail.Provider value={{ ultra, motion }}><SceneObjects game={game} /></SceneDetail.Provider>;
}
function AnimatedProp({ children, mode, position = [0, 0, 0], offset = 0 }: { children: ReactNode; mode: 'pot' | 'hop' | 'scarf'; position?: [number, number, number]; offset?: number }) {
  const ref = useRef<Group>(null);
  const { motion } = useContext(SceneDetail);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = motion ? clock.elapsedTime + offset : 0;
    if (mode === 'pot') ref.current.rotation.z = motion ? Math.sin(time * 1.5) * .13 : 0;
    if (mode === 'hop') ref.current.position.y = position[1] + (motion ? Math.abs(Math.sin(time * 2.4)) * .15 : 0);
    if (mode === 'scarf') { ref.current.position.x = position[0] + (motion ? Math.sin(time * .8) * 1.3 : 0); ref.current.position.y = position[1] + (motion ? Math.cos(time * 1.6) * .3 : 0); }
  });
  return <group ref={ref} position={position}>{children}</group>;
}
export function FestivalGround({ ultra }: { ultra: boolean }) {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[25, ultra ? 64 : 24]} /><meshStandardMaterial color="#91a47a" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]} receiveShadow><circleGeometry args={[5.1, ultra ? 64 : 32]} /><meshStandardMaterial color="#cdbb92" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, 0]}><ringGeometry args={[4.9, 5, 48]} /><meshBasicMaterial color="#eee3bd" /></mesh>
    {[-5, 5].map(x => <mesh key={x} position={[x, 1.6, -3.7]} castShadow={ultra}><cylinderGeometry args={[.045, .065, 3.2, 8]} /><meshStandardMaterial color="#816c4a" /></mesh>)}
    <mesh position={[0, 2.98, -3.7]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.009, .009, 10, 5]} /><meshStandardMaterial color="#827251" /></mesh>
    {Array.from({ length: 15 }, (_, i) => <mesh key={i} position={[-4.6 + i * .65, 2.8, -3.7]} rotation={[0, 0, Math.PI]}><coneGeometry args={[.17, .35, 3]} /><meshStandardMaterial color={SARONGS[i % SARONGS.length]} /></mesh>)}
    {[[-7, -4], [-5, -8], [6, -7], [8, 1]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow={ultra}><cylinderGeometry args={[.14, .23, 2.4, 7]} /><meshStandardMaterial color="#786748" /></mesh>
      <mesh position={[0, 2.7, 0]} castShadow={ultra}><icosahedronGeometry args={[1.35, ultra ? 2 : 0]} /><meshStandardMaterial color={i % 2 ? '#6b8d5a' : '#7c995e'} roughness={1} /></mesh>
    </group>)}
  </group>;
}
/** A simple festival-goer: sarong, torso, head. */
function Person({
  position,
  rotation = 0,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  color: string;
  scale?: number;
}) {
  const { ultra } = useContext(SceneDetail);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.22, 0.56, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.26, 4, 8]} />
        <meshStandardMaterial color="#7c5b3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.14, ultra ? 20 : 10, ultra ? 16 : 8]} />
        <meshStandardMaterial color="#c98a5a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.065, -.015]}><sphereGeometry args={[.14, ultra ? 16 : 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#302d28" /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * .17, .73, .015]} rotation={[0, 0, side * .13]}><capsuleGeometry args={[.044, .22, 3, 6]} /><meshStandardMaterial color="#c98a5a" roughness={.8} /></mesh>
        <mesh position={[side * .09, .035, .055]}><boxGeometry args={[.11, .07, .19]} /><meshStandardMaterial color="#775944" /></mesh>
      </group>)}
    </group>
  );
}

/** A ring of onlookers around the play area. */
function Crowd({ count = 9, radius = 3.7 }: { count?: number; radius?: number }) {
  const people = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.3;
        return {
          pos: [Math.cos(a) * radius, 0, Math.sin(a) * radius] as [number, number, number],
          rot: -a + Math.PI / 2,
          color: SARONGS[i % SARONGS.length],
          scale: 0.92 + ((i * 7) % 5) * 0.03,
        };
      }),
    [count, radius],
  );
  return (
    <group>
      {people.map((p, i) => (
        <Person key={i} position={p.pos} rotation={p.rot} color={p.color} scale={p.scale} />
      ))}
    </group>
  );
}

/** The 3D depiction of the selected game at the centre of the ground. */
function SceneObjects({ game }: { game: KhmerGame }) {
  if (game.play === "aim") {
    // A clay pot hanging from a pole; a blindfolded player with a stick.
    return (
      <group>
        <Crowd />
        {/* pole + beam */}
        <mesh position={[0.6, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 2.6, 10]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
        </mesh>
        <AnimatedProp mode="pot" position={[-.2, 2.5, 0]}>
        <mesh position={[0, -.35, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.7, 6]} />
          <meshStandardMaterial color="#3a2c1c" />
        </mesh>
        <group position={[0, -1, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#b05a2a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 0.12, 12]} />
            <meshStandardMaterial color="#a04e24" roughness={0.85} />
          </mesh>
        </group>
        </AnimatedProp>
        {/* blindfolded player with stick */}
        <group position={[-1.1, 0, 0.4]} rotation={[0, 0.5, 0]}>
          <Person position={[0, 0, 0]} color={game.color} />
          <mesh position={[0.35, 1.2, 0]} rotation={[0, 0, -0.9]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 1.3, 8]} />
            <meshStandardMaterial color="#7c5b3a" />
          </mesh>
          {/* blindfold */}
          <mesh position={[0, 1.03, 0.12]}>
            <boxGeometry args={[0.3, 0.06, 0.16]} />
            <meshStandardMaterial color="#e8e2d2" />
          </mesh>
        </group>
      </group>
    );
  }

  if (game.play === "race") {
    // Three racers in rice sacks at a start line.
    return (
      <group>
        <Crowd radius={4.1} />
        {[-1.1, 0, 1.1].map((x, i) => (
          <AnimatedProp key={i} mode="hop" position={[x, 0, 0.4]} offset={i * .7}>
            {/* sack */}
            <mesh position={[0, 0.42, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.34, 0.84, 12]} />
              <meshStandardMaterial color="#cdae6a" roughness={1} />
            </mesh>
            {/* torso + head poking out */}
            <mesh position={[0, 1.0, 0]} castShadow>
              <capsuleGeometry args={[0.13, 0.24, 4, 8]} />
              <meshStandardMaterial color={SARONGS[i]} roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.32, 0]} castShadow>
              <sphereGeometry args={[0.14, 14, 14]} />
              <meshStandardMaterial color="#c98a5a" roughness={0.7} />
            </mesh>
          </AnimatedProp>
        ))}
        {/* finish line */}
        <mesh position={[0, 0.02, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 0.18]} />
          <meshBasicMaterial color="#f4ece0" />
        </mesh>
      </group>
    );
  }

  if (game.play === "catch") {
    // Two lines of people facing each other, throwing a chhoung back and forth
    return (
      <group>
        <Crowd radius={4.5} count={12} />
        {/* Left Team */}
        {[-1.2, 0, 1.2].map((z, i) => (
          <Person key={`l-${i}`} position={[-1.6, 0, z]} rotation={Math.PI / 2} color={SARONGS[i % SARONGS.length]} />
        ))}
        {/* Right Team */}
        {[-1.2, 0, 1.2].map((z, i) => (
          <Person key={`r-${i}`} position={[1.6, 0, z]} rotation={-Math.PI / 2} color={SARONGS[(i + 3) % SARONGS.length]} />
        ))}
        <AnimatedProp mode="scarf">
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color={game.color} />
        </mesh>
        {/* The tail of the Chhoung (since it's a rolled up scarf) */}
        <mesh position={[0, 1.65, 0.1]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.08, 0.25, 8]} />
          <meshStandardMaterial color={game.color} />
        </mesh>
        </AnimatedProp>
      </group>
    );
  }

  // Tug of war a rope and two teams leaning back.
  return (
    <group>
      <Crowd radius={4.2} />
      {/* rope */}
      <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 4.6, 8]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.9} />
      </mesh>
      {/* centre knot */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#c0453f" />
      </mesh>
      {[-1, 1].map((side) =>
        [0, 1, 2].map((i) => (
          <Person
            key={`${side}-${i}`}
            position={[side * (1.1 + i * 0.62), 0, 0]}
            rotation={side < 0 ? Math.PI / 2 + 0.35 : -Math.PI / 2 - 0.35}
            color={side < 0 ? "#2f6ae0" : "#4c8a3f"}
          />
        )),
      )}
    </group>
  );
}


