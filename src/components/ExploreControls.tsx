import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Html, OrbitControls as DreiOrbitControls, type OrbitControlsProps } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import { cameraKey, moveCamera, navigationBindings, settleCamera, type CameraAction, type DragMode } from '../cameraNavigation';
import './ExploreControls.css';

type Props = OrbitControlsProps & { resetKey?: string };

/** Shared mouse/touch/keyboard navigation, with no new rendering tier or meshes. */
export const ExploreControls = forwardRef<Controls, Props>(function ExploreControls({ resetKey, ...props }, forwarded) {
  const gl = useThree(s => s.gl), size = useThree(s => s.size), invalidate = useThree(s => s.invalidate);
  const controls = useRef<Controls | null>(null);
  const hud = useRef<Group>(null);
  const forward = useMemo(() => new Vector3(), []);
  const homeSaved = useRef(false);
  const [mode, setMode] = useState<DragMode>('rotate');
  const [open, setOpen] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [immersive, setImmersive] = useState(gl.xr.isPresenting);
  const id = useId();
  const bindings = useMemo(() => navigationBindings(mode), [mode]);
  // Html otherwise hides when world origin is behind the camera after panning.
  useFrame(({camera}) => {
    if (hud.current) hud.current.position.copy(camera.position).add(camera.getWorldDirection(forward));
  }, -.5);
  const setRef = useCallback((value: Controls | null) => {
    controls.current = value;
    if (typeof forwarded === 'function') forwarded(value);
    else if (forwarded) forwarded.current = value;
  }, [forwarded]);
  const targetKey = JSON.stringify(props.target);
  useEffect(() => { homeSaved.current = false; }, [resetKey, targetKey]);
  useEffect(() => { setInteracted(false); }, [props.autoRotate, resetKey]);
  useEffect(() => {
    const start = () => { if (controls.current) controls.current.enabled = false; setImmersive(true); };
    const end = () => { if (controls.current) controls.current.enabled = props.enabled !== false; setImmersive(false); invalidate(); };
    gl.xr.addEventListener('sessionstart', start); gl.xr.addEventListener('sessionend', end);
    return () => { gl.xr.removeEventListener('sessionstart', start); gl.xr.removeEventListener('sessionend', end); };
  }, [gl, props.enabled, invalidate]);

  const begin = useCallback(() => {
    const c = controls.current;
    if (!c || !c.enabled || gl.xr.isPresenting) return false;
    // Capture the settled POI/preset, not the intermediate arrival animation.
    if (!homeSaved.current) { c.saveState(); homeSaved.current = true; }
    c.autoRotate = false; setInteracted(true);
    props.onStart?.({ type: 'start', target: c });
    return true;
  }, [gl, props.onStart]);
  const act = useCallback((action: CameraAction | 'reset') => {
    const c = controls.current;
    if (!c || !c.enabled || gl.xr.isPresenting) return;
    // Also lets an in-progress guided camera relinquish control immediately.
    c.dispatchEvent({ type: 'start', target: c });
    if (action === 'reset') { settleCamera(c); c.reset(); }
    else moveCamera(c, action, mode);
    c.dispatchEvent({ type: 'end', target: c });
    invalidate();
  }, [gl, mode, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement, oldTab = canvas.getAttribute('tabindex'), oldLabel = canvas.getAttribute('aria-label');
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Interactive 3D view. Drag to rotate; right-drag or two fingers to move; pinch or scroll to zoom. Camera menu offers buttons.');
    const key = (event: KeyboardEvent) => {
      if (event.target !== canvas || event.ctrlKey || event.metaKey || event.altKey || gl.xr.isPresenting) return;
      const action = cameraKey(event.key);
      if (action) { event.preventDefault(); act(action); }
    };
    canvas.addEventListener('keydown', key);
    return () => {
      canvas.removeEventListener('keydown', key);
      if (oldTab === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', oldTab);
      if (oldLabel === null) canvas.removeAttribute('aria-label'); else canvas.setAttribute('aria-label', oldLabel);
    };
  }, [gl, act]);
  return <>
    <DreiOrbitControls {...props} {...bindings} ref={setRef}
      enabled={!immersive && props.enabled !== false} enablePan enableRotate enableZoom screenSpacePanning
      autoRotate={!immersive && !interacted && !!props.autoRotate}
      onStart={begin} />
    {!immersive && props.enabled !== false && <group ref={hud}><Html fullscreen calculatePosition={() => [size.width / 2, size.height / 2]} zIndexRange={[35, 35]} style={{ pointerEvents: 'none' }}>
      <div className="explore-camera" style={{top: Math.min(100, size.height * .2)}} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
        <button type="button" className="explore-camera-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>↔ Camera</button>
        {open && <section id={id} aria-label="3D camera controls" className="explore-camera-panel" style={{maxHeight: Math.max(60, size.height - Math.min(100, size.height * .2) - 68)}}>
          <div className="explore-camera-modes" role="group" aria-label="Drag action">
            <button type="button" aria-pressed={mode === 'rotate'} onClick={() => setMode('rotate')}>Rotate</button>
            <button type="button" aria-pressed={mode === 'move'} onClick={() => setMode('move')}>Move</button>
          </div>
          <p>{mode === 'rotate' ? 'Drag to look around.' : 'Drag to shift the whole view.'} Two fingers move and pinch to zoom.</p>
          <div className="explore-camera-directions" role="group" aria-label={`${mode === 'move' ? 'Move' : 'Rotate'} camera`}>
            {(['left', 'up', 'down', 'right'] as const).map((direction, i) => <button type="button" key={direction} aria-label={`${mode === 'move' ? 'Move' : 'Rotate'} ${direction}`} onClick={() => act(direction)}>{['←', '↑', '↓', '→'][i]}</button>)}
          </div>
          <div className="explore-camera-modes">
            <button type="button" aria-label="Zoom in" onClick={() => act('closer')}>＋</button>
            <button type="button" aria-label="Zoom out" onClick={() => act('farther')}>−</button>
            <button type="button" onClick={() => act('reset')}>Reset view</button>
          </div>
          <small>Mouse: right-drag to move. Keyboard: arrows, +/−, R while the view is focused.</small>
          <button type="button" className="explore-camera-hide" onClick={() => setOpen(false)}>Hide controls</button>
        </section>}
      </div>
    </Html></group>}
  </>;
});
