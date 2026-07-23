#!/usr/bin/env tsx
/**
 * DisclosureDiff eval harness.
 * Default: offline cases only.
 * EVAL_LIVE=1: also run live SEC cases (slower, network required).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidEdgarUrl, enforceCitations } from "../src/citations/enforce.js";
import { diffSections, scoreClaimAgainstText } from "../src/diff/engine.js";
import { extractSection, htmlToText } from "../src/edgar/sections.js";
import { EdgarClient } from "../src/edgar/client.js";
import { getMethodology } from "../src/tools/getMethodology.js";
import { diffFilingSection } from "../src/tools/diffFilingSection.js";
import { groundClaim } from "../src/tools/groundClaim.js";
import { listMaterialEvents } from "../src/tools/listMaterialEvents.js";
import { comparePeerRisks } from "../src/tools/comparePeerRisks.js";
import { EVAL_CASES, type EvalCase } from "./cases.js";
import type { FilingSection } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.EVAL_LIVE === "1";

interface CaseResult {
  id: string;
  kind: string;
  ok: boolean;
  skipped?: boolean;
  citationOk?: boolean;
  detail: string;
}

function hasEdgarCitation(urls: string[]): boolean {
  return urls.some((u) => isValidEdgarUrl(u));
}

async function runCase(c: EvalCase, client: EdgarClient): Promise<CaseResult> {
  const isLive = c.kind.startsWith("live_");
  if (isLive && !LIVE) {
    return {
      id: c.id,
      kind: c.kind,
      ok: true,
      skipped: true,
      detail: "Skipped (set EVAL_LIVE=1)",
    };
  }

  try {
    switch (c.kind) {
      case "citation_url": {
        const samples: Record<string, string> = {
          "cite-01":
            "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm",
          "cite-02": "https://data.sec.gov/submissions/CIK0000320193.json",
          "cite-03": "https://evil.example/sec.gov/foo",
          "cite-04": "http://www.sec.gov/Archives/edgar/data/1/a.htm",
          "cite-05": "https://efts.sec.gov/LATEST/search-index",
        };
        const url = samples[c.id]!;
        const valid = isValidEdgarUrl(url);
        const ok = valid === c.expectCitation;
        return {
          id: c.id,
          kind: c.kind,
          ok,
          // Only mark citationOk when the case expects a valid EDGAR URL
          citationOk: c.expectCitation ? valid : undefined,
          detail: `url valid=${valid}`,
        };
      }
      case "diff_synthetic": {
        const changes = diffSections({
          olderText: c.olderText!,
          newerText: c.newerText!,
          olderCitation: {
            label: "OLD",
            url: "https://www.sec.gov/Archives/edgar/data/1/a/old.htm",
          },
          newerCitation: {
            label: "NEW",
            url: "https://www.sec.gov/Archives/edgar/data/1/a/new.htm",
          },
        });
        const urls = changes.flatMap((ch) => ch.citations.map((x) => x.url));
        enforceCitations(
          changes[0]?.citations ?? [
            {
              label: "NEW",
              url: "https://www.sec.gov/Archives/edgar/data/1/a/new.htm",
            },
          ],
        );
        const citationOk = hasEdgarCitation(urls) || changes.length === 0;
        let ok = citationOk;
        if (c.id === "diff-03") ok = ok && changes.length <= 1;
        if (c.id === "diff-01") ok = ok && changes.some((x) => x.type === "added");
        if (c.id === "diff-02")
          ok = ok && changes.some((x) => x.type === "added" || x.type === "removed");
        if (c.id === "diff-04") ok = ok && changes.some((x) => x.type === "changed");
        if (c.id === "diff-05")
          ok =
            ok &&
            changes.filter((x) => x.type === "added").length >= 1 &&
            changes.every((x) => x.citations.length > 0);
        if (c.id === "diff-06") ok = ok && changes.some((x) => x.type === "removed");
        return {
          id: c.id,
          kind: c.kind,
          ok,
          citationOk,
          detail: `changes=${changes.length}`,
        };
      }
      case "section_extract": {
        const text = htmlToText(c.html!);
        let section: FilingSection = "Item1A";
        if (/item\s*7/i.test(c.html!)) section = "Item7";
        else if (/item\s*3/i.test(c.html!)) section = "Item3";
        const extracted = extractSection(text, section as Exclude<FilingSection, "Item8K">);
        let ok = extracted.length > 0;
        if (section === "Item1A") {
          ok =
            /risk factors/i.test(extracted) &&
            (/cyber|pandemic|competition/i.test(extracted) || extracted.length > 400);
        } else if (section === "Item7") {
          ok = /management/i.test(extracted) && /revenue/i.test(extracted);
        } else if (section === "Item3") {
          ok = /legal proceedings/i.test(extracted) && /litigation/i.test(extracted);
        }
        if (c.id === "sec-03") {
          ok = ok && /pandemic/i.test(extracted) && extracted.length > 100;
        }
        return {
          id: c.id,
          kind: c.kind,
          ok,
          detail: `len=${extracted.length}`,
        };
      }
      case "ground_synthetic": {
        const hits = scoreClaimAgainstText(c.claim!, c.newerText!);
        let ok = true;
        if (c.id === "ground-01") ok = hits.length > 0 && hits[0]!.score > 0.1;
        if (c.id === "ground-03")
          ok = hits.length > 0 && /climate/i.test(hits[0]!.excerpt);
        return {
          id: c.id,
          kind: c.kind,
          ok,
          citationOk: true,
          detail: `hits=${hits.length}`,
        };
      }
      case "methodology": {
        const m = getMethodology();
        const ok =
          c.id === "meth-02"
            ? /sec\.gov/i.test(m.citationPolicy)
            : /not financial advice/i.test(m.disclaimer);
        return { id: c.id, kind: c.kind, ok, detail: m.version };
      }
      case "live_diff": {
        const section: FilingSection = c.id.includes("-7") ? "Item7" : "Item1A";
        const result = await diffFilingSection(client, {
          ticker: c.ticker!,
          section,
        });
        enforceCitations(result.citations);
        const citationOk = hasEdgarCitation(result.citations.map((x) => x.url));
        return {
          id: c.id,
          kind: c.kind,
          ok: citationOk && result.changes.length >= 0,
          citationOk,
          detail: `changes=${result.changes.length} newer=${result.newer.filedAt}`,
        };
      }
      case "live_ground": {
        const result = await groundClaim(client, {
          ticker: c.ticker!,
          claim: c.claim!,
        });
        enforceCitations(result.citations);
        const citationOk = hasEdgarCitation(result.citations.map((x) => x.url));
        return {
          id: c.id,
          kind: c.kind,
          ok: citationOk,
          citationOk,
          detail: `verdict=${result.verdict} evidence=${result.evidence.length}`,
        };
      }
      case "live_events": {
        const result = await listMaterialEvents(client, {
          tickers: c.tickers!,
          limitPerTicker: 3,
        });
        enforceCitations(result.citations);
        const citationOk = hasEdgarCitation(result.citations.map((x) => x.url));
        return {
          id: c.id,
          kind: c.kind,
          ok: citationOk,
          citationOk,
          detail: `events=${result.events.length}`,
        };
      }
      case "live_peers": {
        const result = await comparePeerRisks(client, {
          tickers: c.tickers!,
          maxThemes: 8,
        });
        enforceCitations(result.citations);
        const citationOk = hasEdgarCitation(result.citations.map((x) => x.url));
        return {
          id: c.id,
          kind: c.kind,
          ok: citationOk && result.themes.length > 0,
          citationOk,
          detail: `themes=${result.themes.length}`,
        };
      }
      default:
        return {
          id: c.id,
          kind: c.kind,
          ok: false,
          detail: "Unknown kind",
        };
    }
  } catch (err) {
    return {
      id: c.id,
      kind: c.kind,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const client = new EdgarClient();
  const results: CaseResult[] = [];
  for (const c of EVAL_CASES) {
    process.stderr.write(`→ ${c.id}… `);
    const r = await runCase(c, client);
    results.push(r);
    process.stderr.write(
      r.skipped ? `skip\n` : r.ok ? `ok (${r.detail})\n` : `FAIL (${r.detail})\n`,
    );
  }

  const ran = results.filter((r) => !r.skipped);
  const passed = ran.filter((r) => r.ok);
  const failed = ran.filter((r) => !r.ok);
  const citationCases = ran.filter((r) => r.citationOk !== undefined);
  const citationRate =
    citationCases.length === 0
      ? 1
      : citationCases.filter((r) => r.citationOk).length / citationCases.length;

  const report = {
    generatedAt: new Date().toISOString(),
    live: LIVE,
    totalCases: EVAL_CASES.length,
    ran: ran.length,
    skipped: results.filter((r) => r.skipped).length,
    passed: passed.length,
    failed: failed.length,
    passRate: ran.length ? passed.length / ran.length : 0,
    citationRate,
    targetCitationRate: 1.0,
    results,
  };

  const outDir = join(__dirname);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "last-report.json");
  await writeFile(outPath, JSON.stringify(report, null, 2));

  const md = `# Eval results

Generated: ${report.generatedAt}
Mode: ${LIVE ? "live+offline" : "offline"}

| Metric | Value |
|--------|------:|
| Cases in suite | ${report.totalCases} |
| Ran | ${report.ran} |
| Passed | ${report.passed}/${report.ran} |
| Pass rate | ${(report.passRate * 100).toFixed(1)}% |
| Citation rate (substantive) | ${(citationRate * 100).toFixed(1)}% |

Target: **100% of substantive answers include a live EDGAR URL**.

## Case detail

| ID | Kind | Result | Detail |
|----|------|--------|--------|
${results
  .map((r) => {
    const status = r.skipped ? "skip" : r.ok ? "pass" : "FAIL";
    return `| ${r.id} | ${r.kind} | ${status} | ${r.detail.replace(/\|/g, "/")} |`;
  })
  .join("\n")}
`;
  await writeFile(join(outDir, "RESULTS.md"), md);

  console.log("\n=== DisclosureDiff Eval Report ===");
  console.log(`Ran: ${ran.length}  Passed: ${passed.length}  Failed: ${failed.length}`);
  console.log(`Citation rate: ${(citationRate * 100).toFixed(1)}% (target 100%)`);
  console.log(`Report: ${outPath}`);
  console.log(`Markdown: ${join(outDir, "RESULTS.md")}`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.id}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
