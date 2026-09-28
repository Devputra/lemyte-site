"""Replace only the stem text of rows (keeps tag line, figure links, options block, explanation).

    python3 restem.py <CODE> [--dry]

Reads .gate-work/<CODE>/stems.py: STEMS = {q: r'''verbatim stem with {FIG} where the row's figure(s) go'''}.
{IMG:<file>} inserts an image from the paper's S3 folder (e.g. a figure that was never linked).
{FIG} is filled with the figure lines already in the row (all `![...](gate-media://...)` in the stem part);
if the row has figures and the new stem has no {FIG}, they are appended at the end. Patches DRAFT rows only.
"""
import os
import re
import runpy
import sys

import json

from common import get, patch, workdir

code = sys.argv[1]
dry = "--dry" in sys.argv
STEMS = runpy.run_path(os.path.join(workdir(code), "stems.py"))["STEMS"]
rows = {int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1)): r
        for r in get(f"question_versions?pyq_paper_code=eq.{code}&select=id,status,markdown_content")}
for q, stem in sorted(STEMS.items()):
    r = rows[q]
    md = r["markdown_content"]
    m = re.match(r"(\s*\[gate-source[^\n]*\]: #\n)(.*?)(\n\(A\) .*)?$", md, re.S)
    head, body, opts = m.group(1), m.group(2), m.group(3) or "\n"
    figs = re.findall(r"!\[[^\]]*\]\(gate-media://[^)]+\)", body)
    fig = "\n\n".join(figs)
    new = stem.strip()
    if figs:
        new = new.replace("{FIG}", "\n\n" + fig + "\n\n") if "{FIG}" in new else new + "\n\n" + fig
    else:
        assert "{FIG}" not in new, f"Q{q}: stem expects a figure but the row has none"
    folder = json.load(open(os.path.join(workdir(code), "meta.json")))["folder"]
    new = re.sub(r"\{IMG:([^}]+)\}", lambda m: f"\n\n![Figure for Q{q}](gate-media://{folder}/{m.group(1)})\n\n", new)
    new = re.sub(r"\n{3,}", "\n\n", new).strip()
    md_new = head + "\n" + new + "\n" + (opts if opts.strip() else "")
    if dry:
        print(f"--- Q{q}\n{md_new}")
        continue
    assert r["status"] == "DRAFT", f"Q{q} is {r['status']}"
    n = len(patch(f"question_versions?id=eq.{r['id']}", {"markdown_content": md_new}))
    print(f"Q{q} patched {n}")
