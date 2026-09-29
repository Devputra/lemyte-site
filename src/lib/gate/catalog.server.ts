// src/lib/gate/catalog.server.ts — builds the public catalog from the database, cached for an hour.
// Papers = active, non-demo PRACTICE tests titled "GATE <year> …" (generated topic sets are excluded,
// matching /api/gate/tests). Prices come from gate.plans, so marketing pages never drift from checkout.
import "server-only";
import { unstable_cache } from "next/cache";

import type { Catalog, CatalogSubject } from "@/lib/gate/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaperRow = {
  title: string;
  subjects: { code: string; name: string } | null;
  test_version_questions: { count: number }[];
};

async function loadCatalog(): Promise<Catalog> {
  const db = supabaseAdmin.schema("gate");
  const [papersRes, plansRes] = await Promise.all([
    db
      .from("test_versions")
      .select("title, subjects(code, name), test_version_questions(count)")
      .eq("kind", "PRACTICE")
      .eq("is_active", true)
      .eq("is_demo", false)
      .like("title", "GATE %")
      .not("description", "ilike", "[adhoc-topic-practice]%")
      .returns<PaperRow[]>(),
    db.from("plans").select("name, duration_months, price_inr").eq("is_active", true).order("duration_months"),
  ]);
  if (papersRes.error) throw papersRes.error;
  if (plansRes.error) throw plansRes.error;

  const bySubject = new Map<string, CatalogSubject & { yearList: number[] }>();
  const papers: Catalog["papers"] = [];
  for (const row of papersRes.data ?? []) {
    const year = Number(row.title.match(/GATE (\d{4})/)?.[1]);
    if (!row.subjects || !year) continue;
    const { code, name } = row.subjects;
    const s = bySubject.get(code) ?? { code, name, questions: 0, papers: 0, years: "", yearList: [] };
    s.questions += row.test_version_questions[0]?.count ?? 0;
    s.papers += 1;
    s.yearList.push(year);
    bySubject.set(code, s);
    papers.push({ year, code });
  }

  const subjects = [...bySubject.values()]
    .map(({ yearList, ...s }) => ({ ...s, years: `${Math.min(...yearList)}–${Math.max(...yearList)}` }))
    .sort((a, b) => b.questions - a.questions);
  const plans = (plansRes.data ?? []).map((p) => ({ name: p.name, months: p.duration_months, priceInr: p.price_inr }));

  return {
    subjects,
    papers: papers.sort((a, b) => b.year - a.year || a.code.localeCompare(b.code)),
    totals: {
      questions: subjects.reduce((n, s) => n + s.questions, 0),
      papers: papers.length,
      subjects: subjects.length,
    },
    plans,
    fromInr: Math.min(...plans.map((p) => p.priceInr)),
  };
}

export const getCatalog = unstable_cache(loadCatalog, ["gate-catalog"], { revalidate: 3600 });
