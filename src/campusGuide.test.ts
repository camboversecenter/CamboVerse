import {afterEach,describe,expect,it,vi} from 'vitest';
import {BUILDINGS,SITES} from './buildings';
import {locationGuideContext,savedLocationAnswer} from './locationGuide';
import {handleLocationGuide} from './worker/locationGuide';
import {isKhmerGuideText,savedKhmerLocationAnswer,khmerGuideQuestion} from './guideKhmer';

afterEach(()=>vi.unstubAllGlobals());
describe('campus guide context and API',()=>{
  it('covers every registered site/building without borrowing temple history',()=>{
    for(const item of [...BUILDINGS,...SITES]){
      const context=locationGuideContext('campus',item.id)!;
      expect(context.title).toBe(item.name);
      expect(savedLocationAnswer(context,'When was this built?').text).toContain('have not been supplied');
      expect(JSON.stringify(context)).not.toContain('1372');
      for(const question of ['',...context.facts.map(f=>khmerGuideQuestion(f.question))]){
        expect(isKhmerGuideText(savedKhmerLocationAnswer(context,question).text)).toBe(true);
      }
    }
    expect(locationGuideContext('campus','naga-staircase')).toBeNull();
    expect(locationGuideContext('campus','hall','guardian-lion')).toBeNull();
  });
  it('grounds Gemini in the selected building and uses a separate campus identity',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({candidates:[{content:{parts:[{text:'The hall has a white colonnade.'}]}}]}));vi.stubGlobal('fetch',fetch);
    const response=await handleLocationGuide({experienceId:'campus',locationId:'hall',question:'Describe the hall',lang:'en'},{GEMINI_API_KEY:'test-only'});
    expect((await response.json()).fallback).toBe(false);
    const prompt=JSON.parse(fetch.mock.calls[0][1].body).systemInstruction.parts[0].text;
    expect(prompt).toContain('You are the Campus guide');expect(prompt).toContain('The Great Hall');
    expect(prompt).toContain('opening hours');expect(prompt).not.toContain('1372');
  });
  it('returns clearly labelled Khmer campus notes when AI is unavailable',async()=>{
    const response=await handleLocationGuide({experienceId:'campus',locationId:'teaching',lang:'km',question:khmerGuideQuestion('What is this place?')},{});
    const reply=await response.json();expect(reply.fallback).toBe(true);expect(reply.lang).toBe('km');
    expect(reply.text).toContain('អគារសិក្សា');expect(isKhmerGuideText(reply.text)).toBe(true);
    expect((await handleLocationGuide({experienceId:'campus',locationId:'invalid'},{})).status).toBe(404);
  });
});
