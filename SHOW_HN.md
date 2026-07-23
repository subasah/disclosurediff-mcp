# Show HN: DisclosureDiff — MCP that diffs SEC filings with mandatory EDGAR citations

**HN title suggestion:** Show HN: DisclosureDiff – YoY SEC disclosure diffs for AI agents (with citations)

## Body (draft)

Hi HN —

I built **DisclosureDiff**, a remote Model Context Protocol (MCP) server that answers “what changed in this company’s disclosures?” with structured diffs and **mandatory live EDGAR links**.

Existing finance MCPs mostly wrap market-data APIs or fetch filings. Agents still hallucinate “facts.” Analysts actually need: YoY risk-factor / MD&A deltas, claim grounding, and 8-K event lists — each tied to `sec.gov` URLs.

### Tools

- `diff_filing_section` — Item 1A / MD&A / Business / Legal YoY diff
- `ground_claim` — support/contradict a claim with excerpts
- `list_material_events` — recent 8-Ks
- `compare_peer_risks` — theme clusters across peers
- `get_methodology` — limits + not-financial-advice

### Trust bits (the parts I care about for production finance)

- Citation gate rejects answers without `sec.gov` URLs
- SEC fair-access User-Agent + serialized rate limiting
- Hash-chained audit log of tool calls
- 20+ case eval harness; citation rate target 100% on substantive answers

### Non-goals

No trading, no Yahoo wrapper as the product, no fake alpha.

Repo: [GITHUB_URL]
Remote MCP: [HTTPS_/mcp]
Install snippets in the README (Cursor + Claude).

Feedback welcome — especially on section extraction edge cases and peer clustering quality.
