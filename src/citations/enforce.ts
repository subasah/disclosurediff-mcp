import type { EdgarCitation } from "../types.js";

const EDGAR_HOST = /(^|\.)sec\.gov$/i;

export class CitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CitationError";
  }
}

export function isValidEdgarUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (!EDGAR_HOST.test(u.hostname)) return false;
    return (
      u.hostname === "www.sec.gov" ||
      u.hostname === "data.sec.gov" ||
      u.hostname === "efts.sec.gov"
    );
  } catch {
    return false;
  }
}

/**
 * Enforce mandatory EDGAR citations on every substantive tool response.
 * Throws if citations are missing or point off sec.gov.
 */
export function enforceCitations(
  citations: EdgarCitation[] | undefined,
  opts: { requireExcerpt?: boolean; minCount?: number } = {},
): EdgarCitation[] {
  const minCount = opts.minCount ?? 1;
  if (!citations || citations.length < minCount) {
    throw new CitationError(
      `Substantive response requires at least ${minCount} EDGAR citation(s)`,
    );
  }
  for (const c of citations) {
    if (!c.url || !isValidEdgarUrl(c.url)) {
      throw new CitationError(`Invalid or non-EDGAR citation URL: ${c.url}`);
    }
    if (!c.label?.trim()) {
      throw new CitationError("Citation missing label");
    }
    if (opts.requireExcerpt && !c.excerpt?.trim()) {
      throw new CitationError(`Citation ${c.label} missing excerpt`);
    }
  }
  return citations;
}

export function wrapWithCitationsCheck<T extends { citations: EdgarCitation[] }>(
  result: T,
): T {
  enforceCitations(result.citations);
  return result;
}

export function formatCitationMarkdown(c: EdgarCitation): string {
  const section = c.sectionId ? ` (${c.sectionId})` : "";
  return `[${c.label}${section}](${c.url})`;
}
