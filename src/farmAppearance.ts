import layout from './farmVisualLayout.json';
import { farmPatch, farmRiceHeight } from './farmJourney';

export const farmModelUrl = (detailed: boolean) => `/models/local/farm-visuals-v3/farm-${detailed ? 'ultra' : 'normal'}.glb`;
export function riceLook(g: number) {
  if (!Number.isFinite(g) || g < .06) return {show: false, height: 0, color: '#4c8a3f', seedbed: false};
  if (g >= .92) return {show: true, height: .2, color: '#b39355', seedbed: false};
  const t = Math.max(0, Math.min(1, (g - .08) / .77));
  const gold = Math.max(0, Math.min(1, (g - .6) / .28));
  const a = [76, 154, 58], b = [216, 178, 58];
  const color = '#' + a.map((v,i) => Math.round(v + (b[i] - v) * gold).toString(16).padStart(2, '0')).join('');
  return {show: true, height: .28 + t * .97, color, seedbed: g < .2};
}

/** Shared transforms for both tiers: roots stay on the field, heads follow crops. */
export function farmPlantInstances(growth: number, stage: string | undefined, tasks: number[]) {
  const look = riceLook(growth), plants: {x: number; z: number; height: number; angle: number; grain: boolean; cut: boolean}[] = [];
  if (!look.show) return plants;
  for (let r = 0; r < layout.riceColumns; r++) for (let c = 0; c < layout.riceColumns; c++) {
    const idx = r * layout.riceColumns + c;
    const x = (c / (layout.riceColumns - 1) - .5) * layout.riceExtent;
    const z = (r / (layout.riceColumns - 1) - .5) * layout.riceExtent;
    if (look.seedbed && !(x < -.9 && z < -.9)) continue;
    // Keep a clear central dike; do not grow plants through its edge.
    if (Math.abs(z) < .09) continue;
    const patch = look.seedbed ? farmPatch(x + 1.6, z + 1.6) : farmPatch(x,z);
    const base = farmRiceHeight(stage, tasks, patch, look.height);
    if (!base) continue;
    const cut = growth >= .92 || (stage === 'harvest' && tasks.includes(patch));
    plants.push({x: x + (((idx*37)%20)/20-.5)*.10, z: z + (((idx*53)%20)/20-.5)*.06,
      height: base * (.82 + ((idx*13)%10)/28), angle: idx%7*.4, grain: growth >= .72 && !cut, cut});
  }
  return plants;
}
