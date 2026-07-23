# Publishing DisclosureDiff to MCP registries

## Official MCP Registry (`mcp-publisher`)

1. Install the publisher (see https://github.com/modelcontextprotocol/registry):

```bash
# Example — follow current registry docs for the exact binary
curl -fsSL https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/install.md
```

2. Ensure [`server.json`](../server.json) `remotes[0].url` points at your deployed HTTPS `/mcp` endpoint.

3. Authenticate and publish:

```bash
mcp-publisher login   # GitHub / method per current docs
mcp-publisher publish server.json
```

**Blocker:** requires a registry account / GitHub auth you must complete interactively.

## Smithery

1. Open https://smithery.ai/new
2. Choose **URL publish** (remote MCP).
3. Enter: `https://YOUR_HOST/mcp`
4. Attach README + demo prompts from this repo.
5. Optional: add `smithery.yaml` metadata if Smithery CLI is used:

```bash
# If you use Smithery CLI (when available for your account):
npx @smithery/cli publish
```

**Blocker:** Smithery login + confirmation in browser.

## PulseMCP / directories

After official registry publish, directories often ingest automatically. To expedite PulseMCP, email their listings contact with the registry URL.

## GitHub release checklist

- [ ] Push repo to GitHub (`git remote add origin … && git push -u origin main`)
- [ ] Tag `v0.1.0`
- [ ] Update README install snippets with real URLs
- [ ] Link landing page (`landing/index.html` via GitHub Pages or CDN)
