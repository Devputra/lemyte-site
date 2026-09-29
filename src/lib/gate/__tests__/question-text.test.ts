import { describe, expect, it } from "vitest";

import { hasRealOptions, stripInlineOptions } from "../question-text";

const stem = "Which of the following is true?\n\n";
describe("stripInlineOptions", () => {
  it("removes a trailing (A)-(D) block", () => {
    const md = `${stem}(A) one  \n(B) two  \n(C) three  \n(D) four\n`;
    expect(stripInlineOptions(md, true)).toBe("Which of the following is true?\n");
  });
  it("handles options that start on the next line (display maths)", () => {
    const md = `${stem}(A)\n$$x$$\n\n(B)\n$$y$$\n\n(C)\n$$z$$\n\n(D)\n$$w$$\n`;
    expect(stripInlineOptions(md, true)).toBe("Which of the following is true?\n");
  });
  it("keeps the text when there are no choices, or no full block", () => {
    const md = `${stem}(A) one\n(B) two\n`;
    expect(stripInlineOptions(md, true)).toBe(md);
    expect(stripInlineOptions(`${stem}(A) a\n(B) b\n(C) c\n(D) d\n`, false)).toContain("(A) a");
  });
  it("only strips the last block, keeping earlier (A)-style lists in the stem", () => {
    const md = "List:\n(A) p\n(B) q\n(C) r\n(D) s\n\nChoose:\n\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n";
    expect(stripInlineOptions(md, true)).toContain("(D) s");
    expect(stripInlineOptions(md, true)).not.toContain("(A) 1");
  });
});

describe("hasRealOptions", () => {
  it("rejects letter-only placeholders", () => {
    expect(hasRealOptions([{ markdown: "(A)" }, { markdown: "(B)" }])).toBe(false);
    expect(hasRealOptions([{ markdown: "127" }, { markdown: "64" }])).toBe(true);
    expect(hasRealOptions([])).toBe(false);
  });
});
