import {useEffect,useMemo} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {wrapVRText} from '../vrPresentation';

/** Actual scene meshes: visible in both eyes, selectable by XR controller rays.
 * Transparent render queue + high order keeps splats from painting over text. */
export function VRSurface({title,body,footer,onClick,active=false,width=.92,height=.14}:{
  title:string;body?:string;footer?:string;onClick?:()=>void;active?:boolean;width?:number;height?:number;
}) {
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=body?768:156;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=active?'#426137':'#14372f';ctx.beginPath();ctx.roundRect(3,3,1018,canvas.height-6,28);ctx.fill();
    ctx.strokeStyle='#b8cba0';ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle='#fff8df';ctx.textBaseline='middle';
    if(body){
      ctx.textAlign='left';ctx.font='600 44px sans-serif';ctx.fillText(title,48,64,928);
      ctx.font='32px sans-serif';ctx.textBaseline='top';
      wrapVRText(body,928,t=>ctx.measureText(t).width).forEach((line,i)=>ctx.fillText(line,48,120+i*44));
      ctx.fillStyle='#c9d8bd';ctx.font='26px sans-serif';
      if(footer)wrapVRText(footer,928,t=>ctx.measureText(t).width).forEach((line,i)=>ctx.fillText(line,48,650+i*32));
    }else{
      ctx.textAlign='center';ctx.font='600 42px sans-serif';ctx.fillText(title,512,78,940);
    }
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
  },[title,body,footer,active]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh renderOrder={2000} onClick={onClick?e=>{e.stopPropagation();onClick();}:undefined}>
    <planeGeometry args={[width,height]}/>
    <meshBasicMaterial map={texture} transparent alphaTest={.01} depthTest={false} depthWrite={false} toneMapped={false}/>
  </mesh>;
}
