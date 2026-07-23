# LinkedIn launch post (draft)

---

AI agents keep inventing financial “facts.”

I shipped **DisclosureDiff MCP** — an open server that diffs SEC disclosures year-over-year and refuses to answer without a live EDGAR citation.

What it does for Cursor / Claude-style agents:
• YoY Risk Factors / MD&A / Business / Legal diffs  
• Claim grounding against the latest 10-K  
• 8-K material event lists  
• Peer risk theme compare  

What I optimized for (beyond the demo):
• SEC fair-access rate limits + descriptive User-Agent  
• Hash-chained audit logs  
• Eval harness with citation-rate reporting  
• Streamable HTTP remote host + local stdio  

Not financial advice. Public filings only. MIT.

Repo + install: [GITHUB_URL]  
Try prompt: “Diff AAPL Item 1A YoY and cite every change.”

#MCP #FinTech #AIAgents #SEC #EDGAR

---

## Short comment/reply variants

1. “Price APIs are saturated. Citation-backed disclosure change detection isn’t.”
2. “Happy to walk through the threat model doc — prompt injection via filing text is a real issue.”
