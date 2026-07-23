# Launch materials — DisclosureDiff MCP

## Demo script (3–5 min)

**Setup (you click):**
1. Open Cursor with DisclosureDiff MCP installed (stdio or remote).
2. Open a new Agent chat.
3. Have EDGAR browser tab ready to click through citations.

**Script:**

1. **Hook (20s):** “Agents hallucinate financial facts. Most finance MCPs only fetch prices or dump filings. DisclosureDiff returns what *changed* — with clickable EDGAR proof.”
2. **Prompt 1:** “Diff AAPL Item 1A risk factors year-over-year. Summarize the top 5 changes and cite each.”
   - Show tool call → JSON with citations → click one `sec.gov` link.
3. **Prompt 2:** “Ground this claim against MSFT’s 10-K: ‘Microsoft discloses material cybersecurity risks.’”
   - Show verdict + excerpts.
4. **Prompt 3 (optional):** “Compare NVDA, AMD, AVGO Item 1A — which themes are shared vs unique?”
5. **Trust (30s):** Mention citation enforcement, SEC User-Agent/rate limits, hash-chained audit log, eval harness citation rate.
6. **Close:** “Not financial advice — it’s the citation layer agents were missing.”

## Demo video — user action required

Recording needs your screen + mic. Suggested flow:

```bash
# Terminal A — HTTP server
export SEC_CONTACT_EMAIL=you@example.com TRANSPORT=http PORT=8787
npm run build && npm run start:http

# Terminal B — spike for B-roll
npm run spike
```

**You must:**
1. Start QuickTime / OBS screen recording
2. Capture Cursor agent session with the three prompts
3. Export 3–5 minute MP4 to `docs/demo/` (create folder) or YouTube Unlisted
4. Link from README

Blocker: cannot record your screen from this agent session without you.

## Show HN draft

**Title:** Show HN: DisclosureDiff – MCP that diffs SEC filings with mandatory citations

**Body:**

AI agents keep inventing what companies “said” in filings. Existing EDGAR MCPs mostly fetch documents. Analysts actually need: what changed in risk factors / MD&A since last year — with proof.

DisclosureDiff is a remote MCP server (Streamable HTTP + stdio) with:

- diff_filing_section (Item 1A/1/7/3 YoY)
- ground_claim (anti-hallucination excerpts)
- list_material_events (8-K)
- compare_peer_risks
- Mandatory live sec.gov citations or the response is rejected
- SEC-compliant User-Agent + throttling + filing cache
- Eval harness reporting citation rate

Not financial advice / no trading / no paid market data.

Repo: [link]
Try: “Diff AAPL Item 1A YoY and cite every change”

## LinkedIn draft

Shipped DisclosureDiff MCP — an agent tool that diffs SEC disclosures year-over-year and refuses to answer without EDGAR citations.

Why: finance agents don’t need another price wrapper; they need trustworthy interpretation of what was filed.

Built with the official MCP SDK (Streamable HTTP + stdio), citation enforcement, SEC rate-limit hygiene, audit logs, and an eval harness.

Demo prompts in the README. Happy to walk through the threat model / citation gate in interviews.

#MCP #FinTech #SEC #AIAgents

## Usage metrics hooks

Already wired:

- `metrics.jsonl` via `MetricsHook` (`tool_call`, `http_request`, `health`, `rate_limited`)
- Hash-chained `audit-logs/tool-calls.jsonl`
- Smithery analytics after publish (external)

Optional dashboard snippet:

```bash
wc -l metrics.jsonl audit-logs/tool-calls.jsonl
node -e "const fs=require('fs');const lines=fs.readFileSync('metrics.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse);console.log(lines.reduce((a,x)=>{a[x.type]=(a[x.type]|0)+1;return a},{}))"
```

Put anonymized weekly totals in the README after launch.
