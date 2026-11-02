import {wrapVRText} from './vrPresentation';

/** Keep texture and physical panel aspect ratios identical. */
export function vrSurfaceMetrics(width:number,height:number){
  const density=800;
  return {width:Math.round(width*density),height:Math.round(height*density),density};
}

export function vrTextPages(text:string,width:number,linesPerPage:number,measure:(s:string)=>number){
  const lines=wrapVRText(text,width,measure),pages:string[][]=[];
  const count=Math.max(1,Math.floor(linesPerPage));
  for(let i=0;i<lines.length;i+=count)pages.push(lines.slice(i,i+count));
  return pages.length?pages:[['']];
}
