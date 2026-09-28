"""Create placeholder DRAFT rows for a paper that is not in Supabase yet, then snapshot them.

    python3 newrows.py <CODE> <YEAR>

One row per key.json question with valid type/marks/grading/options/NAT bounds and a
"[gate-source-<CODE>-Qnn]" tag; content is filled afterwards by build.py + apply.py.
Topic comes from the first draft_*.json that has the question (else GA-VA / first CORE topic).
Writes rows_before.json. Refuses to run if the paper already has rows.
"""
import glob
import json
import os
import sys
import urllib.request

from common import HEADERS, URL, _open, get, workdir

CREATOR = "a2064829-adc1-450e-9dd9-6893fe5acf7e"
code, year = sys.argv[1], int(sys.argv[2])
w = workdir(code)
meta = json.load(open(f"{w}/meta.json"))
key = {int(k): v for k, v in json.load(open(f"{w}/key.json")).items()}
topics = json.load(open(f"{w}/topics.json"))
TID = {t["code"]: t for t in topics}
subj = get(f"subjects?select=id,name&code=eq.{meta['subj']}")[0]
if get(f"question_versions?select=id&pyq_paper_code=eq.{code}"):
    sys.exit(f"{code} already has rows")
dtopic = {}
for f in sorted(glob.glob(f"{w}/draft_*.json")):
    for x in json.load(open(f)):
        if x.get("topic") in TID:
            dtopic.setdefault(int(x["q"]), x["topic"])
core0 = next(t["code"] for t in topics if t["section_kind"] == "CORE")

rows = []
for q, k in sorted(key.items()):
    t = TID[dtopic.get(q, "GA-VA" if q <= 10 else core0)]
    mta = k["key"] == "MTA"
    r = dict(type=k["type"], marks=k["marks"], difficulty="MEDIUM", status="DRAFT", source_kind="PYQ",
             markdown_content=f"\n[gate-source-{code}-Q{q:02d}]: #\n\n(pending)\n", explanation_markdown="\n(pending)\n",
             subject_tag=subj["name"], subject_id=subj["id"], exam_year=year, pyq_paper_code=code,
             topic_id=t["id"], topic_tag=t["name"], section_kind=t["section_kind"], creator_id=CREATOR,
             grading_policy="MARKS_TO_ALL" if mta else "NORMAL", options_array=None,
             nat_precision=None, nat_lower_bound=None, nat_upper_bound=None)
    if k["type"] == "NAT" and not mta:
        lo, hi = [float(v) for v in __import__("re").findall(r"-?\d+\.?\d*", k["key"])][:2]
        r.update(nat_lower_bound=lo, nat_upper_bound=hi, nat_precision=2)
    elif k["type"] != "NAT":
        ok = set(k["key"].split(" OR ")[0].split(";"))
        r["options_array"] = [{"id": l, "markdown": "(pending)", "is_correct": (not mta and l.upper() in ok) or (mta and l == "a")}
                              for l in "abcd"]
    rows.append(r)

req = urllib.request.Request(f"{URL}/rest/v1/question_versions", data=json.dumps(rows).encode(), method="POST",
                             headers={**HEADERS, "Prefer": "return=representation"})
made = _open(req, tries=1)
json.dump(made, open(f"{w}/rows_before.json", "w"), ensure_ascii=False)
print(code, "inserted", len(made))
