import { MOUSE, TOUCH, Spherical, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';

export type DragMode = 'rotate' | 'move';
export type CameraAction = 'left' | 'right' | 'up' | 'down' | 'closer' | 'farther';

export function navigationBindings(mode: DragMode) {
  return {
    mouseButtons: { LEFT: mode === 'move' ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN },
    touches: { ONE: mode === 'move' ? TOUCH.PAN : TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN },
  };
}

/** No window listeners: keyboard shortcuts belong only to the focused canvas. */
export function cameraKey(key: string): CameraAction | 'reset' | undefined {
  const keys: Record<string, CameraAction | 'reset'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    '+': 'closer', '=': 'closer', '-': 'farther', r: 'reset', R: 'reset' };
  return Object.hasOwn(keys, key) ? keys[key] : undefined;
}

/** Clear queued drag inertia before a button action or a reset. */
export function settleCamera(controls: OrbitControls) {
  const damping = controls.enableDamping, spin = controls.autoRotate;
  controls.enableDamping = false; controls.autoRotate = false;
  controls.update();
  controls.enableDamping = damping; controls.autoRotate = spin;
}

export function moveCamera(controls: OrbitControls, action: CameraAction, mode: DragMode) {
  if (!controls.enabled) return;
  settleCamera(controls);
  const camera = controls.object;
  const offset = camera.position.clone().sub(controls.target);
  const distance = Math.max(.001, offset.length());
  if (action === 'closer' || action === 'farther') {
    if ('isOrthographicCamera' in camera) {
      camera.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, camera.zoom * (action === 'closer' ? 1.2 : 1 / 1.2)));
      camera.updateProjectionMatrix();
    } else {
      offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, distance * (action === 'closer' ? .82 : 1 / .82))));
      camera.position.copy(controls.target).add(offset);
    }
  } else if (mode === 'move') {
    camera.updateMatrix();
    const horizontal = action === 'left' || action === 'right';
    const direction = new Vector3().setFromMatrixColumn(camera.matrix, horizontal ? 0 : 1);
    const span = 'isOrthographicCamera' in camera ? (camera.top - camera.bottom) / camera.zoom : distance;
    direction.multiplyScalar(span * .12 * (action === 'left' || action === 'down' ? -1 : 1));
    camera.position.add(direction); controls.target.add(direction);
  } else {
    const spherical = new Spherical().setFromVector3(offset);
    if (action === 'left' || action === 'right') spherical.theta += action === 'left' ? -.18 : .18;
    else spherical.phi += action === 'up' ? -.12 : .12;
    spherical.theta = Math.max(controls.minAzimuthAngle, Math.min(controls.maxAzimuthAngle, spherical.theta));
    spherical.phi = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, spherical.phi));
    spherical.makeSafe();
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
  }
  controls.update();
}

/** A saved viewpoint must fit inside the controls' zoom range. */
export function viewpointOrbitLimit(camera: readonly number[], target: readonly number[], baseline: number) {
  const distance = Math.hypot(...camera.map((v, i) => v - target[i]));
  return Math.max(baseline, Number.isFinite(distance) ? distance * 1.5 : baseline);
}

export type CameraTravel = { elapsed: number; done: boolean };
/** Frame-rate independent and bounded even when a viewpoint meets an angle limit. */
export function advanceCameraTravel(controls: OrbitControls, position: Vector3, target: Vector3, travel: CameraTravel, dt: number) {
  if (travel.done) return;
  const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  travel.elapsed += delta;
  const blend = 1 - Math.exp(-6 * Math.min(delta, .1));
  controls.object.position.lerp(position, blend);
  controls.target.lerp(target, blend);
  controls.update();
  if (travel.elapsed >= 1.5 || (controls.object.position.distanceTo(position) < .06 && controls.target.distanceTo(target) < .06)) {
    controls.object.position.copy(position); controls.target.copy(target); controls.update();
    travel.done = true;
  }
}
