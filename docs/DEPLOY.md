# Deploy guide

## Local (stdio)

```bash
export SEC_CONTACT_EMAIL="you@example.com"
npm install
npm run build
npm run start:stdio
```

Cursor / Claude Desktop spawn this process — see README install snippets.

## Local (Streamable HTTP)

```bash
export SEC_CONTACT_EMAIL="you@example.com"
export TRANSPORT=http
export PORT=8787
export ALLOW_ANONYMOUS=true
# optional: export API_KEYS="demo-key-1,demo-key-2"
npm run build && npm run start:http
```

- Health: `GET http://localhost:8787/health`
- MCP: `POST http://localhost:8787/mcp`

## Docker

```bash
docker build -t disclosurediff-mcp .
docker run --rm -p 8787:8787 \
  -e SEC_CONTACT_EMAIL=you@example.com \
  -e TRANSPORT=http \
  -e ALLOW_ANONYMOUS=true \
  disclosurediff-mcp
```

## Cloudflare Workers (preferred remote)

This repo ships a Node/Express Streamable HTTP server. For Workers you can:

1. **Containers / Durable Objects node compat** (recommended when available on your plan): run the Docker image or Node server behind a Worker route.
2. **Railway / Fly.io** (simplest path today for the Express app) — configs included.

### Railway

```bash
# Install Railway CLI, then:
railway login
railway init
railway variables set SEC_CONTACT_EMAIL=you@example.com TRANSPORT=http ALLOW_ANONYMOUS=true
railway up
```

Or connect the GitHub repo in the Railway dashboard and set the same env vars. Start command: `npm run start:http`.

### Fly.io

```bash
fly auth login
fly launch --name disclosurediff-mcp --region iad --no-deploy
fly secrets set SEC_CONTACT_EMAIL=you@example.com
fly deploy
```

See `fly.toml`.

### Cloudflare (wrangler placeholder)

`deploy/wrangler.toml` documents a Worker proxy pattern. Full Workers rewrite of the MCP SDK transport is optional; use Railway/Fly for production Node until you port to `WebStandardStreamableHTTPServerTransport`.

## Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `SEC_CONTACT_EMAIL` | `contact@example.com` | Required for SEC fair access |
| `TRANSPORT` | `stdio` | `stdio` or `http` |
| `PORT` | `8787` | HTTP listen port |
| `API_KEYS` | _(empty)_ | Comma-separated keys for `X-API-Key` |
| `ALLOW_ANONYMOUS` | `true` | Allow unauthenticated (rate-limited) access |
| `ANONYMOUS_RPM` | `30` | Requests/minute anonymous |
| `AUTHENTICATED_RPM` | `120` | Requests/minute with API key |
| `SEC_MIN_INTERVAL_MS` | `200` | Min delay between SEC fetches |
| `CACHE_DIR` | `.cache/filings` | Filing cache root |
| `AUDIT_LOG_PATH` | `audit-logs/tool-calls.jsonl` | Hash-chained audit log |
| `METRICS_PATH` | `metrics.jsonl` | Usage metrics hook |

## Deploy status checklist

- [ ] Set a real `SEC_CONTACT_EMAIL`
- [ ] Provision host (Railway/Fly/CF)
- [ ] Confirm `GET /health` returns `ok: true`
- [ ] Confirm MCP client can call `get_methodology`
- [ ] Publish URL to Smithery + MCP registry (see `docs/PUBLISH.md`)
