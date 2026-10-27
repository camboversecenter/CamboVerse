import { Mesh,type Intersection } from 'three';

/** Picking halos and hidden lesson groups are not physical floors or walls. */
export function isWalkingSurface(hit:Intersection) {
  const object=hit.object;
  if(!(object instanceof Mesh))return false;
  if(object.userData.walkCollision===true)return true;
  for(let p:typeof hit.object|null=object;p;p=p.parent)if(!p.visible)return false;
  const material=Array.isArray(object.material)?object.material[hit.face?.materialIndex??0]:object.material;
  return !!material && material.visible && !(material.transparent&&material.opacity===0);
}

/** Relative to the player's feet, never a fixed world-space height cutoff. */
export const TERRAIN_STEP_HEIGHT = 0.45;
export function isTerrainFloor(surfaceY: number, feetY: number, worldNormalY: number) {
  return Number.isFinite(surfaceY) && surfaceY <= feetY + TERRAIN_STEP_HEIGHT && worldNormalY > 0.55;
}
