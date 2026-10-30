/** Shared native headset configuration. Never offer inline or emulated VR. */
export const IMMERSIVE_XR_OPTIONS={
  emulate:false,offerSession:false,enterGrantedSession:false,
  domOverlay:false,anchors:false,hitTest:false,planeDetection:false,meshDetection:false,
} as const;

export type VRSupport = {ready:boolean; code:string; message:string};

/** DOMException (and exceptions from another realm) need not be instanceof Error. */
export function immersiveVRFailure(error:unknown):{name:string;message:string} {
  const value=error as {name?:unknown;message?:unknown}|null;
  return {
    name:typeof value?.name==='string'?value.name.slice(0,80):'Error',
    message:typeof value?.message==='string'?value.message.slice(0,420):'Unknown session error',
  };
}

/** Keep a failed permissions check distinct from a device without WebXR. */
export async function checkImmersiveVR(environment:{
  secure:boolean;
  xr?:Pick<XRSystem,'isSessionSupported'>;
  spatialTrackingAllowed?:boolean;
}):Promise<VRSupport> {
  if(!environment.secure)return {ready:false,code:'https-required',message:'Open this site over HTTPS in Meta Quest Browser. A plain HTTP address on your Wi-Fi network cannot start VR.'};
  if(environment.spatialTrackingAllowed===false)return {ready:false,code:'policy-blocked',message:'This page is blocked from using headset tracking. Open the site directly in Meta Quest Browser, outside an embedded preview.'};
  if(!environment.xr)return {ready:false,code:'webxr-missing',message:'This browser is not exposing WebXR. Open this link directly in Meta Quest Browser on your headset.'};
  try{
    const ready=await environment.xr.isSessionSupported('immersive-vr');
    return ready?{ready:true,code:'ready',message:'Headset ready. Press Enter VR to enter the scene.'}
      :{ready:false,code:'headset-unavailable',message:'The browser reports immersive VR is unavailable. Open this link directly in Meta Quest Browser, then check again.'};
  }catch(error){
    return {ready:false,code:immersiveVRFailure(error).name,message:immersiveVRError(error)};
  }
}

type NativeVRStore={
  enterVR:()=>Promise<XRSession|undefined>;
  getState:()=>{session?:XRSession;mode:XRSessionMode|null};
};

/** Call directly in the click handler, before any awaited work, so Quest keeps
 * the user activation required by requestSession('immersive-vr'). The XR store
 * binds through Three's sessionstart event, not a fullscreen/browser flag. */
export async function startImmersiveVR(store:NativeVRStore):Promise<XRSession> {
  const session=await store.enterVR();
  if(!session)throw new Error('The headset did not start a VR session.');
  const state=store.getState();
  if(state.session!==session||state.mode!=='immersive-vr'){
    await session.end().catch(()=>{});
    throw new Error('The headset renderer did not enter immersive VR.');
  }
  return session;
}

export function immersiveVRError(error:unknown):string {
  const failure=immersiveVRFailure(error);
  if(failure.name==='NotAllowedError'||failure.name==='SecurityError')return 'VR permission was not granted. Open the link directly in Meta Quest Browser, allow VR access, then try again.';
  if(failure.name==='NotSupportedError')return 'Immersive VR is unavailable here. Open this HTTPS link directly in Meta Quest Browser.';
  if(failure.name==='InvalidStateError')return 'Another immersive session may already be open. Exit it from the headset menu, then try again.';
  if(failure.message.includes('not connected to three.js'))return 'The 3D scene is still starting. Wait for it to appear, then press Enter VR again.';
  return 'The immersive headset session could not start. Open the link directly in Meta Quest Browser and try again.';
}
