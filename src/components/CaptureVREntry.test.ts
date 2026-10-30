// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {createXRStore} from '@react-three/xr';
import {IMMERSIVE_XR_OPTIONS} from '../immersiveVR';
import {ImmersiveVREntry} from './CaptureVR';

let root:Root,host:HTMLDivElement;
const stores:ReturnType<typeof createXRStore>[]=[];
beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('isSecureContext',true);
  vi.stubGlobal('navigator',{xr:{isSessionSupported:vi.fn(async()=>true),addEventListener:vi.fn(),removeEventListener:vi.fn()}});
  // jsdom has dialog markup but does not implement its native top-layer API.
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
  host=document.createElement('div');host.className='viewer';document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{
  await act(async()=>root?.unmount());
  for(const store of stores.splice(0))store.destroy();
  document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();
});
async function renderEntry(){
  const store=createXRStore(IMMERSIVE_XR_OPTIONS);stores.push(store);
  await act(async()=>root.render(createElement(ImmersiveVREntry,{store,title:'Wat Phnom'})));
  return {store,button:document.querySelector<HTMLButtonElement>('.capture-vr-entry')!};
}

describe('VR entry over the walk view',()=>{
  it('renders entry outside the canvas stacking context, above sibling walking controls',async()=>{
    const walkLayer=document.createElement('div');walkLayer.className='walk-layer';document.body.append(walkLayer);
    const {button}=await renderEntry();
    expect(button.textContent).toContain('Enter VR');
    expect(host.contains(button)).toBe(false);
    expect(button.parentElement?.parentElement).toBe(document.body);
    expect(document.querySelector('dialog')?.parentElement).toBe(document.body);
  });
  it('makes one immediate native request on click and leaves permission failures visible',async()=>{
    const {store,button}=await renderEntry();
    const denied=new DOMException('User denied immersive session','NotAllowedError');
    const enter=vi.spyOn(store,'enterVR').mockRejectedValue(denied);
    await act(async()=>{
      button.click();button.click();
      expect(enter).toHaveBeenCalledTimes(1);
    });
    expect(document.querySelector('dialog')?.open).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toContain('permission');
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('NotAllowedError');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Enter VR');
  });
  it('keeps the entry discoverable on unsupported devices without claiming VR is active',async()=>{
    vi.mocked(navigator.xr!.isSessionSupported).mockResolvedValue(false);
    const {store,button}=await renderEntry();
    const enter=vi.spyOn(store,'enterVR');
    await act(async()=>button.click());
    expect(enter).not.toHaveBeenCalled();
    expect(document.querySelector('dialog')?.open).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toContain('unavailable');
    expect(button.textContent).toContain('Enter VR');
  });
  it('rechecks availability when the headset browser regains focus',async()=>{
    vi.mocked(navigator.xr!.isSessionSupported).mockResolvedValue(false);
    const {store,button}=await renderEntry();
    vi.mocked(navigator.xr!.isSessionSupported).mockResolvedValue(true);
    await act(async()=>window.dispatchEvent(new Event('focus')));
    const enter=vi.spyOn(store,'enterVR').mockRejectedValue(new Error('test session failure'));
    await act(async()=>button.click());
    expect(enter).toHaveBeenCalledOnce();
  });
});
