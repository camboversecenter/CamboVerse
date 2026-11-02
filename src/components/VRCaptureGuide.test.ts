// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {VRCaptureGuide} from './VRCaptureGuide';

const mocked=vi.hoisted(()=>({ask:vi.fn(),speak:vi.fn(()=>true),stop:vi.fn()}));
vi.mock('@react-three/fiber',()=>({useFrame:()=>{},useLoader:()=>({})}));
vi.mock('../lib/guide',()=>({askGuide:mocked.ask}));
vi.mock('../lib/voice',()=>({LANGS:[{code:'en',name:'English',bcp:'en-US'},{code:'km',name:'ខ្មែរ',bcp:'km-KH'},{code:'fr',name:'Français',bcp:'fr-FR'},{code:'zh',name:'中文',bcp:'zh-CN'}],speak:mocked.speak,stopSpeaking:mocked.stop,ttsSupported:()=>true,sttSupported:()=>false,listenOnce:()=>null}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {start(text:string,bcp:string){mocked.speak(text,bcp,{});} stop(){mocked.stop();} dispose(){mocked.stop();}}}));
vi.mock('./VRSurface',()=>({VRSurface:({title,onClick,body}:{title:string;onClick?:()=>void;body?:string})=>createElement('button',{onClick},`${title} ${body??''}`)}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{localStorage.clear();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');document.body.append(host);root=createRoot(host);mocked.ask.mockReset();mocked.speak.mockClear();mocked.stop.mockClear();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
function button(label:string){return [...host.querySelectorAll('button')].find(el=>el.textContent?.includes(label))!;}

describe('immersive location guide',()=>{
  it.each([['naga-staircase','Tell me about the history','staircase-3dgs'],['flower-clock','What is the flower clock?','clock-3dgs']])
  ('asks the correct location and narrates saved answers for %s',async(locationId,question,experienceId)=>{
    mocked.ask.mockResolvedValue({text:'A verified answer about this location.',fallback:true,sources:[]});
    await act(async()=>root.render(createElement(VRCaptureGuide,{locationId,scale:1,onClose:vi.fn()})));
    await act(async()=>button(question).click());
    expect(mocked.ask).toHaveBeenCalledWith(expect.objectContaining({locationId,experienceId,question}),expect.any(AbortSignal));
    expect(button('Penh · Saved notes').textContent).toContain('A verified answer');
    await act(async()=>button('Listen').click());
    expect(mocked.speak).toHaveBeenCalledWith('A verified answer about this location.','en-US',expect.any(Object));
    await act(async()=>button('Ask another').click());
    expect(button(question)).toBeTruthy();expect(mocked.stop).toHaveBeenCalled();
  });
  it('uses local notes when the guide endpoint is unavailable',async()=>{
    mocked.ask.mockResolvedValue(null);
    await act(async()=>root.render(createElement(VRCaptureGuide,{locationId:'flower-clock',scale:1,onClose:vi.fn()})));
    await act(async()=>button('What is the flower clock?').click());
    expect(button('Penh · Saved notes').textContent).toContain('clock face');
  });
  it('requests and narrates in the selected language',async()=>{
    mocked.ask.mockResolvedValue({text:'Bonjour et bienvenue.',fallback:false,sources:[]});
    await act(async()=>root.render(createElement(VRCaptureGuide,{locationId:'flower-clock',scale:1,onClose:vi.fn()})));
    await act(async()=>button('Language: English').click());
    await act(async()=>button('Language: ខ្មែរ').click());
    await act(async()=>button('What is the flower clock?').click());
    expect(mocked.ask).toHaveBeenCalledWith(expect.objectContaining({lang:'fr'}),expect.any(AbortSignal));
    await act(async()=>button('Listen').click());
    expect(mocked.speak).toHaveBeenCalledWith('Bonjour et bienvenue.','fr-FR',expect.any(Object));
  });
  it('uses the selected sculpture as the guide context',async()=>{
    mocked.ask.mockResolvedValue({text:'The naga forms the staircase railing.',fallback:false,sources:[]});
    await act(async()=>root.render(createElement(VRCaptureGuide,{locationId:'naga-staircase',objectId:'naga-balustrade',scale:1,embedded:true,onClose:vi.fn()})));
    await act(async()=>button('Tell me about Naga balustrade').click());
    expect(mocked.ask).toHaveBeenCalledWith(expect.objectContaining({locationId:'naga-staircase',objectId:'naga-balustrade'}),expect.any(AbortSignal));
  });
});
