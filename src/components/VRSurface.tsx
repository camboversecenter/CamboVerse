import {useEffect,useMemo,useState} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {wrapVRText} from '../vrPresentation';

/** Actual scene meshes: visible in both eyes, selectable by XR controller rays.
 * Transparent render queue + high order keeps splats from painting over text. */
export function VRSurface({title,body,footer,onClick,active=false,width=.92,height=.14,variant='default',eyebrow='WAT PHNOM  ·  INFORMATION'}:{
  title:string;body?:string;footer?:string;onClick?:()=>void;active?:boolean;width?:number;height?:number;variant?:'default'|'marker'|'board'|'action';eyebrow?:string;
}) {
  const [hovered,setHovered]=useState(false);
  const khmer=/\p{Script=Khmer}/u.test(`${title}${body??''}${footer??''}${eyebrow}`);
  const [fontReady,setFontReady]=useState(false);
  useEffect(()=>{
    let alive=true;
    if(khmer&&document.fonts)void document.fonts.load('32px Siemreap','ខ្មែរ').then(()=>{if(alive)setFontReady(true);}).catch(()=>{});
    return()=>{alive=false;};
  },[khmer]);
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=body?768:156;
    const ctx=canvas.getContext('2d')!;
    const family=khmer?'Siemreap, sans-serif':'sans-serif';
    ctx.fillStyle=hovered?'#365f49':active?'#426137':variant==='board'?'#0c2923':'#14372f';ctx.beginPath();ctx.roundRect(3,3,1018,canvas.height-6,28);ctx.fill();
    ctx.strokeStyle=variant==='default'?'#b8cba0':'#e5ce85';ctx.lineWidth=variant==='default'?4:7;ctx.stroke();
    ctx.fillStyle='#fff8df';ctx.textBaseline='middle';
    if(body){
      ctx.textAlign='left';
      if(variant==='board'){
        ctx.fillStyle='#e5ce85';ctx.font=`700 23px ${family}`;ctx.fillText(eyebrow,48,43);
        ctx.fillStyle='#fff8df';ctx.font=`700 46px ${family}`;ctx.fillText(title,48,100,928);
        ctx.fillStyle='#e5ce85';ctx.fillRect(48,137,928,4);ctx.fillStyle='#fff8df';
      }else{ctx.font=`600 44px ${family}`;ctx.fillText(title,48,64,928);}
      ctx.font=`${variant==='board'?34:32}px ${family}`;ctx.textBaseline='top';
      wrapVRText(body,928,t=>ctx.measureText(t).width).forEach((line,i)=>ctx.fillText(line,48,(variant==='board'?170:120)+i*44));
      ctx.fillStyle='#c9d8bd';ctx.font=`26px ${family}`;
      if(footer)wrapVRText(footer,928,t=>ctx.measureText(t).width).forEach((line,i)=>ctx.fillText(line,48,650+i*32));
    }else if(variant==='marker'){
      ctx.fillStyle='#e5ce85';ctx.beginPath();ctx.arc(82,78,58,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#12352b';ctx.textAlign='center';ctx.font='bold 78px Georgia,serif';ctx.fillText('i',82,79);
      ctx.textAlign='left';ctx.fillStyle='#fff8df';ctx.font=`700 49px ${family}`;ctx.fillText(title.replace(/^ⓘ\s*/,''),170,78,720);
      ctx.textAlign='center';ctx.fillStyle='#e5ce85';ctx.font='600 75px sans-serif';ctx.fillText('›',948,76);
    }else{
      ctx.textAlign='center';ctx.font=`600 42px ${family}`;ctx.fillText(title,512,78,940);
    }
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
  },[title,body,footer,active,hovered,variant,eyebrow,khmer,fontReady]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh renderOrder={2000} pointerEventsOrder={onClick?100:0}
    onPointerOver={onClick?e=>{e.stopPropagation();setHovered(true);}:undefined}
    onPointerOut={onClick?()=>setHovered(false):undefined}
    onClick={onClick?e=>{e.stopPropagation();onClick();}:undefined}>
    <planeGeometry args={[width,height]}/>
    <meshBasicMaterial map={texture} transparent alphaTest={.01} depthTest={false} depthWrite={false} toneMapped={false}/>
  </mesh>;
}
