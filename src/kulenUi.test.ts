import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SPOTS } from './spots';
import { KULEN_WATERFALL } from './kulenWaterfall';
import { SpotView } from './components/SpotView';
import { PhnomKulenView } from './components/PhnomKulenView';

vi.mock('./components/Viewer', () => ({ Viewer: () => null }));
const spot = SPOTS.find(s => s.id === 'phnom-kulen')!;

describe('Kulen navigation markup', () => {
  it('opens as the mountain overview with all five locations available', () => {
    const html = renderToStaticMarkup(createElement(PhnomKulenView, { spot, onBack: () => {} }));
    for (const p of spot.pois!) expect(html).toContain(p.title);
    expect(html).toContain('Mountain overview');
    expect(html).not.toContain('🚶 Walk in');
  });
  it('offers the waterfall entry only on its own landmark card', () => {
    const props = { spot, onBack: () => {}, enterPlace: { id: 'waterfalls', label: 'Enter waterfall study', onEnter: () => {} } };
    expect(renderToStaticMarkup(createElement(SpotView, { ...props, initialPoiId: 'waterfalls' }))).toContain('Enter waterfall study');
    const temple = renderToStaticMarkup(createElement(SpotView, { ...props, initialPoiId: 'preah-ang-thom' }));
    expect(temple).not.toContain('Enter waterfall study');
    expect(temple).toContain('location symbol');
  });
  it('provides a mountain return and ground-level walking in the child scene', () => {
    const html = renderToStaticMarkup(createElement(SpotView, { spot: KULEN_WATERFALL, onBack: () => {}, backLabel: '← Kulen mountain' }));
    expect(html).toContain('← Kulen mountain');
    expect(html).toContain('🚶 Walk in');
    expect(html).not.toContain('Mountain overview');
  });
});
