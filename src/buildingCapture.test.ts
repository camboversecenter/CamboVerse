import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BUILDINGS } from './buildings';
import { advanceAreaWalk, areaEyePosition, areaGroundHeight, constrainAreaPosition } from './captureAreaWalk';
import { advanceCaptureJump } from './captureWalk';

describe('Campus Shrine capture import',()=>{
  const shrine=BUILDINGS.find(b=>b.id==='shrine')!;
  it('attaches the capture to the requested building without replacing the other campus buildings',()=>{
    expect(shrine.name).toBe('Campus Shrine');expect(shrine.capture).toBeTruthy();
    expect(BUILDINGS.filter(b=>b.capture).map(b=>b.id)).toEqual(['shrine']);
    expect(shrine.capture!.rotation).toEqual([Math.PI/2,0,0]);
    expect(shrine.capture!.walk).toBeUndefined();
  });
  it('lets visitors circle the shrine at grounded eye height while protecting the pedestal',()=>{
    const area=shrine.capture!.walkAround!;
    const radius=(p:[number,number])=>Math.hypot(p[0]-area.center[0],p[1]-area.center[1]);
    let p:[number,number]=[...area.start],turn=0,previous=Math.atan2(p[0],p[1]);
    for(let frame=0;frame<2400;frame++){
      const yaw=Math.atan2(p[0]-area.center[0],p[1]-area.center[1]);
      p=advanceAreaWalk(area,...p,yaw,0,1,1/60);
      const next=Math.atan2(p[0],p[1]);
      turn+=Math.atan2(Math.sin(next-previous),Math.cos(next-previous));previous=next;
      const eye=areaEyePosition(area,...p);
      expect(eye[1]-areaGroundHeight(area,...p)).toBeCloseTo(area.eyeHeight);
      expect(radius(p)).toBeGreaterThanOrEqual(area.innerRadius-1e-8);
      expect(radius(p)).toBeLessThanOrEqual(area.outerRadius+1e-8);
    }
    expect(turn).toBeGreaterThan(Math.PI*2);
    expect(radius(constrainAreaPosition(area,...area.center))).toBeCloseTo(area.innerRadius);
    expect(radius(constrainAreaPosition(area,100,100))).toBeCloseTo(area.outerRadius);
    const eye=areaEyePosition(area)[1];
    let jump=advanceCaptureJump({y:eye,velocity:0,grounded:true},eye,true,1/60);
    expect(jump.y).toBeGreaterThan(eye);
    for(let frame=0;frame<240;frame++)jump=advanceCaptureJump(jump,eye,false,1/60);
    expect(jump.grounded).toBe(true);expect(jump.y).toBeCloseTo(eye);
  });
  it('provides valid finite splat records within the Normal/Ultra budgets and preserves originals',()=>{
    const manifest=JSON.parse(readFileSync('public/models/local/campus-shrine-capture-v1/manifest.json','utf8'));
    for(const [tier,limit] of [['normal',180000],['ultra',600000]] as const){
      for(const variant of [shrine.capture!,shrine.capture!.cleanup!]){
        const path=variant[tier],bytes=readFileSync(`public${path}`);
        const expected=manifest.files[path.split('/').at(-1)!];
        expect(bytes.length).toBe(expected.bytes);expect(bytes.length%32).toBe(0);
        expect(bytes.length/32).toBeLessThanOrEqual(limit);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected.sha256);
        let finite=true;
        for(let offset=0;offset<bytes.length;offset+=32){
          for(let axis=0;axis<6;axis++)finite&&=Number.isFinite(bytes.readFloatLE(offset+axis*4));
        }
        expect(finite).toBe(true);
      }
    }
    expect(manifest.content_license).toBe('UNCONFIRMED');
  });
});
