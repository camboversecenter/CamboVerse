import {computeMix, type Recipe} from './chemistry';

/** Recipe quantities are ordered by reagent identity, not selection order. */
export function mixSelected(recipe: Recipe, slots: (string | null)[], amounts: number[]) {
  const ordered = recipe.inputs.map(id => amounts[slots.indexOf(id)] ?? 0);
  return computeMix(recipe, ordered[0], ordered[1], ordered[2], ordered[3]);
}

export function canDose(x: number, y: number, z: number, upY: number) {
  return Number.isFinite(x + y + z + upY) && Math.hypot(x, z + 4.04) < .15 && y > 1.31 && y < 1.9 && upY < .45;
}
