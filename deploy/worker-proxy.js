/**
 * Optional Cloudflare Worker reverse-proxy to a Node MCP upstream (Railway/Fly).
 * Set UPSTREAM_MCP_URL in wrangler vars / secrets.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        proxy: true,
        upstream: env.UPSTREAM_MCP_URL || null,
      });
    }
    const upstream = env.UPSTREAM_MCP_URL;
    if (!upstream) {
      return new Response("UPSTREAM_MCP_URL not configured", { status: 500 });
    }
    const target = new URL(upstream);
    target.pathname = url.pathname === "/" ? new URL(upstream).pathname : url.pathname;
    target.search = url.search;
    const headers = new Headers(request.headers);
    headers.delete("host");
    return fetch(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
