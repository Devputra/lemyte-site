"""QA of AI drafts against the PDF text layer: python3 draftcheck.py <CODE> [...]
Per question: share of PDF words (>=4 letters) missing from draft stem+opts (verbatim ~0; >0.25 flagged),
missing questions, invalid topics, option count vs key type, {FIG} use vs figures found by autofig."""
import glob
import json
import os
import re
import sys

from common import QUESTIONS_ROOT, workdir
STOP = {"mechanical", "engineering", "gate", "organizing", "institute", "page", "copyright", "session", "question",
        "paper", "section", "general", "aptitude", "marks", "each", "carry", "mark"}


def words(s):
    s = re.sub(r"\\[a-zA-Z]+", " ", s)
    return [v for v in re.findall(r"[a-z]{4,}", s.lower()) if v not in STOP]

for code in sys.argv[1:]:
    w = workdir(code)
    key = json.load(open(f"{w}/key.json"))
    pdf = json.load(open(f"{w}/pdf_q.json"))
    tc = {t["code"] for t in json.load(open(f"{w}/topics.json"))}
    meta = json.load(open(f"{w}/meta.json"))
    figs = {}  # current crops on disk: tmp_qNN[b]_<part>.png
    for f in glob.glob(os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images", "tmp_q*.png")):
        m = re.match(r"tmp_q(\d+)[a-z]?_(.+)\.png", os.path.basename(f))
        figs.setdefault(int(m.group(1)), set()).add(m.group(2))
    D = {}
    for f in sorted(glob.glob(f"{w}/draft_*.json")):
        for x in json.load(open(f)):
            D[int(x["q"])] = x
    miss = [int(q) for q in key if int(q) not in D]
    probs = []
    for q, x in sorted(D.items()):
        k = key.get(str(q))
        if not k:
            continue
        t = x["stem"] + " " + json.dumps(x.get("opts") or [], ensure_ascii=False)
        pw = words(pdf.get(str(q), ""))
        dw = set(words(t))
        r = round(sum(v not in dw for v in pw) / len(pw), 2) if len(pw) >= 5 else None
        p = []
        if r is not None and r > 0.25:
            p.append(f"text {r}")
        if x.get("topic") not in tc:
            p.append(f"topic {x.get('topic')}")
        o = x.get("opts")
        if (k["type"] == "NAT") != (o is None):
            p.append("opts/type")
        elif isinstance(o, list) and len(o) != 4:
            p.append(f"{len(o)} opts")
        fs = figs.get(q, set())
        if ("{FIG" in x["stem"]) != ("stem" in fs) and figs:
            p.append(f"FIG draft={'{FIG' in x['stem']} crop={'stem' in fs}")
        nimg = (4 if o == "IMG" else sum("{IMG}" in s or s == "IMG" for s in o) if isinstance(o, list) else 0)
        if figs and nimg != sum(v.startswith("option") for v in fs):
            p.append(f"optimg draft={nimg} crop={sum(v.startswith('option') for v in fs)}")
        if p:
            probs.append((q, p))
    print(f"{code}: drafts {len(D)} missing {miss}")
    for q, p in probs:
        print(f"   Q{q}: {'; '.join(p)}")
