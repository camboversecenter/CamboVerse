import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { FarmActivity } from './components/FarmActivity';
import { FARM_STAGES } from './farm';
import { newFarmJourney, farmJourneyReducer as reduce, type FarmJourney } from './farmJourney';
const render = (journey: FarmJourney) => renderToStaticMarkup(createElement(FarmActivity, {journey, onTask: () => {}, onWater: () => {}}));

describe('Farm activity accessible controls', () => {
  it('provides named native buttons and progress in every stage', () => {
    for (const stage of FARM_STAGES) {
      const html = render(reduce(newFarmJourney(), {type: 'select', stageId: stage.id}));
      expect(html).toContain('aria-label="Current farm activity"');
      expect(html).toContain('<button'); expect(html).toContain('<progress');
      expect(html).toContain('aria-label="Activity progress"');
    }
  });
  it('announces completed patches and disables repeat actions', () => {
    const state = reduce(newFarmJourney(), {type: 'task', stageId: 'plough', task: 0});
    const html = render(state);
    expect(html).toContain('Plough far left, completed'); expect(html).toContain('class="complete" disabled=""');
    expect(html).toContain('value="1" max="4"');
  });
  it('labels the water scale as an exercise, not agronomy guidance', () => {
    const state = reduce(newFarmJourney(), {type: 'select', stageId: 'water'});
    const html = render(state);
    expect(html).toContain('for="farm-water"'); expect(html).toContain('type="range"');
    expect(html).toContain('not a water-depth or farming recommendation');
    expect(html).toContain('disabled=""');
    const ready = render(reduce(state, {type: 'water', value: 50}));
    expect(ready).not.toContain('disabled=""'); expect(ready).toContain('Within the practice band');
  });
  it('distinguishes grain and chaff in text without relying on emoji or colour', () => {
    const html = render(reduce(newFarmJourney(), {type: 'select', stageId: 'thresh'}));
    expect(html).toContain('Grain bundle 4'); expect(html).toContain('Light chaff 2');
  });
});
