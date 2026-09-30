// src/lib/about.ts — the founder story on /about.
// Keep it short and true: every line here should be something the founder would say out loud.

export type Founder = {
  name: string;
  role: string;
  photo: string; // square, public/images/team/
  linkedin?: string;
  story: string[]; // first person, one paragraph per entry
};

export const FOUNDER: Founder = {
  name: "Devputra",
  role: "Founder & Director",
  photo: "/images/team/devputra.jpg",
  story: [
    "I grew up in Kuruvikarambai and studied Electrical and Electronics Engineering. After college, I worked as a plumber and electrician for almost two years while preparing for competitive exams.",
    "Before I could sit the exams, Amazon called me for an interview. The problem-solving and aptitude skills I had built up while preparing helped me get through it, and I joined as an Application Engineer. I spent four years there, and later joined Glencore as a Quantitative Analyst. Preparing for competitive exams changed the course of my life.",
    "Through it all, my only late-night companion was a thick, dog-eared book of previous years' questions. It was exceptional at telling me what was right: clean formulas, final answers and polished derivations. But late at night, stuck on a problem, I kept wishing for something that could evaluate my attempt, show me where I stood and track my progress. Lemyte was born from that wish.",
  ],
};

// Thirukkural 400 — the line that sits behind Lemyte.
export const KURAL = {
  tamil: ["கேடில் விழுச்செல்வம் கல்வி யொருவற்கு", "மாடல்ல மற்றை யவை."],
  english: "Learning is the one wealth that can never be destroyed. Nothing else is true wealth.",
  source: "Thirukkural",
};
