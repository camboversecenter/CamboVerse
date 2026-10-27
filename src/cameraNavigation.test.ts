import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOUSE, TOUCH, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three-stdlib';
import { advanceCameraTravel, cameraKey, moveCamera, navigationBindings, settleCamera, viewpointOrbitLimit } from './cameraNavigation';
import { SPOTS } from './spots';
import { regionalOverviewCamera } from './regionalCamera';

// Real bundled OrbitControls, synthetic DOM events; not a browser/WebGL test.
class Surface extends EventTarget {
  style = { touchAction: '' };
  clientWidth = 800; clientHeight = 600;
  ownerDocument = new EventTarget();
  releasePointerCapture() {}
}
function setup(mode: 'rotate' | 'move' = 'rotate') {
  const surface = new Surface(), camera = new PerspectiveCamera(50, 4 / 3, .1, 2000);
  camera.position.set(5, 5, 12);
  const controls = new OrbitControls(camera, surface as unknown as HTMLElement);
  controls.target.set(0, 1, 0); controls.update();
  Object.assign(controls, navigationBindings(mode));
  controls.enableDamping = false; controls.screenSpacePanning = true;
  return { surface, camera, controls };
}
function pointer(surface: Surface, type: string, x: number, y: number, options: Record<string, unknown> = {}) {
  const event = Object.assign(new Event(type, { cancelable: true }), { clientX:x, clientY:y, pageX:x, pageY:y, pointerId:1, pointerType:'mouse', button:0, ...options });
  (type === 'pointerdown' ? surface : surface.ownerDocument).dispatchEvent(event);
}

describe('shared 3D exploration controls', () => {
  it('maps one-finger rotate/move and always keeps two-finger pan + pinch', () => {
    expect(navigationBindings('rotate').mouseButtons.LEFT).toBe(MOUSE.ROTATE);
    expect(navigationBindings('move').touches.ONE).toBe(TOUCH.PAN);
    for (const mode of ['rotate','move'] as const) {
      expect(navigationBindings(mode).touches.TWO).toBe(TOUCH.DOLLY_PAN);
      expect(navigationBindings(mode).mouseButtons.RIGHT).toBe(MOUSE.PAN);
    }
  });
  it('left drag changes the angle without shifting the target', () => {
    const {surface,camera,controls}=setup(), before=camera.position.clone(), target=controls.target.clone(), distance=controls.getDistance();
    pointer(surface,'pointerdown',100,100); pointer(surface,'pointermove',230,150); pointer(surface,'pointerup',230,150);
    expect(camera.position.distanceTo(before)).toBeGreaterThan(1);
    expect(controls.target.distanceTo(target)).toBeLessThan(1e-8);
    expect(controls.getDistance()).toBeCloseTo(distance); controls.dispose();
  });
  it.each(['right mouse','move mouse','move touch'])('%s moves both camera and pivot together', kind => {
    const {surface,camera,controls}=setup(kind==='right mouse'?'rotate':'move');
    const before=camera.position.clone(), target=controls.target.clone(), direction=camera.getWorldDirection(new Vector3());
    const options=kind==='right mouse'?{button:2}:kind==='move touch'?{pointerType:'touch'}:{};
    pointer(surface,'pointerdown',100,100,options); pointer(surface,'pointermove',210,160,options); pointer(surface,'pointerup',210,160,options);
    expect(controls.target.distanceTo(target)).toBeGreaterThan(.1);
    expect(camera.position.clone().sub(before).distanceTo(controls.target.clone().sub(target))).toBeLessThan(1e-8);
    expect(camera.getWorldDirection(new Vector3()).distanceTo(direction)).toBeLessThan(1e-8); controls.dispose();
  });
  it('two-finger movement pans and pinch changes viewing distance', () => {
    const {surface,controls}=setup(), distance=controls.getDistance(), target=controls.target.clone();
    pointer(surface,'pointerdown',100,100,{pointerType:'touch',pointerId:1});
    pointer(surface,'pointerdown',200,100,{pointerType:'touch',pointerId:2});
    pointer(surface,'pointermove',280,130,{pointerType:'touch',pointerId:2});
    pointer(surface,'pointerup',100,100,{pointerType:'touch',pointerId:1});
    pointer(surface,'pointerup',280,130,{pointerType:'touch',pointerId:2});
    expect(controls.getDistance()).toBeLessThan(distance); expect(controls.target.distanceTo(target)).toBeGreaterThan(.1); controls.dispose();
  });
  it('button actions obey zoom/angle limits and reset restores the saved view', () => {
    const {camera,controls}=setup(); controls.minDistance=2; controls.maxDistance=25; controls.maxPolarAngle=1.5;
    controls.saveState(); const before=camera.position.clone(), target=controls.target.clone();
    for(let i=0;i<50;i++) moveCamera(controls,'closer','rotate');
    expect(controls.getDistance()).toBeCloseTo(2);
    for(let i=0;i<50;i++) moveCamera(controls,'farther','rotate');
    expect(controls.getDistance()).toBeCloseTo(25);
    for(let i=0;i<50;i++) moveCamera(controls,'down','rotate');
    expect(controls.getPolarAngle()).toBeLessThanOrEqual(1.5+1e-8);
    moveCamera(controls,'left','move'); settleCamera(controls); controls.reset();
    expect(camera.position.distanceTo(before)).toBeLessThan(1e-8); expect(controls.target.distanceTo(target)).toBeLessThan(1e-8);
    controls.enabled=false; moveCamera(controls,'up','move'); expect(camera.position.distanceTo(before)).toBeLessThan(1e-8); controls.dispose();
  });
  it('supports orthographic zoom and ignores unrelated keyboard shortcuts', () => {
    const camera=new OrthographicCamera(-5,5,5,-5,.1,100); camera.position.set(0,3,10);
    const controls=new OrbitControls(camera); controls.minZoom=.5; controls.maxZoom=2;
    moveCamera(controls,'closer','move'); expect(camera.zoom).toBeCloseTo(1.2);
    moveCamera(controls,'left','move'); expect(controls.target.x).toBeLessThan(0);
    expect(cameraKey('ArrowLeft')).toBe('left'); expect(cameraKey('R')).toBe('reset');
    expect(cameraKey('w')).toBeUndefined(); expect(cameraKey('toString')).toBeUndefined(); controls.dispose();
  });
  it('fits every site viewpoint, including portrait regional views', () => {
    for(const site of SPOTS) for(const pose of [site.overview,...site.pois??[]].filter(p=>!!p)) {
      for(const aspect of [.4,1.6]) {
        const position=regionalOverviewCamera(pose!,aspect), distance=new Vector3(...position).distanceTo(new Vector3(...pose!.target));
        expect(viewpointOrbitLimit(position,pose!.target,20),`${site.id}/${pose!.id}`).toBeGreaterThan(distance);
      }
    }
  });
  it('guided travel finishes even at an unreachable angle and can be cancelled', () => {
    for(const fps of [15,60,120]) {
      const {controls,camera}=setup(); controls.maxPolarAngle=1; controls.maxDistance=200;
      const travel={done:false,elapsed:0}, position=new Vector3(80,1,100), target=new Vector3(0,10,0);
      for(let i=0;i<fps*2;i++) advanceCameraTravel(controls,position,target,travel,1/fps);
      expect(travel.done).toBe(true); expect(controls.enabled).toBe(true);
      moveCamera(controls,'left','move'); const manual=camera.position.clone();
      advanceCameraTravel(controls,position,target,travel,1/fps); expect(camera.position.equals(manual)).toBe(true);
      controls.dispose();
    }
  });
  it('all orbit-based feature views use the shared controls and allow panning', () => {
    const files=readdirSync('src/components',{recursive:true}).filter(f=>String(f).endsWith('.tsx'));
    let count=0;
    for(const file of files) {
      if(file==='ExploreControls.tsx') continue;
      const source=readFileSync(`src/components/${file}`,'utf8');
      if(!source.includes('<OrbitControls')) continue;
      count++; expect(source,String(file)).toContain('ExploreControls as OrbitControls');
      expect(source,String(file)).not.toContain('enablePan={false}');
    }
    // Current inventory: 19 views instantiate OrbitControls; wrapper-only
    // views use Viewer and are covered through it rather than counted twice.
    expect(count).toBe(19);
    expect(readFileSync('src/splat-preview.tsx','utf8')).toContain('ExploreControls as OrbitControls');
    const shared=readFileSync('src/components/ExploreControls.tsx','utf8');
    expect(shared).toContain('sessionstart'); expect(shared).toContain('removeEventListener');
    const viewer=readFileSync('src/components/Viewer.tsx','utf8');
    expect(viewer).toContain("addEventListener('start', cancel)"); expect(viewer).not.toContain('controls.enabled = !poi');
  });
});
