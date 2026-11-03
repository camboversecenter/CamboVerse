import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {createXRStore, useXR, useXRStore} from '@react-three/xr';
import {Group, Vector3} from 'three';
import {IMMERSIVE_XR_OPTIONS, vrSimulationEnabled} from '../immersiveVR';
import {LAB_VR_HELP, labStationArrival, type LabBounds} from '../labVRNavigation';
import {worldPanelPose} from '../vrPresentation';
import {GuideNarrator, type NarrationStatus} from '../lib/guideNarrator';
import {ImmersiveVREntry} from './CaptureVR';
import {VRRig} from './VRRig';
import {VRSurface} from './VRSurface';
import {VRPanelFrame, VRPageControls} from './VRPanel';
import './LabVR.css';
import {useLabInteraction} from './LabInteraction';

/** The same native session and visible controller rays as Buildings/Wat Phnom. */
export function useLabVR() {
  const [store] = useState(() => createXRStore({...IMMERSIVE_XR_OPTIONS,
    emulate: vrSimulationEnabled(import.meta.env.DEV, window.location.hostname, window.location.search)
      ? {type:'metaQuest3', inject:true, syntheticEnvironment:false} : false}));
  const [active, setActive] = useState(false);
  useEffect(() => {
    const unsubscribe = store.subscribe(s => setActive(s.session != null && s.mode === 'immersive-vr'));
    return () => { unsubscribe(); void store.getState().session?.end().catch(() => {}); };
  }, [store]);
  return {store, active};
}

export function LabVRButton({vr, title = 'Learning Lab'}: {vr: ReturnType<typeof useLabVR>; title?: string}) {
  return <ImmersiveVREntry store={vr.store} title={title} className="lab-vr-entry-button"
    movementHelp={LAB_VR_HELP} onBeforeEnter={() => document.exitPointerLock?.()}/>;
}

export interface VRStation {id: string; label: string; description: string; detail?: string; at: [number, number, number]}
export interface LabVRAction {id: string; label: string; onSelect: () => void; disabled?: boolean; active?: boolean; closeAfter?: boolean}
type LabTab = 'learn' | 'activities' | 'results' | 'controls';
export interface LabActivity {objective: string; result: string}

/** A small anchored marker faces the visitor, but never travels with their head. */
function LabStationMarker({station, onSelect}: {station: VRStation; onSelect: () => void}) {
  const group = useRef<Group>(null), head = useMemo(() => new Vector3(), []);
  const [x, y, z] = station.at;
  const height = Math.min(2.25, y + .55);
  useFrame(({camera}) => {
    if (!group.current) return;
    camera.getWorldPosition(head);
    group.current.visible = Math.hypot(head.x - x, head.z - z) < 8;
    group.current.rotation.y = Math.atan2(head.x - x, head.z - z);
  });
  return <group ref={group} position={[x, height, z]}>
    <VRSurface variant="marker" title={station.label} width={.85} height={.14} onClick={onSelect}/>
  </group>;
}

/** One world-anchored panel. It mounts on demand, never blocks locomotion. */
export function LabVRPanel({title, station, index, count, tab, setTab, actions, status, activity, onPrevious, onNext, onVisit, onEntrance, onClose, onExit}: {
  title: string; station?: VRStation; index: number; count: number; tab: LabTab; setTab: (tab: LabTab) => void;
  actions: LabVRAction[]; status?: string; activity?: LabActivity; onPrevious: () => void; onNext: () => void;
  onVisit: () => void; onEntrance: () => void; onClose: () => void; onExit: () => void;
}) {
  const panel = useRef<Group>(null), placed = useRef(false);
  const vectors = useMemo(() => ({head: new Vector3(), forward: new Vector3()}), []);
  const [page, setPage] = useState(0), [pages, setPages] = useState(1), [actionPage, setActionPage] = useState(0);
  const [speech, setSpeech] = useState<NarrationStatus>('idle');
  const narrator = useMemo(() => new GuideNarrator(setSpeech), []);
  const text = tab === 'results' ? activity?.result ?? 'Choose an activity to see its observations here.'
    : station?.detail ?? station?.description ?? 'Select a station marker to explore its learning notes.';
  useEffect(() => {setPage(0); setActionPage(0); narrator.stop();}, [station?.id, text, tab, narrator]);
  useEffect(() => () => narrator.dispose(), [narrator]);
  useEffect(() => {setPage(p => Math.min(p, pages - 1));}, [pages]);
  const actionPages = Math.max(1, Math.ceil(actions.length / 4));
  useEffect(() => {setActionPage(p => Math.min(p, actionPages - 1));}, [actionPages]);
  useFrame(({camera}) => {
    if (!panel.current || placed.current) return;
    camera.getWorldPosition(vectors.head); camera.getWorldDirection(vectors.forward);
    const pose = worldPanelPose(vectors.head, vectors.forward, 1);
    panel.current.position.set(...pose.position); panel.current.rotation.set(0, pose.yaw, 0);
    panel.current.visible = true; placed.current = true;
  });
  const listen = () => {
    if (speech === 'loading' || speech === 'speaking') narrator.stop();
    else void narrator.start(`${station?.label ?? title}. ${text}`);
  };
  return <group ref={panel} visible={false}>
    <VRPanelFrame width={1.5} height={1.78}/>
    <group position={[-.16,.75,0]}><VRSurface variant="heading" title={title} width={1.03} height={.13}/></group>
    <group position={[.56,.75,0]}><VRSurface title="Close" width={.28} height={.13} onClick={onClose}/></group>
    {(['learn', 'activities', 'results', 'controls'] as const).map((id, i) => <group key={id} position={[(i - 1.5) * .35,.57,0]}>
      <VRSurface title={{learn:'Learn', activities:'Activities', results:'Results', controls:'Controls'}[id]} width={.33} height={.14} active={tab === id} onClick={() => setTab(id)}/>
    </group>)}
    {(tab === 'learn' || tab === 'results') && <>
      <group position={[0,.04,0]}><VRSurface variant="board" eyebrow={`STATION ${count ? index + 1 : 0} / ${count}`} title={station?.label ?? 'Explore the room'}
        body={text} footer={tab === 'results' ? activity?.objective : 'Close the panel to select a marker in the room.'} width={1.36} height={.86} page={page} onPages={setPages}/></group>
      <group position={[0,-.47,0]}><VRPageControls page={page} pages={pages} onPage={setPage} km={false}/></group>
      <group position={[-.46,-.65,0]}><VRSurface title="Previous station" width={.43} height={.15} disabled={count < 2} onClick={onPrevious}/></group>
      <group position={[0,-.65,0]}><VRSurface title="Visit station" width={.43} height={.15} disabled={!station} onClick={onVisit}/></group>
      <group position={[.46,-.65,0]}><VRSurface title="Next station" width={.43} height={.15} disabled={count < 2} onClick={onNext}/></group>
      <group position={[0,-.81,0]}><VRSurface title={speech === 'loading' ? 'Loading voice… select to stop' : speech === 'speaking' ? 'Stop reading' : speech === 'unavailable' ? 'Voice unavailable · retry' : 'Listen to these notes'} width={1.36} height={.12} onClick={listen}/></group>
    </>}
    {tab === 'activities' && <>
      <group position={[0,.29,0]}><VRSurface variant="text" title={station?.label ?? 'Room activities'} width={1.36} height={.13}/></group>
      {actions.slice(actionPage * 4, actionPage * 4 + 4).map((action, i) => <group key={action.id} position={[0,.10 - i * .17,0]}>
        <VRSurface title={action.label} width={1.36} height={.15} disabled={action.disabled} active={action.active} onClick={()=>{action.onSelect();if(action.closeAfter)onClose();}}/>
      </group>)}
      {!actions.length && <group position={[0,-.05,0]}><VRSurface variant="board" title="Explore this exhibit" body="Walk around the model and use Learn to read or listen to its notes. Detailed experiment forms and quizzes are available outside VR." width={1.36} height={.66}/></group>}
      <group position={[0,-.54,0]}><VRPageControls page={actionPage} pages={actionPages} onPage={setActionPage} km={false}/></group>
      <group position={[0,-.73,0]}><VRSurface variant="text" title={activity?.objective ?? status ?? 'Point at a model or select a control above.'} width={1.36} height={.2}/></group>
    </>}
    {tab === 'controls' && <>
      <group position={[0,.06,0]}><VRSurface variant="board" title="Explore at your pace" body={LAB_VR_HELP} footer="Flying stays inside the room. Listen uses the online voice service." width={1.36} height={.88} page={page} onPages={setPages}/></group>
      <group position={[0,-.46,0]}><VRPageControls page={page} pages={pages} onPage={setPage} km={false}/></group>
      <group position={[-.35,-.66,0]}><VRSurface title="Room entrance" width={.66} height={.16} onClick={onEntrance}/></group>
      <group position={[.35,-.66,0]}><VRSurface title="Exit VR" width={.66} height={.16} onClick={onExit}/></group>
      <group position={[0,-.82,0]}><VRSurface variant="text" title="Press Y to hide or reopen this panel." width={1.36} height={.11}/></group>
    </>}
  </group>;
}

export function LabVRRig({start, bounds, ceiling = 3.6, stations = [], title = 'Learning Lab', actions, status, activity}: {
  start: [number, number, number]; bounds: LabBounds; ceiling?: number; stations?: VRStation[]; title?: string;
  actions?: (station: VRStation | undefined) => LabVRAction[]; status?: string; activity?: (station: VRStation | undefined) => LabActivity;
}) {
  const store = useXRStore(), session = useXR(s => s.session);
  const [open, setOpen] = useState(false), [index, setIndex] = useState(0), [tab, setTab] = useState<LabTab>('controls');
  const manipulation = useLabInteraction();
  useEffect(() => {if (manipulation) manipulation.blocked = open; return () => {if (manipulation) manipulation.blocked = false;};}, [manipulation, open]);
  const [arrival, setArrival] = useState({position: start, yaw: 0}), [resetKey, setResetKey] = useState(0);
  const held = useRef(false);
  const [sx, sy, sz] = start;
  useEffect(() => {
    setOpen(!!session); setIndex(0); setTab('controls'); held.current = false;
    setArrival({position: [sx, sy, sz], yaw: 0}); setResetKey(n => n + 1);
  }, [session, sx, sy, sz]);
  useFrame(() => {
    if (!session) return;
    const state = store.getState();
    const left = state.inputSourceStates.find(s => s.type === 'controller' && s.inputSource.handedness === 'left');
    const pressed = left?.type === 'controller' && left.gamepad['y-button']?.state === 'pressed';
    if (session.visibilityState !== 'hidden' && session.visibilityState !== 'visible-blurred' && pressed && !held.current) setOpen(v => !v);
    held.current = !!pressed;
  });
  const station = stations[index % Math.max(1, stations.length)];
  const moveTo = (next: typeof arrival) => {setArrival(next); setResetKey(n => n + 1); setOpen(false);};
  return <>
    <VRRig position={arrival.position} startYaw={arrival.yaw} resetKey={resetKey} buildingMovement roomBounds={bounds} ceiling={ceiling} moveSpeed={1.4}/>
    {session && !open && stations.map((s, i) => <LabStationMarker key={s.id} station={s} onSelect={() => {setIndex(i); setTab('learn'); setOpen(true);}}/>)}
    {session && open && <LabVRPanel title={title} station={station} index={index} count={stations.length} tab={tab} setTab={setTab} actions={actions?.(station) ?? []} status={status} activity={activity?.(station)}
      onPrevious={() => setIndex(i => (i + stations.length - 1) % stations.length)} onNext={() => setIndex(i => (i + 1) % stations.length)}
      onVisit={() => {if (station) moveTo(labStationArrival(station.at, bounds, sy));}}
      onEntrance={() => moveTo({position: [sx, sy, sz], yaw: 0})} onClose={() => setOpen(false)} onExit={() => {void session.end().catch(() => {});}}/>}
  </>;
}
