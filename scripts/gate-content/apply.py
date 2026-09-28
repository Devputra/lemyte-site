"""Step 5: apply S3 renames + row updates, then verify DB against key.json and S3.

usage: python3 scripts/gate-content/apply.py GATE2024_EE [--upload]
  --upload  first uploads the local images folder to S3 (for papers where WE made the images)
Only DRAFT rows are updated. Publishing is a separate, explicit step (see playbook).
"""
import json
import os
import re
import sys

from common import BUCKET, QUESTIONS_ROOT, aws, get, patch, s3_names, workdir

code = sys.argv[1]
w = workdir(code)
meta = json.load(open(f"{w}/meta.json"))
folder = meta["folder"]
if "--upload" in sys.argv:
    src = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
    res = aws("s3", "cp", src + "/", f"s3://{BUCKET}/{folder}/", "--recursive", "--exclude", "*", "--include", "*.png",
              "--content-type", "image/png", "--only-show-errors")
    print("upload", "ok" if res.returncode == 0 else res.stderr)
for a, b in json.load(open(f"{w}/copies.json")).items():
    res = aws("s3", "cp", f"s3://{BUCKET}/{folder}/{a}", f"s3://{BUCKET}/{folder}/{b}", "--content-type", "image/png",
              "--metadata-directive", "REPLACE", "--only-show-errors")
    if res.returncode:
        print("COPY FAIL", a, res.stderr[:200])

rows = json.load(open(f"{w}/rows_new.json"))
ok = 0
for r in rows:
    try:
        ok += len(patch(f"question_versions?id=eq.{r['id']}&status=eq.DRAFT", r["update"])) == 1
    except Exception as e:
        print("Q", r["q"], e, getattr(e, "read", lambda: b"")()[:300])
print("updated", ok, "/", len(rows))

after = {r["id"]: r for r in get(f"question_versions?pyq_paper_code=eq.{code}")}
key = json.load(open(f"{w}/key.json"))
qn = lambda x: int(re.search(r"-Q(\d+)\]", x["markdown_content"]).group(1))
mism = [r["q"] for r in rows if any(after[r["id"]][k] != v for k, v in r["update"].items())]
bad = []
for r in after.values():
    k = key[str(qn(r))]
    if r["type"] != k["type"]:
        bad.append((qn(r), "type"))
    elif k["type"] == "NAT" and k["key"] == "MTA":
        if r.get("grading_policy") != "MARKS_TO_ALL" or r["nat_lower_bound"] is not None:
            bad.append((qn(r), "mta"))
    elif k["type"] == "NAT":
        if [r["nat_lower_bound"], r["nat_upper_bound"]] != [float(v) for v in re.findall(r"-?\d+\.?\d*", k["key"])][:2]:
            bad.append((qn(r), "nat"))
    elif k["key"] == "MTA":
        if r["grading_policy"] != "MARKS_TO_ALL":
            bad.append((qn(r), "mta"))
    elif ";".join(o["id"].upper() for o in r["options_array"] if o["is_correct"]) != k["key"].split(" OR ")[0]:
        bad.append((qn(r), "ans"))
s3 = set(s3_names(folder))
refs = {x for r in after.values() for x in re.findall(rf"gate-media://{re.escape(folder)}/([^)\s\"]+)",
                                                        r["markdown_content"] + json.dumps(r["options_array"]))}
print("rows", len(after), "| mismatched", mism, "| key mismatches", bad, "| statuses", {r["status"] for r in after.values()})
print("image refs", len(refs), "| missing in S3", sorted(refs - s3))
