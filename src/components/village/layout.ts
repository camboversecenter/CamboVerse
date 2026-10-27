export type VillageMode = 'normal' | 'ultra';
export type AssetName = 'house' | 'house-blue' | 'house-kitchen' | 'fence' | 'jar' | 'bench' | 'basket' | 'palm' | 'tree' | 'hall' | 'stupa' | 'buffalo' | 'road' | 'plot' | 'pond' | 'paddy';
export type Placement = { position: [number, number, number]; rotation?: number; scale?: number };
export const ASSETS: AssetName[] = ['house', 'house-blue', 'house-kitchen', 'fence', 'jar', 'bench', 'basket', 'palm', 'tree', 'hall', 'stupa', 'buffalo', 'road', 'plot', 'pond', 'paddy'];
export const houses: Placement[] = [
  ...[-16, -8, 8, 16].map((x): Placement => ({ position: [x, 0, -7.5] })),
  ...[-16, -8, 0, 8, 16].map((x): Placement => ({ position: [x, 0, 7.5], rotation: Math.PI })),
];
export const placements: Record<AssetName, Placement[]> = { house:[], 'house-blue':[], 'house-kitchen':[], fence:[], jar:[], bench:[], basket:[], palm:[], tree:[], hall:[], stupa:[], buffalo:[], road:[], plot:[], pond:[], paddy:[] };
houses.forEach((h,i) => placements[(['house','house-blue','house-kitchen'] as const)[i%3]].push(h));
placements.plot = houses;
placements.road = [
  ...Array.from({ length:52 }, (_,i): Placement => ({position:[i-25.5,0,0]})),
  ...Array.from({ length:13 }, (_,i): Placement => ({position:[0,.01,-3.5-i],rotation:Math.PI/2})),
];
placements.pond = [{position:[16,0,19]}];
placements.paddy = [{position:[-19,0,22]},{position:[-8,0,22]}];
export function local(h: Placement, x: number, z: number): Placement {
  const a = h.rotation ?? 0;
  return { position: [h.position[0] + x * Math.cos(a) + z * Math.sin(a), 0, h.position[2] - x * Math.sin(a) + z * Math.cos(a)], rotation: a };
}
for (const house of houses) {
  placements.jar.push(local(house, 2.3, .5), local(house, 2.3, 1.4));
  placements.bench.push(local(house, -.7, .4));
  placements.basket.push(local(house, .9, -.3));
  for (const x of [-2.6, 2.6]) {
    placements.fence.push(local(house, x, 4.1));
    for (const z of [-1.6, .5, 2.6]) placements.fence.push({ ...local(house, x < 0 ? -3.6 : 3.6, z), rotation: (house.rotation ?? 0) + Math.PI / 2 });
  }
}
placements.hall = [{ position: [0, 0, -18] }];
placements.stupa = [{ position: [5.5, 0, -18] }];
// The moving herd lives in VillageLife; keep the archived static asset reusable.
placements.buffalo = [];
placements.palm = [[-21,-6],[-20,5],[-12,-12],[-4,-12],[10,-13],[20,-12],[22,5],[-20,12],[-3,13],[9,12],[20,13],[-7,-20],[8,-23]].map(([x,z]) => ({position:[x,0,z]}));
placements.tree = [[-23,-15],[-23,15],[23,-18],[23,16],[-9,-23],[12,-24]].map(([x,z]) => ({position:[x,0,z]}));
houses.forEach((h,i) => {
  placements.tree.push({...local(h,-2.7,-2.0),scale:.58+(i%3)*.06});
  placements.palm.push({...local(h,2.8,-2.4),scale:.72+(i%2)*.1});
});
// Trees occupy the gaps between plots; keep road, house entrances and wat approach clear.
for (const x of [-20,-12,-4,4,12,20]) {
  for (const z of [-2.7,2.7]) placements.palm.push({position:[x,0,z],scale:.74});
}
export function detectVillageMode(): VillageMode {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return navigator.hardwareConcurrency <= 4 || memory <= 3 || Math.min(screen.width, screen.height) < 500 ? 'normal' : 'ultra';
}
