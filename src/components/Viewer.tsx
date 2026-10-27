import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './ExploreControls';
import { Html } from "@react-three/drei";
import { createXRStore, XR, useXR } from "@react-three/xr";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Group, Vector3 } from "three";
import { HeritageModel } from "./HeritageModel";
import { HeritagePlaceholder } from "./HeritagePlaceholder";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { Loader } from "./Loader";
import { Scenery } from "./Scenery";
import { SplatModel } from "./SplatModel";
import { PoiMarker } from "./PoiMarker";
import { VRRig } from "./VRRig";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { CaptureWalkControls } from "./CaptureWalkControls";
import { CaptureAreaControls } from './CaptureAreaControls';
import { CaptureAreaGround } from './CaptureAreaGround';
import { areaEyePosition, areaGroundHeight } from '../captureAreaWalk';
import type { CaptureFlightMode } from '../captureFlight';
import { SceneAssetGroup } from "./SceneAssetGroup";
import type { Poi, PoiCapture } from "../spots";
import type { MutableRefObject } from "react";
import { regionalOverviewCamera } from '../regionalCamera';
import { advanceCameraTravel, viewpointOrbitLimit } from '../cameraNavigation';
import { captureWalkPosition } from '../captureWalk';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ObjectHotspotMarkers } from './ObjectHotspots';
import { STAIRCASE_OBJECT_ANCHORS } from '../objectHotspots';
import { CaptureVREntry, CaptureVRMenu, type CaptureVRTour } from './CaptureVR';
import { captureVRArrival } from '../captureVR';

const ARTIFACT_OVERVIEW: Poi = { id: "overview", title: "Overview", info: "", target: [0, 1.08, 0], camera: [2.05, 1.72, 3.2] };

/**
 * The 3D viewer surface.
 *
 * A canvas with touch-tuned orbit controls set in an outdoor daytime scene
 * (procedural sky, grass, palms, warm sun, optional reflecting pool). It loads
 * a real glTF heritage model (streamed, with a loading indicator); if that
 * fails it falls back to a primitive placeholder so the canvas never breaks.
 */
export function Viewer({
  modelUrl,
  ultraModelUrl,
  heritageUltraUrl,
  overview,
  blurb,
  water = false,
  splatUrl,
  splat = false,
  capture,
  cleanCapture = true,
  onSelectCaptureObject,
  onCaptureFlightChange,
  vrTour,
  pois,
  activePoi = null,
  onSelectPoi,
  mode = "orbit",
  walkInput,
  aerial = false,
  landscape,
  modelScale = 1,
  modelY = 0,
  sceneryGroundY = 0,
  sceneryShadowNormalBias = 0,
  terrainWalking = false,
  walkStart,
  overviewOnly = false,
  float = false,
}: {
  modelUrl: string;
  ultraModelUrl?: string;
  heritageUltraUrl?: string;
  overview?: Poi;
  blurb: string;
  water?: boolean;
  splatUrl?: string;
  splat?: boolean;
  capture?: PoiCapture;
  cleanCapture?: boolean;
  onSelectCaptureObject?: (id:string)=>void;
  onCaptureFlightChange?: (mode:CaptureFlightMode)=>void;
  vrTour?:CaptureVRTour;
  pois?: Poi[];
  activePoi?: Poi | null;
  onSelectPoi?: (id: string) => void;
  mode?: "orbit" | "walk";
  walkInput?: MutableRefObject<WalkInput>;
  aerial?: boolean;
  landscape?: "angkor" | "wat-phnom";
  /** Uniform scale for the heritage model (e.g. Angkor's temple reads larger). */
  modelScale?: number;
  /** Lift the model (e.g. Wat Phnom sits atop its hill). */
  modelY?: number;
  /** Background only: does not move the model, camera, or walking ground. */
  sceneryGroundY?: number;
  sceneryShadowNormalBias?: number;
  terrainWalking?: boolean;
  walkStart?: [number, number, number];
  overviewOnly?: boolean;
  /** Floating micro-animation (used for artifacts). */
  float?: boolean;
}) {
  // One XR store per viewer session; drives the optional VR mode. The device
  // emulator is off (it pulls heavy room assets on localhost). The capture
  // tour waits for an explicit entry click rather than offering a session.
  const store = useMemo(() => createXRStore({ emulate: false, offerSession:vrTour?false:undefined, enterGrantedSession:vrTour?false:undefined }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [arSupported, setArSupported] = useState(false);
  const [detail, setDetail] = useState<"normal" | "ultra">(() => {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    return navigator.hardwareConcurrency <= 4 || memory <= 3 || Math.min(screen.width, screen.height) < 500 ? "normal" : "ultra";
  });
  const [immersive, setImmersive] = useState(false);
  const [showParts, setShowParts] = useState(false);
  const [vrReset,setVRReset]=useState(0);
  const detailed = immersive || detail === "ultra";
  const capturePose = useMemo<Poi | null>(() => capture ? {
    id: 'capture-view', title: '3D capture', info: '',
    target: capture.target, camera: capture.camera,
  } : null, [capture]);
  // Wat Phnom's VR tour follows Clean/Full selection, always at Ultra detail.
  const cleanCaptureActive = cleanCapture && !!capture?.cleanup && (!immersive || !capture.walk || !!vrTour);
  const captureFiles = cleanCaptureActive ? capture!.cleanup! : capture;
  const splatSource = captureFiles ? (detailed ? captureFiles.ultra : captureFiles.normal) : splatUrl;
  const arrivalPosition: [number, number, number] = capture
    ? (mode === 'walk' && capture.walkAround ? areaEyePosition(capture.walkAround) : mode === 'walk' && capture.walk ? captureWalkPosition(capture.walk, 0) : capture.camera)
    : overview?.camera ?? (aerial ? [12, 22, 30] : ultraModelUrl ? [2.05, 1.72, 3.2] : [5, 2.8, 14]);
  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
    xr?.isSessionSupported("immersive-ar").then(setArSupported).catch(() => setArSupported(false));
  }, []);

  // Where the VR visitor stands: on the ground, in front of the site.
  const vrStart: [number, number, number] = overviewOnly && overview
    ? [overview.camera[0], overview.camera[1] - 1.6, overview.camera[2]]
    : vrTour&&capture ? captureVRArrival(capture).position
    : capture?.walkAround ? [capture.walkAround.start[0],areaGroundHeight(capture.walkAround,...capture.walkAround.start),capture.walkAround.start[1]]
    : capture ? [capture.camera[0], 0, capture.camera[2]] : walkStart ? [walkStart[0], walkStart[1] - 1.25, walkStart[2]] : terrainWalking ? [0, 0, 9.5] : aerial ? [0, 1.6, 16] : [0, 1.6, 9];

  return (
    <div className={`viewer${heritageUltraUrl ? " heritage-viewer" : ""}`} style={ultraModelUrl && !immersive ? { height: "60%" } : undefined}>
      {(heritageUltraUrl || capture) && !immersive && <div className="heritage-detail" role="group" aria-label="Scene detail">
        {(["normal", "ultra"] as const).map(tier => <button key={tier} aria-pressed={detail === tier} onClick={() => setDetail(tier)}>{tier === "normal" ? "Normal" : "Ultra"}</button>)}
      </div>}
      {ultraModelUrl && <div style={{ position: "absolute", top: 18, right: 18, zIndex: 10, display: "flex", gap: 6 }} aria-label="Model detail">
        <button style={{ padding: "8px 12px", borderRadius: 18, background: "#18221c", color: "white", border: "1px solid #738175" }} aria-pressed={showParts} onClick={() => setShowParts(v => !v)}>{showParts ? "Hide parts" : "Show parts"}</button>
        {(["normal", "ultra"] as const).map((tier) => <button key={tier} style={{ position: "static", padding: "8px 12px", borderRadius: 18, border: "1px solid #738175", background: (detailed ? "ultra" : "normal") === tier ? "#324c36" : "#18221c", color: "white", cursor: "pointer" }} aria-pressed={(detailed ? "ultra" : "normal") === tier} disabled={immersive} onClick={() => setDetail(tier)}>{tier === "normal" ? "Normal" : "Ultra"}</button>)}
      </div>}
      <div className="xr-buttons" style={{ position: "absolute", bottom: 20, right: 20, zIndex: 10, display: "flex", gap: "10px" }}>
        {arSupported && (
          <button className="vr-btn" onClick={() => store.enterAR()} style={{ background: "rgba(0,0,0,0.6)", color: "white", padding: "8px 16px", borderRadius: "20px", border: "1px solid white", cursor: "pointer" }}>
            👁️ Enter AR
          </button>
        )}
        {vrSupported && !vrTour && (
          <button className="vr-btn" onClick={() => store.enterVR()} style={{ background: "rgba(0,0,0,0.6)", color: "white", padding: "8px 16px", borderRadius: "20px", border: "1px solid white", cursor: "pointer" }}>
            🥽 Enter VR
          </button>
        )}
      </div>
      {vrTour&&<CaptureVREntry store={store} tour={vrTour}/>}
      <Canvas
        // Cap DPR so we don't over-render on high-density phone screens.
        dpr={!detailed ? 1 : [1, 2]}
        shadows={detailed && !capture}
        // Aerial sites arrive high above the whole complex; teleporting to a
        // location (POI) then brings the visitor down.
        camera={{ position: arrivalPosition, fov: ultraModelUrl ? 45 : 50 }}
        gl={{ antialias: detailed, powerPreference: "high-performance" }}
      >
        <XR store={store}>
        <SessionDetail onChange={setImmersive} />
        {capture ? <color attach="background" args={['#182322']} />
          : ultraModelUrl ? <ArtifactStudio detailed={detailed} /> : <ConditionalScenery water={water} landscape={landscape} detailed={detailed} authoredSite={!!heritageUltraUrl} groundY={sceneryGroundY} shadowNormalBias={sceneryShadowNormalBias} regional={overviewOnly} />}

        {/* Authored models rise into place on arrival; captures keep their
            calibrated transform fixed around the walking camera. */}
        <Materialize enabled={!capture}>
          <SceneAssetGroup capture={capture} modelScale={modelScale} modelY={modelY}>
            {(capture || splat) && splatSource ? (
              <ModelErrorBoundary key={splatSource} fallback={<Html center><p style={{ color: '#fff', background: '#182322', padding: 12 }}>Capture could not load. Return to the model to continue.</p></Html>}>
                <Suspense fallback={<Loader />}>
                  <SplatModel key={splatSource} url={splatSource} />
                </Suspense>
              </ModelErrorBoundary>
            ) : (
              <ModelErrorBoundary key={detailed ? heritageUltraUrl ?? ultraModelUrl ?? modelUrl : modelUrl} fallback={<HeritagePlaceholder />}>
                <Suspense fallback={<Loader />}>
                  <HeritageModel url={detailed ? heritageUltraUrl ?? ultraModelUrl ?? modelUrl : modelUrl} float={float} />
                </Suspense>
              </ModelErrorBoundary>
            )}
          </SceneAssetGroup>
        </Materialize>

        {capture?.walkAround && <CaptureAreaGround area={capture.walkAround}/>}

        {capture && onSelectCaptureObject && <ObjectHotspotMarkers anchors={STAIRCASE_OBJECT_ANCHORS} onSelect={onSelectCaptureObject}/>}

        {/* Points of interest to walk between or a single info hotspot. */}
        {capture || (ultraModelUrl && !showParts) ? null : pois && pois.length && onSelectPoi ? (
          // Keep a focused stop readable; every stop remains reachable through
          // the menu and Prev/Next while other floating labels are suppressed.
          pois.filter((p) => !heritageUltraUrl || !activePoi || p.id === activePoi.id).map((p) => (
            <PoiMarker key={p.id} poi={p} active={activePoi?.id === p.id} onSelect={onSelectPoi} compact={overviewOnly} index={pois.indexOf(p) + 1} />
          ))
        ) : (
          <Hotspot blurb={blurb} />
        )}
        <CameraRig poi={mode === "orbit" ? capturePose ?? activePoi ?? overview ?? (ultraModelUrl ? ARTIFACT_OVERVIEW : null) : null} fitRegion={overviewOnly && !activePoi} />

        {/* VR player (thumbstick locomotion + glide-to-POI); harmless outside a session. */}
        <VRRig position={vrStart} poi={capturePose ?? activePoi} elevatedStops={terrainWalking || overviewOnly} area={capture?.walkAround}
          capture={vrTour?capture:undefined} resetKey={vrReset}/>
        {vrTour&&<CaptureVRMenu tour={vrTour} onReset={()=>setVRReset(v=>v+1)}/>}
        {/* Desktop/mobile controls suppressed while in a VR session. */}
        <Nav
          pose={capturePose ?? activePoi ?? overview ?? (ultraModelUrl ? ARTIFACT_OVERVIEW : null)}
          fitRegion={overviewOnly && !activePoi}
          maxOrbitDistance={overviewOnly ? 330 : undefined}
          mode={mode}
          terrainWalking={terrainWalking}
          walkStart={walkStart}
          walkInput={walkInput}
          aerial={aerial}
          capture={capture}
          onFlightChange={onCaptureFlightChange}
          lookLimits={cleanCaptureActive ? capture?.cleanup?.lookLimits : undefined}
        />
        </XR>
      </Canvas>
    </div>
  );
}

function SessionDetail({ onChange }: { onChange: (active: boolean) => void }) {
  const active = useXR((s) => s.session != null);
  useEffect(() => { onChange(active); }, [active, onChange]);
  return null;
}

/** Only the new authored artifact opts into this inexpensive inspection stage. */
function ArtifactStudio({ detailed }: { detailed: boolean }) {
  const inAR = useXR((s) => s.session != null && s.mode === "immersive-ar");
  return <>
    <hemisphereLight args={["#fff4e7", "#7d857f", 1.5]} />
    <directionalLight position={[3, 6, 4]} intensity={2} castShadow={detailed} shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-4, 3, -2]} intensity={0.8} />
    {!inAR && <>
      <color attach="background" args={["#b7c1bd"]} />
      <KhmerLifeBackdrop detailed={detailed} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.015, 0]} receiveShadow={detailed}>
        <planeGeometry args={[200, 200]} /><meshStandardMaterial color="#a0aaa5" roughness={1} />
      </mesh>
    </>}
  </>;
}

/** A small, licence-clean Khmer household display setting for artifact studies.
 * Normal uses a few low-cost meshes; Ultra adds warm materials and shadows.
 * It is an illustrative environment, not a reconstruction of a specific home.
 */
function KhmerLifeBackdrop({ detailed }: { detailed: boolean }) {
  const wood = detailed ? "#6c3d20" : "#76502e";
  const wall = detailed ? "#c8b997" : "#b7c1bd";
  const mat = detailed ? "#9b7044" : "#8c7656";
  return <group>
    {/* warm plaster wall and a simple timber rail */}
    <mesh position={[0, 2.4, -2.7]} receiveShadow={detailed}>
      <planeGeometry args={[18, 8]} /><meshStandardMaterial color={wall} roughness={1} />
    </mesh>
    <mesh position={[0, 1.75, -2.55]} castShadow={detailed}>
      <boxGeometry args={[10, .12, .18]} /><meshStandardMaterial color={wood} roughness={.82} />
    </mesh>
    {[[-4.5, 2.7], [4.5, 2.7]].map(([x, y]) => <mesh key={x} position={[x, y, -2.56]} castShadow={detailed}>
      <cylinderGeometry args={[.07, .09, 4.8, detailed ? 12 : 6]} /><meshStandardMaterial color={wood} roughness={.9} />
    </mesh>)}
    {/* woven mat under the object; the stripes remain visible in Normal */}
    <mesh position={[0, .012, .15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={detailed}>
      <planeGeometry args={[3.8, 3.2]} /><meshStandardMaterial color={mat} roughness={.95} />
    </mesh>
    {[-1.25, -.42, .42, 1.25].map((z) => <mesh key={z} position={[0, .018, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.8, .035]} /><meshStandardMaterial color={detailed ? "#b8965d" : "#a88d62"} roughness={1} />
    </mesh>)}
    {/* sugar-palm-inspired greenery at the edges, kept out of the study area */}
    <mesh position={[-3.9, .8, -1.9]} castShadow={detailed}>
      <cylinderGeometry args={[.11, .16, 1.6, detailed ? 14 : 7]} /><meshStandardMaterial color="#604226" roughness={1} />
    </mesh>
    <mesh position={[-3.9, 1.65, -1.9]} castShadow={detailed}>
      <sphereGeometry args={[.62, detailed ? 16 : 8, detailed ? 10 : 5]} /><meshStandardMaterial color="#486548" roughness={1} />
    </mesh>
    <mesh position={[3.9, .8, -1.9]} castShadow={detailed}>
      <cylinderGeometry args={[.11, .16, 1.6, detailed ? 14 : 7]} /><meshStandardMaterial color="#604226" roughness={1} />
    </mesh>
    <mesh position={[3.9, 1.65, -1.9]} castShadow={detailed}>
      <sphereGeometry args={[.62, detailed ? 16 : 8, detailed ? 10 : 5]} /><meshStandardMaterial color="#486548" roughness={1} />
    </mesh>
  </group>;
}

/** Renders the flat-screen controls, but not while a VR session is active
 *  (in VR the headset + thumbstick locomotion drive the view). */
function Nav({
  pose,
  fitRegion,
  walkStart,
  maxOrbitDistance,
  mode,
  terrainWalking,
  walkInput,
  aerial,
  capture,
  lookLimits,
  onFlightChange,
}: {
  pose: Poi | null;
  fitRegion: boolean;
  maxOrbitDistance?: number;
  walkStart?: [number, number, number];
  mode: "orbit" | "walk";
  terrainWalking?: boolean;
  walkInput?: MutableRefObject<WalkInput>;
  aerial: boolean;
  capture?: PoiCapture;
  lookLimits?: NonNullable<PoiCapture['cleanup']>['lookLimits'];
  onFlightChange?: (mode:CaptureFlightMode)=>void;
}) {
  const inXR = useXR((s) => s.session != null);
  const size = useThree(s => s.size);
  const baseline = maxOrbitDistance ?? (capture ? 12 : aerial ? 55 : 20);
  const orbitLimit = pose ? viewpointOrbitLimit(fitRegion ? regionalOverviewCamera(pose, size.width / Math.max(1, size.height)) : pose.camera, pose.target, baseline) : baseline;
  if (inXR) return null;
  return mode === "walk" && walkInput ? (
    capture?.walkAround ? <CaptureAreaControls area={capture.walkAround} input={walkInput} onFlightChange={onFlightChange}/> : capture?.walk ? (
      <CaptureWalkControls
        input={walkInput}
        path={capture.walk}
        lookLimits={lookLimits}
        onFlightChange={onFlightChange}
      />
    ) : <FirstPersonControls input={walkInput} terrainWalking={terrainWalking} start={walkStart} />
  ) : (
    <OrbitControls
      resetKey={pose?.id ?? 'overview'}
      makeDefault
      enablePan
      minDistance={capture ? .7 : 1.2}
      maxDistance={orbitLimit}
      maxPolarAngle={Math.PI / 2.15}
      enableDamping
      dampingFactor={0.08}
      target={capture ? capture.target : [0, aerial ? 0.6 : 1.2, aerial ? 5 : 0]}
    />
  );
}

/**
 * Eases the camera + orbit target to the active point of interest, then hands
 * control back so the visitor can look around from there. With no active POI,
 * free orbit is unchanged.
 */
function CameraRig({ poi, fitRegion = false }: { poi: Poi | null; fitRegion?: boolean }) {
  const size = useThree((s) => s.size);
  // OrbitControls registers itself here via makeDefault.
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const inXR = useXR((s) => s.session != null);
  const travel = useRef({ done: false, elapsed: 0 });

  const camVec = useMemo(() => (poi ? new Vector3(...(fitRegion ? regionalOverviewCamera(poi, size.width / Math.max(1, size.height)) : poi.camera)) : null), [poi, fitRegion, size.width, size.height]);
  const tgtVec = useMemo(() => (poi ? new Vector3(...poi.target) : null), [poi]);

  useEffect(() => {
    travel.current = { done: false, elapsed: 0 };
    // Keep gestures enabled: touching the view cancels guided travel immediately.
    const cancel = () => { travel.current.done = true; };
    controls?.addEventListener('start', cancel);
    return () => controls?.removeEventListener('start', cancel);
  }, [poi, controls, camVec, inXR]);

  useFrame((_, dt) => {
    // In VR the headset owns the camera don't fight it.
    if (inXR || !poi || !controls || !camVec || !tgtVec) return;
    advanceCameraTravel(controls, camVec, tgtVec, travel.current, dt);
  });
  return null;
}

/** Entrance animation: the site scales up and rises into place on teleport-in. */
function Materialize({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useLayoutEffect(() => {
    // A capture's calibrated floor must stay still around the visitor.
    t.current = enabled ? 0 : 1;
    ref.current?.scale.setScalar(enabled ? 0.9 : 1);
    if (ref.current) ref.current.position.y = enabled ? -0.25 : 0;
  }, [enabled]);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / 0.6);
    const e = 1 - Math.pow(1 - t.current, 3); // easeOutCubic
    g.scale.setScalar(0.9 + 0.1 * e);
    g.position.y = (1 - e) * -0.25;
  });
  return (
    <group ref={ref} scale={enabled ? 0.9 : 1} position={[0, enabled ? -0.25 : 0, 0]}>
      {children}
    </group>
  );
}

/** Example information hotspot the core v1 interaction ("explore + info"). */
function Hotspot({ blurb }: { blurb: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Html position={[0, 3.4, 0]} center distanceFactor={10} occlude>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          padding: open ? "10px 14px" : "6px 12px",
          maxWidth: open ? 240 : "none",
          borderRadius: open ? 12 : 999,
          background: open ? "#4c8a3f" : "rgba(76,138,63,0.9)",
          color: "#ffffff",
          font: open ? "500 12px/1.4 system-ui, sans-serif" : "600 12px system-ui, sans-serif",
          whiteSpace: open ? "normal" : "nowrap",
          textAlign: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        {open ? blurb : "ⓘ Info"}
      </button>
    </Html>
  );
}

/** Renders scenery only if NOT in immersive-ar mode */
function ConditionalScenery({ water, landscape, detailed, authoredSite, groundY, shadowNormalBias, regional }: { water?: boolean; landscape?: "angkor" | "wat-phnom"; detailed: boolean; authoredSite: boolean; groundY: number; shadowNormalBias: number; regional?: boolean }) {
  const inAR = useXR((s) => s.session && s.mode === "immersive-ar");
  if (inAR) return null;
  return <Scenery water={water} landscape={landscape} detailed={detailed} authoredSite={authoredSite} groundY={groundY} shadowNormalBias={shadowNormalBias} regional={regional} />;
}
