import { EdgarClient } from "../edgar/client.js";
import { loadAnnualFilings, loadFilingSection } from "../edgar/sections.js";
import { diffSections } from "../diff/engine.js";
import { enforceCitations } from "../citations/enforce.js";
import {
  DISCLAIMER,
  SECTION_LABELS,
  type DiffFilingSectionResult,
  type EdgarCitation,
  type FilingSection,
} from "../types.js";

export interface DiffFilingSectionArgs {
  ticker: string;
  section?: FilingSection;
  yearsBack?: number;
}

export async function diffFilingSection(
  client: EdgarClient,
  args: DiffFilingSectionArgs,
): Promise<DiffFilingSectionResult> {
  const section = (args.section || "Item1A") as FilingSection;
  if (section === "Item8K") {
    throw new Error("Use list_material_events for 8-K items");
  }

  const { company, filings } = await loadAnnualFilings(
    client,
    args.ticker,
    Math.max(2, (args.yearsBack ?? 1) + 1),
  );
  if (filings.length < 2) {
    throw new Error(
      `Need at least two 10-K filings to diff; found ${filings.length} for ${args.ticker}`,
    );
  }

  const newerRef = filings[0]!;
  const olderRef = filings[1]!;

  const [newer, older] = await Promise.all([
    loadFilingSection(client, company.ticker, newerRef, section, company.cik),
    loadFilingSection(client, company.ticker, olderRef, section, company.cik),
  ]);

  if (!newer.sectionText || !older.sectionText) {
    throw new Error(
      `Could not extract ${SECTION_LABELS[section]} from one or both filings for ${company.ticker}`,
    );
  }

  const olderCitation: EdgarCitation = {
    label: `${company.ticker} ${olderRef.form} ${SECTION_LABELS[section]} (${olderRef.filedAt})`,
    url: older.url,
    sectionId: section,
    accessionNumber: olderRef.accessionNumber,
    form: olderRef.form,
    filedAt: olderRef.filedAt,
  };
  const newerCitation: EdgarCitation = {
    label: `${company.ticker} ${newerRef.form} ${SECTION_LABELS[section]} (${newerRef.filedAt})`,
    url: newer.url,
    sectionId: section,
    accessionNumber: newerRef.accessionNumber,
    form: newerRef.form,
    filedAt: newerRef.filedAt,
  };

  const changes = diffSections({
    olderText: older.sectionText,
    newerText: newer.sectionText,
    olderCitation,
    newerCitation,
  });

  const citations = enforceCitations([newerCitation, olderCitation]);

  return {
    ticker: company.ticker,
    section,
    sectionLabel: SECTION_LABELS[section],
    older: {
      form: olderRef.form,
      filedAt: olderRef.filedAt,
      accessionNumber: olderRef.accessionNumber,
      url: older.url,
    },
    newer: {
      form: newerRef.form,
      filedAt: newerRef.filedAt,
      accessionNumber: newerRef.accessionNumber,
      url: newer.url,
    },
    changes,
    citations,
    methodologyNotes: [
      "Paragraph-level Jaccard matching; themes are lexical labels, not legal classifications.",
      "HTML filings are stripped to text before section extraction; XBRL tags are not interpreted.",
      DISCLAIMER,
    ],
    disclaimer: DISCLAIMER,
  };
}
