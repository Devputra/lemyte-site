// src/lib/about.ts — people and milestones on /about.
//
// FOUNDER DETAILS ARE STILL TO COME. Anything left empty ("" or []) is hidden in production and
// shown as a dashed "fill me" box in development, so a half-finished About page never goes live.
// Photos go in public/images/team/ (square, at least 800×800, a real photo — not an illustration).

export type Person = {
  name: string; // e.g. "Devputra N"
  role: string; // e.g. "Founder & Director"
  photo: string; // e.g. "/images/team/devputra.jpg"
  bio: string; // 2–3 sentences in first person: background, why this problem, what you do day to day
  linkedin?: string;
};

export type Milestone = { when: string; what: string };

export const ABOUT = {
  // Why Lemyte exists, in the founder's own words (one short paragraph). Shown as a pull quote.
  originStory: "",
  people: [] as Person[],
  // Oldest first. Keep every line verifiable; month + year is enough.
  milestones: [
    { when: "2026", what: "DXOCTAGON (OPC) Private Limited is incorporated in Chennai." },
    { when: "June 2026", what: "Our registered office moves to the KCG Innovation Incubation and Entrepreneurship Centre, Chennai." },
    { when: "2026", what: "Lemyte's GATE assessment goes live with official past papers across seven subjects." },
  ] as Milestone[],
};
