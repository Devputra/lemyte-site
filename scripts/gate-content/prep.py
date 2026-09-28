"""Prepare a new paper for AI drafting: page images + per-question PDF text.

    python3 prep.py <CODE> <SUBJ> <year-dir> <folder> <questions.pdf>

Writes .gate-work/<CODE>/: meta.json, topics.json, pages/pNN.png (zoom 1.4), pdf_q.json {q: text}.
Question numbering: GA 1–10 then subject section; if the subject section restarts at 1, DB q = 10 + n.
"""
import json
import os
import re
import sys

import fitz

from common import QUESTIONS_ROOT, get, workdir

code, subj, ydir, folder, pdfname = sys.argv[1:6]
w = workdir(code)
os.makedirs(os.path.join(w, "pages"), exist_ok=True)
json.dump(dict(code=code, subj=subj, year=ydir, folder=folder), open(os.path.join(w, "meta.json"), "w"))
sid = next(s["id"] for s in get("subjects?select=id,code") if s["code"] == subj)
topics = [t for t in get("topics?select=id,subject_id,code,name,section_kind") if t["subject_id"] in (sid, None)]
json.dump(topics, open(os.path.join(w, "topics.json"), "w"))

d = fitz.open(os.path.join(QUESTIONS_ROOT, subj, ydir, pdfname))
for i, p in enumerate(d):
    p.get_pixmap(matrix=fitz.Matrix(1.4, 1.4)).save(os.path.join(w, "pages", f"p{i + 1:02d}.png"))

text = "\n".join(p.get_text() for p in d)
parts = re.split(r"\n\s*Q\.\s?No\.?\s?(\d+)\s|\n\s*Q\.\s?(\d+)\s", "\n" + text)
qs, off, prev = {}, 0, 0
i = 1
while i < len(parts) - 2:
    n = parts[i] or parts[i + 1]
    body = parts[i + 2]
    i += 3
    if n is None:
        continue
    n = int(n)
    if re.match(r"\s*(–|-|to\b)", body) or re.match(r"\s*(Carry|Multiple|Numerical)", body):
        continue
    if n <= 2 and prev >= 10 and off == 0:  # a real restart goes back to 1 (blocks can be out of order)
        off = 10
    prev = n
    q = n + (off if off else 0)
    qs.setdefault(str(q), re.sub(r"\s+", " ", body).strip())
json.dump(qs, open(os.path.join(w, "pdf_q.json"), "w"), ensure_ascii=False)
print(code, "pages", len(d), "questions with text", len(qs))
