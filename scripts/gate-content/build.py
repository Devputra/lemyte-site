"""Step 3: turn content.py + key.json + images into row updates.

usage: python3 scripts/gate-content/build.py GATE2024_EE gate_pyq_2024_EE_
  arg2 = image-name prefix before <TOPIC>_qNN (EC: gate_pyq_2024_EC_, CE set 1: gate_pyq_2024_set-1_CE_)
Needs in .gate-work/<CODE>/: content.py (Q dict), key.json, rows_before.json, topics.json, meta.json.
Images are read from <QUESTIONS_ROOT>/<SUBJ>/<YEAR>/images (the user's local copy == S3).
Writes rows_new.json and copies.json (S3 renames to topic-code names).
"""
import collections
import json
import os
import re
import sys

from common import QUESTIONS_ROOT, workdir

code, prefix = sys.argv[1:3]
w = workdir(code)
meta = json.load(open(f"{w}/meta.json"))
ns = {}
exec(open(f"{w}/content.py").read(), ns)
Q = ns["Q"]
cur = json.load(open(f"{w}/rows_before.json"))
key = {int(k): v for k, v in json.load(open(f"{w}/key.json")).items()}
topics = json.load(open(f"{w}/topics.json"))
TID = {t["code"]: t for t in topics}
IMGDIR = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
BASE = f"gate-media://{meta['folder']}/"
qn = lambda r: int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1))
byq = {qn(r): r for r in cur}

up, copies = collections.defaultdict(dict), {}
pat = re.compile(re.escape(prefix) + r"([A-Za-z]+)_q(\d+)([ab]?)_(stem|option-[a-d])\.v1\.png$")
for f in sorted(x for x in os.listdir(IMGDIR) if x.endswith(".png")) if os.path.isdir(IMGDIR) else []:
    m = pat.match(f)
    assert m, f"unexpected image name {f}"
    q = ns.get("FIXQ", {}).get((m.group(1), int(m.group(2))), int(m.group(2)))
    up[q][(m.group(3), m.group(4))] = f

rows, used = [], 0
for q in sorted(Q):
    c, r, k = Q[q], byq[q], key[q]
    tcode = c["topic"]
    tok = "GA" if tcode.startswith("GA-") else tcode
    figs = {}
    for (suf, part), f in up.get(q, {}).items():
        nf = f"{prefix}{tok}_q{q:02d}{suf}_{part}.v1.png"
        figs[(suf, part)] = nf
        if nf != f:
            copies[f] = nf
    stem = c["stem"]
    stems = sorted(k2 for k2 in figs if k2[1] == "stem")
    if "{FIG}" in stem:
        assert stems, f"Q{q} expects figure"
        stem = stem.replace("{FIG}", "".join(
            f"\n\n![Figure{' (' + s + ')' if s else ''} for Q{q}]({BASE}{figs[(s, p)]})" for s, p in stems))
    else:
        assert not stems, f"Q{q} has unused stem image"
    mta = k["key"] == "MTA"
    alt = " OR " in k["key"]
    dbflags = [o.get("is_correct", False) for o in (r["options_array"] or [])] or [False] * 4
    correct = set(k["key"].split(" OR ")[0].split(";")) if k["type"] != "NAT" else set()
    optsrc = ["IMG"] * 4 if c["opts"] == "IMG" else c["opts"]
    opts = None
    if optsrc:
        opts = []
        for i, (l, t) in enumerate(zip("abcd", optsrc)):
            md = f"![Option {l.upper()}]({BASE}{figs[('', 'option-' + l)]})" if t == "IMG" else t
            opts.append({"id": l, "markdown": md, "is_correct": dbflags[i] if mta else l.upper() in correct})
        if alt:  # MSQ "A;D OR A;C;D" / MCQ "B OR D": extra options accepted either way
            extra = set(k["key"].split(" OR ")[1].split(";")) - correct
            for o in opts:
                if o["id"].upper() in extra:
                    o["optional_correct"] = True
        assert sum(t == "IMG" for t in optsrc) == sum(1 for k2 in figs if k2[1].startswith("option")), f"Q{q} option images"
    assert (k["type"] == "NAT") == (not optsrc), f"Q{q} type/options mismatch"
    md = f"\n[gate-source-{code}-Q{q:02d}]: #\n\n{stem}\n"
    if optsrc:
        md += "\n" + "  \n".join(f"({o['id'].upper()}) {o['markdown']}" for o in opts) + "\n"
    t = TID[tcode]
    upd = dict(markdown_content=md, options_array=opts, explanation_markdown="\n" + c["expl"].strip() + "\n",
               topic_id=t["id"], topic_tag=t["name"], type=k["type"], marks=k["marks"],
               section_kind=t["section_kind"], grading_policy="MARKS_TO_ALL" if mta else "NORMAL")
    if k["type"] == "NAT" and mta:  # CHECK qv_nat_fields_complete: MTA NAT rows carry no bounds
        upd.update(nat_lower_bound=None, nat_upper_bound=None, nat_precision=None)
    elif k["type"] == "NAT":  # NAT rows may NOT carry options_array (DB check constraint)
        lo, hi = [float(v) for v in re.findall(r"-?\d+\.?\d*", k["key"])][:2]
        upd.update(nat_lower_bound=lo, nat_upper_bound=hi)
        if r["nat_precision"] is None:
            upd["nat_precision"] = 2
    used += md.count("gate-media://")
    old = next((x["code"] for x in topics if x["id"] == r["topic_id"]), "?")
    rows.append(dict(id=r["id"], q=q, update=upd, old_topic=old, new_topic=tcode,
                     changed=[f for f in upd if upd[f] != r.get(f)]))

json.dump(rows, open(f"{w}/rows_new.json", "w"), ensure_ascii=False)
json.dump(copies, open(f"{w}/copies.json", "w"), indent=0)
print("rows", len(rows), "| topic changes", [(x["q"], x["old_topic"], x["new_topic"]) for x in rows if x["old_topic"] != x["new_topic"]])
print("image refs", used, "| images on disk", sum(len(v) for v in up.values()), "| S3 renames", len(copies))
for a, b in copies.items():
    print("  ", a, "->", b)
print(collections.Counter(f for x in rows for f in x["changed"]))
