// src/lib/gate/question-text.ts
//
// Past-paper rows store the options twice: as "(A) … (D) …" lines at the end of markdown_content
// (so the text reads like the paper) and as options_array (what the exam screen renders as choices).
// On the exam screen and in reports we show only the choices, so strip the trailing option block.

const OPTION_START = /(^|\n)[ \t]*\(A\)[ \t]/g;

/** Remove a trailing "(A) … (B) … (C) … (D) …" block from question markdown. */
export function stripInlineOptions(markdown: string, hasOptions: boolean): string {
  if (!hasOptions || !markdown) return markdown;
  let cut = -1;
  for (const m of markdown.matchAll(OPTION_START)) cut = m.index + m[1].length; // last "(A)" line
  if (cut < 0) return markdown;
  const tail = markdown.slice(cut);
  if (!/\n[ \t]*\(B\)[ \t]/.test(tail) || !/\n[ \t]*\(C\)[ \t]/.test(tail) || !/\n[ \t]*\(D\)[ \t]/.test(tail)) {
    return markdown; // not a full option block (e.g. a list inside the stem)
  }
  return markdown.slice(0, cut).trimEnd() + "\n";
}
