import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EdgarClient } from "./edgar/client.js";
import { AuditLogger, MetricsHook } from "./infra/cache-audit.js";
import { CitationError } from "./citations/enforce.js";
import { diffFilingSection } from "./tools/diffFilingSection.js";
import { groundClaim } from "./tools/groundClaim.js";
import { listMaterialEvents } from "./tools/listMaterialEvents.js";
import { comparePeerRisks } from "./tools/comparePeerRisks.js";
import { getMethodology } from "./tools/getMethodology.js";
import type { EdgarCitation } from "./types.js";

const SectionSchema = z.enum(["Item1A", "Item1", "Item7", "Item3"]);

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
  };
}

function citationCount(payload: { citations?: EdgarCitation[] }): number {
  return payload.citations?.length ?? 0;
}

export function createDisclosureDiffServer(opts?: {
  client?: EdgarClient;
  audit?: AuditLogger;
  metrics?: MetricsHook;
}): McpServer {
  const client = opts?.client ?? new EdgarClient();
  const audit = opts?.audit ?? new AuditLogger();
  const metrics = opts?.metrics ?? new MetricsHook();

  const server = new McpServer({
    name: "disclosurediff-mcp",
    version: "0.1.0",
  });

  async function runTool<T extends { citations?: EdgarCitation[] } | object>(
    tool: string,
    argsSummary: Record<string, unknown>,
    fn: () => Promise<T>,
  ) {
    const started = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - started;
      const cites =
        result && typeof result === "object" && "citations" in result
          ? citationCount(result as { citations?: EdgarCitation[] })
          : 0;
      await audit.log({
        tool,
        argsSummary,
        ok: true,
        durationMs,
        citationCount: cites,
      });
      await metrics.record({
        type: "tool_call",
        name: tool,
        ok: true,
        meta: { durationMs, citations: cites },
      });
      return textResult(result);
    } catch (err) {
      const durationMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      await audit.log({
        tool,
        argsSummary,
        ok: false,
        durationMs,
        citationCount: 0,
        error: message,
      });
      await metrics.record({
        type: "tool_call",
        name: tool,
        ok: false,
        meta: { durationMs },
      });
      if (err instanceof CitationError) {
        return errorResult(
          new Error(`Citation enforcement failed: ${message}`),
        );
      }
      return errorResult(err);
    }
  }

  server.tool(
    "diff_filing_section",
    "Year-over-year (or multi-year) diff of a 10-K section (Risk Factors, MD&A, Business, Legal). Returns added/removed/changed themes with verbatim excerpts and mandatory EDGAR citations.",
    {
      ticker: z.string().describe("Equity ticker symbol, e.g. AAPL"),
      section: SectionSchema.optional().describe(
        "Filing section to diff. Default Item1A (Risk Factors).",
      ),
      yearsBack: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("How many years back for the older filing (default 1 = YoY)."),
    },
    async (args) =>
      runTool("diff_filing_section", args, () =>
        diffFilingSection(client, args),
      ),
  );

  server.tool(
    "ground_claim",
    "Ground a natural-language claim against the latest 10-K section for a ticker. Returns supporting/contradicting excerpts with EDGAR URLs (anti-hallucination).",
    {
      ticker: z.string().describe("Equity ticker symbol"),
      claim: z.string().describe("Claim to verify against filed disclosures"),
      section: SectionSchema.optional().describe("Section to search (default Item1A)"),
    },
    async (args) =>
      runTool("ground_claim", args, () => groundClaim(client, args)),
  );

  server.tool(
    "list_material_events",
    "List recent Form 8-K material events for one or more tickers with item codes, event types, and EDGAR links.",
    {
      tickers: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe("Tickers to scan for recent 8-K filings"),
      limitPerTicker: z
        .number()
        .int()
        .min(1)
        .max(15)
        .optional()
        .describe("Max 8-K filings per ticker (default 5)"),
    },
    async (args) =>
      runTool("list_material_events", args, () =>
        listMaterialEvents(client, args),
      ),
  );

  server.tool(
    "compare_peer_risks",
    "Cluster risk-factor (or other section) themes across a peer set and show which peers discuss each theme, with cited excerpts.",
    {
      tickers: z
        .array(z.string())
        .min(2)
        .max(8)
        .describe("Peer tickers, e.g. [NVDA, AMD, AVGO]"),
      section: SectionSchema.optional().describe("Section to compare (default Item1A)"),
      maxThemes: z.number().int().min(3).max(25).optional(),
    },
    async (args) =>
      runTool("compare_peer_risks", args, () =>
        comparePeerRisks(client, args),
      ),
  );

  server.tool(
    "get_methodology",
    "Return product methodology, limits, citation policy, rate-limiting notes, and the not-financial-advice disclaimer.",
    {},
    async () =>
      runTool("get_methodology", {}, async () => getMethodology()),
  );

  return server;
}
