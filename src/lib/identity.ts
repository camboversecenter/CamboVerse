/**
 * A lightweight client for the Identity rail. A visitor gets a free, portable
 * CamboVerse ID — created lazily and only when they first *do* something that
 * needs one (e.g. earn a learning credential), so passive viewers create no
 * account. The token is kept in localStorage; later, real login/avatar binding
 * makes the same identity portable across devices and ecosystem apps.
 */
export interface Identity {
  id: string;
  token: string;
}

const KEY = "camboverse.identity.v1";
let cached: Identity | null = null;

function fromStore(): Identity | null {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (cached = JSON.parse(raw) as Identity);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Get the visitor's identity. With `create=false` (default) it only returns an
 * existing one — it will never mint an account just for reading. With
 * `create=true` it creates one on demand.
 */
export async function getIdentity(create = false): Promise<Identity | null> {
  const existing = fromStore();
  if (existing || !create) return existing;
  try {
    const r = await fetch("/v1/id", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { id: string; token: string };
    cached = { id: d.id, token: d.token };
    localStorage.setItem(KEY, JSON.stringify(cached));
    return cached;
  } catch {
    return null;
  }
}

/** Achievements this identity already holds (for showing "earned" state). */
export async function earnedAchievements(identity: Identity | null): Promise<Set<string>> {
  if (!identity) return new Set();
  try {
    const r = await fetch(`/v1/credentials?subject=${encodeURIComponent(identity.id)}`);
    if (!r.ok) return new Set();
    const d = (await r.json()) as { credentials: { achievement: string }[] };
    return new Set(d.credentials.map((c) => c.achievement));
  } catch {
    return new Set();
  }
}

export interface Credential {
  id: string;
  achievement: string;
  evidence?: string | null;
  issuedAt: string;
}

/**
 * The full list of learning credentials the current visitor holds (for the
 * Heritage Passport). Returns an empty list for a passive visitor with no
 * identity — it never mints one.
 */
export async function myCredentials(): Promise<Credential[]> {
  const id = await getIdentity(false);
  if (!id) return [];
  try {
    const r = await fetch(`/v1/credentials?subject=${encodeURIComponent(id.id)}`);
    if (!r.ok) return [];
    const d = (await r.json()) as { credentials: Credential[] };
    return d.credentials ?? [];
  } catch {
    return [];
  }
}

/** Claim a learning credential for the given achievement. */
export async function claimCredential(achievement: string, evidence: string): Promise<boolean> {
  const id = await getIdentity(true);
  if (!id) return false;
  try {
    const r = await fetch("/v1/credentials/claim", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${id.token}` },
      body: JSON.stringify({ achievement, evidence }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
