// src/lib/gate/catalog.ts — public facts about the GATE question bank, shown on marketing pages.
// Counts are PUBLISHED past-paper (source_kind=PYQ) questions in Supabase, excluding original mock papers.
// Update when papers are added (scripts/gate-content: count question_versions by subject_tag).
export const GATE_SUBJECTS = [
  { code: "CS", name: "Computer Science & IT", questions: 1495, papers: 23, years: "2014–2026" },
  { code: "CE", name: "Civil Engineering", questions: 910, papers: 14, years: "2020–2026" },
  { code: "ME", name: "Mechanical Engineering", questions: 650, papers: 10, years: "2020–2026" },
  { code: "EC", name: "Electronics & Communication", questions: 455, papers: 7, years: "2020–2026" },
  { code: "EE", name: "Electrical Engineering", questions: 455, papers: 7, years: "2020–2026" },
  { code: "AE", name: "Aerospace Engineering", questions: 455, papers: 7, years: "2020–2026" },
  { code: "DA", name: "Data Science & AI", questions: 195, papers: 3, years: "2024–2026" },
] as const;

export const GATE_TOTALS = {
  questions: GATE_SUBJECTS.reduce((n, s) => n + s.questions, 0),
  papers: GATE_SUBJECTS.reduce((n, s) => n + s.papers, 0),
  subjects: GATE_SUBJECTS.length,
  years: "2014–2026",
};

export const fmtInt = (n: number) => n.toLocaleString("en-IN");
