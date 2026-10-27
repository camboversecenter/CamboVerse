import { describe, expect, it } from 'vitest';
import { objectInfoFor, roomObjectAnchors, STAIRCASE_OBJECT_ANCHORS } from './objectHotspots';
import { locationGuideContext, savedLocationAnswer } from './locationGuide';
import { handleLocationGuide } from './worker/locationGuide';

describe('object information in capture and panorama previews',()=>{
  it('only accepts objects annotated in the requested experience and photo',()=>{
    expect(STAIRCASE_OBJECT_ANCHORS).toHaveLength(2);
    expect(objectInfoFor('staircase-3dgs','naga-staircase','guardian-lion')?.title).toBe('Guardian lion');
    expect(objectInfoFor('staircase-3dgs','naga-staircase','room-screen')).toBeNull();
    expect(objectInfoFor('room-360','051','room-screen')).toBeNull();
    expect(objectInfoFor('room-360','999','room-tables')).toBeNull();
    expect(objectInfoFor('room-360','050','room-entrance')).not.toBeNull();
  });
  it('has valid image anchors throughout the 27-photo tour',()=>{
    for(let n=50;n<=76;n++) {
      const anchors=roomObjectAnchors(String(n).padStart(3,'0'));
      expect(anchors.some(a=>a.id==='room-tables')).toBe(true);
      expect(new Set(anchors.map(a=>a.id)).size).toBe(anchors.length);
      for(const a of anchors) {
        expect(a.u).toBeGreaterThanOrEqual(0);expect(a.u).toBeLessThanOrEqual(1);
        expect(a.v).toBeGreaterThanOrEqual(0);expect(a.v).toBeLessThanOrEqual(1);
      }
    }
  });
  it('answers about the selected object without assigning the temple founding date to it',()=>{
    const lion=locationGuideContext('staircase-3dgs','naga-staircase','guardian-lion')!;
    expect(savedLocationAnswer(lion,'Tell me about this').text).toContain('front paws');
    const dated=savedLocationAnswer(lion,'When was this built?').text;
    expect(dated).toContain('date and artist');expect(dated).not.toContain('1372');
    expect(locationGuideContext('room-360','058','naga-balustrade')).toBeNull();
  });
  it('validates object context on the server and supports saved notes without an AI key',async()=>{
    const request={experienceId:'room-360',locationId:'058',objectId:'room-screen',question:'Tell me about this'};
    const response=await handleLocationGuide(request,{});
    expect(response.status).toBe(200);
    const body=await response.json();
    expect(body.fallback).toBe(true);expect(body.text).toContain('marble-patterned');
    expect((await handleLocationGuide({...request,objectId:'guardian-lion'},{})).status).toBe(404);
    expect((await handleLocationGuide({...request,objectId:{}},{})).status).toBe(400);
  });
});
