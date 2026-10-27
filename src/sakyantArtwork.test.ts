import { describe, expect, it, vi } from 'vitest';
import { YANTRAS } from './sakyant';
import { readFileSync,statSync } from 'node:fs';
import { drawYantra, YANTRA_ART, YANTRA_BITMAP, inkOpacity, prepareYantra, yantraSvg } from './sakyantArtwork';

describe('Sak Yant shared artwork',()=>{
  it('provides artwork and provenance for every existing selectable motif',()=>{
    expect(YANTRAS.map(y=>y.id).sort()).toEqual([...Object.keys(YANTRA_ART),...Object.keys(YANTRA_BITMAP)].sort());
    expect(new Set(YANTRAS.map(y=>y.id)).size).toBe(6);
    for(const y of YANTRAS) {
      expect(new URL(y.reference).protocol).toBe('https:');
      expect(y.form.length).toBeGreaterThan(30);
      expect(y.context.length).toBeGreaterThan(30);
      expect(YANTRA_ART[y.id]?.length > 2 || !!YANTRA_BITMAP[y.id]).toBe(true);
    }
  });
  it('keeps the four vector exports standalone with attribution/status',()=>{
    for(const y of YANTRAS.filter(y=>YANTRA_ART[y.id])) {
      const svg=yantraSvg(y.id,y.name,'#7c1f16');
      expect(svg).toContain('sacred inscriptions omitted');
      expect(svg).toContain('CC-BY-4.0');
      expect(svg).toContain('CamboVerse contributors');
      expect(svg).not.toMatch(/<image|<script|<foreignObject|NaN|Infinity/);
      expect(svg.match(/<path /g)?.length).toBe(YANTRA_ART[y.id].length);
      expect(svg.length).toBeLessThan(20000);
    }
  });
  it('escapes SVG metadata and refuses unknown motifs instead of silently showing the old design',()=>{
    const svg=yantraSvg('gaoyord','<test>&"', '#222');
    expect(svg).toContain('&lt;test&gt;&amp;&quot;');
    expect(svg).not.toContain('<test>');
    expect(()=>yantraSvg('missing','Unknown','#222')).toThrow('Unknown motif');
  });
  it('restores the canvas transform and ink after rendering each motif',()=>{
    vi.stubGlobal('Path2D',class { constructor(public d:string){} });
    try {
      for(const y of YANTRAS.filter(y=>YANTRA_ART[y.id])) {
        let depth=0;const seen:string[]=[];
        const ctx={save:()=>{depth++;},restore:()=>{depth--;expect(depth).toBeGreaterThanOrEqual(0);},scale:vi.fn(),translate:vi.fn(),rotate:vi.fn(),stroke:(p:{d:string})=>seen.push(p.d),fill:(p:{d:string})=>seen.push(p.d)};
        drawYantra(ctx as unknown as CanvasRenderingContext2D,y.id,470,'#222');
        expect(depth).toBe(0);
        expect(seen).toEqual(YANTRA_ART[y.id].map(p=>p.d));
        expect(ctx.scale).toHaveBeenCalledWith(.47,.47);
      }
    } finally {vi.unstubAllGlobals();}
  });
  it('ships the two replacement drawings locally within the download budget',()=>{
    for(const url of Object.values(YANTRA_BITMAP)) {
      const file=new URL(`../public${url}`,import.meta.url);
      expect(readFileSync(file).toString('ascii',8,12)).toBe('WEBP');
      expect(statSync(file).size).toBeLessThan(450000);
    }
    expect(YANTRA_ART.khla).toBeUndefined();
    expect(YANTRA_ART.neak).toBeUndefined();
  });
  it('preserves transparent pixels and removes white sticker interiors from tattoo ink',()=>{
    expect(inkOpacity(0,0,0,0)).toBe(0);
    expect(inkOpacity(0,0,0,255)).toBe(255);
    expect(inkOpacity(255,255,255,255)).toBe(0);
    expect(inkOpacity(128,128,128,255)).toBe(127);
  });
  it('does not export an obsolete animal while the replacement is loading',()=>{
    expect(()=>yantraSvg('khla','Tiger','#222')).toThrow('Artwork is still loading');
    expect(()=>yantraSvg('neak','Naga','#222')).toThrow('Artwork is still loading');
  });
  it('shares concurrent asset requests and permits retry after a failed load',async()=>{
    const decode=vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('Image',class {src='';decode=decode;});
    try {
      const a=prepareYantra('khla'),b=prepareYantra('khla');
      expect(a).toBe(b);
      await expect(a).rejects.toThrow('offline');
      await expect(prepareYantra('khla')).rejects.toThrow('offline');
      expect(decode).toHaveBeenCalledTimes(2);
    } finally {vi.unstubAllGlobals();}
  });
  it('exports the loaded animal as embedded coloured ink with no remote image dependency',async()=>{
    const data=new Uint8ClampedArray([255,255,255,255,0,0,0,200]);
    const ctx={drawImage:vi.fn(),getImageData:()=>({data}),putImageData:vi.fn(),fillRect:vi.fn(),fillStyle:''};
    vi.stubGlobal('Image',class {src='';naturalWidth=2;naturalHeight=1;decode=()=>Promise.resolve();});
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,encoded-local-ink'})});
    try {
      await prepareYantra('neak');
      expect([...data]).toEqual([0,0,0,0,0,0,0,200]);
      const svg=yantraSvg('neak','Naga','#7c1f16');
      expect(ctx.fillStyle).toBe('#7c1f16');
      expect(svg).toContain('href="data:image/png;base64,encoded-local-ink"');
      expect(svg).toContain('Embedded raster artwork, not vector paths');
      expect(svg).toContain('CC-BY-4.0');
      expect(svg).not.toContain(YANTRA_BITMAP.neak);
    } finally {vi.unstubAllGlobals();}
  });
});
