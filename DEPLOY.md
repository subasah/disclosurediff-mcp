# Deploy DisclosureDiff MCP

Remote-first: Streamable HTTP on `/mcp`, health on `/health`.

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `TRANSPORT` | `stdio` | Set `http` for remote |
| `PORT` | `8787` | HTTP listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `SEC_CONTACT_EMAIL` | `contact@example.com` | **Required for production** — SEC User-Agent |
| `API_KEYS` | _(empty)_ | Comma-separated keys for `X-API-Key` |
| `ALLOW_ANONYMOUS` | `true` | Set `false` to require API keys |
| `ANONYMOUS_RPM` | `30` | Per-IP requests/minute |
| `AUTHENTICATED_RPM` | `120` | Per-key requests/minute |
| `SEC_MIN_INTERVAL_MS` | `200` | Outbound SEC throttle |
| `CACHE_DIR` | `.cache/filings` | Filing cache |
| `AUDIT_LOG_PATH` | `audit-logs/tool-calls.jsonl` | Hash-chained audit |
| `METRICS_PATH` | `metrics.jsonl` | Usage metrics hook |

## Docker (recommended)

```bash
docker build -t disclosurediff-mcp .
docker run --rm -p 8787:8787 \
  -e TRANSPORT=http \
  -e SEC_CONTACT_EMAIL=you@example.com \
  -e API_KEYS=demo-key-change-me \
  -e ALLOW_ANONYMOUS=true \
  disclosurediff-mcp
```

Verify:

```bash
curl -s http://localhost:8787/health
```

## Railway

1. Create a new Railway project from this repo (or `railway init`).
2. Set variables from the table above (`TRANSPORT=http`, `SEC_CONTACT_EMAIL`, `API_KEYS`).
3. Deploy. Railway uses `railway.toml` / Dockerfile.
4. Public URL: `https://<app>.up.railway.app/mcp`

```bash
# If Railway CLI is logged in:
railway up
```

**Blocker if no login:** create an account at https://railway.app and run `railway login`.

## Fly.io

```bash
fly launch --name disclosurediff-mcp --region iad
fly secrets set SEC_CONTACT_EMAIL=you@example.com API_KEYS=demo-key-change-me TRANSPORT=http
fly deploy
```

Uses `fly.toml`. **Blocker if no login:** `fly auth login`.

## Cloudflare Workers

Node + filesystem cache does not map 1:1 to Workers. Options:

1. **Preferred for this repo:** deploy the Docker/Node HTTP server on Railway or Fly.
2. **Workers adapter (experimental):** see `wrangler.toml` — requires Durable Object / R2 cache port (not production-ready in v0.1). Use Railway/Fly for the public demo.

If you have `CLOUDFLARE_API_TOKEN` and want Workers later, port `src/http/app.ts` to `WebStandardStreamableHTTPServerTransport` + R2.

## Health & abuse controls

- `GET /health` — liveness for uptime monitors
- API key via `X-API-Key` or `Authorization: Bearer`
- Separate anonymous vs authenticated RPM
- SEC outbound rate limit + User-Agent

## Post-deploy checklist

- [ ] `/health` returns `ok`
- [ ] `POST /mcp` with initialize JSON-RPC succeeds
- [ ] Spike: Cursor prompt “Diff AAPL Item 1A YoY and cite”
- [ ] Rotate demo API key after launch
- [ ] Point registry `server.json` remotes URL at production host
