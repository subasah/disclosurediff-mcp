import {
  EdgarClient,
  padCik,
  type CompanySubmission,
  type TickerEntry,
} from "./client.js";

let tickerMapCache: Map<string, TickerEntry> | null = null;

export async function loadTickerMap(
  client: EdgarClient,
): Promise<Map<string, TickerEntry>> {
  if (tickerMapCache) return tickerMapCache;
  const url = "https://www.sec.gov/files/company_tickers.json";
  const data = await client.fetchJson<Record<string, TickerEntry>>(url);
  const map = new Map<string, TickerEntry>();
  for (const entry of Object.values(data)) {
    map.set(entry.ticker.toUpperCase(), entry);
  }
  tickerMapCache = map;
  return map;
}

export async function resolveTicker(
  client: EdgarClient,
  ticker: string,
): Promise<{ cik: string; name: string; ticker: string }> {
  const t = ticker.trim().toUpperCase();
  const map = await loadTickerMap(client);
  const entry = map.get(t);
  if (!entry) {
    throw new Error(`Unknown ticker: ${ticker}`);
  }
  return {
    cik: padCik(entry.cik_str),
    name: entry.title,
    ticker: entry.ticker.toUpperCase(),
  };
}

export async function fetchSubmissions(
  client: EdgarClient,
  cik: string,
): Promise<CompanySubmission> {
  const padded = padCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${padded}.json`;
  return client.fetchJson<CompanySubmission>(url);
}

export interface FilingRef {
  form: string;
  filedAt: string;
  reportDate: string;
  accessionNumber: string;
  primaryDocument: string;
  items: string;
}

export function listFilings(
  submissions: CompanySubmission,
  forms: string[],
  limit = 20,
): FilingRef[] {
  const recent = submissions.filings.recent;
  const wanted = new Set(forms.map((f) => f.toUpperCase()));
  const out: FilingRef[] = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (!wanted.has(recent.form[i]!.toUpperCase())) continue;
    out.push({
      form: recent.form[i]!,
      filedAt: recent.filingDate[i]!,
      reportDate: recent.reportDate[i] || recent.filingDate[i]!,
      accessionNumber: recent.accessionNumber[i]!,
      primaryDocument: recent.primaryDocument[i]!,
      items: recent.items[i] || "",
    });
    if (out.length >= limit) break;
  }
  return out;
}
