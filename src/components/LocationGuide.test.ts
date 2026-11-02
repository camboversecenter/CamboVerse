// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LocationGuide} from './LocationGuide';
import {KHMER_GUIDE,isKhmerGuideText,khmerGuideQuestion} from '../guideKhmer';

const mocked=vi.hoisted(()=>({ask:vi.fn(),narrate:vi.fn()}));
vi.mock('../lib/guide',()=>({askGuide:mocked.ask}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {start(text:string,lang:string,persona?:string){mocked.narrate(text,lang,persona);} stop(){} dispose(){}}}));
vi.mock('./GuideMascot',()=>({GuideMascot:()=>null}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{localStorage.clear();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');document.body.append(host);root=createRoot(host);mocked.ask.mockReset();mocked.narrate.mockReset();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const button=(text:string)=>[...host.querySelectorAll('button')].find(element=>element.textContent?.includes(text))!;
describe('Penh language selection',()=>{
  it('opens and minimizes within its containing information panel',async()=>{
    await act(async()=>root.render(createElement('section',{'aria-label':'Location information'},createElement(LocationGuide,{embedded:true,experienceId:'wat-phnom',locationId:'central-stupa'}))));
    await act(async()=>button('Ask Penh').click());
    const parent=host.querySelector('section')!;
    expect(parent.querySelector('.location-guide-embedded .location-guide-panel')).toBeTruthy();
    expect(parent.textContent).toContain('The Great Stupa');
    await act(async()=>button('−').click());expect(parent.querySelector('.location-guide-panel')).toBeNull();
  });
  it('requests the selected language and narrates the answer with its locale',async()=>{
    mocked.ask.mockResolvedValue({text:'Bonjour et bienvenue.',fallback:false,sources:[]});
    await act(async()=>root.render(createElement(LocationGuide,{experienceId:'clock-3dgs',locationId:'flower-clock'})));
    await act(async()=>button('Ask Penh').click());
    const select=host.querySelector('select')!;act(()=>{select.value='fr';select.dispatchEvent(new Event('change',{bubbles:true}));});
    await act(async()=>button('What is the flower clock?').click());
    expect(mocked.ask).toHaveBeenCalledWith(expect.objectContaining({lang:'fr'}),expect.any(AbortSignal));
    await act(async()=>button('Listen').click());
    expect(mocked.narrate).toHaveBeenCalledWith('Bonjour et bienvenue.','fr-FR','penh');
  });
  it('keeps saved answers and controls in Khmer when the AI is unavailable',async()=>{
    mocked.ask.mockResolvedValue(null);
    await act(async()=>root.render(createElement(LocationGuide,{experienceId:'clock-3dgs',locationId:'flower-clock'})));
    await act(async()=>button('Ask Penh').click());
    const select=host.querySelector('select')!;act(()=>{select.value='km';select.dispatchEvent(new Event('change',{bubbles:true}));});
    await act(async()=>button(khmerGuideQuestion('What is the flower clock?')).click());
    expect(host.textContent).toContain(KHMER_GUIDE.saved);expect(isKhmerGuideText(host.textContent!)).toBe(true);
    await act(async()=>button(KHMER_GUIDE.listen).click());expect(mocked.narrate).toHaveBeenCalledWith(expect.any(String),'km-KH','penh');
  });
  it('never displays or narrates a mixed Thai/Khmer reply',async()=>{
    localStorage.setItem('camboverse-penh-language','km');mocked.ask.mockResolvedValue({text:'សួស្តី Penh ครับ',fallback:false});
    await act(async()=>root.render(createElement(LocationGuide,{experienceId:'clock-3dgs',locationId:'flower-clock'})));
    await act(async()=>button(`${KHMER_GUIDE.ask} ${KHMER_GUIDE.name}`).click());
    await act(async()=>button(khmerGuideQuestion('What is the flower clock?')).click());
    expect(host.textContent).not.toContain('ครับ');expect(isKhmerGuideText(host.textContent!)).toBe(true);
    await act(async()=>button(KHMER_GUIDE.listen).click());expect(isKhmerGuideText(mocked.narrate.mock.calls[0][0])).toBe(true);
  });
  it('keeps the embedded object guide compact and its conversation usable',async()=>{
    mocked.ask.mockResolvedValue({text:'The naga forms the staircase railing.',fallback:false,sources:[]});
    await act(async()=>root.render(createElement(LocationGuide,{embedded:true,experienceId:'staircase-3dgs',locationId:'naga-staircase',objectId:'naga-balustrade'})));
    await act(async()=>button('Ask Penh').click());
    expect(host.querySelector('.location-guide-header p')?.textContent).toBe('Naga balustrade');
    expect(host.querySelector('.location-guide-intro')).toBeNull();
    expect(host.querySelector('details')?.open).toBe(false);
    expect(host.querySelector('input')).toBeTruthy();
    await act(async()=>button('Tell me about Naga balustrade').click());
    expect(host.querySelector('[role="log"]')?.textContent).toContain('The naga forms the staircase railing.');
    expect(mocked.ask).toHaveBeenCalledWith(expect.objectContaining({objectId:'naga-balustrade'}),expect.any(AbortSignal));
    await act(async()=>button('Listen').click());
    expect(mocked.narrate).toHaveBeenCalledWith('The naga forms the staircase railing.','en-US','penh');
  });
});
