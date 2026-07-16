import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useState } from "react";
import type { Texture } from "three";
import { makeGlyphTexture } from "../lib/glyphTexture";
import { usageFor, KHMER_FONTS, type KhmerLetter, type Syllable } from "../khmer";

/**
 * A 3D space for one letter — how to *use* it. For a consonant it shows the
 * letter combined with every vowel to make syllables (the core of reading
 * Khmer); for a vowel, the same vowel across consonants of both series; for a
 * numeral, how digits combine. Explorable in 3D and VR.
 */
function Tile({
  texture,
  position,
  size = 1,
  selected,
  onSelect,
}: {
  texture: Texture;
  position: [number, number, number];
  size?: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const s = (selected || hover ? 1.12 : 1) * size;
  return (
    <group
      position={position}
      scale={s}
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
    >
      <mesh>
        <boxGeometry args={[1.06, 1.32, 0.12]} />
        <meshStandardMaterial color={selected ? "#c8912e" : "#8a7a5a"} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.061]}>
        <planeGeometry args={[0.98, 1.24]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LetterSpace({
  letter,
  groupId,
  onBack,
}: {
  letter: KhmerLetter;
  groupId: string;
  onBack: () => void;
}) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<Syllable | null>(null);

  const usage = useMemo(() => usageFor(letter, groupId), [letter, groupId]);
  const family = KHMER_FONTS.normal.family;

  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const bigTex = useMemo(
    () => (ready ? makeGlyphTexture(letter.display, letter.roman, { family, size: 320 }) : null),
    [ready, letter, family],
  );
  const tileTex = useMemo(
    () => (ready ? usage.syllables.map((s) => makeGlyphTexture(s.khmer, s.sound, { family })) : []),
    [ready, usage, family],
  );
  useEffect(() => () => {
    bigTex?.dispose();
    tileTex.forEach((t) => t.dispose());
  }, [bigTex, tileTex]);

  const n = usage.syllables.length;
  const cols = n <= 6 ? Math.max(1, n) : n <= 12 ? 4 : 7;
  const rows = Math.ceil(n / cols);
  const SX = 1.35;
  const SY = 1.62;
  const gridTop = 1.6; // grid sits below the big letter

  return (
    <div className="lspace">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, Math.max(cols * SX, rows * SY + 4) * 0.92 + 5], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setPicked(null)}
      >
        <XR store={store}>
          <color attach="background" args={["#14181c"]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 6, 8]} intensity={1.0} />

          {/* The letter itself, large, at the top. */}
          {bigTex && <Tile texture={bigTex} position={[0, gridTop + 2.4, 0]} size={2} />}

          {/* Syllables / examples below. */}
          {ready &&
            usage.syllables.map((s, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = (col - (cols - 1) / 2) * SX;
              const y = gridTop - row * SY;
              return (
                <Tile
                  key={s.khmer + i}
                  texture={tileTex[i]}
                  position={[x, y, 0]}
                  selected={picked?.khmer === s.khmer}
                  onSelect={() => setPicked(s)}
                />
              );
            })}

          <XROrigin position={[0, 1, Math.max(cols * SX, rows * SY + 4) * 0.9 + 4]} />
          <Nav />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>
          ← Letters
        </button>
        <span className="cls-title">{usage.title}</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      {picked ? (
        <div className="ls-info">
          <button className="cls-close" onClick={() => setPicked(null)} aria-label="Close">
            ✕
          </button>
          <span className="ls-syll" style={{ fontFamily: `'${family}', serif` }}>
            {picked.khmer}
          </span>
          <div className="ls-meta">
            <div className="ls-sound">{picked.sound}</div>
            {picked.note && <div className="ls-note">{picked.note}</div>}
          </div>
        </div>
      ) : (
        <div className="cls-hint">
          <p>{usage.lesson}</p>
          {n > 0 && <p className="cls-hint-sub">Tap a card to hear-read the sound. 🥽 or step inside in VR.</p>}
        </div>
      )}

      {!ready && <div className="cls-loading">Loading…</div>}
    </div>
  );
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={4}
      maxDistance={30}
      maxPolarAngle={Math.PI / 1.8}
      enableDamping
      dampingFactor={0.08}
      target={[0, 0.4, 0]}
    />
  );
}
