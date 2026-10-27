import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import { createXRStore, XR, XROrigin, useXR } from '@react-three/xr';
import { BackSide, MathUtils, PerspectiveCamera, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { PANORAMA_MANIFEST, panoramaDirection, panoramaStop, panoramaUrl, type PanoramaId, type PanoramaStop } from '../panoramaTour';
import './PanoramaTour.css';
import { LocationGuide } from './LocationGuide';
import { ObjectHotspotMarkers, ObjectInfoCard } from './ObjectHotspots';
import { objectInfoFor, roomObjectAnchors } from '../objectHotspots';

type Status = 'loading' | 'ready' | 'error';
type LookRequest = {yaw:number; pitch:number; zoom:number; reset:boolean};
function PhotoScene({id, stops, ultra, retry, onVisit, onStatus, onXR, look, onObject}: {
  id:PanoramaId; stops:PanoramaStop[]; ultra:boolean; retry:number; onVisit:(id:PanoramaId)=>void; onStatus:(status:Status)=>void;
  onXR:(active:boolean)=>void; look:React.MutableRefObject<LookRequest>;
  onObject:(id:string)=>void;
}) {
  const immersive=useXR(s=>s.session!=null);
  const camera=useThree(s=>s.camera), gl=useThree(s=>s.gl);
  const [photo,setPhoto]=useState<{texture:Texture; stop:PanoramaStop}|null>(null);
  const homeHeading=stops[0].heading;
  const orientation=useRef({yaw:homeHeading,pitch:0,fov:75});
  useEffect(()=>{onXR(immersive);},[immersive,onXR]);
  useEffect(()=>{
    let cancelled=false, timer:ReturnType<typeof setTimeout>|undefined, pending:Texture|null=null;
    const started=performance.now();
    onStatus('loading');
    new TextureLoader().load(panoramaUrl(id,ultra||immersive),texture=>{
      if(cancelled){texture.dispose();return;}
      texture.colorSpace=SRGBColorSpace;pending=texture;
      // Finish covering the previous view before swapping; keep global heading.
      timer=setTimeout(()=>{pending=null;setPhoto({texture,stop:panoramaStop(id,stops)});onStatus('ready');},Math.max(0,200-(performance.now()-started)));
    },undefined,()=>{if(!cancelled)onStatus('error');});
    return ()=>{cancelled=true;clearTimeout(timer);pending?.dispose();};
  },[id,stops,ultra,immersive,retry,onStatus]);
  useEffect(()=>()=>{photo?.texture.dispose();},[photo]);
  useEffect(()=>{
    const canvas=gl.domElement, points=new Map<number,{x:number;y:number}>();
    let pinch=0;
    const down=(e:PointerEvent)=>{
      if(gl.xr.isPresenting || e.button>0)return;
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      canvas.setPointerCapture(e.pointerId); canvas.focus({preventScroll:true});
      if(points.size===2){const [a,b]=[...points.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}
    };
    const move=(e:PointerEvent)=>{
      const old=points.get(e.pointerId);if(!old || gl.xr.isPresenting)return;
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(points.size===1){orientation.current.yaw+=(e.clientX-old.x)*.004;orientation.current.pitch+=(e.clientY-old.y)*.004;}
      else if(points.size===2){const [a,b]=[...points.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0&&distance>0)orientation.current.fov*=pinch/distance;pinch=distance;}
    };
    const up=(e:PointerEvent)=>{points.delete(e.pointerId);pinch=0;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
    const wheel=(e:WheelEvent)=>{if(gl.xr.isPresenting)return;e.preventDefault();orientation.current.fov+=Math.sign(e.deltaY)*3;};
    const key=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.altKey||e.metaKey||gl.xr.isPresenting)return;
      const state=orientation.current;
      if(e.key==='ArrowLeft')state.yaw+=.12;else if(e.key==='ArrowRight')state.yaw-=.12;
      else if(e.key==='ArrowUp')state.pitch+=.1;else if(e.key==='ArrowDown')state.pitch-=.1;
      else if(e.key==='+'||e.key==='=')state.fov-=5;else if(e.key==='-')state.fov+=5;
      else if(e.key.toLowerCase()==='r'){state.yaw=homeHeading;state.pitch=0;state.fov=75;}else return;
      e.preventDefault();
    };
    const clear=()=>{points.clear();pinch=0;};
    const oldTab=canvas.getAttribute('tabindex'), oldLabel=canvas.getAttribute('aria-label'), oldAction=canvas.style.touchAction;
    canvas.tabIndex=0;canvas.style.touchAction='none';canvas.setAttribute('aria-label','360 photo tour. Drag to look around. Arrow keys turn, plus and minus zoom.');
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);canvas.addEventListener('blur',clear);
    return ()=>{
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
      canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);canvas.removeEventListener('blur',clear);clear();canvas.style.touchAction=oldAction;
      if(oldTab===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',oldTab);
      if(oldLabel===null)canvas.removeAttribute('aria-label');else canvas.setAttribute('aria-label',oldLabel);
    };
  },[gl,homeHeading]);
  useFrame(()=>{
    if(immersive || !(camera instanceof PerspectiveCamera))return;
    const state=orientation.current, request=look.current;
    if(request.reset){state.yaw=homeHeading;state.pitch=0;state.fov=75;}
    state.yaw+=request.yaw;state.pitch+=request.pitch;state.fov+=request.zoom;
    request.yaw=request.pitch=request.zoom=0;request.reset=false;
    state.pitch=MathUtils.clamp(state.pitch,-Math.PI*.47,Math.PI*.47);state.fov=MathUtils.clamp(state.fov,40,95);
    camera.position.set(0,0,0);camera.rotation.set(state.pitch,state.yaw,0,'YXZ');
    if(camera.fov!==state.fov){camera.fov=state.fov;camera.updateProjectionMatrix();}
  });
  return <>
    <color attach="background" args={['#101b20']}/><XROrigin position={[0,0,0]}/>
    {photo && <>
      <group quaternion={photo.stop.orientation}><mesh scale={[-1,1,1]} rotation={[0,-Math.PI/2,0]}>
        <sphereGeometry args={[50,ultra||immersive?64:32,ultra||immersive?32:16]}/>
        <meshBasicMaterial map={photo.texture} toneMapped={false} side={BackSide}/>
      </mesh></group>
      {photo.stop.id===id && <ObjectHotspotMarkers onSelect={onObject} anchors={roomObjectAnchors(photo.stop.id).map(a=>({id:a.id,position:panoramaDirection(a.u,a.v,photo.stop.orientation)}))}/>}
      {photo.stop.links.map(link=><Billboard key={link.to} position={panoramaDirection(link.u,link.v,photo.stop.orientation)}>
        <mesh onClick={e=>{e.stopPropagation();if(e.delta<=5)onVisit(link.to);}}>
          <circleGeometry args={[.35,24]}/><meshBasicMaterial color="#eff4df" toneMapped={false}/>
        </mesh>
        <mesh position={[0,0,.01]} rotation={[0,0,-Math.PI/4]} raycast={()=>null}>
          <ringGeometry args={[.12,.19,4,1,0,Math.PI*1.5]}/><meshBasicMaterial color="#245638" toneMapped={false}/>
        </mesh>
        {!immersive && <Html center position={[0,-.56,0]} zIndexRange={[5,0]}>
          <button className="pano-link" onClick={()=>onVisit(link.to)}>Go to {panoramaStop(link.to,stops).title} →</button>
        </Html>}
      </Billboard>)}
    </>}
  </>;
}

function RoomTour({onBack,stops}:{onBack:()=>void;stops:PanoramaStop[]}) {
  const store=useMemo(()=>createXRStore({emulate:false}),[]);
  const [id,setId]=useState<PanoramaId>(stops[0].id),[status,setStatus]=useState<Status>('loading'),[retry,setRetry]=useState(0);
  const [ultra,setUltra]=useState(()=>navigator.hardwareConcurrency>4 && Math.min(screen.width,screen.height)>500);
  const [immersive,setImmersive]=useState(false),[vrSupported,setVrSupported]=useState(false),[vrError,setVrError]=useState('');
  const [panel,setPanel]=useState(false);
  const [selectedObject,setSelectedObject]=useState<string|null>(null),[guideObject,setGuideObject]=useState<string|undefined>();
  const [guideRequest,setGuideRequest]=useState(0);
  const look=useRef<LookRequest>({yaw:0,pitch:0,zoom:0,reset:false});
  const visit=useCallback((next:PanoramaId)=>{if(status==='loading'||next===id)return;setSelectedObject(null);setGuideObject(undefined);setStatus('loading');setId(next);},[status,id]);
  useEffect(()=>{
    let alive=true;
    navigator.xr?.isSessionSupported('immersive-vr').then(ok=>{if(alive)setVrSupported(ok);}).catch(()=>{});
    return ()=>{alive=false;};
  },[]);
  return <main className="pano-tour">
    <Canvas dpr={ultra||immersive?[1,1.5]:1} camera={{position:[0,0,0],fov:75,near:.01,far:100}} gl={{antialias:false}}>
      <XR store={store}><PhotoScene id={id} stops={stops} ultra={ultra} retry={retry} look={look} onVisit={visit} onStatus={setStatus} onXR={setImmersive} onObject={setSelectedObject}/></XR>
    </Canvas>
    <div className={`pano-fade${status==='loading'?' active':''}`} aria-hidden="true"/>
    <header className="pano-toolbar">
      <button onClick={onBack}>← Map</button><strong>Room photo tour · {stops.length} spots</strong>
      <div role="group" aria-label="Photo detail">{[false,true].map(detail=><button key={String(detail)} aria-pressed={(ultra||immersive)===detail} disabled={immersive||status==='loading'} onClick={()=>setUltra(detail)}>{detail?'Ultra':'Normal'}</button>)}</div>
      {vrSupported && <button onClick={()=>{setVrError('');store.enterVR().catch(()=>setVrError('VR could not start. Please try again.'));}}>Enter VR</button>}
    </header>
    {status==='loading' && <div className="pano-message" role="status">Loading {panoramaStop(id,stops).title}…</div>}
    {status==='error' && <div className="pano-message" role="alert">This photo could not load. <button onClick={()=>setRetry(n=>n+1)}>Retry photo</button></div>}
    <section className={`pano-panel${panel?'':' collapsed'}`} aria-label="Tour locations">
      <div className="pano-panel-heading"><h1>{panoramaStop(id,stops).title}</h1><button aria-expanded={panel} aria-controls="pano-locations" onClick={()=>setPanel(p=>!p)}>{panel?'Hide':'27 locations'}</button></div>
      {panel && <div id="pano-locations">
        <p>Drag to look around · pinch or scroll to zoom · tap a spot to move.</p>
        <nav aria-label="Choose a photo location">{stops.map((stop,index)=><button key={stop.id} disabled={status==='loading'} aria-current={id===stop.id?'location':undefined} onClick={()=>visit(stop.id)}>{index+1}. {stop.title}</button>)}</nav>
        <small>{stops.length} original panoramas. Tap an arrow to move between photographed positions.</small>
      </div>}
      {vrError && <p role="alert">{vrError}</p>}
    </section>
    {!immersive && <LocationGuide experienceId="room-360" locationId={id} objectId={guideObject} openRequest={guideRequest} hidden={!!selectedObject}/>}
    {!immersive && selectedObject && objectInfoFor('room-360',id,selectedObject) && <ObjectInfoCard
      key={`${id}/${selectedObject}`} object={objectInfoFor('room-360',id,selectedObject)!} onClose={()=>setSelectedObject(null)}
      onAsk={()=>{setGuideObject(selectedObject);setGuideRequest(n=>n+1);setSelectedObject(null);}}/>}
    {!immersive && <div className="pano-look" role="group" aria-label="Look and zoom controls">
      <button aria-label="Look left" onClick={()=>{look.current.yaw+=.2;}}>←</button><button aria-label="Look up" onClick={()=>{look.current.pitch+=.15;}}>↑</button>
      <button aria-label="Look down" onClick={()=>{look.current.pitch-=.15;}}>↓</button><button aria-label="Look right" onClick={()=>{look.current.yaw-=.2;}}>→</button>
      <button aria-label="Zoom in" onClick={()=>{look.current.zoom-=5;}}>＋</button><button aria-label="Zoom out" onClick={()=>{look.current.zoom+=5;}}>−</button>
      <button onClick={()=>{look.current.reset=true;}}>Reset</button>
    </div>}
  </main>;
}

export default function PanoramaTour({onBack}:{onBack:()=>void}) {
  const [stops,setStops]=useState<PanoramaStop[]|null>(null);
  const [error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();setError(false);
    fetch(PANORAMA_MANIFEST,{signal:abort.signal}).then(async response=>{
      if(!response.ok)throw new Error('Tour unavailable');
      const data:PanoramaStop[]=await response.json();
      if(!Array.isArray(data)||!data.length||data.some(s=>!s.id||s.orientation?.length!==4||!Array.isArray(s.links)))throw new Error('Invalid tour');
      if(!abort.signal.aborted)setStops(data);
    }).catch(()=>{if(!abort.signal.aborted)setError(true);});
    return ()=>abort.abort();
  },[retry]);
  if(!stops)return <main className="pano-tour"><div className="pano-message" role={error?'alert':'status'}>{error?'Room photos could not load.':'Loading the room photo tour…'}{error&&<button onClick={()=>setRetry(n=>n+1)}>Retry</button>}<button onClick={onBack}>← Map</button></div></main>;
  return <RoomTour stops={stops} onBack={onBack}/>;
}
