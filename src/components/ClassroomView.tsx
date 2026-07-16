import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useState } from "react";
import { LetterTile } from "./LetterTile";
import { LetterQuiz } from "./LetterQuiz";
import { WriteAnimation } from "./WriteAnimation";
import { LetterSpace } from "./LetterSpace";
import { makeGlyphTexture } from "../lib/glyphTexture";
import { getIdentity, earnedAchievements } from "../lib/identity";
import { GLYPH_PATHS } from "../glyphPaths";
import { KHMER_GROUPS, KHMER_FONTS, type KhmerShape, type KhmerLetter } from "../khmer";

/**
 * The Khmer Alphabet Classroom — every Khmer letter as a 3D tile on a board,
 * shown in either the Normal or the Moul (ceremonial) shape using embedded
 * Google Khmer fonts. Tap a letter to study it in both shapes; explore in 3D or
 * step inside in VR. A calm place to learn to read Khmer.
 */
export function ClassroomView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [groupId, setGroupId] = useState(KHMER_GROUPS[0].id);
  const [shape, setShape] = useState<KhmerShape>("normal");
  const [selected, setSelected] = useState<KhmerLetter | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [writeFor, setWriteFor] = useState<KhmerLetter | null>(null);
  const [spaceFor, setSpaceFor] = useState<KhmerLetter | null>(null);
  const [earned, setEarned] = useState<Set<string>>(new Set());

  const group = KHMER_GROUPS.find((g) => g.id === groupId)!;
  const family = KHMER_FONTS[shape].family;
  const passed = earned.has(`alphabet:${groupId}`);

  // Load any alphabet credentials this visitor already holds (never mints one).
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

  // Load the embedded Khmer fonts before drawing glyph textures (else tofu).
  useEffect(() => {
    let live = true;
    Promise.all([
      document.fonts.load('64px "Noto Sans Khmer"', "ក០"),
      document.fonts.load('64px "Moul"', "ក"),
    ])
      .then(() => document.fonts.ready)
      .then(() => live && setReady(true))
      .catch(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  // A glyph texture per letter, in the current group + font.
  const textures = useMemo(() => {
    if (!ready) return [];
    return group.letters.map((l) => makeGlyphTexture(l.display, l.roman, { family }));
  }, [group, family, ready]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  // Grid layout.
  const n = group.letters.length;
  const cols = n <= 10 ? 5 : n <= 20 ? 6 : 7;
  const rows = Math.ceil(n / cols);
  const SX = 1.35;
  const SY = 1.62;

  // Clear selection when the group changes.
  useEffect(() => setSelected(null), [groupId]);

  // A dedicated 3D "learn to use" space for one letter replaces the board.
  if (spaceFor) return <LetterSpace letter={spaceFor} groupId={groupId} onBack={() => setSpaceFor(null)} />;

  return (
    <div className="classroom">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, Math.max(cols * SX, rows * SY) * 0.92 + 4], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelected(null)}
      >
        <XR store={store}>
          <color attach="background" args={["#14181c"]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 6, 8]} intensity={1.1} />
          {/* Chalkboard + floor. */}
          <mesh position={[0, 0, -0.5]}>
            <planeGeometry args={[cols * SX + 2, rows * SY + 2]} />
            <meshStandardMaterial color="#20302a" roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -(rows * SY) / 2 - 1.2, 2]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#2a2620" roughness={1} />
          </mesh>

          {ready &&
            group.letters.map((l, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = (col - (cols - 1) / 2) * SX;
              const y = ((rows - 1) / 2 - row) * SY;
              return (
                <LetterTile
                  key={l.char + shape}
                  letter={l}
                  texture={textures[i]}
                  position={[x, y, 0]}
                  selected={selected?.char === l.char}
                  onSelect={() => setSelected(l)}
                />
              );
            })}

          <XROrigin position={[0, 1.1, Math.max(cols * SX, rows * SY) * 0.9 + 3]} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="cls-title">🔤 Khmer Alphabet Classroom</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="cls-controls">
        <div className="cls-tabs">
          {KHMER_GROUPS.map((g) => (
            <button key={g.id} className={g.id === groupId ? "cls-tab on" : "cls-tab"} onClick={() => setGroupId(g.id)}>
              {g.title}
            </button>
          ))}
        </div>
        <div className="cls-shape">
          <span className="cls-shape-label">Letter shape</span>
          {(Object.keys(KHMER_FONTS) as KhmerShape[]).map((s) => (
            <button key={s} className={s === shape ? "cls-seg on" : "cls-seg"} onClick={() => setShape(s)}>
              {KHMER_FONTS[s].label}
            </button>
          ))}
          <button className="cls-quiz-btn" onClick={() => setQuizOpen(true)}>
            🎯 Quiz{passed ? " ✓" : ""}
          </button>
        </div>
      </div>

      {quizOpen && (
        <LetterQuiz
          group={group}
          shape={shape}
          onClose={() => setQuizOpen(false)}
          onEarned={() => setEarned((s) => new Set(s).add(`alphabet:${groupId}`))}
        />
      )}

      {selected ? (
        <div className="cls-info">
          <button className="cls-close" onClick={() => setSelected(null)} aria-label="Close">
            ✕
          </button>
          <div className="cls-shapes">
            <div className="cls-shape-cell">
              <span className="cls-glyph" style={{ fontFamily: "'Noto Sans Khmer', serif" }}>
                {selected.display}
              </span>
              <span className="cls-shape-name">Normal · អក្សរធម្មតា</span>
            </div>
            <div className="cls-shape-cell">
              <span className="cls-glyph" style={{ fontFamily: "'Moul', 'Noto Sans Khmer', serif" }}>
                {selected.display}
              </span>
              <span className="cls-shape-name">Moul · អក្សរមូល</span>
            </div>
          </div>
          <div className="cls-meta">
            <div className="cls-roman">{selected.roman}</div>
            {selected.name && (
              <div className="cls-name" style={{ fontFamily: "'Noto Sans Khmer', serif" }}>
                {selected.name}
              </div>
            )}
            {selected.series && (
              <div className={`cls-series ${selected.series}`}>
                {selected.series === "a" ? "a-series (អ)" : "o-series (អ)"}
              </div>
            )}
            <div className="cls-cat">{group.title}</div>
            <div className="cls-actions">
              <button className="cls-use-btn" onClick={() => setSpaceFor(selected)}>
                📖 Learn to use
              </button>
              {GLYPH_PATHS[selected.char] && (
                <button className="cls-write-btn" onClick={() => setWriteFor(selected)}>
                  ✍️ How to write
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="cls-hint">
          <p>
            <b>{group.title}</b> · {group.khmer} — {group.note}
          </p>
          <p className="cls-hint-sub">
            Tap a letter to see it in both the <b>Normal</b> and <b>Moul</b> shapes. 🥽 or step inside in VR.
          </p>
        </div>
      )}

      {writeFor && <WriteAnimation letter={writeFor} initialShape={shape} onClose={() => setWriteFor(null)} />}

      {!ready && <div className="cls-loading">Loading Khmer fonts…</div>}
    </div>
  );
}

/** Flat-screen orbit controls — suppressed while a VR session is active. */
function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={4}
      maxDistance={26}
      maxPolarAngle={Math.PI / 1.8}
      enableDamping
      dampingFactor={0.08}
      target={[0, 0, 0]}
    />
  );
}
