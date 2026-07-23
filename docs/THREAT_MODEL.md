# Threat model (v0.1)

## Assets

- Integrity of citations (must point at real EDGAR documents)
- Availability of the public MCP endpoint
- Audit trail of tool invocations (demo of bank/fintech concerns)
- Operator secrets: `API_KEYS`, contact email (not a secret but identity)

## Trust boundaries

1. **AI agent / client** — untrusted; may send adversarial tool args.
2. **MCP server** — trusted compute; validates inputs, enforces citations.
3. **SEC EDGAR** — trusted public data source; filing *text* is untrusted content.
4. **Filesystem cache / audit logs** — trusted local storage in the deploy environment.

## Threats & mitigations

| Threat | Mitigation |
|--------|------------|
| Hallucinated “facts” without proof | `enforceCitations` rejects responses lacking live `https://*.sec.gov` URLs |
| Citation spoofing (evil.com) | Hostname allowlist: `www.sec.gov`, `data.sec.gov`, `efts.sec.gov` |
| Prompt injection via filing text | Excerpts returned as data; methodology warns models; no `eval` of filing content |
| SEC IP ban / 429 | User-Agent with email, serial throttle, backoff, CIK+accession cache |
| API abuse / DoS | API keys + RPM limits; anonymous tier capped |
| Secret leakage in logs | Audit logger never records `Authorization` / raw API keys (only key prefix id in metrics tier) |
| Tampered audit history | Hash-chained JSONL (`prevHash` + sha256) |
| SSRF via ticker/URL args | Server builds EDGAR URLs from CIK/accession only; no user-supplied fetch URLs |

## Non-goals

- Preventing a malicious agent from *asking* about filings
- Cryptographic proof that SEC content is unmodified (rely on HTTPS to sec.gov)
- Multi-tenant isolation beyond API keys (single-process demo)

## Residual risk

Section extraction heuristics can miss text; agents may still mis-summarize cited excerpts. Always click through to EDGAR.
