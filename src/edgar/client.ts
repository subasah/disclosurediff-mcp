/**
 * Rate-limited SEC EDGAR HTTP client with descriptive User-Agent.
 * Fair-access: stay well under 10 req/s and never omit contact email.
 */

import { loadConfig } from "../config.js";
import { FilingCache } from "../infra/cache-audit.js";

export class SecRateLimitError extends Error {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message);
    this.name = "SecRateLimitError";
  }
}

export class EdgarClient {
  private lastRequestAt = 0;
  private queue: Promise<void> = Promise.resolve();
  private readonly userAgent: string;
  private readonly minIntervalMs: number;
  private readonly cache: FilingCache;

  constructor(opts?: {
    userAgent?: string;
    minIntervalMs?: number;
    cache?: FilingCache;
  }) {
    const cfg = loadConfig();
    this.userAgent = opts?.userAgent ?? cfg.userAgent;
    this.minIntervalMs = opts?.minIntervalMs ?? cfg.secMinIntervalMs;
    this.cache = opts?.cache ?? new FilingCache();
  }

  getUserAgent(): string {
    return this.userAgent;
  }

  private async throttle(): Promise<void> {
    this.queue = this.queue.then(async () => {
      const elapsed = Date.now() - this.lastRequestAt;
      if (elapsed < this.minIntervalMs) {
        await sleep(this.minIntervalMs - elapsed);
      }
      this.lastRequestAt = Date.now();
    });
    await this.queue;
  }

  async fetchText(url: string, init?: RequestInit): Promise<string> {
    let attempt = 0;
    let backoffMs = 5_000;
    while (true) {
      await this.throttle();
      const res = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json, text/html, text/plain, */*",
          "User-Agent": this.userAgent,
          ...(init?.headers ?? {}),
        },
      });

      if (res.status === 429 || res.status === 503) {
        attempt += 1;
        if (attempt > 4) {
          throw new SecRateLimitError(
            `SEC rate limit (${res.status}) after retries`,
            backoffMs,
          );
        }
        const retryHdr = Number(res.headers.get("retry-after") || 0) * 1000;
        const wait = Math.max(retryHdr, backoffMs);
        await sleep(wait);
        backoffMs *= 2;
        continue;
      }
      if (!res.ok) {
        throw new Error(`SEC fetch failed ${res.status} for ${url}`);
      }
      return res.text();
    }
  }

  async fetchJson<T>(url: string): Promise<T> {
    const text = await this.fetchText(url);
    return JSON.parse(text) as T;
  }

  async getCachedOrFetch(
    cacheKey: string,
    url: string,
  ): Promise<string> {
    const hit = await this.cache.get<string>(cacheKey);
    if (hit != null) return hit;
    const text = await this.fetchText(url);
    await this.cache.set(cacheKey, text);
    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface CompanySubmission {
  cik: string;
  name: string;
  tickers: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      items: string[];
    };
  };
}

export function padCik(cik: string | number): string {
  return String(cik).replace(/^0+/, "").padStart(10, "0");
}

export function accessionToPath(accession: string): string {
  return accession.replace(/-/g, "");
}

export function filingDocumentUrl(
  cik: string | number,
  accession: string,
  primaryDocument: string,
): string {
  const cikNum = String(cik).replace(/^0+/, "");
  const acc = accessionToPath(accession);
  return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${primaryDocument}`;
}

export function filingIndexUrl(
  cik: string | number,
  accession: string,
): string {
  const cikNum = String(cik).replace(/^0+/, "");
  const acc = accessionToPath(accession);
  return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${accession}-index.htm`;
}
