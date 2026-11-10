// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {TourGuide} from './TourGuide';
import {SPOTS} from '../spots';
const mocked=vi.hoisted(()=>({ask:vi.fn(),start:vi.fn(),stop:vi.fn(),dispose:vi.fn()}));
vi.mock('../lib/guide',()=>({askGuide:mocked.ask}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {start=mocked.start;stop=mocked.stop;dispose=mocked.dispose;}}));
vi.mock('./GuideMascot',()=>({GuideMascot:()=>null}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);for(const mock of Object.values(mocked))mock.mockReset();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const props={spot:SPOTS.find(s=>s.id==='bayon')!,activePoi:null,count:5,index:-1,onPrev:vi.fn(),onNext:vi.fn(),onClose:vi.fn()};
describe('heritage guide recorded narration',()=>{
  it('waits for Listen and uses the same recording service outside Wat Phnom',async()=>{
    mocked.ask.mockResolvedValue({text:'Bayon introduction.',lang:'en'});
    await act(async()=>root.render(createElement(TourGuide,props)));
    expect(mocked.start).not.toHaveBeenCalled();
    await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Listen to Kiri"]')!.click());
    expect(mocked.start).toHaveBeenCalledWith('Bayon introduction.','en-US');
    await act(async()=>root.render(createElement(TourGuide,{...props,activePoi:props.spot.pois![0]})));
    expect(mocked.stop).toHaveBeenCalled();
    expect(mocked.ask).toHaveBeenLastCalledWith(expect.objectContaining({spotId:'bayon',poiId:props.spot.pois![0].id}),expect.any(AbortSignal));
  });
  it('narrates English fallback text in English when translation is unavailable',async()=>{
    mocked.ask.mockResolvedValue({text:'Saved English notes.',lang:'en',fallback:true});
    await act(async()=>root.render(createElement(TourGuide,props)));
    const french=[...host.querySelectorAll('button')].find(b=>b.textContent==='Français')!;
    await act(async()=>french.click());
    expect(host.textContent).toContain('Translation unavailable');
    await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Listen to Kiri"]')!.click());
    expect(mocked.start).toHaveBeenCalledWith('Saved English notes.','en-US');
  });
});
