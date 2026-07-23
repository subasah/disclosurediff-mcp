/**
 * Shared types for DisclosureDiff responses.
 * Every substantive answer MUST include at least one EdgarCitation.
 */

export const DISCLAIMER =
  "Not financial advice. DisclosureDiff summarizes publicly filed SEC text; it does not recommend securities, predict prices, or replace professional analysis. Models and parsers can miss nuance — verify every claim against the linked EDGAR documents.";

export interface EdgarCitation {
  /** Human-readable label, e.g. "AAPL 10-K Item 1A (FY2024)" */
  label: string;
  /** Absolute EDGAR URL to the filing document */
  url: string;
  /** Section identifier when known, e.g. "Item 1A" */
  sectionId?: string;
  /** Accession number, e.g. "0000320193-24-000123" */
  accessionNumber?: string;
  /** Filing form type */
  form?: string;
  /** Filing date YYYY-MM-DD */
  filedAt?: string;
  /** Verbatim excerpt supporting the claim */
  excerpt?: string;
}

export type FilingSection =
  | "Item1A"
  | "Item1"
  | "Item7"
  | "Item3"
  | "Item8K";

export const SECTION_LABELS: Record<FilingSection, string> = {
  Item1A: "Item 1A — Risk Factors",
  Item1: "Item 1 — Business",
  Item7: "Item 7 — MD&A",
  Item3: "Item 3 — Legal Proceedings",
  Item8K: "Form 8-K",
};

export interface DiffChange {
  type: "added" | "removed" | "changed";
  theme: string;
  summary: string;
  beforeExcerpt?: string;
  afterExcerpt?: string;
  citations: EdgarCitation[];
}

export interface DiffFilingSectionResult {
  ticker: string;
  section: FilingSection;
  sectionLabel: string;
  older: { form: string; filedAt: string; accessionNumber: string; url: string };
  newer: { form: string; filedAt: string; accessionNumber: string; url: string };
  changes: DiffChange[];
  citations: EdgarCitation[];
  methodologyNotes: string[];
  disclaimer: string;
}

export interface GroundClaimResult {
  ticker: string;
  claim: string;
  verdict: "supported" | "contradicted" | "partially_supported" | "not_found";
  evidence: Array<{
    stance: "supports" | "contradicts" | "related";
    excerpt: string;
    sectionId: string;
    citation: EdgarCitation;
  }>;
  citations: EdgarCitation[];
  disclaimer: string;
}

export interface MaterialEvent {
  ticker: string;
  form: string;
  filedAt: string;
  accessionNumber: string;
  items: string[];
  eventTypes: string[];
  summary: string;
  url: string;
  citation: EdgarCitation;
}

export interface ListMaterialEventsResult {
  tickers: string[];
  events: MaterialEvent[];
  citations: EdgarCitation[];
  disclaimer: string;
}

export interface PeerRiskTheme {
  theme: string;
  tickersPresent: string[];
  tickersAbsent: string[];
  excerpts: Array<{ ticker: string; excerpt: string; citation: EdgarCitation }>;
}

export interface ComparePeerRisksResult {
  tickers: string[];
  section: FilingSection;
  themes: PeerRiskTheme[];
  citations: EdgarCitation[];
  disclaimer: string;
}

export interface MethodologyResult {
  name: string;
  version: string;
  purpose: string;
  limits: string[];
  citationPolicy: string;
  rateLimiting: string;
  disclaimer: string;
  threatModelUrl: string;
}
