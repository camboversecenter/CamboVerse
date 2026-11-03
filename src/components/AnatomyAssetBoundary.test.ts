// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {AnatomyAssetBoundary} from './AnatomyAssetBoundary';

vi.mock('@react-three/drei',()=>({Html:({children}:{children:unknown})=>children,useGLTF:{clear:vi.fn()}}));

it('keeps an in-scene fallback usable after a detailed model fails and retries on a new model',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const errors=vi.spyOn(console,'error').mockImplementation(()=>{});
  const warnings=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const host=document.createElement('div'),root=createRoot(host),select=vi.fn();
  function Missing():never {throw new Error('Model download failed');}
  try {
    await act(async()=>root.render(createElement(AnatomyAssetBoundary,{url:'/model-a.glb',
      fallback:createElement('button',{onClick:select},'Select fallback organ'),children:createElement(Missing)})));
    expect(host.textContent).toBe('Select fallback organ');
    await act(async()=>host.querySelector('button')!.click());expect(select).toHaveBeenCalledTimes(1);
    await act(async()=>root.render(createElement(AnatomyAssetBoundary,{url:'/model-b.glb',
      fallback:'Fallback',children:createElement('span',null,'Detailed organ')})));
    expect(host.textContent).toBe('Detailed organ');
  } finally {await act(async()=>root.unmount());errors.mockRestore();warnings.mockRestore();vi.unstubAllGlobals();}
});
