import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ExploreControls as OrbitControls } from './ExploreControls';
import { Html } from '@react-three/drei';
import { createXRStore, XR, XROrigin, useXR } from '@react-three/xr';
import { VillageAssets } from './village/VillageAssets';
import { VillageLife } from './village/VillageLife';
import { VillageNight } from './village/VillageNight';
import { HouseholdPlacements, VillageHousehold } from './village/VillageHousehold';
import { detectVillageMode, type VillageMode } from './village/layout';
import './village/village.css';
class AssetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Html center><div className="village-loading" role="alert">The village models could not load. Return to the map and try again.</div></Html> : this.props.children;
  }
}
const VIEWS = {
  overview: { camera: [29,22,34], target: [0,1,-2] },
  house: { camera: [-2,4.5,1], target: [-8,2,-7] },
  wat: { camera: [12,7,-7], target: [0,2,-18] },
  fields: { camera: [0,8,30], target: [-10,0,20] },
  veranda: { camera: [-8,3.1,-5.9], target: [-8,2.6,-8] },
  inside: { camera: [-8,3.0,-7.5], target: [-8,2.2,-8.6] },
} as const;
type View = keyof typeof VIEWS;
const INITIAL_CAMERA = { position: [29,22,34] as [number,number,number], fov:48 };
function Scene({ mode, view, night, paused, onXR }: { mode: VillageMode; view: View; night: boolean; paused: boolean; onXR: (active: boolean) => void }) {
  const inXR = useXR(s => s.session != null);
  const effective = inXR ? 'ultra' : mode;
  const camera = useThree(s => s.camera);
  const gl = useThree(s => s.gl);
  useEffect(() => { onXR(inXR); }, [inXR, onXR]);
  useEffect(() => { gl.shadowMap.enabled = effective === 'ultra'; }, [gl,effective]);
  useEffect(() => {
    if (!inXR) {
      const [x,y,z] = VIEWS[view].camera;
      const [tx,ty,tz] = VIEWS[view].target;
      camera.position.set(x,y,z); camera.lookAt(tx,ty,tz);
    }
  }, [camera,view,inXR]);
  return <>
    <color attach="background" args={[night?'#0c172d':'#d9e3da']} />
    <fog attach="fog" args={[night?'#0c172d':'#d9e3da',48,105]} />
    <hemisphereLight args={[night?'#94aedd':'#fff2d5',night?'#303b49':'#66734b',night?.7:1.6]} />
    <directionalLight position={[15,27,12]} color={night?'#a5bcf1':'#fff8e8'} intensity={night?.65:2.4} castShadow={effective === 'ultra'} shadow-mapSize={[2048,2048]} shadow-camera-left={-33} shadow-camera-right={33} shadow-camera-top={33} shadow-camera-bottom={-33} shadow-camera-far={100} shadow-normalBias={.05} />
    <VillageNight night={night} />
    <VillageLife mode={effective} paused={paused} />
    <AssetBoundary><HouseholdPlacements mode={effective}/></AssetBoundary>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[65,64]} /><meshStandardMaterial color="#89905c" roughness={1} /></mesh>
    <AssetBoundary key={effective}><Suspense fallback={<Html center><div role="status" className="village-loading">Loading village…</div></Html>}><VillageAssets mode={effective} /></Suspense></AssetBoundary>
    <XROrigin position={[0,0,-1]} />
    {!inXR && <OrbitControls key={view} makeDefault target={[...VIEWS[view].target]} minDistance={(view==='inside'||view==='veranda')?.3:3} maxDistance={view==='inside'?2:65} maxPolarAngle={Math.PI/2.06} enableDamping />}
  </>;
}
export function VillageView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [mode,setMode] = useState<VillageMode>(detectVillageMode);
  const [view,setView] = useState<View>('overview');
  const [vrSupported,setVrSupported] = useState(false);
  const [inXR,setInXR] = useState(false);
  const [vrError,setVrError] = useState('');
  const [night,setNight] = useState(false);
  const [household,setHousehold] = useState(false);
  const [paused,setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    let alive = true;
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported('immersive-vr').then(ok => { if (alive) setVrSupported(ok); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return <div className="village village-refined">
    <Canvas shadows={mode === 'ultra' || inXR} dpr={mode === 'normal' && !inXR ? 1 : [1,1.5]} camera={INITIAL_CAMERA} gl={{ antialias:true }}>
      <XR store={store}><Scene mode={mode} view={view} night={night} paused={paused} onXR={setInXR} /></XR>
    </Canvas>
    <header className="village-toolbar">
      <button onClick={onBackToMap}>← Map</button>
      <div className="village-heading"><strong>Khmer Village</strong><span>ភូមិខ្មែរ · Architecture study</span></div>
      <div className="village-modes" aria-label="Rendering quality">
        {(['normal','ultra'] as const).map(m => <button key={m} aria-pressed={(inXR ? 'ultra' : mode) === m} disabled={inXR} onClick={() => setMode(m)}>{m === 'normal' ? 'Normal' : 'Ultra'}</button>)}
      </div>
      <div className="village-time" role="group" aria-label="Time of day">
        <button aria-pressed={!night} onClick={() => setNight(false)}>Day</button>
        <button aria-pressed={night} onClick={() => setNight(true)}>Night</button>
      </div>
      {vrSupported && <button onClick={() => { setVrError(''); store.enterVR().catch(() => setVrError('VR could not start. Please try again.')); }}>Enter VR</button>}
    </header>
    <section className="village-guide" aria-label="Explore village">
      <span className="village-eyebrow">EXPLORE EVERYDAY SPACES</span>
      <h1>{view === 'inside' ? 'Inside the household.' : view === 'veranda' ? 'On the veranda.' : view === 'house' ? 'A house, a courtyard, a home.' : view === 'wat' ? 'The village gathering place.' : view === 'fields' ? 'At the edge of the village.' : 'Follow the road home.'}</h1>
      <p>Drag to orbit · pinch or scroll to zoom · two fingers or right-drag to pan.</p>
      <nav>{(Object.keys(VIEWS) as View[]).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{({overview:'Village',house:'House & yard',wat:'Wat',fields:'Rice fields',veranda:'Visit veranda',inside:'Inside house'})[v]}</button>)}</nav>
      <button onClick={()=>{setView('house');setHousehold(true);}}>Explore household life</button>
      <small>Guided orbit viewpoints, not free walking · original stylized concept · architectural review pending</small>
      <button className="village-motion" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused?'Resume village life':'Pause village life'}</button>
      {vrError && <p role="alert">{vrError}</p>}
    </section>
    {household && <VillageHousehold mode={inXR?'ultra':mode} onClose={()=>setHousehold(false)}/>}
  </div>;
}
