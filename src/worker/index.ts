/**
 * CamboVerse edge Worker.
 *
 * For v1 this is intentionally thin: static assets are served by the edge, and
 * the Worker only handles a small API surface (health/metadata for now). Future
 * phases can add heritage-archive metadata endpoints, KHQR/Bakong donation
 * flows, etc. — but v1 needs no game server (see STRATEGY.md §3.2).
 */
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "camboverse-viewer",
        version: "0.1.0",
      });
    }

    // Anything else: hand back to the static asset server (SPA fallback).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
