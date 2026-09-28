"""Replace option texts (keeps ids / correctness flags).  Reads .gate-work/<CODE>/opts.py: OPTS = {q: [A, B, C, D]}.
    python3 reopts.py <CODE>"""
import os, re, runpy, sys
from common import get, patch, workdir
code = sys.argv[1]
OPTS = runpy.run_path(os.path.join(workdir(code), "opts.py"))["OPTS"]
rows = {int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1)): r
        for r in get(f"question_versions?pyq_paper_code=eq.{code}&select=id,status,markdown_content,options_array")}
for q, texts in sorted(OPTS.items()):
    r = rows[q]; o = r["options_array"]
    assert r["status"] == "DRAFT" and len(o) == len(texts), f"Q{q}"
    for x, t in zip(o, texts):
        x["markdown"] = t
    md = r["markdown_content"]
    if re.search(r"\n\(A\) ", md):  # rows that also list options in the markdown
        block = "\n" + "  \n".join(f"({x['id'].upper()}) {x['markdown']}" for x in o) + "\n"
        md = re.sub(r"\n\(A\) .*$", lambda _: block, md, flags=re.S)
    print(f"Q{q}", len(patch(f"question_versions?id=eq.{r['id']}", {"options_array": o, "markdown_content": md})))
