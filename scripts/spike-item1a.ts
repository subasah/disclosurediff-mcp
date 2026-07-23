#!/usr/bin/env tsx
/**
 * Spike: Item 1A YoY diff for AAPL with EDGAR citations.
 * Run: npm run spike
 */

import { EdgarClient } from "../src/edgar/client.js";
import { diffFilingSection } from "../src/tools/diffFilingSection.js";
import { enforceCitations } from "../src/citations/enforce.js";

async function main() {
  const ticker = process.env.SPIKE_TICKER || "AAPL";
  console.error(`Spike: diffing ${ticker} Item 1A (live SEC)…`);
  const client = new EdgarClient();
  const result = await diffFilingSection(client, {
    ticker,
    section: "Item1A",
  });
  enforceCitations(result.citations);
  console.log(
    JSON.stringify(
      {
        ticker: result.ticker,
        section: result.sectionLabel,
        older: result.older,
        newer: result.newer,
        changeCount: result.changes.length,
        sampleChanges: result.changes.slice(0, 5).map((c) => ({
          type: c.type,
          theme: c.theme,
          summary: c.summary,
          citations: c.citations.map((x) => x.url),
        })),
        citations: result.citations,
        disclaimer: result.disclaimer,
      },
      null,
      2,
    ),
  );
  console.error(
    `OK: ${result.changes.length} changes, ${result.citations.length} top-level citations`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
