import { EdgarClient } from "../edgar/client.js";
import { loadAnnualFilings, loadFilingSection } from "../edgar/sections.js";
import { scoreClaimAgainstText } from "../diff/engine.js";
import { enforceCitations } from "../citations/enforce.js";
import {
  DISCLAIMER,
  SECTION_LABELS,
  type FilingSection,
  type GroundClaimResult,
} from "../types.js";

export interface GroundClaimArgs {
  ticker: string;
  claim: string;
  section?: FilingSection;
}

export async function groundClaim(
  client: EdgarClient,
  args: GroundClaimArgs,
): Promise<GroundClaimResult> {
  const section = (args.section || "Item1A") as FilingSection;
  if (section === "Item8K") {
    throw new Error("ground_claim currently supports 10-K sections only");
  }
  if (!args.claim?.trim()) {
    throw new Error("claim is required");
  }

  const { company, filings } = await loadAnnualFilings(client, args.ticker, 1);
  const filing = filings[0]!;
  const loaded = await loadFilingSection(
    client,
    company.ticker,
    filing,
    section,
    company.cik,
  );

  if (!loaded.sectionText) {
    throw new Error(
      `Could not extract ${SECTION_LABELS[section]} for ${company.ticker}`,
    );
  }

  const baseCitation = {
    label: `${company.ticker} ${filing.form} ${SECTION_LABELS[section]} (${filing.filedAt})`,
    url: loaded.url,
    sectionId: section,
    accessionNumber: filing.accessionNumber,
    form: filing.form,
    filedAt: filing.filedAt,
  };

  const scored = scoreClaimAgainstText(args.claim, loaded.sectionText);
  const claimLower = args.claim.toLowerCase();
  const neg =
    /\b(not|no|never|absent|without|did not|does not|untrue|false)\b/i.test(
      claimLower,
    );

  const evidence = scored.map((s) => {
    const stance =
      s.score >= 0.22
        ? neg
          ? ("contradicts" as const)
          : ("supports" as const)
        : ("related" as const);
    return {
      stance,
      excerpt: s.excerpt,
      sectionId: section,
      citation: { ...baseCitation, excerpt: s.excerpt },
    };
  });

  let verdict: GroundClaimResult["verdict"] = "not_found";
  if (evidence.some((e) => e.stance === "supports" || e.stance === "contradicts")) {
    const supports = evidence.filter((e) => e.stance === "supports").length;
    const contradicts = evidence.filter((e) => e.stance === "contradicts").length;
    if (supports && contradicts) verdict = "partially_supported";
    else if (contradicts) verdict = "contradicted";
    else if (supports) verdict = "supported";
    else verdict = "partially_supported";
  } else if (evidence.length > 0) {
    verdict = "partially_supported";
  }

  const citations = enforceCitations(
    evidence.length > 0
      ? evidence.map((e) => e.citation)
      : [{ ...baseCitation, excerpt: loaded.sectionText.slice(0, 200) }],
  );

  return {
    ticker: company.ticker,
    claim: args.claim.trim(),
    verdict,
    evidence,
    citations,
    disclaimer: DISCLAIMER,
  };
}
