import {Suspense,useMemo,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {createXRStore,XR} from '@react-three/xr';
import {VRObjectHotspots} from './VRObjectHotspots';
import {VRCaptureGuide} from './VRCaptureGuide';
import {ImmersiveVREntry} from './CaptureVR';
import {IMMERSIVE_XR_OPTIONS,vrSimulationEnabled} from '../immersiveVR';
import {guideLanguage,useGuideLanguage} from '../lib/guideLanguage';

/** Dev-only review scene uses the production meshes and interactions without
 * downloading either scan. The optional emulator exercises stereo/controllers. */
export default function VRInterfacePreview(){
  const [view,setView]=useState('labels'),[revision,setRevision]=useState(0);
  const {language,choose}=useGuideLanguage();
  const store=useMemo(()=>createXRStore({...IMMERSIVE_XR_OPTIONS,emulate:vrSimulationEnabled(import.meta.env.DEV,location.hostname,location.search)?{type:'metaQuest3',inject:true,syntheticEnvironment:false}:false}),[]);
  return <main style={{position:'fixed',inset:0,background:'#10231f',color:'#faf4d8'}}>
    <Canvas camera={{position:[0,1.6,0],fov:60}} dpr={[1,1.5]}>
      <color attach="background" args={['#10231f']}/>
      <XR store={store}><Suspense fallback={null}>
        <group key={`${view}-${revision}`}>
          {view==='labels'?<VRObjectHotspots anchors={[{id:'naga-balustrade',position:[-.42,1.55,-2.3]},{id:'guardian-lion',position:[.5,2,-3]}]} scale={1} penhGuide/>:
            <VRCaptureGuide locationId={view} scale={1} onClose={()=>setView('labels')}/>}
        </group>
        <gridHelper args={[20,20,'#405b4c','#223d32']} position={[0,0,-4]}/>
      </Suspense></XR>
    </Canvas>
    <nav aria-label="VR interface preview" style={{position:'absolute',top:12,left:12,right:12,display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
      <strong>VR interface preview · local only</strong>
      <button onClick={()=>{setView('labels');setRevision(n=>n+1);}}>Object labels</button>
      <button onClick={()=>setView('naga-staircase')}>Penh · Staircase</button>
      <button onClick={()=>setView('flower-clock')}>Penh · Clock</button>
      <select aria-label="Guide language" value={language.code} onChange={e=>choose(guideLanguage(e.target.value).code)}>
        <option value="en">English</option><option value="km">ខ្មែរ</option><option value="fr">Français</option><option value="zh">中文</option>
      </select>
      <ImmersiveVREntry store={store} title="Interface preview" className="vr-preview-entry"/>
      <a href="/?site=wat-phnom&vr-sim=1" style={{color:'#e8d88f'}}>Full Wat Phnom simulator</a>
    </nav>
    <p style={{position:'absolute',bottom:8,left:16,pointerEvents:'none'}}>Click the same 3D labels and controls used in VR. Add &amp;vr-sim=1 for the Quest emulator.</p>
  </main>;
}
