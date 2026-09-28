"""Rename a paper's linked images to the convention gate_pyq_<year>[_set-n]_<SUBJ>_<TOPIC>_qNN_<part>.v1.png
using each row's topic code (GA-* → GA). Copies in S3 (old keys stay: no delete permission), renames the local
file, and rewrites the links in markdown_content / options_array. DRAFT rows only.

    python3 renameimgs.py <CODE> [--dry]
"""
import json
import os
import re
import sys

from common import BUCKET, QUESTIONS_ROOT, aws, get, patch, workdir

code = sys.argv[1]; dry = "--dry" in sys.argv
meta = json.load(open(os.path.join(workdir(code), "meta.json")))
folder = meta["folder"]
local = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
topics = {t["id"]: t["code"] for t in json.load(open(os.path.join(workdir(code), "topics.json")))}
pat = re.compile(r"(gate_pyq_\d{4}(?:_set-\d)?_[A-Z]+)_([A-Z]+)_q(\d+)([a-z]?_[a-z\-]+)\.v1\.png")
done = {}
for r in get(f"question_versions?pyq_paper_code=eq.{code}&select=id,status,markdown_content,options_array,topic_id"):
    q = int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1))
    tok = topics[r["topic_id"]]; tok = "GA" if tok.startswith("GA-") else tok
    blob = r["markdown_content"] + json.dumps(r["options_array"] or [])
    ren = {}
    for m in {m.group(0): m for m in pat.finditer(blob)}.values():
        new = f"{m.group(1)}_{tok}_q{q:02d}{m.group(4)}.v1.png"
        if new != m.group(0):
            ren[m.group(0)] = new
    if not ren:
        continue
    print(f"Q{q}: " + ", ".join(f"{a.split('_q')[0][-6:]}…q{a.split('_q')[1][:2]}→{b.split('_')[-3]}_q{q:02d}" for a, b in ren.items()))
    if dry:
        continue
    assert r["status"] == "DRAFT"
    for old, new in ren.items():
        if old not in done:
            res = aws("s3", "cp", f"s3://{BUCKET}/{folder}/{old}", f"s3://{BUCKET}/{folder}/{new}")
            assert res.returncode == 0, res.stderr
            if os.path.exists(os.path.join(local, old)):
                os.rename(os.path.join(local, old), os.path.join(local, new))
            done[old] = new
    md = r["markdown_content"]; opts = json.dumps(r["options_array"]) if r["options_array"] else None
    for old, new in ren.items():
        md = md.replace(old, new)
        opts = opts.replace(old, new) if opts else opts
    body = {"markdown_content": md}
    if opts:
        body["options_array"] = json.loads(opts)
    patch(f"question_versions?id=eq.{r['id']}", body)
print("renamed", len(done), "(dry)" if dry else "")
