# Demo script — 3–5 minute Cursor walkthrough
# Record with OBS / Loom while narrating.

## Setup (0:30)

1. Open Cursor with DisclosureDiff MCP configured (stdio or remote `/mcp`).
2. Confirm tools visible: `diff_filing_section`, `ground_claim`, `list_material_events`, `compare_peer_risks`, `get_methodology`.
3. State on camera: “Not financial advice — public SEC filings only.”

## Scene 1 — The gap (0:45)

Prompt: “Don’t fetch prices. Tell me what changed in Apple’s risk factors this year vs last, with links.”

Expected: Agent calls `diff_filing_section` → structured added/removed/changed themes → clickable `sec.gov` URLs.

Talk track: “Finance agents don’t need another quote API. They need proof.”

## Scene 2 — Anti-hallucination (1:00)

Prompt: “Ground this claim against Microsoft’s 10-K: ‘The company faces material export-control risk on cloud/AI products.’”

Expected: `ground_claim` → verdict + excerpts + citations.

Talk track: “If it isn’t in the filing, we say so.”

## Scene 3 — Peers + 8-K (1:30)

Prompt: “Compare NVDA / AMD / AVGO Item 1A themes, then list TSLA’s last three 8-K event types.”

Expected: `compare_peer_risks` + `list_material_events`.

## Close (0:30)

- Show `get_methodology` disclaimer.
- Show eval table in README (citation rate).
- CTA: GitHub stars + Smithery install + Show HN link.

## B-roll checklist

- [ ] `/health` JSON
- [ ] Audit log line (hash field)
- [ ] EDGAR page opening from a citation
