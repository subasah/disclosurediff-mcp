import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EdgarClient } from "./client.js";
import { resolveTicker, fetchSubmissions, listFilings } from "./resolve.js";
import { diffFilingSection } from "../tools/diffFilingSection.js";
import { isValidEdgarUrl } from "../citations/enforce.js";

const live = process.env.EVAL_LIVE === "1" || process.env.LIVE_EDGAR === "1";

describe("live EDGAR", { skip: !live }, () => {
  it(
    "resolves AAPL and diffs Item 1A with citations",
    { timeout: 120_000 },
    async () => {
      process.env.SEC_CONTACT_EMAIL =
        process.env.SEC_CONTACT_EMAIL || "contact@example.com";
      const client = new EdgarClient();
      const company = await resolveTicker(client, "AAPL");
      assert.match(company.cik, /^0000320193$/);
      const subs = await fetchSubmissions(client, company.cik);
      const tens = listFilings(subs, ["10-K"], 2);
      assert.ok(tens.length >= 2);

      const result = await diffFilingSection(client, {
        ticker: "AAPL",
        section: "Item1A",
      });
      assert.ok(result.citations.length >= 2);
      for (const c of result.citations) {
        assert.equal(isValidEdgarUrl(c.url), true);
      }
      assert.ok(result.changes.length > 0);
    },
  );
});
