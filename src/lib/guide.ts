import type { LangCode } from "./voice";

/**
 * Client for the AI tour-guide endpoint (the monkey, "Kiri"). The Worker
 * grounds the model in our per-POI facts and answers in the chosen language.
 * If the endpoint is unreachable or no API key is configured, callers should
 * fall back to the static POI text they already hold.
 */
export interface GuideReply {
  text: string;
  /** True when the server returned static facts instead of a model answer. */
  fallback?: boolean;
}

export interface GuideRequest {
  spotId: string;
  poiId?: string | null;
  /** When set, Kiri narrates this historical era (see history.ts) instead. */
  eraId?: string;
  question?: string;
  lang: LangCode;
}

export async function askGuide(req: GuideRequest, signal?: AbortSignal): Promise<GuideReply | null> {
  try {
    const r = await fetch("/api/guide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as GuideReply;
  } catch {
    return null; // offline / aborted — caller uses its local fallback
  }
}
