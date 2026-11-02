import {useEffect,useMemo,useState} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {wrapVRText} from '../vrPresentation';
import {vrSurfaceMetrics,vrTextPages} from '../vrSurfaceLayout';

export interface VRSurfaceProps {
  title:string;body?:string;footer?:string;onClick?:()=>void;active?:boolean;disabled?:boolean;
  width?:number;height?:number;variant?:'default'|'marker'|'board'|'action'|'text'|'heading';eyebrow?:string;
  page?:number;onPages?:(count:number)=>void;
}

/** Stereo surfaces with dimension-correct typography and measured pages.
 * Decorative text never competes with buttons for the controller ray. */
export function VRSurface({title,body,footer,onClick,active=false,disabled=false,width=.92,height=.14,variant='default',eyebrow='',page=0,onPages}:VRSurfaceProps) {
  const [hovered,setHovered]=useState(false);
  const khmer=/\p{Script=Khmer}/u.test(`${title}${body??''}${footer??''}${eyebrow}`);
  const [fontReady,setFontReady]=useState(false);
  const interactive=!!onClick&&!disabled;
  useEffect(()=>{
    let alive=true;
    if(khmer&&document.fonts)void document.fonts.load('32px Siemreap','ខ្មែរ').then(()=>{if(alive)setFontReady(true);}).catch(()=>{});
    return()=>{alive=false;};
  },[khmer]);
  const {texture,pages}=useMemo(()=>{
    const canvas=document.createElement('canvas'),size=vrSurfaceMetrics(width,height);
    canvas.width=size.width;canvas.height=size.height;
    const ctx=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,pad=24;
    const family=khmer?'Siemreap, sans-serif':'system-ui, sans-serif';
    if(variant!=='text'&&variant!=='heading'){
      ctx.fillStyle=disabled?'#18362f':active?(hovered?'#f0df9a':'#d9c779'):hovered&&interactive?'#3b6650':variant==='board'?'#102c26':'#204438';
      ctx.beginPath();ctx.roundRect(2,2,w-4,h-4,variant==='marker'?h/2:18);ctx.fill();
      ctx.strokeStyle=hovered&&interactive?'#fff2b0':active?'#f5e7ad':variant==='marker'?'#c6b976':'#6b9078';
      ctx.lineWidth=hovered&&interactive?4:2;ctx.stroke();
    }
    ctx.fillStyle=disabled?'#8ba496':active?'#15362c':'#f5f3df';
    ctx.textAlign='left';ctx.textBaseline='top';
    let pageCount=1;
    if(body!==undefined){
      ctx.font=`${khmer?24:20}px ${family}`;ctx.fillStyle='#d9c779';ctx.fillText(eyebrow,pad,18);
      ctx.fillStyle='#f5f3df';ctx.font=`600 34px ${family}`;
      const titles=wrapVRText(title,w-pad*2,s=>ctx.measureText(s).width);
      titles.slice(0,2).forEach((line,i)=>ctx.fillText(line,pad,54+i*48));
      const top=54+Math.min(2,titles.length)*48+20,bottom=h-108,lineHeight=khmer?46:40;
      ctx.fillStyle='#d6e2d6';ctx.font=`${khmer?30:28}px ${family}`;
      const chunks=vrTextPages(body,w-pad*2,Math.floor((bottom-top)/lineHeight),s=>ctx.measureText(s).width);
      pageCount=chunks.length;
      ctx.save();ctx.beginPath();ctx.rect(pad,top,w-pad*2,bottom-top);ctx.clip();
      chunks[Math.min(page,chunks.length-1)].forEach((line,i)=>ctx.fillText(line,pad,top+i*lineHeight));ctx.restore();
      ctx.fillStyle='#547765';ctx.fillRect(pad,h-90,w-pad*2,1);
      ctx.fillStyle='#b1c6b5';ctx.font=`${khmer?22:20}px ${family}`;
      if(footer)wrapVRText(footer,w-pad*2,s=>ctx.measureText(s).width).slice(0,2).forEach((line,i)=>ctx.fillText(line,pad,h-73+i*30));
    }else{
      let left=pad,right=pad;
      if(variant==='marker'){
        const radius=Math.min(35,h*.30),cx=h/2;
        ctx.fillStyle='#dfce88';ctx.beginPath();ctx.arc(cx,h/2,radius,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#14372c';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 48px Georgia';ctx.fillText('i',cx,h/2+1);
        left=h;right=50;ctx.fillStyle='#dfce88';ctx.font='40px sans-serif';ctx.fillText('›',w-28,h/2);
      }
      ctx.fillStyle=disabled?'#8ba496':active?'#15362c':variant==='text'?'#b7cdba':'#f5f3df';
      ctx.textBaseline='middle';ctx.textAlign=variant==='marker'?'left':'center';
      let font=variant==='text'?20:variant==='heading'?34:30,lines:string[]=[];
      const label=title.replace(/^ⓘ\s*/,'');
      // Wrap, then shrink uniformly if a bounded control needs a second line.
      do{ctx.font=`${variant==='text'?400:600} ${font}px ${family}`;lines=wrapVRText(label,w-left-right,s=>ctx.measureText(s).width);if(lines.length*font*1.5<=h-16||font<=18)break;font-=2;}while(true);
      const lineHeight=font*1.5;
      lines.forEach((line,i)=>ctx.fillText(line,variant==='marker'?left:w/2,h/2+(i-(lines.length-1)/2)*lineHeight));
    }
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
    return {texture:map,pages:pageCount};
  },[title,body,footer,active,disabled,hovered,interactive,variant,eyebrow,khmer,fontReady,width,height,page]);
  useEffect(()=>{onPages?.(pages);},[pages,onPages]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh renderOrder={2000} pointerEvents={interactive?'auto':'none'} pointerEventsOrder={100}
    onPointerOver={interactive?e=>{e.stopPropagation();setHovered(true);}:undefined}
    onPointerOut={()=>setHovered(false)}
    onClick={interactive?e=>{e.stopPropagation();onClick();}:undefined}>
    <planeGeometry args={[width,height]}/>
    <meshBasicMaterial map={texture} transparent alphaTest={.01} depthTest={false} depthWrite={false} toneMapped={false}/>
  </mesh>;
}
