import {describe,expect,it,vi} from 'vitest';
import {IMMERSIVE_XR_OPTIONS,immersiveVRError,startImmersiveVR} from './immersiveVR';
import {buildXRSessionInit} from '@pmndrs/xr/internals';

describe('native headset entry',()=>{
  it('disables emulated sessions, automatic entry, and flat HTML overlays',()=>{
    expect(IMMERSIVE_XR_OPTIONS).toMatchObject({emulate:false,offerSession:false,enterGrantedSession:false,domOverlay:false});
  });
  it('builds a floor-tracked native VR request without an HTML overlay',()=>{
    vi.stubGlobal('Element',class Element {});
    try{
      const init=buildXRSessionInit('immersive-vr',undefined,IMMERSIVE_XR_OPTIONS);
      expect(init.requiredFeatures).toContain('local-floor');
      expect(init.optionalFeatures).not.toContain('dom-overlay');
      expect(init.domOverlay).toBeUndefined();
    }finally{vi.unstubAllGlobals();}
  });
  it('requests the native session immediately in the user click, then verifies the renderer binding',async()=>{
    const session={end:vi.fn()} as unknown as XRSession;
    const store={enterVR:vi.fn(async()=>session),getState:()=>({session,mode:'immersive-vr' as const})};
    const pending=startImmersiveVR(store);
    expect(store.enterVR).toHaveBeenCalledOnce();
    expect(await pending).toBe(session);
    expect(session.end).not.toHaveBeenCalled();
  });
  it('never calls a flat or unbound session a successful VR entry',async()=>{
    for(const mode of ['inline',null] as const){
      const session={end:vi.fn(async()=>{})} as unknown as XRSession;
      await expect(startImmersiveVR({enterVR:async()=>session,getState:()=>({session,mode})})).rejects.toThrow('renderer');
      expect(session.end).toHaveBeenCalledOnce();
    }
    const session={end:vi.fn(async()=>{})} as unknown as XRSession;
    await expect(startImmersiveVR({enterVR:async()=>session,getState:()=>({mode:'immersive-vr'})})).rejects.toThrow('renderer');
    await expect(startImmersiveVR({enterVR:async()=>undefined,getState:()=>({mode:null})})).rejects.toThrow('did not start');
  });
  it('keeps permission failures visible with Quest-specific recovery advice',async()=>{
    const error=new Error('permission');error.name='NotAllowedError';
    await expect(startImmersiveVR({enterVR:()=>Promise.reject(error),getState:()=>({mode:null})})).rejects.toBe(error);
    expect(immersiveVRError(error)).toContain('Meta Quest Browser');
  });
});
