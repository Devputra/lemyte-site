"""Create one practice test per published GATE paper (65 questions in official order, 3 hours).

    python3 fullpapers.py [--dry]

Idempotent: skips papers that already have a test with the same title. Tests are PRACTICE / PAID and use a
shared blueprint "GATE full paper (3 hours)". Section: GA for Q1–10, CORE for Q11–65.
"""
import collections
import json
import re
import sys
import urllib.parse
import urllib.request

from common import HEADERS, URL, get

DRY = "--dry" in sys.argv
BLUEPRINT = "GATE full paper (3 hours)"


def post(path, body):
    r = urllib.request.Request(f"{URL}/rest/v1/{path}", data=json.dumps(body).encode(), method="POST",
                               headers={**HEADERS, "Prefer": "return=representation"})
    return json.load(urllib.request.urlopen(r, timeout=60))


bp = get(f"blueprint_profiles?select=id&name=eq.{urllib.parse.quote(BLUEPRINT)}")
if bp:
    bp_id = bp[0]["id"]
elif DRY:
    bp_id = "(new)"
else:
    bp_id = post("blueprint_profiles", {"name": BLUEPRINT, "duration_seconds": 10800, "pass_percent": 25})[0]["id"]

subjects = {s["id"]: s for s in get("subjects?select=id,code,name")}
existing = {t["title"] for t in get("test_versions?select=title")}
rows = get("question_versions?select=id,markdown_content,pyq_paper_code,exam_year,subject_id,section_kind,marks,created_at"
           "&status=eq.PUBLISHED&source_kind=eq.PYQ")
papers = collections.defaultdict(list)
untagged = collections.defaultdict(list)
for r in rows:
    if not r["pyq_paper_code"]:
        continue
    m = re.search(r"-Q(\d+)\]", r["markdown_content"] or "")
    (papers[r["pyq_paper_code"]].append((int(m.group(1)), r)) if m else untagged[r["pyq_paper_code"]].append(r))
# CS/DA rows carry no question number: rebuild GATE's layout (GA first, then core; 1-mark before 2-mark).
for code, rs in untagged.items():
    if code in papers:
        continue
    rs.sort(key=lambda r: (r["section_kind"] != "GA", r["marks"], r["created_at"], r["id"]))
    papers[code] = [(i + 1, r) for i, r in enumerate(rs)]

made = skipped = 0
for code in sorted(papers):
    qs = sorted(papers[code], key=lambda x: x[0])
    nums = [q for q, _ in qs]
    first = qs[0][1]
    subj = subjects[first["subject_id"]]
    set_no = re.search(r"(\d)$", code.replace(f"GATE{first['exam_year']}_{subj['code']}", "")) if code[-1].isdigit() else None
    title = f"GATE {first['exam_year']} · {subj['name']}" + (f" · Set {set_no.group(1)}" if set_no else "")
    if nums != list(range(1, 66)):
        print(f"skip {code}: questions {len(nums)} not Q1–65")
        skipped += 1
        continue
    if title in existing:
        skipped += 1
        continue
    desc = (f"The full official GATE {first['exam_year']} {subj['code']} paper: 65 questions, 100 marks, 3 hours. "
            "Marked with the official answer key, including negative marking.")
    if DRY:
        print("would create", title)
        made += 1
        continue
    tv = post("test_versions", {"blueprint_profile_id": bp_id, "title": title, "description": desc, "is_demo": False,
                                "is_active": True, "kind": "PRACTICE", "access_tier": "PAID",
                                "subject_id": first["subject_id"]})[0]
    post("test_version_questions", [{"test_version_id": tv["id"], "question_version_id": r["id"],
                                     "section": "GA" if r["section_kind"] == "GA" else "CORE", "question_order": q} for q, r in qs])
    made += 1
print(f"created {made}, skipped {skipped}, blueprint {bp_id}")
