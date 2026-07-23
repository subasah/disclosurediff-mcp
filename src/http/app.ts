import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createDisclosureDiffServer } from "../server.js";
import { loadConfig } from "../config.js";
import { MetricsHook } from "../infra/cache-audit.js";
import { EdgarClient } from "../edgar/client.js";

/**
 * Streamable HTTP MCP host with /health, API-key auth, and rate limits.
 */
export function createHttpApp() {
  const cfg = loadConfig();
  const metrics = new MetricsHook();
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: true,
      exposedHeaders: ["Mcp-Session-Id", "mcp-session-id"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", async (_req, res) => {
    await metrics.record({ type: "health", ok: true });
    res.json({
      ok: true,
      service: "disclosurediff-mcp",
      version: "0.1.0",
      secUserAgent: new EdgarClient().getUserAgent(),
      timestamp: new Date().toISOString(),
    });
  });

  // Static landing (optional; Cloudflare/Docker may serve landing/ separately)
  app.get("/", (_req, res) => {
    res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>DisclosureDiff MCP</title>
<link rel="stylesheet" href="/landing.css"></head><body>
<main style="font-family:Georgia,serif;max-width:42rem;margin:3rem auto;padding:0 1.25rem;line-height:1.5">
  <p style="letter-spacing:.08em;text-transform:uppercase;font-size:.75rem;opacity:.7">MCP</p>
  <h1 style="font-size:2.4rem;margin:.2rem 0">DisclosureDiff</h1>
  <p>Year-over-year SEC disclosure diffs with mandatory EDGAR citations. Not financial advice.</p>
  <p><a href="/health">/health</a> · MCP endpoint <code>POST /mcp</code></p>
  <p>See the GitHub README for Cursor / Claude install snippets.</p>
</main></body></html>`);
  });

  function extractApiKey(req: express.Request): string | undefined {
    const header = req.header("x-api-key") || req.header("authorization");
    if (!header) return undefined;
    if (header.toLowerCase().startsWith("bearer ")) {
      return header.slice(7).trim();
    }
    return header.trim();
  }

  function authorize(req: express.Request, res: express.Response): boolean {
    const key = extractApiKey(req);
    if (key && cfg.apiKeys.has(key)) {
      (req as express.Request & { clientTier?: string }).clientTier = "authenticated";
      return true;
    }
    if (cfg.allowAnonymous) {
      (req as express.Request & { clientTier?: string }).clientTier = "anonymous";
      return true;
    }
    if (cfg.apiKeys.size === 0 && cfg.nodeEnv !== "production") {
      (req as express.Request & { clientTier?: string }).clientTier = "dev";
      return true;
    }
    res.status(401).json({
      error: "Unauthorized",
      message: "Provide X-API-Key or Authorization: Bearer <key>",
    });
    return false;
  }

  const anonLimiter = rateLimit({
    windowMs: 60_000,
    max: cfg.anonymousRpm,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded (anonymous tier)" },
    handler: async (_req, res, _next, options) => {
      await metrics.record({ type: "rate_limited", name: "anonymous" });
      res.status(options.statusCode).json(options.message);
    },
  });

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: cfg.authenticatedRpm,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => extractApiKey(req) || req.ip || "unknown",
    message: { error: "Rate limit exceeded (authenticated tier)" },
  });

  // Stateless Streamable HTTP: one transport+server per request (simple horizontal scale)
  app.all("/mcp", async (req, res) => {
    if (!authorize(req, res)) return;

    const tier =
      (req as express.Request & { clientTier?: string }).clientTier || "anonymous";
    if (tier === "authenticated") {
      await new Promise<void>((resolve, reject) => {
        authLimiter(req, res, (err) => (err ? reject(err) : resolve()));
      });
      if (res.headersSent) return;
    } else {
      await new Promise<void>((resolve, reject) => {
        anonLimiter(req, res, (err) => (err ? reject(err) : resolve()));
      });
      if (res.headersSent) return;
    }

    await metrics.record({
      type: "http_request",
      name: "/mcp",
      meta: { method: req.method, tier },
    });

    const server = createDisclosureDiffServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request error", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal MCP error" });
      }
    }
  });

  // Optional stateful sessions endpoint for clients that need SSE stream
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp/session", async (req, res) => {
    if (!authorize(req, res)) return;
    const server = createDisclosureDiffServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: false,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    if (transport.sessionId) {
      sessions.set(transport.sessionId, transport);
    }
  });

  return { app, cfg };
}

export async function startHttpServer(): Promise<void> {
  const { app, cfg } = createHttpApp();
  app.listen(cfg.port, cfg.host, () => {
    console.error(
      `DisclosureDiff MCP HTTP listening on http://${cfg.host}:${cfg.port}/mcp`,
    );
    console.error(`Health: http://${cfg.host}:${cfg.port}/health`);
    console.error(`SEC User-Agent: ${cfg.userAgent}`);
  });
}
