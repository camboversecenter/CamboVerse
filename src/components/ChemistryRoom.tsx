import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './ExploreControls';
import { Mesh, Quaternion, Vector3 } from "three";
import { waterExperiment, type Point } from "../chemistryBench";
import "./ChemistryRoom.css";

type Clock = { current: number };
function RoomCamera({ focused, revision }: { focused: boolean; revision: number }) {
  const camera = useThree(s=>s.camera);
  useEffect(()=>{camera.position.set(focused?0:5,focused?3.4:4,focused?5:8);camera.lookAt(0,focused?1.9:1,focused?0:-1);},[camera,focused,revision]);
  return null;
}
function Bond({ a, b, clock, start, end }: { a: Point; b: Point; clock: Clock; start: number; end: number }) {
  const ref = useRef<Mesh>(null);
  const delta = useMemo(() => new Vector3(...b).sub(new Vector3(...a)), [a,b]);
  const rotation = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0,1,0),delta.clone().normalize()),[delta]);
  useFrame(() => { if(ref.current) ref.current.visible = clock.current >= start && clock.current <= end; });
  return <mesh ref={ref} position={[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]} quaternion={rotation}>
    <cylinderGeometry args={[.035,.035,delta.length(),6]} /><meshStandardMaterial color="#8297a3" />
  </mesh>;
}
function Atom({ from, to, element, clock, ultra, selected, pick }: {from: Point; to: Point; element: string; clock: Clock; ultra: boolean; selected: boolean; pick: ()=>void}) {
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    const k = Math.max(0,Math.min(1,(clock.current-.25)/.5));
    const t = k*k*(3-2*k);
    ref.current?.position.set(from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t,from[2]+(to[2]-from[2])*t + Math.sin(k*Math.PI)*.45);
  });
  return <mesh ref={ref} position={from} onClick={e=>{e.stopPropagation();pick();}} castShadow={ultra}>
    <sphereGeometry args={[element==='O'?.15:.105,ultra?28:12,ultra?20:8]} />
    <meshStandardMaterial color={element==='O'?'#e56b5c':'#ecf3ef'} roughness={.35} emissive={selected?'#e7b451':'#000000'} emissiveIntensity={.5}/>
  </mesh>;
}
function Block({at,size,color,ultra=false,onClick}: {at:Point;size:Point;color:string;ultra?:boolean;onClick?:()=>void}) {
  return <mesh position={at} onClick={onClick} castShadow={ultra} receiveShadow={ultra}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;
}
export function ChemistryRoom({onBack,onOpenSpecimen}: {onBack:()=>void;onOpenSpecimen:(id:string)=>void}) {
  const [station,setStation]=useState<'room'|'bench'>('room');
  const [viewRevision,setViewRevision]=useState(0);
  const [ultra,setUltra]=useState(()=>{
    const mem=(navigator as Navigator & {deviceMemory?:number}).deviceMemory??4;
    return navigator.hardwareConcurrency>4 && mem>3 && window.innerWidth>500;
  });
  const [h,setH]=useState(2),[o,setO]=useState(1);
  const [playing,setPlaying]=useState(false),[progress,setProgress]=useState(0);
  const [prediction,setPrediction]=useState(''),[started,setStarted]=useState(false);
  const [picked,setPicked]=useState<string|null>(null);
  const clock=useRef(0);
  const reaction=useMemo(()=>waterExperiment(h,o),[h,o]);
  const seek=(p:number)=>{clock.current=p;setProgress(p);setPlaying(false);};
  const reset=()=>{seek(0);setStarted(false);setPrediction('');setPicked(null);};
  useEffect(()=>{
    if(!playing)return;
    let frame=0,last=performance.now(),publish=last;
    const tick=(now:number)=>{
      clock.current=Math.min(1,clock.current+Math.min(now-last,100)/7000);last=now;
      if(now-publish>100||clock.current===1){setProgress(clock.current);publish=now;}
      if(clock.current===1){setPlaying(false);return;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing]);
  const change=(kind:'h'|'o',amount:number)=>{reset();if(kind==='h')setH(Math.max(0,Math.min(4,h+amount)));else setO(Math.max(0,Math.min(2,o+amount)));};
  return <main className="chem-room">
    <header><button onClick={onBack}>← Learning Lab</button><strong>Chemistry studio <small>ROOM PILOT</small></strong><button onClick={()=>setUltra(!ultra)}>{ultra?'✨ Ultra':'🍃 Normal'}</button></header>
    <div className="chem-layout"><section className="chem-scene" aria-label="Interactive chemistry room">
      <Canvas shadows={ultra} dpr={ultra?[1,1.5]:1} camera={{position:[5,4,8],fov:45}}>
        <RoomCamera focused={station==='bench'} revision={viewRevision}/>
        <color attach="background" args={['#132c37']}/><ambientLight intensity={1.5}/><directionalLight position={[3,7,5]} intensity={2} castShadow={ultra} shadow-mapSize={[1024,1024]}/>
        <OrbitControls key={`${station}-${viewRevision}`} target={station==='bench'?[0,1.9,0]:[0,1,-1]} minDistance={3} maxDistance={13} maxPolarAngle={Math.PI*.48}/>
        <Block at={[0,-.12,0]} size={[12,.2,10]} color="#264955" ultra={ultra}/>
        <Block at={[0,2,-4]} size={[12,4.2,.15]} color="#315967"/>
        <Block at={[-6,2,0]} size={[.15,4.2,8]} color="#20434f"/>
        <Block at={[0,1,0]} size={[3.8,.16,2.3]} color="#d3dfd8" ultra={ultra} onClick={()=>setStation('bench')}/>
        {[-1.5,1.5].map(x=><Block key={x} at={[x,.45,0]} size={[.14,1,1.8]} color="#567780"/>)}
        <Block at={[-3.9,1,-2]} size={[2,.18,1.8]} color="#87b9b4" onClick={()=>onOpenSpecimen('water')}/>
        <Block at={[3.9,1,-2]} size={[2,.18,1.8]} color="#aa9ab5" onClick={()=>onOpenSpecimen('salt')}/>
        {[-4.6,-3.2,3.2,4.6].map(x=><Block key={x} at={[x,.45,-2]} size={[.12,1,1.5]} color="#567780"/>)}
        <group position={[0,1.15,0]}>
          {reaction.atoms.map(a=><Atom key={a.id} {...a} clock={clock} ultra={ultra} selected={picked===a.id} pick={()=>{setPicked(a.id);setStation('bench');}}/>)}
          {reaction.before.map(([a,b],i)=><Bond key={`b${h}-${o}-${i}`} a={reaction.atoms[a].from} b={reaction.atoms[b].from} clock={clock} start={0} end={.25}/>)}
          {reaction.after.map(([a,b],i)=><Bond key={`a${h}-${o}-${i}`} a={reaction.atoms[a].to} b={reaction.atoms[b].to} clock={clock} start={.75} end={1}/>)}
        </group>
      </Canvas>
      <div className="chem-scene-caption">{station==='bench'?'Reaction bench · drag to orbit · tap an atom':'Three stations · choose a station below'}<br/>White: hydrogen · Red: oxygen</div>
    </section>
    <aside className="chem-panel">
      <span className="chem-eyebrow">EXPLORE • PREDICT • OBSERVE</span><h1>{station==='room'?'Your chemistry room':'Make water, atom by atom'}</h1>
      <nav aria-label="Chemistry stations"><button onClick={()=>setStation('bench')}>01 Reaction bench</button><button onClick={()=>onOpenSpecimen('water')}>02 Molecule viewer</button><button onClick={()=>onOpenSpecimen('salt')}>03 Crystal viewer</button></nav>
      <button onClick={()=>setViewRevision(v=>v+1)}>Reset view</button>
      {station==='room'?<><p>A small studio for exploring molecules and following atoms through a reaction. Start at the reaction bench, or inspect the existing models.</p><button className="chem-primary" onClick={()=>setStation('bench')}>Start the water experiment →</button><p>Touch, mouse and keyboard supported. Headset controls and teleportation are a later milestone-not enabled in this pilot.</p></>:<>
        <button onClick={()=>{setPlaying(false);setStation('room');}}>← Back to room</button>
        <h2>1. Choose your molecules</h2><p>2 H₂ + O₂ → 2 H₂O</p>
        <div className="chem-quantity"><span>Hydrogen (H₂): {h}</span><button aria-label="Remove hydrogen" disabled={h===0} onClick={()=>change('h',-1)}>−</button><button aria-label="Add hydrogen" disabled={h===4} onClick={()=>change('h',1)}>+</button></div>
        <div className="chem-quantity"><span>Oxygen (O₂): {o}</span><button aria-label="Remove oxygen" disabled={o===0} onClick={()=>change('o',-1)}>−</button><button aria-label="Add oxygen" disabled={o===2} onClick={()=>change('o',1)}>+</button></div>
        <h2>2. Predict the product</h2><label>What will form? <select value={prediction} onChange={e=>setPrediction(e.target.value)}><option value="">Choose…</option><option value="water">Water molecules</option><option value="carbon">Carbon dioxide</option><option value="salt">Salt crystals</option></select></label>
        <div className="chem-actions"><button className="chem-primary" disabled={!prediction||!reaction.water} onClick={()=>{if(clock.current===1)seek(0);setStarted(true);setPlaying(true);}}>React / Replay</button><button disabled={!started} onClick={()=>setPlaying(!playing)}>{playing?'Pause':'Play'}</button><button onClick={reset}>Reset</button></div>
        {!reaction.water&&<p role="status">Add at least two H₂ molecules and one O₂ molecule to form water in this model.</p>}
        {started&&<><p role="status">{prediction==='water'?'Correct-water forms.':'The product is water. The atoms available cannot form your predicted product.'}</p><label>Reaction timeline <input aria-label="Reaction timeline" type="range" min="0" max="100" value={Math.round(progress*100)} onChange={e=>seek(Number(e.target.value)/100)}/></label><div className="chem-actions">{[0,.25,.75,1].map((p,i)=><button key={p} onClick={()=>seek(p)}>{['Reactants','Bonds open','New bonds','Products'][i]}</button>)}</div><p>{progress<.25?'Reactants':progress<.75?'Simplified atom rearrangement':'Products'} · {Math.round(progress*100)}%</p>{progress>=.75&&<p><strong>{reaction.water} H₂O formed.</strong> Left over: {reaction.leftH} H₂ and {reaction.leftO} O₂ (shown behind the products).</p>}</>}
        <h2>Atoms are conserved</h2><p>Before: {h*2} H · {o*2} O<br/>After: {h*2} H · {o*2} O</p>
        <label>Follow an atom <select value={picked??''} onChange={e=>setPicked(e.target.value||null)}><option value="">None selected</option>{reaction.atoms.map(a=><option key={a.id}>{a.id}</option>)}</select></label>
        {picked&&<p>{picked} stays the same atom throughout the animation.</p>}
      </>}
      <footer>Simplified molecular teaching model-not an exact reaction mechanism. No real-world mixing or ignition instructions. Never attempt this reaction outside an appropriately supervised laboratory.</footer>
    </aside></div>
  </main>;
}
