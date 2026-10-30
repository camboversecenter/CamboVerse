/** Shared native headset configuration. Never offer inline or emulated VR. */
export const IMMERSIVE_XR_OPTIONS={
  emulate:false,offerSession:false,enterGrantedSession:false,
  domOverlay:false,anchors:false,hitTest:false,planeDetection:false,meshDetection:false,
} as const;

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
  if(error instanceof Error){
    if(error.name==='NotAllowedError'||error.name==='SecurityError')return 'VR permission was not granted. Open the link directly in Meta Quest Browser, allow VR access, then try again.';
    if(error.name==='NotSupportedError')return 'Immersive VR is unavailable here. Open this HTTPS link directly in Meta Quest Browser.';
    if(error.name==='InvalidStateError')return 'Another immersive session may already be open. Exit it from the headset menu, then try again.';
  }
  return 'The immersive headset session could not start. Open the link directly in Meta Quest Browser and try again.';
}
