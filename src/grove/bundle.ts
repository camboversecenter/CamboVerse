/**
 * GroveBundle importer — Path A (BRIDGE.md §1A): ingest an offline `grove-bundle`
 * a phone exported (`/garden` → Export JSON), verifying each signed observation
 * locally with no network. The phone is the source of truth; the virtual garden
 * is a direct function of what the user signed on their own device.
 */
import { verifyObservation, trustScore, type GardenObservation } from "./grove";
import type { VerifiedRecord } from "./client";

export interface GroveBundle {
  v: number;
  kind: "grove-bundle";
  observations: GardenObservation[];
}

export interface BundleImport {
  records: VerifiedRecord[];
  /** Signed observations that failed verification (tampered/forged) — dropped. */
  dropped: number;
  total: number;
}

/** Parse + validate the envelope of a `grove-bundle` (shape only, not signatures). */
export function parseBundle(input: unknown): GroveBundle {
  const b = input as GroveBundle;
  if (!b || b.kind !== "grove-bundle" || !Array.isArray(b.observations)) {
    throw new Error("Not a grove-bundle (expected { kind: 'grove-bundle', observations: [...] }).");
  }
  return b;
}

/**
 * Verify every observation in a bundle and return only the valid ones as records.
 * A bundle carries no attestations, so trust is the base self-signed score.
 */
export async function importBundle(input: unknown): Promise<BundleImport> {
  const bundle = parseBundle(input);
  const records: VerifiedRecord[] = [];
  let dropped = 0;
  for (const obs of bundle.observations) {
    if ((await verifyObservation(obs)).ok) {
      records.push({ observation: obs, attestations: [], trust: trustScore(obs, []) });
    } else {
      dropped++;
    }
  }
  return { records, dropped, total: bundle.observations.length };
}

/** Read a `grove-bundle` from a File chosen in the browser (the Import JSON flow). */
export async function importBundleFile(file: File): Promise<BundleImport> {
  const text = await file.text();
  return importBundle(JSON.parse(text));
}
