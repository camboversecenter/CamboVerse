import {describe,expect,it,vi} from 'vitest';
import {IMMERSIVE_XR_OPTIONS,checkImmersiveVR,immersiveVRError,startImmersiveVR} from './immersiveVR';
import {buildXRSessionInit,createXRStore} from '@pmndrs/xr/internals';

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
  it('distinguishes HTTPS, policy, browser API, and headset failures',async()=>{
    const xr={isSessionSupported:vi.fn(async()=>true)};
    expect((await checkImmersiveVR({secure:false,xr})).code).toBe('https-required');
    expect((await checkImmersiveVR({secure:true,xr,spatialTrackingAllowed:false})).code).toBe('policy-blocked');
    expect((await checkImmersiveVR({secure:true})).code).toBe('webxr-missing');
    expect(xr.isSessionSupported).not.toHaveBeenCalled();
    expect((await checkImmersiveVR({secure:true,xr})).ready).toBe(true);
    expect(xr.isSessionSupported).toHaveBeenCalledWith('immersive-vr');
    xr.isSessionSupported.mockResolvedValue(false);
    expect((await checkImmersiveVR({secure:true,xr})).code).toBe('headset-unavailable');
    const denied=new Error('tracking denied');denied.name='SecurityError';
    xr.isSessionSupported.mockRejectedValue(denied);
    expect(await checkImmersiveVR({secure:true,xr})).toMatchObject({ready:false,code:'SecurityError'});
  });
  it('connects the installed XR store to the native request and Three sessionstart lifecycle',async()=>{
    // Native hardware and GPU boundary only are faked; the installed XR store,
    // session-init builder and our entry helper are exercised together.
    const nativeSession=Object.assign(new EventTarget(),{
      inputSources:[],environmentBlendMode:'opaque',visibilityState:'visible',
      end:vi.fn(async()=>nativeSession.dispatchEvent(new Event('end'))),
    }) as unknown as XRSession;
    const requestSession=vi.fn(async()=>nativeSession);
    vi.stubGlobal('navigator',{userAgent:'OculusBrowser',xr:{requestSession}});
    vi.stubGlobal('Element',class Element {});
    vi.stubGlobal('XRWebGLLayer',{getNativeFramebufferScaleFactor:()=>1});
    const events=new EventTarget();
    const manager={
      addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),
      setReferenceSpaceType:vi.fn(),getSession:()=>nativeSession,
      setSession:vi.fn(async()=>events.dispatchEvent(new Event('sessionstart'))),
    };
    const store=createXRStore(IMMERSIVE_XR_OPTIONS);
    try{
      store.setWebXRManager(manager as never);
      const starting=startImmersiveVR(store);
      expect(requestSession).toHaveBeenCalledWith('immersive-vr',expect.objectContaining({requiredFeatures:['local-floor']}));
      expect(await starting).toBe(nativeSession);
      expect(manager.setSession).toHaveBeenCalledWith(nativeSession);
      expect(store.getState().mode).toBe('immersive-vr');
      await nativeSession.end();
      expect(store.getState().session).toBeUndefined();
      expect(store.getState().mode).toBeNull();
    }finally{store.destroy();vi.unstubAllGlobals();}
  });
});
