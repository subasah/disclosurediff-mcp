# Publishing DisclosureDiff to MCP registries

## Prerequisites (blocking until met)

Official registry **URL/remote** listings and Smithery **URL publish** need a live HTTPS `/mcp` endpoint.

This repo currently has **no deployed remote MCP** (no Fly/Railway/Cloudflare CLI auth in this environment). Do **not** put a placeholder host in `server.json` remotes.

To unblock remote registry publish, provide one of:

1. A public MCP URL you already host (`https://…/mcp`), **or**
2. Hosting credentials + `SEC_CONTACT_EMAIL` (Railway, Fly.io, or similar) so the Docker HTTP server in `DEPLOY.md` can be deployed

Stdio registry publish additionally needs the npm package published with matching `mcpName` (see below).

## Official MCP Registry (`mcp-publisher`)

Namespace for GitHub auth: `io.github.subasah/disclosurediff-mcp` (must match GitHub user `subasah`).

### Install

```bash
# macOS arm64 example (see latest release assets for other platforms)
curl -fsSL -o mcp-publisher.tgz \
  https://github.com/modelcontextprotocol/registry/releases/download/v1.8.0/mcp-publisher_darwin_arm64.tar.gz
tar -xzf mcp-publisher.tgz
sudo mv mcp-publisher /usr/local/bin/
```

### Prep

1. Publish npm package `disclosurediff-mcp@0.1.0` with `"mcpName": "io.github.subasah/disclosurediff-mcp"` in `package.json` (ownership check), **and/or**
2. After deploy, add a `remotes` entry in [`server.json`](../server.json) pointing at `https://YOUR_PUBLIC_HOST/mcp` (no placeholders).

### Authenticate and publish (interactive — run locally)

```bash
mcp-publisher login github   # browser OAuth; cannot complete non-interactively here
mcp-publisher validate server.json
mcp-publisher publish server.json
```

CI alternative (GitHub Actions only): `mcp-publisher login github-oidc` with `permissions: { id-token: write }`.

**Blocker in this agent session:** no `~/.mcp_publisher_token`; `login github` requires browser OAuth.

## Smithery

URL publish path (preferred for remote MCP):

1. Deploy HTTPS `/mcp` (see prerequisites).
2. Open https://smithery.ai/new → **URL publish**.
3. Enter your real `https://…/mcp` (not a placeholder).
4. Attach README + demo prompts from this repo.

CLI (browser login):

```bash
npx @smithery/cli auth login
# Non-TTY agents get JSON with auth_url — complete in browser, then retry.
```

There is no non-interactive `publish` subcommand in `@smithery/cli` v4 for this flow; use the website URL publish after auth.

**Blocker:** Smithery browser login + live `/mcp` URL.

## PulseMCP / directories

After official registry publish, directories often ingest automatically. To expedite PulseMCP, email their listings contact with the official registry URL for `io.github.subasah/disclosurediff-mcp`.

## GitHub release checklist

- [x] Push repo to GitHub (`https://github.com/subasah/disclosurediff-mcp`)
- [x] Tag `v0.1.0` / GitHub Release
- [x] README install snippets use real repo + Pages URL
- [x] Landing via GitHub Pages: https://subasah.github.io/disclosurediff-mcp/ (`docs/` on `main`)
- [ ] Live remote `/mcp` for registry URL listings
- [ ] `mcp-publisher login github` + publish (interactive)
- [ ] Smithery URL publish (interactive + live URL)
