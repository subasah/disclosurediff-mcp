import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enforceCitations,
  isValidEdgarUrl,
  CitationError,
} from "../citations/enforce.js";
import {
  diffSections,
  scoreClaimAgainstText,
  splitParagraphs,
  themeLabel,
  tokenize,
} from "./engine.js";
import { extractSection, htmlToText } from "../edgar/sections.js";
import {
  padCik,
  accessionToPath,
  filingDocumentUrl,
} from "../edgar/client.js";
import { getMethodology } from "../tools/getMethodology.js";
import { parseItemCodes, describeItems } from "../edgar/eightk.js";

describe("citations", () => {
  it("accepts sec.gov https URLs", () => {
    assert.equal(
      isValidEdgarUrl(
        "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm",
      ),
      true,
    );
    assert.equal(
      isValidEdgarUrl("https://data.sec.gov/submissions/CIK0000320193.json"),
      true,
    );
    assert.equal(isValidEdgarUrl("http://www.sec.gov/x"), false);
    assert.equal(isValidEdgarUrl("https://evil.com/sec.gov"), false);
  });

  it("enforces at least one citation", () => {
    assert.throws(() => enforceCitations([]), CitationError);
    const ok = enforceCitations([
      {
        label: "AAPL 10-K",
        url: "https://www.sec.gov/Archives/edgar/data/320193/x/a.htm",
        sectionId: "Item 1A",
      },
    ]);
    assert.equal(ok.length, 1);
  });
});

describe("edgar helpers", () => {
  it("pads CIK and builds document URLs", () => {
    assert.equal(padCik(320193), "0000320193");
    assert.equal(accessionToPath("0000320193-24-000123"), "000032019324000123");
    assert.equal(
      filingDocumentUrl(320193, "0000320193-24-000123", "aapl-20240928.htm"),
      "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm",
    );
  });

  it("maps 8-K item codes", () => {
    assert.deepEqual(parseItemCodes("2.02,5.02"), ["2.02", "5.02"]);
    assert.ok(describeItems(["2.02"])[0]!.includes("Results"));
  });
});

describe("section extraction", () => {
  it("extracts Item 1A from synthetic HTML", () => {
    const html = `
      <html><body>
      <p>ITEM 1. BUSINESS</p><p>We make devices and sell them worldwide with many partners.</p>
      <p>ITEM 1A. RISK FACTORS</p>
      <p>Cybersecurity risks could materially harm our business and reputation over time.</p>
      <p>Supply chain disruptions in Asia may impact our ability to meet demand.</p>
      <p>ITEM 1B. UNRESOLVED STAFF COMMENTS</p>
      <p>None.</p>
      </body></html>
    `;
    const text = htmlToText(html);
    const section = extractSection(text, "Item1A");
    assert.match(section.toLowerCase(), /risk factors/);
    assert.match(section.toLowerCase(), /cybersecurity/);
    assert.equal(section.toLowerCase().includes("unresolved staff"), false);
  });

  it("skips TOC stub and prefers long Item 1A body", () => {
    const text = `Item 1A. Risk Factors 5
Item 1B. Unresolved Staff Comments 12
ITEM 1A. RISK FACTORS
The following summarizes factors that could harm operations including pandemic disruptions and competition pressures across markets worldwide for several years.
ITEM 1B. UNRESOLVED STAFF COMMENTS
None.`;
    const section = extractSection(text, "Item1A");
    assert.match(section, /pandemic/i);
    assert.ok(section.length > 100);
  });
});

describe("diff engine", () => {
  it("detects added and removed paragraphs", () => {
    const older = `
Cybersecurity risks could materially affect operations and customer trust worldwide.

Competition in consumer electronics remains intense and pricing pressure continues.
`.trim();
    const newer = `
Cybersecurity risks could materially affect operations and customer trust worldwide.

Artificial intelligence product liability and copyright claims may increase over time.
`.trim();
    const changes = diffSections({
      olderText: older,
      newerText: newer,
      olderCitation: {
        label: "OLD",
        url: "https://www.sec.gov/Archives/edgar/data/1/a/old.htm",
      },
      newerCitation: {
        label: "NEW",
        url: "https://www.sec.gov/Archives/edgar/data/1/a/new.htm",
      },
    });
    assert.equal(changes.some((c) => c.type === "added"), true);
    assert.equal(changes.some((c) => c.type === "removed"), true);
    for (const c of changes) {
      assert.ok(c.citations.length > 0);
      assert.match(c.citations[0]!.url, /sec\.gov/);
    }
  });

  it("grounds claims with excerpts", () => {
    const hits = scoreClaimAgainstText(
      "The company faces cybersecurity threats",
      `
We face significant cybersecurity threats that could disrupt our systems and harm customers.

Climate-related regulation may increase compliance costs in multiple jurisdictions.
`,
    );
    assert.ok(hits.length > 0);
    assert.ok(hits[0]!.score > 0);
  });

  it("tokenizes and labels themes", () => {
    assert.ok(tokenize("cybersecurity ransomware privacy breach").size >= 3);
    assert.ok(themeLabel("cybersecurity ransomware privacy breach").length > 0);
  });

  it("splits paragraphs", () => {
    assert.equal(splitParagraphs("short").length, 0);
    assert.equal(
      splitParagraphs(
        "This is a long enough paragraph that should be kept as a unit for diffing purposes and evaluation.\n\nAnother long enough paragraph that should also be retained for clustering and theme extraction.",
      ).length,
      2,
    );
  });
});

describe("methodology", () => {
  it("includes disclaimer", () => {
    const m = getMethodology();
    assert.match(m.disclaimer.toLowerCase(), /not financial advice/);
    assert.match(m.citationPolicy.toLowerCase(), /edgar/);
  });
});
