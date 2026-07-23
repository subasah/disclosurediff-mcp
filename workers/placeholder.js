/**
 * Cloudflare Workers placeholder.
 * Full Workers port is deferred; use Docker on Railway/Fly (see DEPLOY.md).
 */
export default {
  async fetch() {
    return new Response(
      JSON.stringify({
        error: "Workers adapter not enabled in v0.1",
        deploy: "Use Dockerfile on Railway or Fly.io — see DEPLOY.md",
      }),
      { status: 501, headers: { "content-type": "application/json" } },
    );
  },
};
