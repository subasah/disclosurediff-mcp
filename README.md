# DisclosureDiff MCP

**Compare real SEC filings year-over-year — and always get a link back to the source.**

Ask an AI about a company and it often invents “facts.” Reading two 100-page annual reports by hand is painful. Spotting what *changed* in the risk section is worse. DisclosureDiff plugs into Cursor or Claude (via [MCP](https://modelcontextprotocol.io/) — a way for AI apps to call tools) and diffs the actual filing text from [EDGAR](https://www.sec.gov/edgar) — the [SEC](#crash-course-sec-edgar-10-k-and-item-1a)’s free public filing database — with a `sec.gov` link on every change.

Not financial advice. Public SEC filings only.

**Live landing page:** https://subasah.github.io/disclosurediff-mcp/

New to finance jargon? Skim the [crash course](#crash-course-sec-edgar-10-k-and-item-1a) below first (SEC, EDGAR, 10-K, Item 1A).

## Crash course: SEC, EDGAR, 10-K, and Item 1A

This is a plain-English primer — not legal or financial advice. It’s the vocabulary DisclosureDiff uses everywhere else.

### SEC

The **SEC** is the U.S. **Securities and Exchange Commission** — the federal regulator for public securities markets. Public companies (ones whose stock trades on exchanges) must disclose certain information so investors can make informed decisions and markets stay fairer. DisclosureDiff only reads those public disclosures; it doesn’t advise trades.

### EDGAR

**EDGAR** (Electronic Data Gathering, Analysis, and Retrieval) is the SEC’s public filing database. Anyone can look up company reports for free at [sec.gov/edgar](https://www.sec.gov/edgar). This MCP pulls real filing text from there and cites `sec.gov` URLs so you can verify every answer yourself.

### 10-K (and friends)

A **10-K** is a company’s **annual report** filed with the SEC — a yearly deep dive covering the business, risks, financials, legal matters, and more. Two cousins you’ll see in filings:

- **10-Q** — quarterly update (shorter, more frequent)
- **8-K** — “something material just happened” (acquisition, leadership change, etc.), filed promptly

DisclosureDiff’s main demo path is year-over-year comparison of sections inside **10-K**s.

### Item 1A (Risk Factors)

**Item 1A** is a required section of the 10-K titled **Risk Factors**. Management lists what could go wrong: competition, regulation, supply chain, lawsuits, cyber incidents, and so on.

**Why it matters:** it’s the company’s own warning label. What gets **added** or **removed** year to year often signals new worries (or worries that cooled). Journalists, analysts, and students compare those edits. **That’s exactly what DisclosureDiff diffs** — last year’s Item 1A vs this year’s, from real EDGAR 10-Ks, with citations.

### Why companies care

Listed companies have a legal duty to disclose. Incomplete or misleading disclosures can mean regulatory or legal trouble. Investors, reporters, and researchers treat filings as **primary sources** — not press-release spin.

### How this ties to the MCP

When we say *“diff Apple’s Item 1A,”* we mean: pull Apple’s latest and prior **10-K** Risk Factors from **EDGAR**, compare the text, and show what changed with links back to the SEC filings. Same idea for grounding a claim or comparing peer risk themes.

| Term | One-liner |
|------|-----------|
| **SEC** | U.S. market regulator; requires public-company disclosures |
| **EDGAR** | Free SEC database of those filings (what this MCP reads) |
| **10-K** | Annual report filed with the SEC |
| **10-Q / 8-K** | Quarterly update / “something material happened” filing |
| **Item 1A** | Risk Factors section — management’s warning list |

## Why you’d use this

**In one sentence:** it compares real company disclosures (like the [**risk factors** in a **10-K**](#crash-course-sec-edgar-10-k-and-item-1a) — the annual report companies file with the SEC) and returns structured changes + short excerpts + EDGAR links — so the AI can’t just make things up.

### You might use this if…

- **You’re researching a stock** and want a concrete answer like: “What new risks did Apple add this year?” instead of scrolling two PDFs.
- **You’re a student writing about a company** and need citable primary sources, not a chatbot paraphrase with no URL.
- **You’re a journalist or researcher** checking whether management’s story matches what they actually filed.
- **You’re comparing competitors** (e.g. NVIDIA vs AMD) and care which risk *themes* show up in [Item 1A](#crash-course-sec-edgar-10-k-and-item-1a) — not yesterday’s stock price.
- **You’re building an AI agent** and need tools that return filing text with mandatory citations, not hallucinated numbers.

### How to try it in 2 minutes

1. Install the server in Cursor or Claude Desktop (see [Quick start](#quick-start-local-stdio) below — clone, `npm install`, `npm run build`, paste the config JSON).
2. Paste one of these prompts into chat:
   - *Investor curiosity:* `Diff Apple’s Item 1A risk factors year-over-year and cite every change with EDGAR links.`
   - *Homework / paper:* `Ground this claim against Microsoft’s latest 10-K: “Microsoft discloses material cybersecurity risks.” Include excerpts and filing URLs.`
   - *Competitor scan:* `Compare NVDA vs AMD Item 1A themes — which risks show up for one peer but not the other? Cite EDGAR.`
3. Click an EDGAR link in the answer and skim the filing yourself before you trust it.

### What you get back

Structured change lists (added / removed / modified), short quoted snippets from the filing, and live `sec.gov` URLs (plus section ids). Enough to verify the claim — **not** buy/sell recommendations, price targets, or portfolio advice.

### What this is NOT

- Not a stock picker or “alpha” bot
- Not a price feed or market-data API
- Not financial, legal, or investment advice

It only analyzes publicly filed disclosure **text**. Verify every claim on EDGAR.

### Why it exists (vs other tools)

Chat agents invent financial facts. Many EDGAR MCPs only **fetch** raw filings; market-data MCPs wrap **prices**. Neither answers: *what changed year-over-year in Item 1A, with a cite for every delta?* DisclosureDiff returns structured diffs, mandatory citations, and peer risk-theme compare in one tool surface.

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

1. Diff Apple’s Item 1A risk factors year-over-year and cite every change with EDGAR links.
2. Ground this claim against Microsoft’s latest 10-K: “Microsoft discloses material cybersecurity risks.” Include excerpts and filing URLs.
3. Compare NVDA vs AMD Item 1A themes — which risks show up for one peer but not the other? Cite EDGAR.

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
