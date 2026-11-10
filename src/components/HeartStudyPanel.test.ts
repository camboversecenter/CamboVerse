// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {HeartStudyPanel} from './HeartStudyPanel';

const voice = vi.hoisted(() => ({start:vi.fn(), stop:vi.fn(), dispose:vi.fn()}));
vi.mock('../lib/guideNarrator', () => ({GuideNarrator:class {start=voice.start; stop=voice.stop; dispose=voice.dispose;}}));
vi.mock('./VRPanel', () => ({VRPanelFrame:() => null, VRPageControls:() => null}));
vi.mock('./VRSurface', () => ({VRSurface:({title,body,eyebrow,onClick}:{title:string;body?:string;eyebrow?:string;onClick?:()=>void}) =>
  createElement(onClick ? 'button' : 'div', {onClick}, title, body, eyebrow)}));
let host: HTMLDivElement, root: Root;
beforeEach(() => {vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks(); host=document.createElement('div'); document.body.append(host); root=createRoot(host);});
afterEach(async () => {await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();});
const click = async (label:string) => {
  const button = Array.from(host.querySelectorAll('button')).find(b => b.textContent === label)!;
  expect(button).toBeDefined(); await act(async () => button.click());
};
describe.each([false, true])('heart lesson presentation immersive=%s', immersive => {
  it('uses the shared actions, allows hiding without losing progress, and cleans narration', async () => {
    const answer=vi.fn(), restart=vi.fn(), close=vi.fn();
    await act(async () => root.render(createElement(HeartStudyPanel, {
      immersive, study:{step:5,seen:[0,2],feedback:'Try again'}, note:'Aorta: carries blood from the left ventricle.',
      actions:[{id:'answer',label:'Left ventricle',run:answer}], onRestart:restart, onClose:close,
    })));
    expect(host.textContent).toContain('Which chamber pumps blood into the aorta?');
    await click('Left ventricle'); expect(answer).toHaveBeenCalledTimes(1);
    await click('Listen'); expect(voice.start).toHaveBeenCalledTimes(1);
    await click(immersive ? 'Minimize' : '−');
    expect(host.textContent).not.toContain('Which chamber');
    expect(voice.stop).toHaveBeenCalled();
    await click(immersive ? 'Heart study · reopen' : '+');
    expect(host.textContent).toContain('Step 6 of 7');
    await click('Restart'); expect(restart).toHaveBeenCalledTimes(1);
    await click('End study'); expect(close).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    expect(voice.dispose).toHaveBeenCalledTimes(1);
    root=createRoot(host);
  });
});
