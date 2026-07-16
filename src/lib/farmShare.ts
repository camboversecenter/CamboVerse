/**
 * Client for the Living Farm rail (docs/LIVING_FARM.md, Phase 2). A farmer can
 * register a real plot and share stage-tagged photo check-ins to the commons;
 * every check-in is consented, CC-BY, and held for moderation before it appears
 * publicly. Anyone can browse the approved shared farms.
 */
import { getIdentity } from "./identity";

export interface SharedCheckIn {
  id: string;
  stageId: string;
  growth: number;
  note?: string | null;
  photo?: string; // present on plot detail
  takenOn?: string;
  status?: string;
}

export interface SharedPlot {
  id: string;
  name: string;
  province: string;
  district?: string | null;
  variety?: string | null;
  plantingDate?: string | null;
  geo?: { lat: number; lng: number } | null;
  approvedCheckins?: number;
  latestGrowth?: number | null;
  owner?: boolean;
  checkins?: SharedCheckIn[];
}

/** Register a real plot to share (creates a CamboVerse identity if needed). */
export async function registerPlot(input: {
  name: string;
  province: string;
  district?: string;
  variety?: string;
  plantingDate?: string;
  geo?: { lat: number; lng: number };
  consentOwner?: string;
}): Promise<{ id: string } | null> {
  const id = await getIdentity(true);
  if (!id) return null;
  try {
    const r = await fetch("/v1/farm/plots", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${id.token}` },
      body: JSON.stringify({
        name: input.name,
        province: input.province,
        district: input.district,
        variety: input.variety,
        plantingDate: input.plantingDate,
        geo: input.geo,
        consent: { owner: input.consentOwner ?? "farmer", consentRef: "in-app", agreed: true },
      }),
    });
    if (!r.ok) return null;
    return (await r.json()) as { id: string };
  } catch {
    return null;
  }
}

/** Share one photo check-in to a plot (held pending until moderated). */
export async function shareCheckin(
  plotId: string,
  c: { stageId: string; growth: number; note?: string; photo: string; takenOn?: string },
): Promise<boolean> {
  const id = await getIdentity(true);
  if (!id) return false;
  try {
    const r = await fetch(`/v1/farm/plots/${encodeURIComponent(plotId)}/checkins`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${id.token}` },
      body: JSON.stringify({ ...c, consent: true }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Browse public (approved) shared farms, optionally filtered by province. */
export async function listPlots(province?: string): Promise<SharedPlot[]> {
  try {
    const q = province ? `?province=${encodeURIComponent(province)}` : "";
    const r = await fetch(`/v1/farm/plots${q}`);
    if (!r.ok) return [];
    const d = (await r.json()) as { plots: SharedPlot[] };
    return d.plots ?? [];
  } catch {
    return [];
  }
}

/** A plot with its check-ins (owner sees pending too, via their token). */
export async function getPlot(id: string): Promise<SharedPlot | null> {
  try {
    const existing = await getIdentity(false);
    const headers: Record<string, string> = {};
    if (existing) headers.authorization = `Bearer ${existing.token}`;
    const r = await fetch(`/v1/farm/plots/${encodeURIComponent(id)}`, { headers });
    if (!r.ok) return null;
    return (await r.json()) as SharedPlot;
  } catch {
    return null;
  }
}
