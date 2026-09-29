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
  "I grew up in Kuruvikarambai, a small village, and studied Electrical and Electronics Engineering at KCG College of Technology in Chennai. After college, I worked as a plumber and electrician for almost two years while preparing for GATE.",
  "Before taking the exam, Amazon called me for an interview. The problem-solving and aptitude skills I had built up for GATE helped me get through it, and I became an Application Engineer. I spent four years there. Later, returning to prepare for GATE helped me land a Quantitative Analyst role at Glencore. I never studied at an IIT, but preparing for GATE changed the course of my life.",
  "Through it all, my companion was a printed book of previous years' questions. Late at night, stuck on a problem, I kept wishing it could answer back: check my attempt, show me why a step works, and tell me what to fix next. Lemyte was born from that wish."
]
};

// Thirukkural 400 — the line that sits behind Lemyte.
export const KURAL = {
  tamil: ["கேடில் விழுச்செல்வம் கல்வி யொருவற்கு", "மாடல்ல மற்றை யவை."],
  english: "Learning is the one wealth that can never be destroyed. Nothing else is true wealth.",
  source: "Thirukkural",
};
