// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {TimeTravel} from './TimeTravel';
import {SPOTS} from '../spots';
import {ERAS} from '../history';
const mocked=vi.hoisted(()=>({ask:vi.fn(),start:vi.fn(),stop:vi.fn(),dispose:vi.fn()}));
vi.mock('../lib/guide',()=>({askGuide:mocked.ask}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {start=mocked.start;stop=mocked.stop;dispose=mocked.dispose;}}));
vi.mock('../lib/identity',()=>({getIdentity:async()=>null,earnedAchievements:async()=>new Set(),claimCredential:async()=>false}));
vi.mock('./GuideMascot',()=>({GuideMascot:()=>null}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);for(const mock of Object.values(mocked))mock.mockReset();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('recorded history narration',()=>{
  it('loads English era text through the saved-answer route and narrates via the shared service',async()=>{
    mocked.ask.mockResolvedValue({text:'The saved era introduction.',lang:'en',source:'authored'});
    await act(async()=>root.render(createElement(TimeTravel,{spot:SPOTS[1],onClose:vi.fn()})));
    expect(mocked.ask).toHaveBeenCalledWith({spotId:SPOTS[1].id,eraId:ERAS[2].id,lang:'en'},expect.any(AbortSignal));
    const narrate=[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Kiri narrates'))!;
    await act(async()=>narrate.click());
    expect(mocked.start).toHaveBeenCalledWith('The saved era introduction.','en-US');
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Later'))!.click());
    expect(mocked.ask).toHaveBeenLastCalledWith(expect.objectContaining({eraId:ERAS[3].id}),expect.any(AbortSignal));
    expect(mocked.stop).toHaveBeenCalled();
  });
});
