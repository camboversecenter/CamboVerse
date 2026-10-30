import type { Vector3 } from 'three';

/** Snapshot a comfortable panel pose. Call on open/reset, never on head motion. */
export function worldPanelPose(head:Pick<Vector3,'x'|'y'|'z'>,forward:Pick<Vector3,'x'|'y'|'z'>,scale:number,side=0) {
  const length=Math.hypot(forward.x,forward.z);
  const x=length>.001?forward.x/length:0,z=length>.001?forward.z/length:-1;
  return {position:[head.x+(x*1.7-z*side)*scale,head.y-.22*scale,head.z+(z*1.7+x*side)*scale] as [number,number,number],yaw:Math.atan2(-x,-z)};
}

/** Word wrapping shared by the in-world information and credit cards. */
export function wrapVRText(text:string,maxWidth:number,measure:(text:string)=>number):string[] {
  const lines:string[]=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      const next=line?`${line} ${word}`:word;
      if(line&&measure(next)>maxWidth){lines.push(line);line=word;}else line=next;
    }
    lines.push(line);
  }
  return lines;
}
