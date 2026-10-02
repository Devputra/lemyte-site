// src/lib/gate/papers.server.ts — the public "past paper" pages (/gate/papers/…).
//
// Each paper page shows facts that are public anyway (structure, topic-wise marks, the official answer
// key) plus a few fully solved sample questions. The rest of the solutions stay behind the paid plans.
// Sample images are served from /gate/papers/media/<sig>/<key>: a stable URL on our own domain (so
// image search can index it) that only this server can mint, keeping the S3 bucket private.
import "server-only";
import { createHmac } from "node:crypto";
import { unstable_cache } from "next/cache";

import { extractCorrectOptionIds, extractOptionalCorrectOptionIds } from "@/lib/gate/options";
import { stripInlineOptions } from "@/lib/gate/question-text";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PaperSummary = {
  slug: string; // gate-2024-ee, gate-2024-cs-set-1
  year: number;
  code: string; // subject code: EE, CS, …
  subject: string; // Electrical Engineering
  set: number | null;
  name: string; // "GATE 2024 EE" / "GATE 2024 CS (Set 1)"
  questions: number;
};

export type PaperQuestion = {
  n: number;
  section: "GA" | "CORE";
  type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  topic: string;
  answer: string; // as printed in the official key
  marksToAll: boolean;
  hasFigure: boolean;
};

export type SampleQuestion = PaperQuestion & {
  markdown: string;
  options: { id: string; markdown: string; correct: boolean }[];
  explanation: string;
};

export type Paper = PaperSummary & { questionList: PaperQuestion[]; samples: SampleQuestion[] };

const MEDIA_RE = /gate-media:\/\/([A-Za-z0-9_./-]+)/g;
const SAMPLE_COUNT = 5;

export function paperSlug(year: number, code: string, set: number | null) {
  return `gate-${year}-${code.toLowerCase()}${set ? `-set-${set}` : ""}`;
}

export function paperName(year: number, code: string, set: number | null) {
  return `GATE ${year} ${code}${set ? ` (Set ${set})` : ""}`;
}

// ---------- public sample images ----------

const mediaKey = () => `public-media:${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
export const mediaSig = (key: string) => createHmac("sha256", mediaKey()).update(key).digest("hex").slice(0, 20);
const publicMediaUrl = (key: string) => `/gate/papers/media/${mediaSig(key)}/${key.replace(/\.png$/i, ".webp")}`;

/** Point gate-media:// references at the public sample-image route, with a descriptive alt text. */
function publish(markdown: string, alt: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\(gate-media:\/\//g, (_, a: string) => `![${/^(figure|option)/i.test(a) || !a ? alt : a}](gate-media://`)
    .replace(MEDIA_RE, (_, key: string) => publicMediaUrl(key));
}

// ---------- loading ----------

type PaperRow = {
  id: string;
  title: string;
  subjects: { code: string; name: string } | null;
  test_version_questions: { count: number }[];
};

async function loadPapers(): Promise<(PaperSummary & { id: string })[]> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("test_versions")
    .select("id, title, subjects(code, name), test_version_questions(count)")
    .eq("kind", "PRACTICE")
    .eq("is_active", true)
    .eq("is_demo", false)
    .like("title", "GATE %")
    .not("description", "ilike", "[adhoc-topic-practice]%")
    .returns<PaperRow[]>();
  if (error) throw error;
  return (data ?? [])
    .flatMap((r) => {
      const year = Number(r.title.match(/GATE (\d{4})/)?.[1]);
      if (!r.subjects || !year) return [];
      const set = Number(r.title.match(/Set (\d)/)?.[1]) || null;
      const { code, name: subject } = r.subjects;
      return [{
        id: r.id,
        slug: paperSlug(year, code, set),
        year,
        code,
        subject,
        set,
        name: paperName(year, code, set),
        questions: r.test_version_questions[0]?.count ?? 0,
      }];
    })
    .sort((a, b) => b.year - a.year || a.code.localeCompare(b.code) || (a.set ?? 0) - (b.set ?? 0));
}

export const getPapers = unstable_cache(loadPapers, ["gate-papers"], { revalidate: 3600 });

type QRow = {
  section: string;
  question_order: number;
  question_versions: {
    type: "MCQ" | "MSQ" | "NAT";
    marks: number;
    markdown_content: string;
    options_array: { id: string; markdown: string }[] | null;
    nat_lower_bound: number | null;
    nat_upper_bound: number | null;
    nat_alt_ranges: [number, number][] | null;
    explanation_markdown: string | null;
    grading_policy: string | null;
    topics: { name: string } | null;
  } | null;
};

const num = (v: number | null) => (v === null ? "" : String(Number(v)));
const range = (lo: number | null, hi: number | null) => (num(lo) === num(hi) ? num(lo) : `${num(lo)} to ${num(hi)}`);

function officialAnswer(q: NonNullable<QRow["question_versions"]>): string {
  if (q.grading_policy === "MARKS_TO_ALL") return "Marks to all";
  if (q.type === "NAT") {
    return [range(q.nat_lower_bound, q.nat_upper_bound), ...(q.nat_alt_ranges ?? []).map(([lo, hi]) => range(lo, hi))].join(" or ");
  }
  const key = extractCorrectOptionIds(q.options_array).map((s) => s.toUpperCase()).sort();
  const optional = extractOptionalCorrectOptionIds(q.options_array).map((s) => s.toUpperCase());
  const main = key.join(", ");
  return optional.length ? `${main} or ${[...key, ...optional].sort().join(", ")}` : main;
}

/** Deterministic pick: 2 aptitude + 3 core questions with real solutions, mixing types and including a figure. */
function pickSamples(rows: { q: PaperQuestion; explanationLen: number }[], seed: number) {
  const good = rows.filter((r) => !r.q.marksToAll && r.explanationLen >= 160);
  const rot = <T,>(xs: T[]) => xs.map((_, i) => xs[(i + seed) % xs.length]);
  const ga = rot(good.filter((r) => r.q.section === "GA")).slice(0, 2);
  const core = rot(good.filter((r) => r.q.section === "CORE"));
  const picked: typeof core = [];
  for (const want of [(r: (typeof core)[0]) => r.q.hasFigure, (r: (typeof core)[0]) => r.q.type === "NAT", (r: (typeof core)[0]) => r.q.type === "MSQ"]) {
    const hit = core.find((r) => want(r) && !picked.includes(r));
    if (hit) picked.push(hit);
  }
  for (const r of core) if (picked.length < SAMPLE_COUNT - ga.length && !picked.includes(r)) picked.push(r);
  return new Set([...ga, ...picked.slice(0, SAMPLE_COUNT - ga.length)].map((r) => r.q.n));
}

async function loadPaper(slug: string): Promise<Paper | null> {
  const summary = (await getPapers()).find((p) => p.slug === slug);
  if (!summary) return null;
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("test_version_questions")
    .select(
      "section, question_order, question_versions(type, marks, markdown_content, options_array, nat_lower_bound, nat_upper_bound, nat_alt_ranges, explanation_markdown, grading_policy, topics(name))",
    )
    .eq("test_version_id", summary.id)
    .order("question_order")
    .returns<QRow[]>();
  if (error) throw error;

  const rows = (data ?? []).flatMap((r, i) => {
    const v = r.question_versions;
    if (!v) return [];
    const q: PaperQuestion = {
      n: r.question_order ?? i + 1,
      section: r.section === "GA" ? "GA" : "CORE",
      type: v.type,
      marks: Number(v.marks),
      topic: v.topics?.name ?? (r.section === "GA" ? "General Aptitude" : summary.subject),
      answer: officialAnswer(v),
      marksToAll: v.grading_policy === "MARKS_TO_ALL",
      hasFigure: v.markdown_content.includes("gate-media://"),
    };
    return [{ q, v, explanationLen: v.explanation_markdown?.length ?? 0 }];
  });

  const chosen = pickSamples(rows, summary.year + summary.code.charCodeAt(0) + (summary.set ?? 0));
  const samples: SampleQuestion[] = rows
    .filter((r) => chosen.has(r.q.n))
    .map(({ q, v }) => {
      const alt = `${summary.name} question ${q.n} (${q.topic})`;
      const correct = new Set(extractCorrectOptionIds(v.options_array));
      const options = (v.options_array ?? []).map((o) => ({
        id: String(o.id).toUpperCase(),
        markdown: publish(o.markdown ?? "", `${alt}, option ${String(o.id).toUpperCase()}`),
        correct: correct.has(o.id),
      }));
      return {
        ...q,
        markdown: publish(
          stripInlineOptions(v.markdown_content, options.length > 0).replace(/^\s*\[gate-source[^\n]*\n/, ""),
          `Figure for ${alt}`,
        ),
        options,
        explanation: publish(v.explanation_markdown ?? "", `Figure for the solution of ${alt}`),
      };
    });

  const { slug: s, year, code, subject, set, name, questions } = summary;
  return { slug: s, year, code, subject, set, name, questions, questionList: rows.map((r) => r.q), samples };
}

export const getPaper = (slug: string) =>
  unstable_cache(() => loadPaper(slug), ["gate-paper", slug], { revalidate: 86400 })();
