import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FARM_JOURNEY_KEY, newFarmJourney } from './farmJourney';
vi.mock('@react-three/fiber', () => ({ Canvas: () => null, useFrame: () => {} }));
vi.mock('@react-three/xr', () => ({ createXRStore: () => ({enterVR: vi.fn()}), XR: () => null, XROrigin: () => null, useXR: () => false }));
import { FarmView } from './components/FarmView';

afterEach(() => vi.unstubAllGlobals());
describe('Virtual Farm HUD integration (server-rendered, no WebGL)', () => {
  it('offers quality, collapse, stage navigation and labelled actions', () => {
    const html = renderToStaticMarkup(createElement(FarmView, {onBackToMap: () => {}}));
    expect(html).toContain('Virtual Farm'); expect(html).toContain('Normal');
    expect(html).toContain('aria-controls="farm-learning-content"');
    expect(html).toContain('aria-current="step"'); expect(html).toContain('Plough far left');
    expect(html).toContain('My Farm'); expect(html).toContain('Community');
    expect(html).toContain('New practice season');
  });
  it('restores the selected lesson and partial tasks without touching diary storage', () => {
    const state = {...newFarmJourney(), stageId: 'harvest', tasks: {harvest: [1, 3]}};
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {getItem: (key: string) => key === FARM_JOURNEY_KEY ? JSON.stringify(state) : null, setItem});
    const html = renderToStaticMarkup(createElement(FarmView, {onBackToMap: () => {}}));
    expect(html).toContain('The Harvest'); expect(html).toContain('Cut far right, completed');
    expect(html).toContain('Cut near right, completed'); expect(html).toContain('value="2" max="4"');
    expect(setItem).not.toHaveBeenCalled();
  });
});
