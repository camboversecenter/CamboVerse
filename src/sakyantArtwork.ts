/** Original motif studies, not transcriptions or tattoo stencils.
 * Geometry is shared by gallery, camera decal and SVG download. See docs/SAK-YANT-REFERENCES.md.
 * Artwork: CC-BY-4.0, CamboVerse contributors. Renderer: Apache-2.0.
 */
export interface InkPath { d: string; width: number; fill?: boolean; transform?: string }
const path = (d: string, width = 3, fill = false, transform?: string): InkPath => ({ d, width, fill, transform });
const circle = (x: number, y: number, r: number, fill = false) => path(`M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0`, 2.4, fill);

// Coil and tapering loops used as a finial. No generated or imitation lettering.
function finial(x: number, y: number, height: number, width = 22): InkPath[] {
  return [path(`M${x} ${y}c${-width} 0 ${-width} ${-width*1.4} 0 ${-width*1.4}c${width*.7} 0 ${width*.7} ${width} 0 ${width}c${-width*.6} 0 ${-width*.5} ${-width*.6} 0 ${-width*.6}
    C${x+width*1.1} ${y-height*.24} ${x-width*1.1} ${y-height*.29} ${x} ${y-height*.38}
    C${x+width*.8} ${y-height*.44} ${x-width*.8} ${y-height*.51} ${x} ${y-height*.57}
    C${x+width*.5} ${y-height*.62} ${x-width*.5} ${y-height*.68} ${x} ${y-height*.73}L${x} ${y-height}`, 3), circle(x,y-height-13,3,true)];
}
function nineSpires(): InkPath[] {
  const p: InkPath[] = [];
  for(let col=-4; col<=4; col++) {
    const x=500+col*78, rows=5-Math.abs(col), top=736-rows*63;
    for(let row=0;row<rows;row++) p.push(path(`M${x-31} ${736-row*63}h62v-63h-62z`,2));
    p.push(...finial(x,top-14,160+rows*9,20));
  }
  p.push(path('M148 752H852M170 763H830',2),path('M360 816Q500 842 640 816',2));
  for(const x of [325,675]) p.push(circle(x,816,5));
  return p;
}
function fiveLines(): InkPath[] {
  const p: InkPath[]=[];
  for(let i=0;i<5;i++) {
    const x=260+i*120;
    p.push(...finial(x,265,150,21));
    // Empty column outlines identify where a master's text belongs, not pseudo-script.
    p.push(path(`M${x-23} 300V712M${x+23} 300V712M${x-23} 290h46M${x-23} 722h46`,2));
    p.push(path(`M${x} 751Q${x-18} 771 ${x} 788Q${x+14} 802 ${x} 817V868`,3));
    p.push(circle(x,884,3,true));
  }
  return p;
}
function eightDirections(): InkPath[] {
  const p: InkPath[]=[circle(500,500,214),circle(500,500,204),circle(500,500,143),circle(500,500,134),circle(500,500,46),circle(500,500,36)];
  for(let i=0;i<8;i++) {
    const transform=`rotate(${i*45} 500 500)`;
    p.push(...finial(500,280,173,18).map(a=>({...a,transform})));
    p.push(path('M500 286V355M483 365Q500 391 517 365M500 384L500 453',2,false,transform));
    p.push(path('M500 450Q462 414 465 389Q500 393 500 450',2,false,transform));
    p.push({...circle(500,327,5),transform});
  }
  p.push(...finial(500,524,42,10));
  return p;
}
function unalome(): InkPath[] {
  const points: string[]=[];
  // An Archimedean coil with a continuous tangent into the ascending loops.
  for(let i=0;i<=150;i++) {
    const t=-i/150*Math.PI*4, r=8+110*i/150;
    points.push(`${i?'L':'M'}${500+Math.cos(t)*r} ${716+Math.sin(t)*r}`);
  }
  return [path(points.join(' ')+`C618 625 370 657 400 553C421 480 613 525 585 453C568 407 435 436 450 378C462 339 539 347 534 306C531 282 481 288 491 251Q500 232 500 211V132`,5),circle(500,108,5,true),circle(500,86,3,true)];
}
export const YANTRA_ART: Readonly<Record<string, readonly InkPath[]>> = {
  gaoyord: nineSpires(), hahtaew: fiveLines(), paedtidt: eightDirections(),
  unalome: unalome(),
};

/** Versioned local illustrations replace the rejected animal outlines entirely. */
export const YANTRA_BITMAP: Readonly<Record<string,string>> = {
  khla: '/art/sak-yant/tiger-v3.webp', neak: '/art/sak-yant/naga-v3.webp',
};
const masks=new Map<string,HTMLCanvasElement>();
const loading=new Map<string,Promise<void>>();
const tints=new Map<string,{ink:string; canvas:HTMLCanvasElement}>();

/** White interiors must reveal the swatch, not produce white sticker patches. */
export function inkOpacity(r:number,g:number,b:number,a:number) {
  return Math.round(a*(1-(.2126*r+.7152*g+.0722*b)/255));
}
export function prepareYantra(id:string):Promise<void> {
  if(!YANTRA_BITMAP[id] || masks.has(id)) return Promise.resolve();
  const pending=loading.get(id);if(pending) return pending;
  const promise=(async()=>{
    const img=new Image();
    img.src=YANTRA_BITMAP[id];
    await img.decode();
    const canvas=document.createElement('canvas');
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');if(!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const d=pixels.data;d[i+3]=inkOpacity(d[i],d[i+1],d[i+2],d[i+3]);
      d[i]=d[i+1]=d[i+2]=0;
    }
    ctx.putImageData(pixels,0,0);masks.set(id,canvas);
  })().finally(()=>loading.delete(id));
  loading.set(id,promise);return promise;
}
function tintedArtwork(id:string,ink:string) {
  const mask=masks.get(id);if(!mask) return undefined;
  const cached=tints.get(id);if(cached?.ink===ink) return cached.canvas;
  const canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;
  const ctx=canvas.getContext('2d')!;
  ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-in';
  ctx.fillStyle=ink;ctx.fillRect(0,0,canvas.width,canvas.height);
  // Bound memory: keep only the most recent ink colour per animal.
  tints.set(id,{ink,canvas});return canvas;
}

// Cache native paths. The camera preview never rebuilds geometry per frame.
const cache = new Map<string, Path2D[]>();
export function drawYantra(ctx: CanvasRenderingContext2D, id: string, s: number, ink: string) {
  if(!Number.isFinite(s) || s<=0) return;
  if(YANTRA_BITMAP[id]) {
    const bitmap=tintedArtwork(id,ink);
    if(bitmap) {ctx.save();ctx.drawImage(bitmap,-s/2,-s/2,s,s);ctx.restore();}
    return;
  }
  const art=YANTRA_ART[id];
  if(!art || !Number.isFinite(s) || s<=0) return;
  let native=cache.get(id);
  if(!native) { native=art.map(p=>new Path2D(p.d)); cache.set(id,native); }
  ctx.save();
  ctx.scale(s/1000,s/1000);ctx.translate(-500,-500);
  ctx.strokeStyle=ink;ctx.fillStyle=ink;ctx.lineCap='round';ctx.lineJoin='round';
  art.forEach((p,i)=>{
    ctx.save();
    if(p.transform) {
      const a=Number(p.transform.match(/rotate\(([-\d.]+)/)?.[1]??0)*Math.PI/180;
      ctx.translate(500,500);ctx.rotate(a);ctx.translate(-500,-500);
    }
    ctx.lineWidth=p.width;
    if(p.fill) ctx.fill(native![i]); else ctx.stroke(native![i]);
    ctx.restore();
  });
  ctx.restore();
}

const escapeXml=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function yantraSvg(id: string, title: string, ink: string): string {
  if(YANTRA_BITMAP[id]) {
    const bitmap=tintedArtwork(id,ink);
    if(!bitmap) throw new Error('Artwork is still loading');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1090" role="img"><title>${escapeXml(title)} — CamboVerse illustration</title><desc>AI-assisted original tattoo illustration. Sacred inscriptions omitted. CC-BY-4.0 CamboVerse contributors. Embedded raster artwork, not vector paths.</desc><rect width="1000" height="1090" fill="#f8f1df"/><image x="40" y="40" width="920" height="920" href="${bitmap.toDataURL('image/png')}"/><g fill="#4a3626" text-anchor="middle" font-family="sans-serif"><text x="500" y="990" font-size="24">${escapeXml(title)}</text><text x="500" y="1030" font-size="18">Illustrative tattoo artwork · sacred inscriptions omitted</text><text x="500" y="1060" font-size="16">CC-BY-4.0 · CamboVerse contributors</text></g></svg>`;
  }
  if(!YANTRA_ART[id]) throw new Error('Unknown motif');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1090" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)} — CamboVerse study</title><desc id="desc">Original illustrative artwork. Sacred inscriptions omitted. Not a tattoo stencil. CC-BY-4.0 CamboVerse contributors.</desc><rect width="1000" height="1090" fill="#f8f1df"/><g stroke="${escapeXml(ink)}" fill="none" stroke-linecap="round" stroke-linejoin="round">${YANTRA_ART[id].map(p=>`<path d="${p.d}" stroke-width="${p.width}"${p.fill?` fill="${escapeXml(ink)}" stroke="none"`:''}${p.transform?` transform="${p.transform}"`:''}/>`).join('')}</g><g fill="#4a3626" text-anchor="middle" font-family="sans-serif"><text x="500" y="990" font-size="24">${escapeXml(title)}</text><text x="500" y="1030" font-size="18">Illustrative study · sacred inscriptions omitted</text><text x="500" y="1060" font-size="16">CC-BY-4.0 · CamboVerse contributors</text></g></svg>`;
}
