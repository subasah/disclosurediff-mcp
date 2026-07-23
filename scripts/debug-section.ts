import { EdgarClient } from "../src/edgar/client.js";
import {
  loadAnnualFilings,
  loadFilingSection,
} from "../src/edgar/sections.js";
import { splitParagraphs } from "../src/diff/engine.js";

async function main() {
  const client = new EdgarClient();
  const { company, filings } = await loadAnnualFilings(client, "AAPL", 2);
  console.log(
    "filings",
    filings.map((f) => ({
      acc: f.accessionNumber,
      doc: f.primaryDocument,
      date: f.filedAt,
    })),
  );
  for (const f of filings.slice(0, 2)) {
    const loaded = await loadFilingSection(
      client,
      company.ticker,
      f,
      "Item1A",
      company.cik,
    );
    console.log("---", f.filedAt);
    console.log("text len", loaded.text.length, "section len", loaded.sectionText.length);
    console.log("paras", splitParagraphs(loaded.sectionText).length);
    console.log("head:", loaded.sectionText.slice(0, 300).replace(/\s+/g, " "));
    const idx = loaded.text.search(/item\s*1a/i);
    console.log(
      "item1a idx",
      idx,
      loaded.text.slice(Math.max(0, idx), idx + 150).replace(/\s+/g, " "),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
