"""Strip editor/provenance notes from explanations (DRAFT rows only).
    python3 cleanexpl.py <CODE> [--dry]"""
import re, sys
from common import get, patch
SUBS = [
    (r"\n[ \t]*Source: supplied[^\n]*", ""),
    (r"(?i)the supplied (answer )?key (accepts|gives|selects|lists)", r"the official key \2"),
    (r"(?i)\bsupplied (answer )?key\b", "official key"),
    (r"(?i)\bsupplied question paper\b", "question paper"),
    (r"(?i)\bin the supplied figure\b", "in the figure"),
    (r"(?i)\bsource figure(s)?\b", r"figure\1"),
    (r"(?i)\bsource option ([A-D])\b", r"option (\1)"),
    (r"(?i)\bsource geometry\b", "given geometry"),
    (r"(?i)\s*This (identification|conclusion) (depends on the displayed[^.]*|remains flagged for final crop verification[^.]*)\.", ""),
    (r"(^|[.!?]\s+|\n)the official key", r"\1The official key"),
    (r"\n{3,}", "\n\n"),
]
code = sys.argv[1]; dry = "--dry" in sys.argv
n = 0
for r in get(f"question_versions?pyq_paper_code=eq.{code}&select=id,status,markdown_content,explanation_markdown"):
    e = r["explanation_markdown"] or ""
    new = e
    for a, b in SUBS:
        new = re.sub(a, b, new)
    new = "\n" + new.strip() + "\n"
    if new.strip() != e.strip():
        n += 1
        if dry:
            if n <= 2: print("---", re.search(r"-Q(\d+)\]", r["markdown_content"]).group(0), "\n", new[-300:])
        else:
            assert r["status"] == "DRAFT"
            patch(f"question_versions?id=eq.{r['id']}", {"explanation_markdown": new})
print(code, "changed", n, "(dry)" if dry else "")
