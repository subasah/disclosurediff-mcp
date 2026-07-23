import { EdgarClient } from "../edgar/client.js";
import { loadAnnualFilings, loadFilingSection } from "../edgar/sections.js";
import {
  excerpt,
  jaccard,
  splitParagraphs,
  themeLabel,
  tokenize,
} from "../diff/engine.js";
import { enforceCitations } from "../citations/enforce.js";
import {
  DISCLAIMER,
  SECTION_LABELS,
  type ComparePeerRisksResult,
  type EdgarCitation,
  type FilingSection,
  type PeerRiskTheme,
} from "../types.js";

export interface ComparePeerRisksArgs {
  tickers: string[];
  section?: FilingSection;
  maxThemes?: number;
}

interface PeerPara {
  ticker: string;
  text: string;
  tokens: Set<string>;
  citation: EdgarCitation;
}

export async function comparePeerRisks(
  client: EdgarClient,
  args: ComparePeerRisksArgs,
): Promise<ComparePeerRisksResult> {
  const tickers = [...new Set((args.tickers || []).map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (tickers.length < 2) {
    throw new Error("compare_peer_risks requires at least two tickers");
  }
  const section = (args.section || "Item1A") as FilingSection;
  if (section === "Item8K") {
    throw new Error("Peer risk compare supports 10-K sections only");
  }
  const maxThemes = Math.min(args.maxThemes ?? 12, 25);

  const peerParas: PeerPara[] = [];
  const allCitations: EdgarCitation[] = [];

  for (const ticker of tickers) {
    const { company, filings } = await loadAnnualFilings(client, ticker, 1);
    const filing = filings[0]!;
    const loaded = await loadFilingSection(
      client,
      company.ticker,
      filing,
      section,
      company.cik,
    );
    if (!loaded.sectionText) continue;
    const citation: EdgarCitation = {
      label: `${company.ticker} ${filing.form} ${SECTION_LABELS[section]} (${filing.filedAt})`,
      url: loaded.url,
      sectionId: section,
      accessionNumber: filing.accessionNumber,
      form: filing.form,
      filedAt: filing.filedAt,
    };
    allCitations.push(citation);
    for (const p of splitParagraphs(loaded.sectionText, 100)) {
      peerParas.push({
        ticker: company.ticker,
        text: p,
        tokens: tokenize(p),
        citation,
      });
    }
  }

  if (allCitations.length < 2) {
    throw new Error("Could not load risk sections for enough peers");
  }

  // Greedy clustering by Jaccard similarity
  const used = new Set<number>();
  const themes: PeerRiskTheme[] = [];

  for (let i = 0; i < peerParas.length && themes.length < maxThemes; i++) {
    if (used.has(i)) continue;
    const seed = peerParas[i]!;
    const cluster = [i];
    used.add(i);
    for (let j = i + 1; j < peerParas.length; j++) {
      if (used.has(j)) continue;
      if (jaccard(seed.tokens, peerParas[j]!.tokens) >= 0.28) {
        cluster.push(j);
        used.add(j);
      }
    }
    const present = [...new Set(cluster.map((idx) => peerParas[idx]!.ticker))];
    if (present.length < 1) continue;
    // Prefer themes that differentiate or appear in multiple peers
    if (present.length === 1 && cluster.length === 1 && themes.length > 4) {
      continue;
    }
    const absent = tickers.filter((t) => !present.includes(t));
    themes.push({
      theme: themeLabel(seed.text),
      tickersPresent: present,
      tickersAbsent: absent,
      excerpts: cluster.slice(0, 4).map((idx) => ({
        ticker: peerParas[idx]!.ticker,
        excerpt: excerpt(peerParas[idx]!.text),
        citation: {
          ...peerParas[idx]!.citation,
          excerpt: excerpt(peerParas[idx]!.text),
        },
      })),
    });
  }

  themes.sort(
    (a, b) =>
      b.tickersPresent.length - a.tickersPresent.length ||
      a.tickersAbsent.length - b.tickersAbsent.length,
  );

  const citations = enforceCitations(allCitations);

  return {
    tickers,
    section,
    themes: themes.slice(0, maxThemes),
    citations,
    disclaimer: DISCLAIMER,
  };
}
