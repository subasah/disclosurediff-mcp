# Contributing

1. Keep substantive tool responses citation-enforced (`enforceCitations`).
2. Do not add paid market-data dependencies or trading endpoints.
3. Prefer deterministic parsers over LLM-in-the-tool for v1 diffs.
4. Run `npm test && npm run eval` before PRs.
5. Never commit `.env`, API keys, or cache dumps.
