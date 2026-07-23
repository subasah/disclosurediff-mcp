/**
 * 8-K item code → human event type (partial map of common items).
 */
export const EIGHT_K_ITEMS: Record<string, string> = {
  "1.01": "Entry into Material Agreement",
  "1.02": "Termination of Material Agreement",
  "1.03": "Bankruptcy or Receivership",
  "2.01": "Completion of Acquisition/Disposition",
  "2.02": "Results of Operations and Financial Condition",
  "2.03": "Creation of Direct Financial Obligation",
  "2.04": "Triggering Events for Financial Obligation",
  "2.05": "Costs Associated with Exit/Disposal",
  "2.06": "Material Impairments",
  "3.01": "Notice of Delisting or Failure to Satisfy Listing Rule",
  "3.02": "Unregistered Sales of Equity Securities",
  "3.03": "Material Modification to Rights of Security Holders",
  "4.01": "Changes in Registrant's Certifying Accountant",
  "4.02": "Non-Reliance on Previously Issued Financial Statements",
  "5.01": "Changes in Control of Registrant",
  "5.02": "Departure/Election of Directors or Officers",
  "5.03": "Amendments to Articles/Bylaws; Fiscal Year Change",
  "5.07": "Submission of Matters to a Vote of Security Holders",
  "7.01": "Regulation FD Disclosure",
  "8.01": "Other Events",
  "9.01": "Financial Statements and Exhibits",
};

export function parseItemCodes(itemsField: string): string[] {
  if (!itemsField?.trim()) return [];
  return itemsField
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function describeItems(codes: string[]): string[] {
  return codes.map((c) => EIGHT_K_ITEMS[c] || `Item ${c}`);
}
