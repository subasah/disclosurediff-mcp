import { FilingCache } from "../infra/cache-audit.js";
import {
  EdgarClient,
  filingDocumentUrl,
  type CompanySubmission,
} from "./client.js";
import {
  fetchSubmissions,
  listFilings,
  resolveTicker,
  type FilingRef,
} from "./resolve.js";
import type { FilingSection } from "../types.js";

const SECTION_PATTERNS: Record<
  Exclude<FilingSection, "Item8K">,
  { start: RegExp; end: RegExp }
> = {
  // Allow optional whitespace inside headings (iXBRL often splits letters across tags)
  Item1A: {
    start: /item\s*1a[\s.:-]*\s*r\s*i\s*s\s*k\s*f\s*a\s*c\s*t\s*o\s*r\s*s/i,
    end: /item\s*1b[\s.:-]|item\s*1c[\s.:-]|item\s*2[\s.:-]*\s*p\s*r\s*o\s*p\s*e\s*r\s*t\s*i\s*e\s*s/i,
  },
  Item1: {
    start: /item\s*1[\s.:-]*\s*b\s*u\s*s\s*i\s*n\s*e\s*s\s*s(?!\s*combination)/i,
    end: /item\s*1a[\s.:-]*\s*r\s*i\s*s\s*k/i,
  },
  Item7: {
    start:
      /item\s*7[\s.:-]*\s*management[''\u2019]?\s*s?\s*discussion\s*and\s*analysis/i,
    end: /item\s*7a[\s.:-]|item\s*8[\s.:-]*\s*financial\s*statements/i,
  },
  Item3: {
    start: /item\s*3[\s.:-]*\s*legal\s*proceedings/i,
    end: /item\s*4[\s.:-]*\s*(mine\s*safety|submission)/i,
  },
};

export function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/(h[1-6]|li)>/gi, "\n")
    // Join tags that only wrap single characters (common in iXBRL) before stripping
    .replace(/>(\s*)<\/(?:span|font|ix:[a-z]+)>(\s*)<(?:span|font|ix:[a-z]+)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/&rsquo;|&apos;|&#39;|’/gi, "'")
    .replace(/\r/g, "");
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");
  // Collapse single-letter splits left by tagged characters: "R I S K" → keep as-is for regex;
  // also normalize "RIS K" style by removing spaces between consecutive uppercase letters briefly
  // (handled primarily via flexible section regexes).
  return text.trim();
}

export function extractSection(
  documentText: string,
  section: Exclude<FilingSection, "Item8K">,
): string {
  const patterns = SECTION_PATTERNS[section];
  // EDGAR HTML often repeats headers in the TOC; pick the longest body.
  const starts: RegExpExecArray[] = [];
  const re = new RegExp(patterns.start.source, patterns.start.flags.includes("g")
    ? patterns.start.flags
    : patterns.start.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(documentText)) !== null) {
    starts.push(m);
    if (starts.length > 20) break;
  }
  if (starts.length === 0) return "";

  let best = "";
  for (const startMatch of starts) {
    const rest = documentText.slice(startMatch.index + startMatch[0].length);
    const endMatch = patterns.end.exec(rest);
    const body = endMatch
      ? rest.slice(0, endMatch.index)
      : rest.slice(0, 200_000);
    const candidate = (startMatch[0] + body).trim();
    // Skip TOC stubs (header + page number only)
    if (candidate.length < 400) continue;
    if (candidate.length > best.length) best = candidate;
  }
  // Fallback: if everything looked like TOC, use the last start match
  if (!best && starts.length > 0) {
    const startMatch = starts[starts.length - 1]!;
    const rest = documentText.slice(startMatch.index + startMatch[0].length);
    const endMatch = patterns.end.exec(rest);
    const body = endMatch
      ? rest.slice(0, endMatch.index)
      : rest.slice(0, 200_000);
    best = (startMatch[0] + body).trim();
  }
  return best;
}

export interface LoadedFiling {
  ticker: string;
  cik: string;
  name: string;
  filing: FilingRef;
  url: string;
  text: string;
  sectionText: string;
}

export async function loadAnnualFilings(
  client: EdgarClient,
  ticker: string,
  count = 2,
): Promise<{
  company: { cik: string; name: string; ticker: string };
  filings: FilingRef[];
  submissions: CompanySubmission;
}> {
  const company = await resolveTicker(client, ticker);
  const submissions = await fetchSubmissions(client, company.cik);
  const filings = listFilings(submissions, ["10-K", "10-K/A"], count);
  if (filings.length < 1) {
    throw new Error(`No 10-K filings found for ${ticker}`);
  }
  return { company, filings, submissions };
}

export async function loadFilingSection(
  client: EdgarClient,
  ticker: string,
  filing: FilingRef,
  section: Exclude<FilingSection, "Item8K">,
  cik: string,
): Promise<LoadedFiling> {
  const company = await resolveTicker(client, ticker);
  const url = filingDocumentUrl(
    cik,
    filing.accessionNumber,
    filing.primaryDocument,
  );
  const cacheKey = FilingCache.key(cik, filing.accessionNumber, "raw");
  const raw = await client.getCachedOrFetch(cacheKey, url);
  const text = htmlToText(raw);
  const sectionCacheKey = FilingCache.key(
    cik,
    filing.accessionNumber,
    `section:${section}`,
  );
  const cache = new FilingCache();
  let sectionText = await cache.get<string>(sectionCacheKey);
  // Invalidate TOC-stub cache entries from earlier extractor bugs
  if (sectionText != null && sectionText.length < 400) {
    sectionText = null;
  }
  if (sectionText == null) {
    sectionText = extractSection(text, section);
    await cache.set(sectionCacheKey, sectionText);
  }
  return {
    ticker: company.ticker,
    cik: company.cik,
    name: company.name,
    filing,
    url,
    text,
    sectionText,
  };
}
