// src/lib/gate/question-text.ts
//
// Past-paper rows store the options twice: as "(A) … (D) …" lines at the end of markdown_content
// (so the text reads like the paper) and as options_array (what the exam screen renders as choices).
// On the exam screen and in reports we show only the choices, so strip the trailing option block.

const OPTION_START = /(^|\n)[ \t]*\(A\)(?=\s)/g; // "(A) text" or "(A)" followed by a display formula

/** Remove a trailing "(A) … (B) … (C) … (D) …" block from question markdown. */
export function stripInlineOptions(markdown: string, hasOptions: boolean): string {
  if (!hasOptions || !markdown) return markdown;
  let cut = -1;
  for (const m of markdown.matchAll(OPTION_START)) cut = m.index + m[1].length; // last "(A)" line
  if (cut < 0) return markdown;
  const tail = markdown.slice(cut);
  if (!/\n[ \t]*\(B\)(?=\s)/.test(tail) || !/\n[ \t]*\(C\)(?=\s)/.test(tail) || !/\n[ \t]*\(D\)(?=\s)/.test(tail)) {
    return markdown; // not a full option block (e.g. a list inside the stem)
  }
  return markdown.slice(0, cut).trimEnd() + "\n";
}

/** True when the options carry real text, not just "(A)"-style placeholders (then the stem copy is the only one). */
export function hasRealOptions(options: { markdown?: string | null }[] | null | undefined): boolean {
  return !!options?.length && options.some((o) => !/^\s*\(?[A-Da-d]\)?\s*$/.test(o.markdown ?? ""));
}
