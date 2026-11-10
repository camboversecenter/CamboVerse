// @vitest-environment jsdom
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import type {XRDevice} from 'iwer';

// Keep IWER's actual XR runtime and controllers. The DevUI renderer needs a GPU.
vi.mock('@iwer/devui', () => ({DevUI:class {render() {} get devUIContainer() {return document.createElement('div');}}}));
let device: XRDevice | undefined;
let native: {isSessionSupported: ReturnType<typeof vi.fn>};
beforeEach(() => {
  vi.resetModules();
  window.history.replaceState({}, '', '?vr-sim=1');
  native = {isSessionSupported:vi.fn(async () => false)};
  Object.defineProperty(navigator, 'xr', {configurable:true, value:native});
  vi.stubGlobal('WebGL2RenderingContext', class {});
});
afterEach(() => {
  device?.uninstallRuntime();
  device = undefined;
  Reflect.deleteProperty(navigator, 'xr');
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});
it('replaces the no-headset desktop stub once and supports immersive exit and re-entry', async () => {
  const {prepareLabSimulation} = await import('./labVRSimulation');
  const [first, second] = await Promise.all([prepareLabSimulation(), prepareLabSimulation()]);
  device = first;
  expect(first).toBeDefined();
  expect(second).toBe(first);
  expect(device?.controllers.left).toBeDefined();
  expect(device?.controllers.right).toBeDefined();
  expect(await navigator.xr!.isSessionSupported('immersive-vr')).toBe(true);
  for (let i = 0; i < 2; i++) {
    const session = await navigator.xr!.requestSession('immersive-vr');
    await session.end();
  }
});
it('preserves native immersive hardware and stays opt-in on desktop', async () => {
  const {prepareLabSimulation} = await import('./labVRSimulation');
  window.history.replaceState({}, '', '/');
  expect(await prepareLabSimulation()).toBeUndefined();
  expect(native.isSessionSupported).not.toHaveBeenCalled();
  window.history.replaceState({}, '', '?vr-sim=1');
  native.isSessionSupported.mockResolvedValue(true);
  expect(await prepareLabSimulation()).toBeUndefined();
  expect(navigator.xr).toBe(native);
});
