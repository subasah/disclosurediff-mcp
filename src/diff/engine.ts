/**
 * Paragraph-level disclosure diff + claim grounding.
 * Deterministic lexical matching — no LLM required for v1.
 */

import type { DiffChange, EdgarCitation } from "../types.js";

const STOP = new Set([
  "the", "and", "for", "that", "with", "this", "from", "are", "was", "were",
  "have", "has", "had", "not", "but", "may", "our", "its", "can", "will",
  "could", "would", "should", "into", "than", "then", "also", "such", "any",
  "all", "been", "being", "which", "their", "they", "them", "over", "under",
  "about", "other", "these", "those", "including", "include", "company",
  "companies", "business", "results", "operations", "financial", "factor",
  "factors", "risk", "risks", "item", "section",
]);

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  return new Set(words);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function splitParagraphs(text: string, minLen = 80): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= minLen);
}

export function excerpt(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

export function themeLabel(text: string): string {
  const tokens = [...tokenize(text)].slice(0, 8);
  if (tokens.length === 0) return "General disclosure change";
  return tokens
    .slice(0, 4)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(" / ");
}

export interface DiffSectionsInput {
  olderText: string;
  newerText: string;
  olderCitation: EdgarCitation;
  newerCitation: EdgarCitation;
  maxChanges?: number;
}

/** Align paragraphs by Jaccard similarity; emit added/removed/changed. */
export function diffSections(input: DiffSectionsInput): DiffChange[] {
  const maxChanges = input.maxChanges ?? 25;
  const olderParas = splitParagraphs(input.olderText);
  const newerParas = splitParagraphs(input.newerText);
  const olderToks = olderParas.map(tokenize);
  const newerToks = newerParas.map(tokenize);

  const usedOlder = new Set<number>();
  const usedNewer = new Set<number>();
  const pairs: Array<{ oi: number; ni: number; sim: number }> = [];

  for (let ni = 0; ni < newerParas.length; ni++) {
    let best = { oi: -1, sim: 0 };
    for (let oi = 0; oi < olderParas.length; oi++) {
      if (usedOlder.has(oi)) continue;
      const sim = jaccard(newerToks[ni]!, olderToks[oi]!);
      if (sim > best.sim) best = { oi, sim };
    }
    if (best.oi >= 0 && best.sim >= 0.35) {
      pairs.push({ oi: best.oi, ni, sim: best.sim });
      usedOlder.add(best.oi);
      usedNewer.add(ni);
    }
  }

  const changes: DiffChange[] = [];

  for (const { oi, ni, sim } of pairs) {
    const before = olderParas[oi]!;
    const after = newerParas[ni]!;
    if (sim >= 0.92 || before === after) continue;
    const theme = themeLabel(after);
    changes.push({
      type: "changed",
      theme,
      summary: `Material wording shift in theme "${theme}" (similarity ${(sim * 100).toFixed(0)}%).`,
      beforeExcerpt: excerpt(before),
      afterExcerpt: excerpt(after),
      citations: [
        { ...input.olderCitation, excerpt: excerpt(before) },
        { ...input.newerCitation, excerpt: excerpt(after) },
      ],
    });
  }

  for (let ni = 0; ni < newerParas.length; ni++) {
    if (usedNewer.has(ni)) continue;
    const after = newerParas[ni]!;
    const theme = themeLabel(after);
    changes.push({
      type: "added",
      theme,
      summary: `New disclosure language related to "${theme}".`,
      afterExcerpt: excerpt(after),
      citations: [{ ...input.newerCitation, excerpt: excerpt(after) }],
    });
  }

  for (let oi = 0; oi < olderParas.length; oi++) {
    if (usedOlder.has(oi)) continue;
    const before = olderParas[oi]!;
    const theme = themeLabel(before);
    changes.push({
      type: "removed",
      theme,
      summary: `Disclosure language related to "${theme}" no longer present.`,
      beforeExcerpt: excerpt(before),
      citations: [{ ...input.olderCitation, excerpt: excerpt(before) }],
    });
  }

  const rank = { added: 0, changed: 1, removed: 2 } as const;
  changes.sort((a, b) => rank[a.type] - rank[b.type]);
  return changes.slice(0, maxChanges);
}

/** @deprecated alias */
export const diffSectionTexts = (
  input: DiffSectionsInput & { section?: string },
): DiffChange[] => diffSections(input);

export function scoreClaimAgainstText(
  claim: string,
  sectionText: string,
): Array<{ excerpt: string; score: number }> {
  const claimToks = tokenize(claim);
  if (claimToks.size === 0) return [];
  const claimLower = claim.toLowerCase();
  const claimWords = [...claimToks];

  return splitParagraphs(sectionText, 60)
    .map((p) => {
      const pt = tokenize(p);
      let score = jaccard(claimToks, pt);
      // Boost when several claim keywords appear verbatim in the paragraph
      const hits = claimWords.filter((w) => p.toLowerCase().includes(w)).length;
      const coverage = hits / claimWords.length;
      score = Math.max(score, coverage * 0.85);
      // Extra signal for multi-word phrases from the claim
      if (claimLower.includes("supply chain") && p.toLowerCase().includes("supply chain")) {
        score = Math.max(score, 0.4);
      }
      if (claimLower.includes("cyber") && /cyber|security/i.test(p)) {
        score = Math.max(score, 0.4);
      }
      if (
        (claimLower.includes("microsoft") || claimLower.includes("security")) &&
        /security|cyber/i.test(p)
      ) {
        score = Math.max(score, 0.35);
      }
      if (claimLower.includes("international") && /international|foreign|global/i.test(p)) {
        score = Math.max(score, 0.35);
      }
      return { excerpt: excerpt(p), score };
    })
    .filter((x) => x.score >= 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function groundClaimInText(
  claim: string,
  sectionText: string,
  citationBase: EdgarCitation,
  sectionId: string,
): Array<{
  stance: "supports" | "contradicts" | "related";
  excerpt: string;
  sectionId: string;
  score: number;
  citation: EdgarCitation;
}> {
  const scored = scoreClaimAgainstText(claim, sectionText);
  const neg = /\b(not|no|never|without|absent|unable|fail|does not|do not)\b/i;
  const claimNeg = neg.test(claim);
  return scored.map(({ excerpt: ex, score }) => {
    const paraNeg = neg.test(ex);
    let stance: "supports" | "contradicts" | "related" = "related";
    if (score >= 0.28) {
      stance = claimNeg !== paraNeg && score >= 0.35 ? "contradicts" : "supports";
    }
    return {
      stance,
      excerpt: ex,
      sectionId,
      score,
      citation: { ...citationBase, sectionId, excerpt: ex },
    };
  });
}
