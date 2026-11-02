import {useEffect,useMemo,useState} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {wrapVRText} from '../vrPresentation';

/** Actual scene meshes: visible in both eyes, selectable by XR controller rays.
 * Transparent render queue + high order keeps splats from painting over text. */
export function VRSurface({title,body,footer,onClick,active=false,width=.92,height=.14,variant='default'}:{
  title:string;body?:string;footer?:string;onClick?:()=>void;active?:boolean;width?:number;height?:number;variant?:'default'|'marker'|'board'|'action';
}) {
  const [hovered,setHovered]=useState(false);
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=body?768:variant==='marker'?220:156;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=hovered?'#365f49':active?'#426137':variant==='board'?'#0c2923':'#14372f';ctx.beginPath();ctx.roundRect(3,3,1018,canvas.height-6,28);ctx.fill();
    ctx.strokeStyle=variant==='default'?'#b8cba0':'#e5ce85';ctx.lineWidth=variant==='default'?4:7;ctx.stroke();
    ctx.fillStyle='#fff8df';ctx.textBaseline='middle';
    if(body){
      ctx.textAlign='left';
      if(variant==='board'){
        ctx.fillStyle='#e5ce85';ctx.font='700 23px sans-serif';ctx.fillText('WAT PHNOM  ·  INFORMATION',48,43);
        ctx.fillStyle='#fff8df';ctx.font='700 46px sans-serif';ctx.fillText(title,48,100,928);
        ctx.fillStyle='#e5ce85';ctx.fillRect(48,137,928,4);ctx.fillStyle='#fff8df';
      }else{ctx.font='600 44px sans-serif';ctx.fillText(title,48,64,928);}
      ctx.font=variant==='board'?'34px sans-serif':'32px sans-serif';ctx.textBaseline='top';
      wrapVRText(body,928,t=>ctx.measureText(t).width).forEach((line,i)=>ctx.fillText(line,48,(variant==='board'?170:120)+i*44));
      ctx.fillStyle='#c9d8bd';ctx.font='26px sans-serif';
      if(footer)wrapVRText(footer,928,t=>ctx.measureText(t).width).forEach((line,i)=>ctx.fillText(line,48,650+i*32));
    }else if(variant==='marker'){
      ctx.fillStyle='#e5ce85';ctx.beginPath();ctx.roundRect(20,22,158,176,25);ctx.fill();
      ctx.fillStyle='#12352b';ctx.textAlign='center';ctx.font='bold 112px Georgia,serif';ctx.fillText('i',99,112);
      ctx.textAlign='left';ctx.fillStyle='#fff8df';ctx.font='700 48px sans-serif';ctx.fillText(title.replace(/^ⓘ\s*/,''),205,81,770);
      ctx.fillStyle='#d4e5c4';ctx.font='600 30px sans-serif';ctx.fillText('POINT AND SELECT  →',205,151,770);
    }else{
      ctx.textAlign='center';ctx.font='600 42px sans-serif';ctx.fillText(title,512,78,940);
    }
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
  },[title,body,footer,active,hovered,variant]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh renderOrder={2000} pointerEventsOrder={onClick?100:0}
    onPointerOver={onClick?e=>{e.stopPropagation();setHovered(true);}:undefined}
    onPointerOut={onClick?()=>setHovered(false):undefined}
    onClick={onClick?e=>{e.stopPropagation();onClick();}:undefined}>
    <planeGeometry args={[width,height]}/>
    <meshBasicMaterial map={texture} transparent alphaTest={.01} depthTest={false} depthWrite={false} toneMapped={false}/>
  </mesh>;
}
