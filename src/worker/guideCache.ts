/** Reusable public guide content. Keys contain hashes, never questions or keys. */
const pending = new Map<string, Promise<Response>>();

type GuideCacheOptions = {
  origin: string;
  kind: 'answers' | 'speech';
  identity: unknown;
  ttl: number;
  storage?: R2Bucket;
  generate: () => Promise<Response>;
  cacheable?: (response: Response) => boolean | Promise<boolean>;
};

function privateResponse(response: Response, source: 'edge' | 'r2' | 'generated'): Response {
  const headers = new Headers(response.headers);
  // POST responses are kept in our explicit edge cache, not an HTTP proxy cache.
  headers.set('cache-control', 'no-store');
  headers.delete('x-guide-persisted');
  headers.set('x-guide-content-source', source);
  return new Response(response.body, { status: response.status, headers });
}

export async function cachedGuideResponse(options: GuideCacheOptions): Promise<Response> {
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  if (!cache && !options.storage) return privateResponse(await options.generate(), 'generated');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(options.identity)));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const url = new URL(`/__guide-cache/v1/${options.kind}/${hash}`, options.origin).href;
  const key = new Request(url);
  const objectKey = `guide/v1/${options.kind}/${hash}.${options.kind === 'speech' ? 'wav' : 'json'}`;
  const warmEdge = async (response: Response) => {
    if (cache) {
      const stored = response.clone();
      const headers = new Headers(stored.headers);
      headers.set('cache-control', `public, max-age=${options.ttl}`);
      try {
        await cache.put(key, new Response(stored.body, { status: stored.status, headers }));
      } catch { /* Quota, eviction or local preview: return the generated content. */ }
    }
  };
  const readRecording = async (): Promise<Response | undefined> => {
    if (!options.storage) return;
    const object = await options.storage.get(objectKey);
    if (!object) return;
    return new Response(object.body, { headers: {
      'content-type': object.httpMetadata?.contentType ?? (options.kind === 'speech' ? 'audio/wav' : 'application/json'),
      'x-content-type-options': 'nosniff',
      'x-guide-persisted': '1',
    } });
  };
  const saveRecording = async (response: Response): Promise<Response> => {
    if (!options.storage) return response;
    try {
      const object = await options.storage.put(objectKey, await response.clone().arrayBuffer(), {
        httpMetadata: { contentType: response.headers.get('content-type') ?? 'application/octet-stream' },
        // A concurrent isolate may have recorded this version first. Keep its
        // answer stable, even if our model generated slightly different words.
        onlyIf: { etagDoesNotMatch: '*' },
      });
      if (!object) return await readRecording() ?? response;
      const headers = new Headers(response.headers);
      headers.set('x-guide-persisted', '1');
      return new Response(response.body, { status: response.status, headers });
    } catch {
      console.warn('Guide R2 write failed; returning content with temporary cache only.');
      return response;
    }
  };
  try {
    let hit = await cache?.match(key);
    if (hit) {
      // Promote temporary recordings made before R2 was connected, or retry a
      // previous failed save, without calling the generation API again.
      if (options.storage && hit.headers.get('x-guide-persisted') !== '1') {
        hit = await saveRecording(hit);
        await warmEdge(hit);
      }
      return privateResponse(hit, 'edge');
    }
  } catch { /* Cache availability must not prevent a guide response. */ }

  const existing = pending.get(url);
  if (existing) return (await existing).clone();
  const generate = async () => {
    try {
      const recording = await readRecording();
      if (recording) {
        await warmEdge(recording);
        return privateResponse(recording, 'r2');
      }
    } catch { console.warn('Guide R2 read failed; falling back to generation.'); }
    let response = await options.generate();
    if (response.ok && (!options.cacheable || await options.cacheable(response))) {
      response = await saveRecording(response);
      await warmEdge(response);
    }
    return privateResponse(response, 'generated');
  };
  // Collapse simultaneous misses within this isolate, without retaining audio
  // indefinitely or allowing an unbounded number of pending cache entries.
  if (pending.size >= 32) return generate();
  const work = generate();
  pending.set(url, work);
  try { return (await work).clone(); }
  finally { pending.delete(url); }
}
