// src/lib/gate/catalog.ts — public facts about the GATE question bank and plans (shapes + formatting).
// The data itself comes from the database via getCatalog() in catalog.server.ts.

export type CatalogSubject = { code: string; name: string; questions: number; papers: number; years: string };
export type CatalogPlan = { name: string; months: number; priceInr: number };

export type Catalog = {
  subjects: CatalogSubject[]; // biggest question bank first
  papers: { year: number; code: string }[]; // newest first
  totals: { questions: number; papers: number; subjects: number };
  plans: CatalogPlan[]; // shortest first
  fromInr: number; // cheapest plan price
};

export const fmtInt = (n: number) => n.toLocaleString("en-IN");
export const fmtInr = (n: number) => `₹${fmtInt(n)}`;
