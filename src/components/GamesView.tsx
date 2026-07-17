import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useState } from "react";
import { KHMER_GAMES, gameCredential, type KhmerGame } from "../games";
import { getIdentity, earnedAchievements } from "../lib/identity";
import { GamePlay } from "./GamePlay";

/**
 * Khmer Traditional Games (ល្បែងប្រជាប្រិយ) — the play of Cambodian festivals.
 * A festival ground you can explore in 3D or VR, with a scene for each game;
 * pick one to read how it's played and its meaning, then play a quick version
 * to earn a Heritage Passport credential. A starting set — contributors can add
 * many more (see TODO.md).
 */
const SARONGS = ["#c0453f", "#2f6ae0", "#4c8a3f", "#c8912e", "#8b3fd0", "#d9662f", "#3fa0a0"];

export function GamesView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [game, setGame] = useState<KhmerGame>(KHMER_GAMES[0]);
  const [playing, setPlaying] = useState(false);
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setEarned(set);
    })();
    return () => {
      live = false;
    };
  }, []);

  const hasWon = earned.has(gameCredential(game.id));

  return (
    <div className="games">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 2.6, 6.6], fov: 45 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#f0c33a"]} />
          <fog attach="fog" args={["#f0c33a", 14, 30]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 9, 5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />

          {/* Festival ground. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[9, 48]} />
            <meshStandardMaterial color="#b8862f" roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[4.3, 4.6, 48]} />
            <meshBasicMaterial color="#9c6f26" />
          </mesh>

          <GameScene game={game} />

          <XROrigin position={[0, 1.1, 5.4]} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="cls-title">🎪 Khmer Traditional Games</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="games-tabs">
        {KHMER_GAMES.map((g) => (
          <button
            key={g.id}
            className={g.id === game.id ? "games-tab on" : "games-tab"}
            style={g.id === game.id ? { background: g.color, borderColor: g.color } : { borderColor: g.color }}
            onClick={() => setGame(g)}
          >
            <span className="khmer">{g.khmer}</span>
            <span className="games-tab-en">{g.english}{earned.has(gameCredential(g.id)) ? " ✓" : ""}</span>
          </button>
        ))}
      </div>

      <div className="games-info" style={{ borderColor: game.color }}>
        <div className="games-info-head">
          <h2>
            <span className="khmer">{game.khmer}</span> {game.name}
          </h2>
          <span className="games-en">{game.english}</span>
        </div>
        <div className="games-facts">
          <span>👥 {game.players}</span>
          <span>🎉 {game.occasion}</span>
        </div>
        <p className="games-how">{game.how}</p>
        <p className="games-desc">{game.desc}</p>
        <button className="games-play" style={{ background: game.color }} onClick={() => setPlaying(true)}>
          ▶ Play {game.english}{hasWon ? " again" : ""}
        </button>
      </div>

      {playing && (
        <GamePlay
          game={game}
          onClose={() => setPlaying(false)}
          onWon={() => setEarned((s) => new Set(s).add(gameCredential(game.id)))}
        />
      )}
    </div>
  );
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
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color="#c98a5a" roughness={0.7} />
      </mesh>
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
function GameScene({ game }: { game: KhmerGame }) {
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
        {/* string + pot */}
        <mesh position={[-0.2, 1.95, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.7, 6]} />
          <meshStandardMaterial color="#3a2c1c" />
        </mesh>
        <group position={[-0.2, 1.5, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#b05a2a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 0.12, 12]} />
            <meshStandardMaterial color="#a04e24" roughness={0.85} />
          </mesh>
        </group>
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
          <group key={i} position={[x, 0, 0.4]}>
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
          </group>
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
        {/* The Chhoung (flying in the middle) */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color={game.color} />
        </mesh>
        {/* The tail of the Chhoung (since it's a rolled up scarf) */}
        <mesh position={[0, 1.65, 0.1]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.08, 0.25, 8]} />
          <meshStandardMaterial color={game.color} />
        </mesh>
      </group>
    );
  }

  // Tug of war — a rope and two teams leaning back.
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

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={3.5}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2.1}
      enableDamping
      dampingFactor={0.08}
      target={[0, 1, 0]}
    />
  );
}
