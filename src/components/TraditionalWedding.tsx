import { useEffect, useMemo, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { BoxGeometry, CanvasTexture, DoubleSide, LatheGeometry, SRGBColorSpace, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Detail } from './LabOrgans';
import { WEDDING_ITEMS, type WeddingObject } from '../weddingStudy';

type V3 = [number, number, number];
type Piece = { at: V3; size: V3 };
const floorY = 0.22;

/** One material/draw call for repeated timber, including in Normal. */
export function Timber({ pieces, color = '#735036', detail }: { pieces: Piece[]; color?: string; detail: Detail }) {
  const grain = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e4ddd0'; ctx.fillRect(0,0,128,128);
    for(let i=0;i<80;i++) {
      const x=(i*43)%128;
      ctx.strokeStyle=`rgba(70,48,25,${.06+(i%5)*.025})`;
      ctx.lineWidth=i%3 ? .5 : 1;
      ctx.beginPath(); ctx.moveTo(x,0);
      ctx.bezierCurveTo(x+Math.sin(i)*5,42,x-Math.sin(i)*4,88,x+2,128); ctx.stroke();
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => grain.dispose(), [grain]);
  const geometry = useMemo(() => {
    const boxes = pieces.map(p => new BoxGeometry(...p.size).translate(...p.at));
    const merged = mergeGeometries(boxes);
    boxes.forEach(g => g.dispose());
    return merged;
  }, [pieces]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow={detail === 'ultra'} receiveShadow>
    <meshStandardMaterial color={color} map={grain} roughness={0.86} />
  </mesh>;
}

/** Locally generated weave; no image download or per-strand draw calls. */
export function useWeave() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#baa174'; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) {
      ctx.fillStyle = (x + y) % 8 ? '#cdb78c' : '#998056';
      ctx.fillRect(x, y, 3, 2);
    }
    ctx.strokeStyle = '#764936'; ctx.lineWidth = 9; ctx.strokeRect(12, 12, 232, 232);
    ctx.lineWidth = 2; ctx.strokeRect(22, 22, 212, 212);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function WeddingCamera({ close }: { close: boolean }) {
  const { camera, size, gl } = useThree();
  useEffect(() => {
    if (gl.xr.isPresenting) return;
    const reach = close ? 1.9 : 3.8;
    const d = Math.min(20, Math.max(close ? 3.4 : 9.6, reach / (Math.tan(Math.PI * 25 / 180) * size.width / size.height)));
    camera.position.set(d * 0.22, d * (close ? .66 : .42), d * .90);
    camera.lookAt(0, 0.65, 0); camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, gl, close]);
  return null;
}

/** Neutral daylight makes the wood and small metal objects readable on a phone. */
export function WeddingLight({ detail }: { detail: Detail }) {
  return <>
    <color attach="background" args={['#cbd7cf']} />
    <fog attach="fog" args={['#cbd7cf',28,80]} />
    <hemisphereLight args={['#fff6e6','#a4a28d',1.8]} />
    <directionalLight position={[-7,12,8]} color="#fff1d7" intensity={2.2} castShadow={detail==='ultra'} shadow-mapSize={[1024,1024]} shadow-bias={-.0003} shadow-normalBias={.025} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
    <directionalLight position={[6,7,-4]} color="#d9e6eb" intensity={.8} />
  </>;
}

export function Vessel({ detail, bowl = false }: { detail: Detail; bowl?: boolean }) {
  const geometry = useMemo(() => new LatheGeometry((bowl
    ? [[0,0],[.16,0],[.17,.04],[.13,.08],[.24,.15],[.29,.28],[.28,.31],[.26,.29],[.22,.16],[0,.10]]
    : [[0,0],[.17,0],[.18,.035],[.09,.07],[.055,.19],[.09,.23],[.30,.29],[.32,.34],[.30,.35],[.28,.30],[0,.27]]
  ).map(([x,y]) => new Vector2(x,y)), detail === 'ultra' ? 36 : 12), [detail, bowl]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow={detail === 'ultra'} receiveShadow>
    <meshStandardMaterial color="#c7b18a" roughness={0.34} metalness={0.48} />
  </mesh>;
}

export function FruitTray({ detail, betel = false }: { detail: Detail; betel?: boolean }) {
  const n = detail === 'ultra' ? 20 : 8;
  return <group><Vessel detail={detail} />
    {Array.from({length: 5}, (_,i) => {
      const a = i * Math.PI * 2 / 5;
      return <group key={i} position={[Math.cos(a)*.15,.36,Math.sin(a)*.15]} rotation={[0,-a,0]}>
        {betel && <mesh rotation={[-.9,0,.25]} scale={[.8,1.7,.15]}><sphereGeometry args={[.1,n,8]} /><meshStandardMaterial color="#526a2a" roughness={.85} /></mesh>}
        <mesh position={[0,betel ? .045 : .02,0]} scale={betel ? [.7,1,.7] : [1,1,1]} castShadow={detail === 'ultra'}>
          <sphereGeometry args={[betel ? .055 : .088,n,10]} /><meshStandardMaterial color={betel ? '#996345' : i%2 ? '#d7ab46' : '#779149'} roughness={.8} />
        </mesh>
      </group>;
    })}
  </group>;
}

export function Flame({ detail }: { detail: Detail }) {
  return <group>
    <mesh position={[0,.12,0]}><cylinderGeometry args={[.018,.022,.24,detail === 'ultra' ? 16 : 8]} /><meshStandardMaterial color="#efe1ba" roughness={.9} /></mesh>
    <mesh position={[0,.263,0]} scale={[.65,1.8,.65]}><sphereGeometry args={[.018,8,6]} /><meshBasicMaterial color="#ffd18a" /></mesh>
  </group>;
}

function Blossoms({ detail }: { detail: Detail }) {
  // All branches stay in Normal; only their radial segments change.
  return <group rotation={[.25,0,-.3]}>
    <mesh position={[0,.32,0]}><cylinderGeometry args={[.012,.022,.64,8]} /><meshStandardMaterial color="#899457" /></mesh>
    {Array.from({length: 9},(_,i) => <group key={i} position={[0,.12+i*.05,0]} rotation={[0,i*2.4,i%2 ? .7 : -.7]}>
      <mesh position={[0,.12,0]}><cylinderGeometry args={[.006,.012,.25,6]} /><meshStandardMaterial color="#c9c297" /></mesh>
      {[0,1,2,3].map(j => <mesh key={j} position={[(j%2 ? 1 : -1)*.028,.06+j*.05,0]} scale={[1,1.4,1]}>
        <sphereGeometry args={[.027,detail === 'ultra' ? 10 : 6,6]} /><meshStandardMaterial color="#eee7c7" roughness={.8} />
      </mesh>)}
    </group>)}
  </group>;
}

function Threads({ detail }: { detail: Detail }) {
  return <group rotation={[-Math.PI/2,0,0]}>
    {[0,1,2].map(i => <mesh key={i} position={[i*.09-.09,0,i*.008]}>
      <torusGeometry args={[.14,.009,6,detail === 'ultra' ? 48 : 16]} /><meshStandardMaterial color="#fff8e7" roughness={1} />
    </mesh>)}
  </group>;
}

function Sword({ detail }: { detail: Detail }) {
  return <group rotation={[0,0,-Math.PI/2]}>
    <mesh position={[0,.35,0]} scale={[1,1,.52]}><capsuleGeometry args={[.045,.69,4,detail === 'ultra' ? 16 : 8]} /><meshStandardMaterial color="#593a29" roughness={.6} /></mesh>
    <mesh position={[0,-.16,0]}><cylinderGeometry args={[.03,.035,.22,12]} /><meshStandardMaterial color="#b19457" metalness={.4} roughness={.45} /></mesh>
    <mesh position={[0,-.035,0]}><boxGeometry args={[.17,.025,.07]} /><meshStandardMaterial color="#b19457" metalness={.4} roughness={.45} /></mesh>
  </group>;
}

function Grooming({ detail }: { detail: Detail }) {
  return <group>
    <mesh position={[-.22,.015,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.16,detail==='ultra'?32:12]} /><meshStandardMaterial color="#b5c5ba" metalness={.65} roughness={.27} /></mesh>
    <mesh position={[-.22,.013,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.165,.018,8,24]} /><meshStandardMaterial color="#795536" /></mesh>
    <mesh position={[-.22,.015,.25]}><boxGeometry args={[.045,.025,.2]} /><meshStandardMaterial color="#795536" /></mesh>
    <mesh position={[.24,.02,-.12]}><boxGeometry args={[.30,.03,.05]} /><meshStandardMaterial color="#61402a" /></mesh>
    {Array.from({length:12},(_,i) => <mesh key={i} position={[.1+i*.025,.02,-.04]}><boxGeometry args={[.012,.025,.13]} /><meshStandardMaterial color="#61402a" /></mesh>)}
    {[-1,1].map(s => <group key={s} position={[.22,.02,.24]} rotation={[0,s*.25,0]}>
      <mesh position={[0,0,-.07]}><boxGeometry args={[.016,.015,.23]} /><meshStandardMaterial color="#9a9d95" metalness={.6} roughness={.4} /></mesh>
      <mesh position={[0,0,.10]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.04,.008,6,16]} /><meshStandardMaterial color="#9a9d95" metalness={.6} roughness={.4} /></mesh>
    </group>)}
  </group>;
}

function Popil({ detail }: { detail: Detail }) {
  return <group>
    {/* An interpretive metal leaf form; the small foot is a museum display support. */}
    <mesh position={[0,.29,0]} scale={[.17,.25,.015]}><sphereGeometry args={[1,detail==='ultra'?32:12,20]} /><meshStandardMaterial color="#b69b62" metalness={.55} roughness={.38} /></mesh>
    <mesh position={[0,.045,0]}><cylinderGeometry args={[.045,.10,.09,12]} /><meshStandardMaterial color="#6b5232" /></mesh>
    <group position={[0,.12,.06]}><Flame detail={detail} /></group>
  </group>;
}

export function TraditionalWedding({ detail, moment, selected, onSelect, roof }: {
  detail: Detail; moment: string; selected: WeddingObject | null; onSelect: (id: WeddingObject) => void; roof: boolean;
}) {
  const weave = useWeave();
  const timber = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    // A ground-level study platform; the raised house and its stair are behind it.
    for(let i=0;i<22;i++) p.push({at:[-3.55+i*.338,.11,0],size:[.325,.22,5.1]});
    for(const x of [-3.65,3.65]) for(const z of [-2.35,2.35]) p.push({at:[x,1.7,z],size:[.08,3.4,.08]});
    for(const x of [-3.65,3.65]) p.push({at:[x,3.35,0],size:[.09,.1,4.9]});
    for(let i=0;i<14;i++) p.push({at:[-3.3+i*.5,2.40,-5.9],size:[.48,2.4,.1]});
    // Front wall boards leave the door and two windows open.
    for(let i=0;i<30;i++) {
      const x=-3.625+i*.25;
      if(Math.abs(x)<.76) continue;
      const window = Math.abs(Math.abs(x)-2.2)<.63;
      if(window) {
        p.push({at:[x,1.46,-3.42],size:[.237,.48,.10]});
        p.push({at:[x,3.34,-3.42],size:[.237,.42,.10]});
      } else p.push({at:[x,2.39,-3.42],size:[.237,2.32,.10]});
    }
    for(const x of [-3.65,3.65]) for(let j=0;j<16;j++) p.push({at:[x,2.39,-3.55-j*.23],size:[.10,2.32,.218]});
    for(const x of [-3.6,3.6]) for(const z of [-7,-3.5]) p.push({at:[x,1.9,z],size:[.15,3.8,.15]});
    p.push({at:[0,1.16,-5.3],size:[7.5,.16,4]});
    for(let i=0;i<5;i++) p.push({at:[0,.12+i*.22,-2.4-i*.22],size:[1.65,.14,.36]});
    // One doorway and two open window frames, never an opaque box facade.
    for(const x of [-.7,.7]) p.push({at:[x,2.32,-3.36],size:[.12,2.2,.12]});
    p.push({at:[0,3.42,-3.36],size:[1.52,.13,.13]});
    for(const x of [-2.2,2.2]) {
      for(const dx of [-.6,.6]) p.push({at:[x+dx,2.40,-3.36],size:[.1,1.35,.1]});
      for(const y of [1.72,3.08]) p.push({at:[x,y,-3.36],size:[1.3,.1,.1]});
      for(let j=0;j<5;j++) p.push({at:[x-.48+j*.24,2.40,-3.36],size:[.035,1.3,.035]});
    }
    return p;
  }, []);
  const mat = (at: V3, size: [number,number], key: string) => <mesh key={key} position={at} rotation={[-Math.PI/2,0,0]} receiveShadow>
    <planeGeometry args={size} /><meshStandardMaterial map={weave} roughness={1} />
  </mesh>;
  const pick = (id: WeddingObject, at: V3, children: ReactNode) => <group position={at} onClick={e=>{e.stopPropagation();onSelect(id);}}>
    {/* Broad hit area also catches taps through thin thread loops and handles. */}
    <mesh position={[0,.16,0]}>
      <sphereGeometry args={[.40,8,6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
    {children}
    {selected===id && <mesh position={[0,.006,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.42,.45,32]} /><meshBasicMaterial color="#e8c875" side={DoubleSide} /></mesh>}
  </group>;
  const active = WEDDING_ITEMS[moment] ?? WEDDING_ITEMS.procession;
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.015,0]} receiveShadow><planeGeometry args={[100,100]} /><meshStandardMaterial color="#b3a17b" roughness={1} /></mesh>
    <Timber pieces={timber} detail={detail} />
    {/* Timber roof geometry is a spatial interpretation, not an archaeological reconstruction. */}
    {[-1,1].map(s=><mesh key={s} position={[s*2,4.05,-5.3]} rotation={[0,0,s*-.43]} castShadow={detail==='ultra'}><boxGeometry args={[4.4,.12,4.9]} /><meshStandardMaterial color="#74604a" roughness={1} /></mesh>)}
    <group position={[-6,0,-1]}>
      <Timber detail={detail} pieces={[-1,1].flatMap(x=>[-1,1].map(z=>({at:[x*1.3,1.4,z*1.3] as V3,size:[.08,2.8,.08] as V3})))} />
      <mesh position={[0,2.8,0]} rotation={[0,0,.1]}><boxGeometry args={[3.1,.04,3.1]} /><meshStandardMaterial color="#c3ac7d" roughness={1} /></mesh>
    </group>
    {roof && <mesh position={[0,3.4,0]} rotation={[0,0,-.07]}><boxGeometry args={[7.8,.04,5.5]} /><meshStandardMaterial color="#c7b18c" side={DoubleSide} roughness={1} /></mesh>}
    {mat([0,floorY+.01,-.15],[3.6,2.8],'main')}
    {[-1,1].map(s=>mat([s*2.6,floorY+.01,0],[1,2.1],`family${s}`))}
    {pick('seats',[0,floorY,-.92],<group>{[-.48,.48].map(x=><mesh key={x} position={[x,.07,0]} scale={[.43,.07,.29]} castShadow={detail==='ultra'}><sphereGeometry args={[1,detail==='ultra'?28:12,12]} /><meshStandardMaterial color="#885240" roughness={.95} /></mesh>)}</group>)}
    <group position={[0,floorY+.03,0]}>
      {active.includes('trays') && pick('trays',[0,0,.6],<group>{[-1,0,1].flatMap((x)=>[-1,1].map(z=><group key={`${x}${z}`} position={[x*.9,0,z*.36]}><FruitTray detail={detail} /></group>))}</group>)}
      {active.includes('betel') && pick('betel',[-1.65,0,-.65],<FruitTray detail={detail} betel />)}
      {active.includes('incense') && pick('incense',[0,0,-.15],<group><Vessel detail={detail} bowl />{[-.055,0,.055].map(x=><mesh key={x} position={[x,.45,0]}><cylinderGeometry args={[.006,.006,.5,6]} /><meshStandardMaterial color="#924e32" /></mesh>)}{[-.5,.5].map(x=><group key={x} position={[x,0,0]}><Flame detail={detail} /></group>)}</group>)}
      {active.includes('water') && pick('water',[.9,0,.5],<Vessel detail={detail} bowl />)}
      {moment==='monks' && <group position={[0,0,-1.6]}>{mat([0,.02,0],[2.8,.6],'monks')}</group>}
      {active.includes('grooming') && pick('grooming',[0,0,.55],<Grooming detail={detail} />)}
      {active.includes('popil') && pick('popil',[0,0,.55],<Popil detail={detail} />)}
      {active.includes('thread') && pick('thread',[-.5,.02,.5],<Threads detail={detail} />)}
      {active.includes('sword') && pick('sword',[.5,.07,.55],<Sword detail={detail} />)}
      {active.includes('flowers') && pick('flowers',[.5,0,.4],<group><Vessel detail={detail} /><group position={[0,.30,0]}><Blossoms detail={detail} /></group></group>)}
      {active.includes('cloth') && pick('cloth',[0,0,-.3],<mesh rotation={[-Math.PI/2,0,.18]} position={[0,.025,-.6]}><planeGeometry args={[.42,2.5,1,detail==='ultra'?24:6]} /><meshStandardMaterial color="#965a42" map={weave} roughness={1} side={DoubleSide} /></mesh>)}
      {active.includes('meal') && pick('meal',[0,0,-1.6],<group>{[-.75,0,.75].map(x=><group key={x} position={[x,0,0]}><Vessel detail={detail} bowl /><mesh position={[0,.22,0]} scale={[1,.25,1]}><sphereGeometry args={[.22,12,8]} /><meshStandardMaterial color="#e0cfa9" /></mesh></group>)}</group>)}
    </group>
  </group>;
}
