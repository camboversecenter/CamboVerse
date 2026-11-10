import type {XRDevice} from 'iwer';
import {vrSimulationEnabled} from './immersiveVR';

let pending: Promise<XRDevice | undefined> | undefined;

/** One runtime per local page, including React StrictMode and room switches. */
export function prepareLabSimulation(): Promise<XRDevice | undefined> {
  if (!vrSimulationEnabled(import.meta.env.DEV, window.location.hostname, window.location.search)) return Promise.resolve(undefined);
  return pending ??= (async () => {
    // Never replace a working headset runtime, even with the local test flag.
    if (await navigator.xr?.isSessionSupported('immersive-vr').catch(() => false)) return undefined;
    const [{XRDevice, metaQuest3}, {DevUI}] = await Promise.all([import('iwer'), import('@iwer/devui')]);
    const device = new XRDevice(metaQuest3, {ipd:0});
    // Desktop Chromium exposes navigator.xr even when there is no headset.
    // IWER otherwise refuses to install, leaving Enter VR disabled forever.
    try {
      device.installRuntime({forceInstall:true});
      device.installDevUI(DevUI);
    } catch (error) {
      device.uninstallRuntime();
      throw error;
    }
    return device;
  })().catch(error => {pending = undefined; throw error;});
}
