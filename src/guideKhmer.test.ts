import {afterEach,describe,expect,it,vi} from 'vitest';
import {isKhmerGuideText,KHMER_GUIDE,khmerGuideQuestion,savedKhmerLocationAnswer} from './guideKhmer';
import {locationGuideContext} from './locationGuide';
import {handleLocationGuide} from './worker/locationGuide';
import {locationGuideReply} from './lib/locationGuideReply';

afterEach(()=>vi.unstubAllGlobals());
const request={experienceId:'staircase-3dgs',locationId:'naga-staircase',question:'សូមប្រាប់អំពីប្រវត្តិ',lang:'km'};
const answer=(text:string)=>Response.json({candidates:[{content:{parts:[{text}]}}]});
describe('Khmer guide language enforcement',()=>{
  it('accepts Khmer and rejects Thai, Thai marks, Latin names and other scripts',()=>{
    expect(isKhmerGuideText('សួស្តី! ខ្ញុំឈ្មោះពេញ។ ឆ្នាំ១៣៧២ (1372)។')).toBe(true);
    for(const text of ['សួស្តី Penh','សួស្តី ครับ','សួស្តី\u0e49','សួស្តី 你好','Hello',''])expect(isKhmerGuideText(text)).toBe(false);
    for(const text of Object.values(KHMER_GUIDE))expect(isKhmerGuideText(text)).toBe(true);
  });
  it('retries mixed-script AI output once before showing a Khmer answer',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(answer('សួស្តី Penh ครับ')).mockResolvedValueOnce(answer('សួស្តី! ខ្ញុំឈ្មោះពេញ។'));
    vi.stubGlobal('fetch',fetch);
    const result=await (await handleLocationGuide(request,{GEMINI_API_KEY:'test-private'})).json();
    expect(fetch).toHaveBeenCalledTimes(2);expect(result).toMatchObject({text:'សួស្តី! ខ្ញុំឈ្មោះពេញ។',lang:'km',fallback:false});
    expect(JSON.parse(fetch.mock.calls[0][1].body).systemInstruction.parts[0].text).toContain('Never include Thai');
  });
  it('uses Khmer saved notes when retries or provider access fail',async()=>{
    const fetch=vi.fn().mockImplementation(async()=>answer('សួស្តី ครับ'));vi.stubGlobal('fetch',fetch);
    const result=await (await handleLocationGuide(request,{GEMINI_API_KEY:'test-private'})).json();
    expect(fetch).toHaveBeenCalledTimes(2);expect(result.fallback).toBe(true);expect(result.lang).toBe('km');
    expect(isKhmerGuideText(result.text)).toBe(true);expect(result.text).toContain('១៣៧២');
    const offline=await (await handleLocationGuide(request,{})).json();expect(isKhmerGuideText(offline.text)).toBe(true);
  });
  it('also rejects mixed-script replies at the browser/VR boundary',()=>{
    const context=locationGuideContext('staircase-3dgs','naga-staircase')!;
    const result=locationGuideReply(context,'Tell me about the history',{text:'សួស្តី ครับ',fallback:false},'km');
    expect(result.lang).toBe('km');expect(result.fallback).toBe(true);expect(isKhmerGuideText(result.text)).toBe(true);
  });
  it('keeps all supported locations and object fallbacks in Khmer',()=>{
    for(const [experience,id,object] of [['wat-phnom','wat-phnom'],['wat-phnom','central-stupa'],['wat-phnom','main-vihara'],['wat-phnom','city-overlook'],['clock-3dgs','flower-clock'],['staircase-3dgs','naga-staircase'],['staircase-3dgs','naga-staircase','naga-balustrade'],['staircase-3dgs','naga-staircase','guardian-lion']]){
      const context=locationGuideContext(experience,id,object)!;
      for(const question of ['',...context.facts.map(f=>khmerGuideQuestion(f.question)),'សំណួរដែលមិនមានព័ត៌មាន']){
        expect(isKhmerGuideText(savedKhmerLocationAnswer(context,question).text)).toBe(true);
      }
    }
  });
});
