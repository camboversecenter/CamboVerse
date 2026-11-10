/** Names retained by the authored Blender heart and the approved organ export. */
export function heartLandmarkIndex(name: string): number | undefined {
  const base = name.replace(/\.\d+$/, '');
  if (base === 'part-lv') return 0;
  if (base === 'part-ra' || base === 'part-ra-inner') return 1;
  if (base === 'part-aorta' || base.startsWith('part-aorta-branch-')) return 2;
  if (base === 'part-pulmonary-trunk') return 3;
  return undefined;
}
