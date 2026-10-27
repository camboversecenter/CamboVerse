import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { createXRStore, XROrigin, useXR, useXRControllerLocomotion } from '@react-three/xr';
import { CanvasTexture, Group, SRGBColorSpace } from 'three';
import './LabVR.css';

/** Each room owns its session; desktop quality is preserved on exit/cancellation. */
export function useLabVR() {
  const [store] = useState(() => createXRStore({ emulate: false, enterGrantedSession: false }));
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [supported, setSupported] = useState(false);
  const [message, setMessage] = useState('Checking VR support…');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (!window.isSecureContext) {
        setMessage('Open this project over HTTPS in your headset browser to enter VR.');
        return;
      }
      try {
        const available = await navigator.xr?.isSessionSupported('immersive-vr') ?? false;
        if (alive) { setSupported(available); setMessage(available ? '' : 'Open this page in Meta Quest Browser or another WebXR headset browser.'); }
      } catch { if (alive) setMessage('VR support could not be checked. Reload in your headset browser.'); }
    };
    void check();
    navigator.xr?.addEventListener('devicechange', check);
    const unsubscribe = store.subscribe(s => setActive(s.session != null));
    return () => {
      alive = false;
      navigator.xr?.removeEventListener('devicechange', check);
      unsubscribe();
      void store.getState().session?.end().catch(() => {});
    };
  }, [store]);
  const enter = async () => {
    if (pending || !supported) return;
    setPending(true); setMessage('');
    document.exitPointerLock?.();
    try {
      const session = await store.enterVR();
      if (!session) setMessage('VR did not start. Check that your headset is connected and try again.');
    }
    catch (error) {
      const name = error instanceof Error ? error.name : '';
      setMessage(name === 'NotAllowedError' ? 'VR permission was declined. You can try again.' : 'VR could not start. Check your headset connection and try again.');
    } finally { setPending(false); }
  };
  const exit = async () => {
    try { await store.getState().session?.end(); }
    catch { setMessage('Use the headset system menu to leave VR.'); }
  };
  return { store, active, pending, supported, message, enter, exit };
}

export function LabVRButton({ vr }: { vr: ReturnType<typeof useLabVR> }) {
  const [help, setHelp] = useState(false);
  return <span className="lab-vr-entry">
    <button type="button" onClick={() => { if (!vr.supported) setHelp(v => !v); else void (vr.active ? vr.exit() : vr.enter()); }} disabled={vr.pending}>
      {vr.pending ? 'Starting VR…' : vr.active ? 'Exit VR' : 'Enter VR'}
    </button>
    {(help || (vr.supported && vr.message)) && <span className="lab-vr-help" role="status">{vr.message}</span>}
  </span>;
}

export interface VRStation { id: string; label: string; description: string; detail?: string; at: [number, number, number] }

/** Canvas text is part of the scene and remains visible to both headset eyes. */
function VRCard({ text, width, height, action }: { text: string; width: number; height: number; action?: () => void }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = Math.round(768 * height / width);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = action ? '#245347' : '#12232c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#71bfa9'; ctx.lineWidth = 5; ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.fillStyle = '#ffffff'; ctx.font = `${action ? 44 : 32}px sans-serif`;
    let y = 52;
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > 704) { ctx.fillText(line, 32, y); y += 42; line = word; } else line = next;
      }
      ctx.fillText(line, 32, y); y += 45;
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [text, width, height, action != null]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh onClick={action ? e => { e.stopPropagation(); action(); } : undefined}>
    <planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

export function LabVRRig({ start, bounds, stations = [] }: {
  start: [number, number, number]; bounds: [number, number, number, number]; stations?: VRStation[];
}) {
  const origin = useRef<Group>(null);
  const session = useXR(s => s.session);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  useXRControllerLocomotion(origin, { speed: 1.4 }, { type: 'snap', degrees: 30 });
  useEffect(() => { if (origin.current) { origin.current.position.set(...start); origin.current.rotation.set(0, 0, 0); } }, [session, start[0], start[1], start[2]]);
  useFrame(() => {
    if (!session || !origin.current) return;
    origin.current.position.x = Math.max(bounds[0], Math.min(bounds[1], origin.current.position.x));
    origin.current.position.z = Math.max(bounds[2], Math.min(bounds[3], origin.current.position.z));
  });
  const station = stations[index];
  const paragraphs = (station?.detail ?? station?.description ?? 'Use the room controls to choose a layer and select an organ.').match(/.{1,260}(?:\s|$)/g) ?? [''];
  const visit = () => {
    if (!station || !origin.current) return;
    const [x, , z] = station.at;
    const length = Math.max(.01, Math.hypot(x, z));
    origin.current.position.set(x - x / length * 1.8, 0, z - z / length * 1.8);
    origin.current.rotation.y = Math.atan2(-x, -z);
  };
  return <XROrigin ref={origin} position={start}>
    {session && <group position={[1.05, 1.5, -1.3]} rotation={[0, -.35, 0]}>
      <VRCard width={.85} height={.7} text={`${station?.label ?? 'Learning Lab VR'}\n${paragraphs[page % paragraphs.length]}\n\nLeft stick: move. Right stick: turn.\nPoint and press trigger to select.`} />
      {station && <>
        <group position={[-.22, -.44, 0]}><VRCard width={.4} height={.12} text="Previous" action={() => { setIndex((index + stations.length - 1) % stations.length); setPage(0); }} /></group>
        <group position={[.22, -.44, 0]}><VRCard width={.4} height={.12} text="Next" action={() => { setIndex((index + 1) % stations.length); setPage(0); }} /></group>
        <group position={[-.22, -.59, 0]}><VRCard width={.4} height={.12} text="Visit station" action={visit} /></group>
        <group position={[.22, -.59, 0]}><VRCard width={.4} height={.12} text="Read more" action={() => setPage((page + 1) % paragraphs.length)} /></group>
      </>}
      <group position={[0, -.75, 0]}><VRCard width={.85} height={.12} text="Exit VR" action={() => { void session.end().catch(() => {}); }} /></group>
    </group>}
  </XROrigin>;
}
