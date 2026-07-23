/**
 * Eval cases for DisclosureDiff.
 * Offline cases validate citation/diff logic without SEC network.
 * Live cases (EVAL_LIVE=1) hit EDGAR for known tickers.
 */

export type EvalKind =
  | "citation_url"
  | "diff_synthetic"
  | "section_extract"
  | "ground_synthetic"
  | "methodology"
  | "live_diff"
  | "live_ground"
  | "live_events"
  | "live_peers";

export interface EvalCase {
  id: string;
  kind: EvalKind;
  description: string;
  /** Expected: every substantive answer must include a live EDGAR URL */
  expectCitation: boolean;
  /** Optional theme keywords that should appear in live diffs */
  expectThemes?: string[];
  ticker?: string;
  tickers?: string[];
  claim?: string;
  olderText?: string;
  newerText?: string;
  html?: string;
}

export const EVAL_CASES: EvalCase[] = [
  // --- Offline citation / unit-style (1–12) ---
  {
    id: "cite-01",
    kind: "citation_url",
    description: "Accept www.sec.gov Archives URL",
    expectCitation: true,
  },
  {
    id: "cite-02",
    kind: "citation_url",
    description: "Accept data.sec.gov submissions URL",
    expectCitation: true,
  },
  {
    id: "cite-03",
    kind: "citation_url",
    description: "Reject non-SEC host",
    expectCitation: false,
  },
  {
    id: "cite-04",
    kind: "citation_url",
    description: "Reject http (non-TLS) SEC URL",
    expectCitation: false,
  },
  {
    id: "diff-01",
    kind: "diff_synthetic",
    description: "Detect added AI risk paragraph",
    expectCitation: true,
    olderText:
      "Cybersecurity risks could materially affect operations and customer trust worldwide across products.\n\nCompetition in consumer electronics remains intense and pricing pressure continues each year.",
    newerText:
      "Cybersecurity risks could materially affect operations and customer trust worldwide across products.\n\nArtificial intelligence product liability and copyright claims may increase litigation exposure over time.",
  },
  {
    id: "diff-02",
    kind: "diff_synthetic",
    description: "Detect removed competition paragraph",
    expectCitation: true,
    olderText:
      "Supply chain disruptions in Asia may delay product launches and increase costs substantially.\n\nCompetition in consumer electronics remains intense and pricing pressure continues each year.",
    newerText:
      "Supply chain disruptions in Asia may delay product launches and increase costs substantially.\n\nClimate regulation may raise compliance costs in multiple jurisdictions for our operations.",
  },
  {
    id: "diff-03",
    kind: "diff_synthetic",
    description: "Unchanged text yields zero or near-zero changes",
    expectCitation: true,
    olderText:
      "Liquidity and capital resources depend on cash from operations and access to credit markets globally for funding.\n\nTalent retention among key engineering personnel is critical to our product roadmap execution.",
    newerText:
      "Liquidity and capital resources depend on cash from operations and access to credit markets globally for funding.\n\nTalent retention among key engineering personnel is critical to our product roadmap execution.",
  },
  {
    id: "sec-01",
    kind: "section_extract",
    description: "Extract Item 1A from synthetic 10-K HTML",
    expectCitation: false,
    html: `<html><body><p>ITEM 1. BUSINESS</p><p>We sell software and services worldwide to enterprise customers.</p>
<p>ITEM 1A. RISK FACTORS</p><p>Cybersecurity incidents could disrupt our systems and harm customers significantly.</p>
<p>ITEM 1B. UNRESOLVED STAFF COMMENTS</p><p>None.</p></body></html>`,
  },
  {
    id: "sec-02",
    kind: "section_extract",
    description: "Extract Item 7 MD&A heading",
    expectCitation: false,
    html: `<html><body><p>ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS</p>
<p>Revenue increased due to higher subscription volumes and improved retention metrics.</p>
<p>ITEM 7A. QUANTITATIVE AND QUALITATIVE DISCLOSURES ABOUT MARKET RISK</p><p>We are exposed to FX.</p></body></html>`,
  },
  {
    id: "ground-01",
    kind: "ground_synthetic",
    description: "Ground cybersecurity claim against risk text",
    expectCitation: true,
    claim: "The company faces cybersecurity threats",
    newerText:
      "We face significant cybersecurity threats that could disrupt our systems and harm customers worldwide.\n\nClimate-related regulation may increase compliance costs in multiple jurisdictions.",
  },
  {
    id: "ground-02",
    kind: "ground_synthetic",
    description: "Low-overlap claim returns weak/empty evidence",
    expectCitation: true,
    claim: "The company manufactures lunar mining equipment exclusively",
    newerText:
      "We face significant cybersecurity threats that could disrupt our systems and harm customers worldwide.\n\nClimate-related regulation may increase compliance costs in multiple jurisdictions.",
  },
  {
    id: "meth-01",
    kind: "methodology",
    description: "Methodology includes not-financial-advice disclaimer",
    expectCitation: false,
  },
  {
    id: "diff-04",
    kind: "diff_synthetic",
    description: "Detect changed overlapping cybersecurity wording",
    expectCitation: true,
    olderText:
      "Cybersecurity attacks could compromise customer data and disrupt services for extended periods across regions.\n\nForeign currency fluctuations affect reported revenue each quarter substantially.",
    newerText:
      "Cybersecurity attacks and ransomware could compromise customer data and disrupt cloud services for extended periods across regions.\n\nForeign currency fluctuations affect reported revenue each quarter substantially.",
  },
  {
    id: "diff-05",
    kind: "diff_synthetic",
    description: "Multiple added themes each carry citations",
    expectCitation: true,
    olderText:
      "Interest rate risk affects the fair value of our investment portfolio over multi-year horizons.",
    newerText:
      "Interest rate risk affects the fair value of our investment portfolio over multi-year horizons.\n\nGenerative artificial intelligence regulation may restrict product features in certain markets.\n\nOpen-source software license claims could increase legal costs and require product changes.",
  },
  {
    id: "sec-03",
    kind: "section_extract",
    description: "Extract Item 1A ignores TOC stub when body exists",
    expectCitation: false,
    html: `<html><body>
<p>Item 1A. Risk Factors 5</p>
<p>Item 1B. Unresolved Staff Comments 12</p>
<p>ITEM 1A. RISK FACTORS</p>
<p>Pandemic-related disruptions could adversely affect demand for our products and services worldwide.</p>
<p>Competition may reduce margins over time across channels.</p>
<p>ITEM 1B. UNRESOLVED STAFF COMMENTS</p>
<p>None.</p>
</body></html>`,
  },
  {
    id: "ground-03",
    kind: "ground_synthetic",
    description: "Ranks climate disclosure paragraph first",
    expectCitation: true,
    claim: "climate disclosure rules increase reporting costs",
    newerText:
      "Weather events can damage facilities in coastal regions over time.\n\nClimate-related disclosure rules may increase reporting costs and liability exposure.\n\nWe lease office space in several cities for administrative functions.",
  },
  {
    id: "cite-05",
    kind: "citation_url",
    description: "Accept efts.sec.gov host",
    expectCitation: true,
  },
  {
    id: "meth-02",
    kind: "methodology",
    description: "Methodology documents citation policy with sec.gov",
    expectCitation: false,
  },
  {
    id: "diff-06",
    kind: "diff_synthetic",
    description: "Removed theme retains prior-year citation",
    expectCitation: true,
    olderText:
      "Patent litigation could divert management attention from operations and increase expenses substantially.\n\nTalent retention among engineers remains critical for roadmap execution.",
    newerText:
      "Talent retention among engineers remains critical for roadmap execution and product quality.",
  },
  {
    id: "sec-04",
    kind: "section_extract",
    description: "Extract Item 3 Legal Proceedings bounds",
    expectCitation: false,
    html: `<html><body>
<p>ITEM 3. LEGAL PROCEEDINGS</p>
<p>We are party to various litigation matters that arise in the ordinary course of business.</p>
<p>ITEM 4. MINE SAFETY DISCLOSURES</p>
<p>Not applicable.</p>
</body></html>`,
  },

  // --- Live EDGAR cases (13–24+) ---
  {
    id: "live-diff-aapl-1a",
    kind: "live_diff",
    description: "AAPL Item 1A YoY diff returns EDGAR citations",
    expectCitation: true,
    ticker: "AAPL",
  },
  {
    id: "live-diff-msft-1a",
    kind: "live_diff",
    description: "MSFT Item 1A YoY diff returns EDGAR citations",
    expectCitation: true,
    ticker: "MSFT",
  },
  {
    id: "live-diff-nvda-1a",
    kind: "live_diff",
    description: "NVDA Item 1A YoY diff returns EDGAR citations",
    expectCitation: true,
    ticker: "NVDA",
  },
  {
    id: "live-diff-aapl-7",
    kind: "live_diff",
    description: "AAPL Item 7 MD&A YoY diff",
    expectCitation: true,
    ticker: "AAPL",
  },
  {
    id: "live-ground-aapl",
    kind: "live_ground",
    description: "Ground claim on AAPL risk factors",
    expectCitation: true,
    ticker: "AAPL",
    claim: "Apple faces risks related to international operations and supply chain",
  },
  {
    id: "live-ground-msft",
    kind: "live_ground",
    description: "Ground claim on MSFT cybersecurity",
    expectCitation: true,
    ticker: "MSFT",
    claim: "Microsoft discloses cybersecurity and security risks",
  },
  {
    id: "live-events-aapl",
    kind: "live_events",
    description: "List recent AAPL 8-K events with citations",
    expectCitation: true,
    tickers: ["AAPL"],
  },
  {
    id: "live-events-multi",
    kind: "live_events",
    description: "List 8-K events for AAPL and MSFT",
    expectCitation: true,
    tickers: ["AAPL", "MSFT"],
  },
  {
    id: "live-peers-semi",
    kind: "live_peers",
    description: "Compare NVDA/AMD/AVGO risk themes",
    expectCitation: true,
    tickers: ["NVDA", "AMD", "AVGO"],
  },
  {
    id: "live-peers-tech",
    kind: "live_peers",
    description: "Compare AAPL/MSFT/GOOGL risk themes",
    expectCitation: true,
    tickers: ["AAPL", "MSFT", "GOOGL"],
  },
  {
    id: "live-diff-googl-1a",
    kind: "live_diff",
    description: "GOOGL Item 1A YoY diff",
    expectCitation: true,
    ticker: "GOOGL",
  },
  {
    id: "live-diff-amzn-1a",
    kind: "live_diff",
    description: "AMZN Item 1A YoY diff",
    expectCitation: true,
    ticker: "AMZN",
  },
];
