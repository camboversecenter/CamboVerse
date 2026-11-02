import { afterEach, describe, expect, it, vi } from 'vitest';
import { locationGuideContext, savedLocationAnswer } from './locationGuide';
import { handleLocationGuide } from './worker/locationGuide';

afterEach(()=>vi.unstubAllGlobals());
describe('location-grounded guide previews',()=>{
  it('provides location-specific, cautious context for all Wat Phnom details',async()=>{
    for(const [id,title] of [['central-stupa','Great Stupa'],['main-vihara','Vihara'],['city-overlook','City Overlook']]){
      const context=locationGuideContext('wat-phnom',id)!;
      expect(context.title).toContain(title);expect(context.introduction).toContain('illustrative');
      const result=await (await handleLocationGuide({experienceId:'wat-phnom',locationId:id,question:'What am I looking at?'},{})).json();
      expect(result.text).toBe(context.introduction);expect(result.fallback).toBe(true);
    }
    expect(locationGuideContext('wat-phnom','unknown')).toBeNull();
  });
  it('keeps all 27 room stops distinct and rejects unknown locations',()=>{
    for(let n=50;n<=76;n++) {
      const context=locationGuideContext('room-360',String(n).padStart(3,'0'))!;
      expect(context.locationId).toBe(String(n).padStart(3,'0'));
      expect(context.title).toContain('Meeting room');
    }
    expect(locationGuideContext('room-360','058')!.introduction).toContain('display');
    expect(locationGuideContext('room-360','061')!.introduction).toContain('windows');
    expect(locationGuideContext('room-360','999')).toBeNull();
    expect(locationGuideContext('staircase-3dgs','050')).toBeNull();
  });
  it('uses clock-specific notes and does not invent its installation date',async()=>{
    const clock=locationGuideContext('clock-3dgs','flower-clock')!;
    expect(clock.title).toContain('Flower Clock');
    expect(savedLocationAnswer(clock,'What is the flower clock?').text).toContain('clock face');
    expect(savedLocationAnswer(clock,'When was it built?').text).toContain('does not date the flower clock');
    expect(locationGuideContext('clock-3dgs','naga-staircase')).toBeNull();
    const answer=await (await handleLocationGuide({experienceId:'clock-3dgs',locationId:'flower-clock',question:'What is the flower clock?'},{})).json();
    expect(answer.fallback).toBe(true);expect(answer.text).toContain('clock face');
  });
  it('never borrows temple history for a meeting room or invents room dates',()=>{
    const room=locationGuideContext('room-360','050')!;
    for(const question of ['What is the room history?','Who built this room?','When was this built?','How old is it?']) {
      const result=savedLocationAnswer(room,question);
      expect(result.text).toContain('have not been provided');
      expect(result.text).not.toContain('1372');
    }
    const temple=savedLocationAnswer(locationGuideContext('staircase-3dgs','naga-staircase')!,'Tell me about the history');
    expect(temple.text).toContain('1372');
    expect(temple.text).toContain('does not date the staircase');
    expect(temple.sources[0].url).toContain('cambodiamuseum.info');
    expect(temple).not.toHaveProperty('question');
    expect(temple).not.toHaveProperty('keywords');
    expect(savedLocationAnswer(room,'Name the person in the photograph').text).toContain('don’t have a verified answer');
  });
  it('labels a working no-key preview as saved notes',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const response=await handleLocationGuide({experienceId:'room-360',locationId:'058',question:'What is at this spot?'},{});
    const result=await response.json();
    expect(result.fallback).toBe(true);expect(result.text).toContain('wall-mounted display');
    expect(fetch).not.toHaveBeenCalled();
    expect((await handleLocationGuide({experienceId:'room-360',locationId:'999'},{})).status).toBe(404);
    expect((await handleLocationGuide({experienceId:'room-360',locationId:'050',question:'x'.repeat(501)},{})).status).toBe(400);
  });
  it('uses server-owned notes for AI and falls back transparently on failure',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(Response.json({candidates:[{content:{parts:[{text:'internal reasoning',thought:true},{text:'This is a meeting-room display.'}]}}]}))
      .mockResolvedValueOnce(new Response('',{status:503}));
    vi.stubGlobal('fetch',fetch);
    const request={experienceId:'room-360',locationId:'058',question:'Describe this spot',lang:'en'};
    const result=await (await handleLocationGuide(request,{GEMINI_API_KEY:'test-only'})).json();
    expect(result.fallback).toBe(false);
    const sent=JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-only');
    expect(sent.systemInstruction.parts[0].text).toContain('Meeting room · In front of the screen');
    expect(sent.systemInstruction.parts[0].text).toContain('Do not invent');
    expect(sent.systemInstruction.parts[0].text).not.toContain('1372');
    expect(result.text).toBe('This is a meeting-room display.');
    expect((await (await handleLocationGuide(request,{GEMINI_API_KEY:'test-only'})).json()).fallback).toBe(true);
  });
  it('does not expose the Gemini key and falls back when the provider returns no answer',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({candidates:[]}));vi.stubGlobal('fetch',fetch);
    const secret='test-key-private';
    const response=await handleLocationGuide({experienceId:'clock-3dgs',locationId:'flower-clock',question:'What is the flower clock?'},{GEMINI_API_KEY:secret});
    const text=await response.text();expect(text).not.toContain(secret);
    const result=JSON.parse(text);expect(result.fallback).toBe(true);expect(result.text).toContain('clock face');
  });
});
