import {describe,expect,it} from 'vitest';
import {vrSurfaceMetrics,vrTextPages} from './vrSurfaceLayout';
import {savedKhmerLocationAnswer} from './guideKhmer';
import {locationGuideContext} from './locationGuide';

describe('VR panel typography',()=>{
  it('keeps letters at the same scale on a short action, full question, label and board',()=>{
    const samples=[[.42,.17],[1.32,.16],[.95,.18],[1.34,1.08]];
    for(const [width,height] of samples){
      const pixels=vrSurfaceMetrics(width,height);
      expect(pixels.width/pixels.height).toBeCloseTo(width/height,3);
      expect(pixels.width/width).toBe(800);
    }
  });
  it('keeps all measured Khmer lines accessible on bounded pages',()=>{
    const context=locationGuideContext('staircase-3dgs','naga-staircase','naga-balustrade')!;
    const text=savedKhmerLocationAnswer(context,'Tell me about Naga balustrade').text.repeat(10);
    const pages=vrTextPages(text,200,5,s=>Array.from(s).length*15);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every(lines=>lines.length<=5&&lines.every(line=>Array.from(line).length*15<=200))).toBe(true);
    expect(pages.flat().join('').replace(/\s/g,'')).toBe(text.replace(/\s/g,''));
  });
});
