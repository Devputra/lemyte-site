// src/lib/gate/exam-facts.ts — facts about the GATE exam used in public page copy and FAQs.
// Keep each one checkable against the official papers and information brochures.

/** Institute that organised GATE in each year (printed on that year's papers). */
export const ORGANISER: Record<number, string> = {
  2014: "IIT Kharagpur",
  2015: "IIT Kanpur",
  2016: "IISc Bengaluru",
  2017: "IIT Roorkee",
  2018: "IIT Guwahati",
  2019: "IIT Madras",
  2020: "IIT Delhi",
  2021: "IIT Bombay",
  2022: "IIT Kharagpur",
  2023: "IIT Kanpur",
  2024: "IISc Bengaluru",
  2025: "IIT Roorkee",
  2026: "IIT Guwahati",
};

export const PAPER_HOURS = 3;

/** One-line marking rule, true for every paper we carry (MSQ appeared from 2021). */
export const NEGATIVE_MARKING =
  "A wrong MCQ answer costs one-third of its marks (−⅓ for a 1-mark question, −⅔ for a 2-mark question). MSQ and numerical (NAT) questions have no negative marking, and an MSQ earns marks only when every correct option is chosen.";
