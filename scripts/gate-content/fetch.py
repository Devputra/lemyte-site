"""Step 1: back up a paper's rows and gather context.

usage: python3 scripts/gate-content/fetch.py GATE2024_EE EE 2024 EE/pyq/2024_ee
Writes .gate-work/<CODE>/{rows_before.json, topics.json, s3_names.json} and a backup
db_backup_<CODE>_<date>.json next to the PDFs (<QUESTIONS_ROOT>/<SUBJ>/<YEAR>/).
"""
import datetime
import json
import os
import sys

from common import QUESTIONS_ROOT, get, s3_names, workdir

code, subj, year, folder = sys.argv[1:5]
w = workdir(code)
rows = get(f"question_versions?pyq_paper_code=eq.{code}&order=id")
json.dump(rows, open(f"{w}/rows_before.json", "w"), ensure_ascii=False)
src = os.path.join(QUESTIONS_ROOT, subj, year)
if os.path.isdir(src):
    # Never overwrite an existing backup: the first one is the pre-change original.
    base = f"{src}/db_backup_{code}_{datetime.date.today()}"
    path, n = base + ".json", 1
    while os.path.exists(path):
        n += 1
        path = f"{base}_{n}.json"
    json.dump(rows, open(path, "w"), ensure_ascii=False)
    print("backup:", path)
subjects = {s["code"]: s["id"] for s in get("subjects?select=id,code")}
topics = [t for t in get("topics?select=id,subject_id,code,name,section_kind")
          if t["subject_id"] in (subjects[subj], None)]
json.dump(topics, open(f"{w}/topics.json", "w"))
json.dump(s3_names(folder), open(f"{w}/s3_names.json", "w"))
json.dump(dict(code=code, subj=subj, year=year, folder=folder), open(f"{w}/meta.json", "w"))
print(len(rows), "rows backed up |", len(topics), "topics |", len(json.load(open(f'{w}/s3_names.json'))), "S3 images")
print("topic codes:", " ".join(sorted(t["code"] for t in topics)))
print("PDFs:", os.listdir(src) if os.path.isdir(src) else "MISSING " + src)
