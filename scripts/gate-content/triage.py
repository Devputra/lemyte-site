"""Step 2b: triage a paper before transcribing (see playbook 'Triage first').

usage: python3 scripts/gate-content/triage.py <CODE> <questions.pdf> [--ga-offset]
Needs key.json in .gate-work/<CODE>/. Prints answer/type/NAT mismatches vs key, stems deviating from the
PDF text, image refs missing in / unused from S3, and weak explanations. Writes audit.txt with full rows.
"""
import json, re, sys
import fitz
from common import workdir
import gatepdf as G

code, pdfpath = sys.argv[1:3]
w = workdir(code)
meta = json.load(open(f"{w}/meta.json"))
rows = json.load(open(f"{w}/rows_before.json"))
key = json.load(open(f"{w}/key.json"))
s3 = set(json.load(open(f"{w}/s3_names.json")))
tp = {t["id"]: t["code"] for t in json.load(open(f"{w}/topics.json"))}
qn = lambda x: int(m.group(1)) if (m := re.search(r"-Q(\d+)\]", x["markdown_content"])) else None
by = {qn(r): r for r in rows}
print("qnums ok:", sorted(q for q in by if q) == list(range(1, len(key) + 1)), "| rows", len(rows), "| key", len(key))
pdf = G.question_text(fitz.open(pdfpath))
json.dump(pdf, open(f"{w}/pdf_text.json", "w"), ensure_ascii=False)
print("pdf questions found:", len(pdf))
issues = {}
def add(q, s): issues.setdefault(q, []).append(s)
for q, r in sorted(by.items()):
    k = key.get(str(q))
    if not k: add(q, "NO KEY"); continue
    if r["type"] != k["type"]: add(q, f"type {r['type']}->{k['type']}")
    if k["key"].startswith("MTA"):
        if r["grading_policy"] != "MARKS_TO_ALL": add(q, "should be MTA")
    elif k["type"] == "NAT":
        rng = [float(v) for v in re.findall(r"-?\d+\.?\d*", k["key"])][:2]
        if [r["nat_lower_bound"], r["nat_upper_bound"]] != rng: add(q, f"NAT {r['nat_lower_bound']}..{r['nat_upper_bound']} key {k['key']}")
    else:
        got = ";".join(o["id"].upper() for o in (r["options_array"] or []) if o.get("is_correct"))
        if got != k["key"].split(" OR ")[0]: add(q, f"ANS {got or '-'} key {k['key']}")
    md = r["markdown_content"]
    if re.match(r"\s*\[gate-source[^\]]*\]: #[ \t]*\S", md): add(q, "inline tag")
    if re.search(r"PENDING|BLOCK_PUBLISH", md) or "[pending]" in json.dumps(r["options_array"]): add(q, "PENDING")
    stem = re.sub(r"\$[^$]*\$", "", re.sub(r"\[gate-source[^\]]*\]: #|!\[[^\]]*\]\([^)]*\)", "", md)).lower()
    p = re.sub(r"\(A\).*", "", pdf.get(str(q), ""), flags=re.S)
    words = re.findall(r"[A-Za-z]{4,}", p)
    miss = [x for x in words if x.lower() not in stem and x not in ("Electrical", "Engineering", "Electronics", "Communication", "Civil", "Aerospace")]
    if words and len(miss) / len(words) > 0.05: add(q, f"stem differs {len(miss)}/{len(words)}: {' '.join(miss[:8])}")
    e = (r["explanation_markdown"] or "").strip()
    if len(e) < 60 or re.search(r"Official key|Wait|depends on the|pending|stem not|figure-dependent", e, re.I): add(q, f"weak expl ({len(e)})")
    st = re.findall(r"\*\*Options?\s*([A-D](?:[, and]+[A-D])*)\*\*", e)
    if k["type"] != "NAT" and st and not k["key"].startswith("MTA") and ";".join(sorted(set(re.findall(r"[A-D]", st[-1])))) != k["key"].split(" OR ")[0]:
        add(q, "EXPL states wrong answer")
folder = meta["folder"]
refs = {}
for q, r in by.items():
    for f in re.findall(rf"gate-media://([^)\s\"]+)", r["markdown_content"] + json.dumps(r["options_array"])):
        refs.setdefault(q, []).append(f)
flat = {f for v in refs.values() for f in v}
print("image refs:", len(flat), "| outside folder:", sorted(f for f in flat if not f.startswith(folder + "/"))[:5])
print("refs missing in S3:", sorted(f.split("/")[-1] for f in flat if f.split("/")[-1] not in s3))
print("S3 unused:", sorted(s3 - {f.split("/")[-1] for f in flat}))
for q in sorted(issues): print(f"Q{q} [{tp.get(by[q]['topic_id'])}]", "; ".join(issues[q]))
with open(f"{w}/audit.txt", "w") as out:
    for q, r in sorted(by.items()):
        k = key.get(str(q), {})
        out.write(f"### Q{q} {k.get('type')} key={k.get('key')} topic={tp.get(r['topic_id'])} {issues.get(q, '')}\n"
                  f"STEM: {re.sub(r'.gate-source[^#]*#', '', r['markdown_content']).strip()[:600]}\n"
                  f"OPTS: {' | '.join(str(o.get('markdown')) for o in (r['options_array'] or []))[:300]}\n"
                  f"EXPL: {(r['explanation_markdown'] or '').strip()[:500]}\n\n")
