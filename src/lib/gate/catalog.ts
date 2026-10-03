// src/lib/gate/catalog.ts — public facts about the GATE question bank and plans (shapes + formatting).
// The data itself comes from the database via getCatalog() in catalog.server.ts.

export type CatalogSubject = { code: string; name: string; questions: number; papers: number; years: string };
export type CatalogPlan = { name: string; months: number; priceInr: number; endsAt: string | null }; // endsAt: fixed-date plan

export type Catalog = {
  subjects: CatalogSubject[]; // biggest question bank first
  papers: { year: number; code: string }[]; // newest first
  totals: { questions: number; papers: number; subjects: number };
  rankedTests: number; // ranked tests open now or scheduled; 0 means none yet (don't promise one)
  plans: CatalogPlan[]; // shortest first
  fromInr: number; // cheapest plan price
};

/** How to describe ranked tests truthfully: promise them only when one is open or scheduled. */
export const rankedLine = (open: number) =>
  open > 0 ? "Ranked tests with one counted attempt" : "Ranked tests (none scheduled yet; the first will be announced on Lemyte)";

export const fmtInt = (n: number) => n.toLocaleString("en-IN");
export const fmtInr = (n: number) => `₹${fmtInt(n)}`;
