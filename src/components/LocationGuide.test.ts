// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LocationGuide} from './LocationGuide';

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
  it('labels untranslated saved notes as English when the AI is unavailable',async()=>{
    mocked.ask.mockResolvedValue(null);
    await act(async()=>root.render(createElement(LocationGuide,{experienceId:'clock-3dgs',locationId:'flower-clock'})));
    await act(async()=>button('Ask Penh').click());
    const select=host.querySelector('select')!;act(()=>{select.value='km';select.dispatchEvent(new Event('change',{bubbles:true}));});
    await act(async()=>button('What is the flower clock?').click());
    expect(host.textContent).toContain('Saved location notes · English');
    await act(async()=>button('Listen').click());expect(mocked.narrate).toHaveBeenCalledWith(expect.any(String),'en-US','penh');
  });
});
