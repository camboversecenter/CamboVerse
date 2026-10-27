import { FARM_STAGES } from './farm';

export const FARM_JOURNEY_KEY = 'camboverse.farm.journey.v2';
export interface FarmJourney {
  version: 2;
  stageId: string;
  tasks: Record<string, number[]>;
  water: number;
}
export type FarmAction =
  | { type: 'select'; stageId: string }
  | { type: 'task'; stageId: string; task: number }
  | { type: 'water'; value: number }
  | { type: 'reset' };

export const FARM_ACTIVITIES: Record<string, { instruction: string; labels: string[]; valid: number[] }> = {
  plough: { instruction: 'Guide a pass through each patch. Watch the furrows appear.', labels: ['Plough far left', 'Plough far right', 'Plough near left', 'Plough near right'], valid: [0, 1, 2, 3] },
  seedbed: { instruction: 'Sow each nursery patch. The seedlings stay together in the small seedbed.', labels: ['Sow patch 1', 'Sow patch 2', 'Sow patch 3', 'Sow patch 4'], valid: [0, 1, 2, 3] },
  transplant: { instruction: 'Move seedlings into all four field patches. You can also tap the field markers.', labels: ['Plant far left', 'Plant far right', 'Plant near left', 'Plant near right'], valid: [0, 1, 2, 3] },
  water: { instruction: 'Adjust the practice water gate into the marked band, then check the dikes.', labels: ['Check the dikes'], valid: [0] },
  harvest: { instruction: 'Cut one patch at a time. Golden rice becomes stubble and gathered sheaves.', labels: ['Cut far left', 'Cut far right', 'Cut near left', 'Cut near right'], valid: [0, 1, 2, 3] },
  thresh: { instruction: 'Keep the four grain bundles; leave the two light chaff piles behind. This is a sorting exercise, not a threshing simulation.', labels: ['Grain bundle 1', 'Light chaff 1', 'Grain bundle 2', 'Grain bundle 3', 'Light chaff 2', 'Grain bundle 4'], valid: [0, 2, 3, 5] },
  store: { instruction: 'Move the four grain sacks into the raised store. No coins or purchases—just a completed rice journey.', labels: ['Store sack 1', 'Store sack 2', 'Store sack 3', 'Store sack 4'], valid: [0, 1, 2, 3] },
};
export const newFarmJourney = (): FarmJourney => ({ version: 2, stageId: FARM_STAGES[0].id, tasks: {}, water: 15 });
export const farmStageDone = (state: FarmJourney, id: string) => !!FARM_ACTIVITIES[id] && FARM_ACTIVITIES[id].valid.every(n => state.tasks[id]?.includes(n));
export const farmDoneCount = (state: FarmJourney) => FARM_STAGES.filter(s => farmStageDone(state, s.id)).length;
export const farmWaterReady = (value: number) => value >= 40 && value <= 60;

export function farmJourneyReducer(state: FarmJourney, action: FarmAction): FarmJourney {
  if (action.type === 'reset') return newFarmJourney();
  if (action.type === 'select') return FARM_STAGES.some(s => s.id === action.stageId) ? { ...state, stageId: action.stageId } : state;
  if (action.type === 'water') return Number.isFinite(action.value) && state.stageId === 'water' && !farmStageDone(state, 'water')
    ? { ...state, water: Math.max(0, Math.min(100, Math.round(action.value))) } : state;
  const activity = FARM_ACTIVITIES[action.stageId];
  if (action.stageId !== state.stageId || !activity?.valid.includes(action.task) || state.tasks[action.stageId]?.includes(action.task)) return state;
  if (action.stageId === 'water' && !farmWaterReady(state.water)) return state;
  return { ...state, tasks: { ...state.tasks, [action.stageId]: [...(state.tasks[action.stageId] ?? []), action.task] } };
}

/** Validate persisted data; never hydrate arbitrary storage into the renderer. */
export function parseFarmJourney(raw: string | null): FarmJourney {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (!data || data.version !== 2) return newFarmJourney();
    const state = newFarmJourney();
    if (FARM_STAGES.some(s => s.id === data.stageId)) state.stageId = data.stageId;
    if (typeof data.water === 'number' && Number.isFinite(data.water)) state.water = Math.max(0, Math.min(100, data.water));
    for (const s of FARM_STAGES) {
      const tasks = data.tasks?.[s.id];
      if (Array.isArray(tasks)) state.tasks[s.id] = [...new Set(tasks.filter((n: unknown): n is number => typeof n === 'number' && FARM_ACTIVITIES[s.id].valid.includes(n)))];
    }
    if (farmStageDone(state, 'water') && !farmWaterReady(state.water)) state.tasks.water = [];
    return state;
  } catch { return newFarmJourney(); }
}

export function nextFarmStage(state: FarmJourney): string {
  const start = FARM_STAGES.findIndex(s => s.id === state.stageId);
  for (let offset = 1; offset <= FARM_STAGES.length; offset++) {
    const stage = FARM_STAGES[(start + offset) % FARM_STAGES.length];
    if (!farmStageDone(state, stage.id)) return stage.id;
  }
  return state.stageId;
}

export function farmQuality(cores = 4, memory = 4, small = true): 'normal' | 'ultra' {
  return cores <= 4 || memory <= 3 || small ? 'normal' : 'ultra';
}

/** The same logical four patches are used by the 3D field and keyboard controls. */
export const farmPatch = (x: number, z: number) => (z < 0 ? 0 : 2) + (x < 0 ? 0 : 1);
export function farmRiceHeight(stage: string | undefined, tasks: number[], patch: number, height: number): number {
  if (stage === 'transplant' || stage === 'seedbed') return tasks.includes(patch) ? height : 0;
  if (stage === 'harvest') return tasks.includes(patch) ? .2 : height;
  return height;
}
