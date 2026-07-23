import { EdgarClient, filingDocumentUrl } from "../edgar/client.js";
import { fetchSubmissions, listFilings, resolveTicker } from "../edgar/resolve.js";
import { describeItems, parseItemCodes } from "../edgar/eightk.js";
import { enforceCitations } from "../citations/enforce.js";
import {
  DISCLAIMER,
  type ListMaterialEventsResult,
  type MaterialEvent,
} from "../types.js";

export interface ListMaterialEventsArgs {
  tickers: string[];
  limitPerTicker?: number;
}

export async function listMaterialEvents(
  client: EdgarClient,
  args: ListMaterialEventsArgs,
): Promise<ListMaterialEventsResult> {
  const tickers = (args.tickers || []).map((t) => t.trim().toUpperCase()).filter(Boolean);
  if (tickers.length === 0) {
    throw new Error("Provide at least one ticker");
  }
  const limit = Math.min(args.limitPerTicker ?? 5, 15);
  const events: MaterialEvent[] = [];

  for (const ticker of tickers) {
    const company = await resolveTicker(client, ticker);
    const submissions = await fetchSubmissions(client, company.cik);
    const filings = listFilings(submissions, ["8-K", "8-K/A"], limit);
    for (const f of filings) {
      const codes = parseItemCodes(f.items);
      const eventTypes = describeItems(codes);
      const url = filingDocumentUrl(
        company.cik,
        f.accessionNumber,
        f.primaryDocument,
      );
      const citation = {
        label: `${company.ticker} ${f.form} (${f.filedAt})`,
        url,
        sectionId: "Item8K",
        accessionNumber: f.accessionNumber,
        form: f.form,
        filedAt: f.filedAt,
        excerpt: eventTypes.join("; ") || "Form 8-K filing",
      };
      events.push({
        ticker: company.ticker,
        form: f.form,
        filedAt: f.filedAt,
        accessionNumber: f.accessionNumber,
        items: codes,
        eventTypes,
        summary:
          eventTypes.length > 0
            ? eventTypes.join("; ")
            : "8-K filed (item codes unavailable in submissions feed)",
        url,
        citation,
      });
    }
  }

  events.sort((a, b) => b.filedAt.localeCompare(a.filedAt));

  let citationList = events.map((e) => e.citation);
  if (citationList.length === 0) {
    // Still return a resolvable EDGAR URL so citation enforcement holds
    const company = await resolveTicker(client, tickers[0]!);
    const submissions = await fetchSubmissions(client, company.cik);
    const any = listFilings(submissions, ["10-K", "8-K", "10-Q"], 1)[0];
    if (!any) {
      throw new Error(`No filings found for ${tickers[0]}`);
    }
    citationList = [
      {
        label: `${company.ticker} latest filing (${any.form})`,
        url: filingDocumentUrl(
          company.cik,
          any.accessionNumber,
          any.primaryDocument,
        ),
        sectionId: "Filing",
        accessionNumber: any.accessionNumber,
        form: any.form,
        filedAt: any.filedAt,
        excerpt: `No 8-K events in the requested window; linked latest ${any.form}.`,
      },
    ];
  }

  const citations = enforceCitations(citationList);

  return {
    tickers,
    events,
    citations,
    disclaimer: DISCLAIMER,
  };
}
