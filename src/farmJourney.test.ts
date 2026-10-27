import { describe, it, expect } from 'vitest';
import { FARM_STAGES } from './farm';
import { FARM_ACTIVITIES, newFarmJourney, farmJourneyReducer as reduce, parseFarmJourney, farmDoneCount, farmStageDone, nextFarmStage, farmQuality, farmPatch, farmRiceHeight } from './farmJourney';

describe('Virtual Farm learning journey', () => {
  it('requires distinct tasks; duplicate clicks cannot complete the field', () => {
    let state = newFarmJourney();
    for (let i = 0; i < 20; i++) state = reduce(state, {type: 'task', stageId: 'plough', task: 0});
    expect(state.tasks.plough).toEqual([0]); expect(farmStageDone(state, 'plough')).toBe(false);
    for (const task of [1, 2, 3]) state = reduce(state, {type: 'task', stageId: 'plough', task});
    expect(farmStageDone(state, 'plough')).toBe(true); expect(farmDoneCount(state)).toBe(1);
  });
  it('preserves partial tasks through stage navigation and reload', () => {
    let state = reduce(newFarmJourney(), {type: 'task', stageId: 'plough', task: 2});
    state = reduce(state, {type: 'select', stageId: 'harvest'});
    state = reduce(state, {type: 'task', stageId: 'harvest', task: 1});
    const loaded = parseFarmJourney(JSON.stringify(state));
    expect(loaded).toEqual(state);
    expect(reduce(loaded, {type: 'select', stageId: 'plough'}).tasks.plough).toEqual([2]);
  });
  it('rejects stale-stage events, invalid indices and chaff', () => {
    const state = newFarmJourney();
    expect(reduce(state, {type: 'task', stageId: 'store', task: 0})).toBe(state);
    expect(reduce(state, {type: 'task', stageId: 'plough', task: -1})).toBe(state);
    expect(reduce(state, {type: 'select', stageId: 'unknown'})).toBe(state);
    const thresh = reduce(state, {type: 'select', stageId: 'thresh'});
    expect(reduce(thresh, {type: 'task', stageId: 'thresh', task: 1})).toBe(thresh);
    expect(reduce(thresh, {type: 'task', stageId: 'thresh', task: 4})).toBe(thresh);
  });
  it('only completes water when the practice gate is in the target band', () => {
    let state = reduce(newFarmJourney(), {type: 'select', stageId: 'water'});
    expect(reduce(state, {type: 'task', stageId: 'water', task: 0})).toBe(state);
    for (const value of [0, 39, 61, 100]) {
      state = reduce(state, {type: 'water', value});
      expect(farmStageDone(reduce(state, {type: 'task', stageId: 'water', task: 0}), 'water')).toBe(false);
    }
    state = reduce(state, {type: 'water', value: 50});
    state = reduce(state, {type: 'task', stageId: 'water', task: 0});
    expect(farmStageDone(state, 'water')).toBe(true);
    expect(reduce(state, {type: 'water', value: 0})).toBe(state);
  });
  it('can finish all seven stages in any order and return to unfinished work', () => {
    let state = newFarmJourney();
    state = reduce(state, {type: 'select', stageId: 'store'});
    expect(nextFarmStage(state)).toBe('plough');
    for (const stage of [...FARM_STAGES].reverse()) {
      state = reduce(state, {type: 'select', stageId: stage.id});
      if (stage.id === 'water') state = reduce(state, {type: 'water', value: 50});
      for (const task of FARM_ACTIVITIES[stage.id].valid) state = reduce(state, {type: 'task', stageId: stage.id, task});
    }
    expect(farmDoneCount(state)).toBe(7);
    expect(nextFarmStage(state)).toBe(state.stageId);
    expect(reduce(state, {type: 'reset'})).toEqual(newFarmJourney());
  });
  it('recovers malformed or unsupported local data and filters task IDs', () => {
    for (const value of [null, 'bad json', '{}', 'null', '[]', '{"version":1}']) expect(parseFarmJourney(value)).toEqual(newFarmJourney());
    const state = parseFarmJourney(JSON.stringify({version: 2, stageId: 'bad', water: 200,
      tasks: { plough: [0, 0, 1, 1.5, 99, '2', null], water: [0], harvest: 'bad', unknown: [1] }}));
    expect(state.stageId).toBe('plough'); expect(state.water).toBe(100);
    expect(state.tasks.plough).toEqual([0, 1]); expect(state.tasks.water).toEqual([]);
    expect(state.tasks.unknown).toBeUndefined(); expect(state.tasks.harvest).toBeUndefined();
  });
  it('maps field tasks to stable quadrants and leaves harvested stubble', () => {
    expect([farmPatch(-1,-1), farmPatch(1,-1), farmPatch(-1,1), farmPatch(1,1)]).toEqual([0,1,2,3]);
    expect(farmRiceHeight('transplant', [2], 2, .5)).toBe(.5);
    expect(farmRiceHeight('transplant', [2], 0, .5)).toBe(0);
    expect(farmRiceHeight('harvest', [2], 2, 1.2)).toBe(.2);
    expect(farmRiceHeight('harvest', [2], 0, 1.2)).toBe(1.2);
    expect(farmRiceHeight(undefined, [], 0, .6)).toBe(.6);
  });
  it('defaults to Normal on small or low-resource devices', () => {
    expect(farmQuality()).toBe('normal');
    expect(farmQuality(8, 8, true)).toBe('normal');
    expect(farmQuality(4, 8, false)).toBe('normal');
    expect(farmQuality(8, 2, false)).toBe('normal');
    expect(farmQuality(8, 8, false)).toBe('ultra');
  });
});
