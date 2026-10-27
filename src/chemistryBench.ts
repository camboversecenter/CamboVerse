/** Deterministic teaching rearrangement, not a reaction mechanism or simulation. */
export type Point = [number, number, number];
export type BenchAtom = { id: string; element: "H" | "O"; from: Point; to: Point };
export function waterExperiment(hydrogen: number, oxygen: number) {
  const h = Math.max(0, Math.min(4, Math.floor(hydrogen)));
  const o = Math.max(0, Math.min(2, Math.floor(oxygen)));
  const batches = Math.min(Math.floor(h / 2), o);
  const atoms: BenchAtom[] = [];
  const before: [number, number][] = [], after: [number, number][] = [];
  for (let m = 0; m < h + o; m++) {
    const element = m < h ? "H" : "O";
    const row = m < h ? m : m - h;
    const x = m < h ? -1.1 : 1.1;
    const base = atoms.length;
    for (let a = 0; a < 2; a++) {
      const from: Point = [x + (a ? .18 : -.18), .35 + row * .48, 0];
      atoms.push({ id: `${element}-${row * 2 + a + 1}`, element, from, to: [...from] });
    }
    before.push([base, base + 1]);
  }
  for (let w = 0; w < batches * 2; w++) {
    const center: Point = [(w % 2 ? .65 : -.65), .55 + Math.floor(w / 2) * .8, 0];
    const oi = h * 2 + w;
    atoms[oi].to = center;
    for (let a = 0; a < 2; a++) {
      const hi = w * 2 + a;
      atoms[hi].to = [center[0] + (a ? .29 : -.29), center[1] + .23, 0];
      after.push([oi, hi]);
    }
  }
  before.forEach(([a,b]) => {
    const used = atoms[a].element === "H" ? a < batches * 4 : a - h * 2 < batches * 2;
    if (!used) {
      atoms[a].to = [atoms[a].from[0], atoms[a].from[1], -.8];
      atoms[b].to = [atoms[b].from[0], atoms[b].from[1], -.8];
      after.push([a,b]);
    }
  });
  return { atoms, before, after, water: batches * 2, leftH: h - batches * 2, leftO: o - batches };
}
