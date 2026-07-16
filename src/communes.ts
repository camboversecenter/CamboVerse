/**
 * Commune (ADM3) boundaries — the fourth map tier. There are ~1,600 communes,
 * far too many to bundle, so they're generated **per province** under
 * src/communes/<ADM1_PCODE>.ts (see scripts/generate-communes.mjs) and loaded on
 * demand: opening a province fetches at most that one province's communes
 * (~30 KB), and only when the visitor drills into a district.
 */
export interface Commune {
  name: string;
  pcode: string;
  district: string; // parent ADM2 pcode
  rings: [number, number][][];
}

const cache = new Map<string, Commune[]>();

/** Lazy-load one province's communes (cached). Returns [] if none/unavailable. */
export async function loadCommunes(provincePcode: string): Promise<Commune[]> {
  const hit = cache.get(provincePcode);
  if (hit) return hit;
  try {
    const mod = (await import(`./communes/${provincePcode}.ts`)) as { COMMUNES?: Commune[] };
    const list = mod.COMMUNES ?? [];
    cache.set(provincePcode, list);
    return list;
  } catch {
    return [];
  }
}
