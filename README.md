# DisclosureDiff MCP

**Year-over-year SEC disclosure diffs with mandatory EDGAR citations for AI agents.**

Not financial advice. Public SEC filings only.

**Live landing page:** https://subasah.github.io/disclosurediff-mcp/

## Why this exists

Most finance MCPs wrap price APIs. Agents still hallucinate what companies *disclosed*. DisclosureDiff returns structured deltas and grounded excerpts — every substantive answer includes a live `sec.gov` URL + section id.

## Tools

| Tool | Purpose |
|------|---------|
| `diff_filing_section` | YoY (or multi-year) diff of Item 1A / 1 / 7 / 3 |
| `ground_claim` | Support/contradict a claim with cited excerpts |
| `list_material_events` | Recent 8-K items with event types + links |
| `compare_peer_risks` | Cluster risk themes across a peer set |
| `get_methodology` | Limits, citation policy, disclaimer |

## Quick start (local stdio)

```bash
git clone https://github.com/subasah/disclosurediff-mcp.git disclosurediff-mcp
cd disclosurediff-mcp
npm install
npm run build
export SEC_CONTACT_EMAIL="you@example.com"
npm run start:stdio
```

### Cursor / Claude Desktop (stdio)

```json
{
  "mcpServers": {
    "disclosurediff": {
      "command": "node",
      "args": ["/absolute/path/to/disclosurediff-mcp/dist/index.js"],
      "env": {
        "TRANSPORT": "stdio",
        "SEC_CONTACT_EMAIL": "you@example.com"
      }
    }
  }
}
```

### Remote Streamable HTTP

No public hosted `/mcp` endpoint is published yet. Run locally or deploy per [DEPLOY.md](./DEPLOY.md), then point clients at your HTTPS URL:

```bash
export TRANSPORT=http
export PORT=8787
export SEC_CONTACT_EMAIL="you@example.com"
export API_KEYS="demo-key-change-me"
export ALLOW_ANONYMOUS=true
npm run start:http
```

Health: `GET /health` · MCP: `POST /mcp` (header `X-API-Key` when keys are configured)

Cursor remote snippet (replace the URL after you deploy):

```json
{
  "mcpServers": {
    "disclosurediff": {
      "url": "https://YOUR_PUBLIC_HOST/mcp",
      "headers": {
        "X-API-Key": "demo-key-change-me"
      }
    }
  }
}
```

## Demo prompts

1. Diff Apple’s Item 1A risk factors year-over-year and cite every change.
2. Ground this claim against MSFT’s latest 10-K: “Microsoft discloses material cybersecurity risks.”
3. Compare NVDA vs AMD vs AVGO Item 1A themes and show which peers omit climate risk language.

## Eval results

```bash
npm test          # unit tests
npm run eval      # offline harness
npm run eval:live # + live SEC cases (network)
npm run spike     # AAPL Item 1A live spike
```

Latest live run (`EVAL_LIVE=1`, 2026-07-23):

| Metric | Value |
|--------|------:|
| Cases | 32 |
| Pass rate | **100%** (32/32) |
| Citation rate | **100%** |
| AAPL Item 1A spike | 16 changes + EDGAR URLs |

Target: **100% of substantive answers include a live EDGAR URL**. Details in [`evals/RESULTS.md`](./evals/RESULTS.md).

## Architecture

```
Agent → MCP (stdio | Streamable HTTP)
          → tools → EDGAR client (UA + throttle + cache)
                 → section extract → diff / ground / cluster
                 → citation enforce → audit JSONL + metrics
```

Cache key: `CIK:accession[:suffix]`. Audit logs are hash-chained (see `docs/THREAT_MODEL.md`).

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Docker, Railway, Fly.io, and Cloudflare Workers notes.

```bash
docker build -t disclosurediff-mcp .
docker run -p 8787:8787 -e SEC_CONTACT_EMAIL=you@example.com -e TRANSPORT=http disclosurediff-mcp
```

## Registry / Smithery

- Official registry metadata: [`server.json`](./server.json)
- Publish steps: [docs/PUBLISH.md](./docs/PUBLISH.md)

## Disclaimer

Not financial advice. DisclosureDiff summarizes publicly filed SEC text; it does not recommend securities, predict prices, or replace professional analysis. Verify every claim against the linked EDGAR documents.

## License

MIT
