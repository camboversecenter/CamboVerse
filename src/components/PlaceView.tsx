import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sky, useGLTF } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping, Object3D, type InstancedMesh, type Mesh } from "three";
import { Palm } from "./Palm";
import { placeById, type Place, type TreeRow } from "../places";

/**
 * 🏛 Place — several generated buildings composed into somewhere you can stand.
 *
 * The building generator (scripts/generate-building.mjs) turns a photograph's
 * typology into a model. This turns models into a PLACE: shared ground, a
 * forecourt, planting, and a camera you can move. That gap is the whole
 * difference between "we can make a building" and "you can visit it".
 *
 * Follows the three view modes (AGENTS.md): Ultra adds an atmospheric sky, a
 * shadow pass and higher DPR; Normal is a flat sky and no shadows, on the same
 * geometry. VR presents Ultra for the duration of the session.
 *
 * Nothing is downloaded beyond the `-bare` glbs themselves, which are the same
 * hand-serialized, vertex-coloured models as every temple here.
 */
export type ViewMode = "normal" | "ultra";

function detectViewMode(): ViewMode {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

/** Deterministic jitter — the same place every visit, never a reshuffle. */
const wobble = (seed: number, n: number) => 0.5 + 0.5 * Math.sin(seed * 12.9898 + n * 78.233);

export function PlaceView({ placeId, onBackToMap }: { placeId: string; onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<ViewMode>(detectViewMode);
  const place = placeById(placeId);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  if (!place) {
    return (
      <div className="place">
        <div className="cls-top">
          <button className="backbtn" onClick={onBackToMap}>← Map</button>
          <span className="cls-title">Place not found</span>
        </div>
      </div>
    );
  }

  const ultra = mode === "ultra";
  return (
    <div className="place">
      <Canvas
        dpr={ultra ? [1, 2] : [1, 1.5]}
        camera={{ position: place.camera.position, fov: 42 }}
        gl={{ antialias: ultra, powerPreference: "high-performance" }}
        shadows={ultra}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          // Ultra runs under a physical sky, which is far brighter than a flat
          // colour — the same exposure in both washes the render out.
          gl.toneMappingExposure = ultra ? 0.68 : 1.05;
        }}
      >
        <XR store={store}>
          <PlaceScene place={place} ultra={ultra} />
          <XROrigin position={[place.camera.position[0] * 0.5, 0, place.camera.position[2] * 0.6]} />
          <VrImpliesUltra onEnter={() => setMode("ultra")} />
          <OrbitControls
            target={place.camera.target}
            maxPolarAngle={Math.PI / 2.06}
            minDistance={14}
            maxDistance={230}
            enableDamping
          />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🏛 {place.nameKm ? `${place.nameKm} · ` : ""}{place.name}</span>
        <button
          className="grove-quality"
          onClick={() => setMode((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full scene"
        >
          {ultra ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setMode("ultra"); store.enterVR(); }}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="place-panel">
        <p className="place-blurb">{place.blurb}</p>
        {/* A generated place should say that it is one, in the place itself and
            not only in a repository somebody will never open. */}
        <p className="place-prov">{place.provenance}</p>
      </div>
    </div>
  );
}

/** Entering VR raises the view for the session, as elsewhere in CamboVerse. */
function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const session = useXR((s) => s.session);
  useEffect(() => { if (session) onEnter(); }, [session, onEnter]);
  return null;
}

function PlaceScene({ place, ultra }: { place: Place; ultra: boolean }) {
  return (
    <>
      {ultra ? (
        <Sky distance={9000} sunPosition={[-34, 76, 88]} turbidity={4} rayleigh={1.3} mieCoefficient={0.006} />
      ) : (
        <color attach="background" args={["#9ccbe8"]} />
      )}
      <hemisphereLight args={[0xdaeaff, 0x6d7a4e, ultra ? 0.9 : 1.6]} />
      <directionalLight
        position={[-34, 76, 88]}
        intensity={ultra ? 3.1 : 2.2}
        castShadow={ultra}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-near={1}
        shadow-camera-far={320}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={110}
        shadow-camera-bottom={-90}
      />

      {/* Ground, then the paving on top of it, then the lawns on top of that.
          Each sits a few centimetres higher than the last: coplanar surfaces
          z-fight, and the flicker reads as a broken renderer. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow={ultra}>
        <planeGeometry args={[place.ground.sizeM, place.ground.sizeM]} />
        <meshStandardMaterial color={place.ground.color} roughness={1} />
      </mesh>
      {place.paving.map((p, i) => (
        <mesh key={`pv${i}`} rotation-x={-Math.PI / 2} position={[p.x, 0, p.z]} receiveShadow={ultra}>
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial color={p.color ?? "#d3cfc6"} roughness={1} />
        </mesh>
      ))}
      {place.lawns.map((l, i) => (
        <group key={`lw${i}`}>
          <mesh rotation-x={-Math.PI / 2} position={[l.x, 0.03, l.z]} receiveShadow={ultra}>
            <planeGeometry args={[l.w, l.d]} />
            <meshStandardMaterial color="#6f9c30" roughness={1} />
          </mesh>
          {l.kerb !== false && (
            <>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[l.x, 0.07, l.z + (s * l.d) / 2]} receiveShadow={ultra}>
                  <boxGeometry args={[l.w + 0.4, 0.16, 0.25]} />
                  <meshStandardMaterial color="#e0ddd6" roughness={1} />
                </mesh>
              ))}
            </>
          )}
        </group>
      ))}

      {place.buildings.map((bldg, i) => (
        <Building key={`b${i}`} url={`/models/${bldg.model}.glb`} x={bldg.x} z={bldg.z}
          rotation={bldg.rotation ?? 0} ultra={ultra} />
      ))}

      {place.treeRows.map((row, i) => (
        <TreeRowMesh key={`t${i}`} row={row} ultra={ultra} />
      ))}

      {place.palms.map((p, i) => (
        <Palm key={`p${i}`} position={[p.x, 0, p.z]} scale={p.scale ?? 1} spin={p.spin ?? 0} />
      ))}

      {(place.flagpoles ?? []).map((f, i) => (
        <group key={`f${i}`} position={[f.x, 0, f.z]}>
          <mesh position={[0, 0.17, 0]} receiveShadow={ultra}>
            <boxGeometry args={[1.1, 0.35, 1.1]} />
            <meshStandardMaterial color="#e0ddd6" roughness={1} />
          </mesh>
          <mesh position={[0, 4.6, 0]} castShadow={ultra}>
            <cylinderGeometry args={[0.06, 0.08, 9, 6]} />
            <meshStandardMaterial color="#e6e3dc" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** One generated building, placed. Cloned per instance so two copies of the
 *  same model can stand in two places. */
function Building({ url, x, z, rotation, ultra }: {
  url: string; x: number; z: number; rotation: number; ultra: boolean;
}) {
  const { scene } = useGLTF(url, false, false);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return c;
  }, [scene]);
  // The flag is read on every render so toggling Ultra takes effect without a
  // reload; the traverse above only runs when the model itself changes.
  cloned.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) { m.castShadow = ultra; m.receiveShadow = ultra; }
  });
  return <primitive object={cloned} position={[x, 0, z]} rotation={[0, (rotation * Math.PI) / 180, 0]} />;
}

/**
 * A row of young staked trees, instanced.
 *
 * Instanced because a campus wants fifty of them and fifty separate meshes is
 * fifty draw calls on a phone that has a budget of a few hundred for the whole
 * scene. Three instanced meshes — trunk, canopy, stake — cover any number.
 */
function TreeRowMesh({ row, ultra }: { row: TreeRow; ultra: boolean }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const stakes = useRef<InstancedMesh>(null);
  const n = Math.max(1, row.count);
  const seed = row.seed ?? 1;

  useFrame(() => { /* static; positions are written once below */ });

  useEffect(() => {
    const o = new Object3D();
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const jit = row.jitterM ?? 0;
      const jx = jit ? wobble(seed, i) * jit - jit / 2 : 0;
      const jz = jit ? wobble(seed, i + 40) * jit - jit / 2 : 0;
      const x = row.from[0] + (row.to[0] - row.from[0]) * t + jx;
      const z = row.from[1] + (row.to[1] - row.from[1]) * t + jz;
      const h = (row.heightM ?? 4.5) * (0.85 + 0.3 * wobble(seed, i + 7));

      o.position.set(x, h * 0.31, z);
      o.scale.set(1, h * 0.62, 1);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      trunks.current?.setMatrixAt(i, o.matrix);

      o.position.set(x, h * 0.78, z);
      o.scale.setScalar(h * 0.2);
      o.updateMatrix();
      crowns.current?.setMatrixAt(i, o.matrix);

      // The stake. Every young tree in a new Cambodian forecourt is tied to
      // one, and leaving it off is what makes planting look like it grew there.
      o.position.set(x + 0.22, h * 0.25, z + 0.05);
      o.scale.set(1, h * 0.5, 1);
      o.updateMatrix();
      stakes.current?.setMatrixAt(i, o.matrix);
    }
    for (const m of [trunks, crowns, stakes]) {
      if (m.current) m.current.instanceMatrix.needsUpdate = true;
    }
  }, [n, seed, row.from, row.to, row.heightM, row.jitterM]);

  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, n]} castShadow={ultra}>
        <cylinderGeometry args={[0.07, 0.11, 1, 6]} />
        <meshStandardMaterial color="#6b5a45" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, n]} castShadow={ultra}>
        <sphereGeometry args={[1, ultra ? 7 : 5, ultra ? 5 : 4]} />
        <meshStandardMaterial color="#3f7024" roughness={1} flatShading={!ultra} />
      </instancedMesh>
      <instancedMesh ref={stakes} args={[undefined, undefined, n]}>
        <cylinderGeometry args={[0.035, 0.035, 1, 5]} />
        <meshStandardMaterial color="#a08a63" roughness={1} />
      </instancedMesh>
    </>
  );
}

useGLTF.preload("/models/institute-block-bare.glb");
useGLTF.preload("/models/annex-block-bare.glb");
