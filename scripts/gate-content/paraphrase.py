"""Paraphrase check: share of the PDF question's words (≥4 letters) missing from the DB row.
    python3 paraphrase.py <CODE> [offset]   (offset 10 when pdf_text.json uses subject numbering 1-55)
Verbatim rows score ~0; > 0.2 means the stem was rewritten. Needs pdf_text.json from triage.py."""
import json, re, sys
import common as c
STOP = {"civil", "engineering", "gate", "organizing", "institute", "page", "copyright", "session", "question",
        "paper", "section", "general", "aptitude", "marks", "each", "carry", "mark"}
def words(s):
    s = re.sub(r"\\[a-zA-Z]+", " ", s)
    return [w for w in re.findall(r"[a-z]{4,}", s.lower()) if w not in STOP]
code = sys.argv[1]; off = int(sys.argv[2]) if len(sys.argv) > 2 else 0
pdf = json.load(open(f"{c.workdir(code)}/pdf_text.json"))
rows = {int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1)): r
        for r in c.get(f"question_versions?pyq_paper_code=eq.{code}&select=markdown_content,options_array")}
res = []
for k, t in pdf.items():
    q = int(k) + (off if int(k) <= 55 and off else 0)
    if q not in rows: continue
    db = set(words(rows[q]["markdown_content"] + json.dumps(rows[q]["options_array"] or [])))
    pw = words(t)
    if pw:
        res.append((q, round(sum(w not in db for w in pw) / len(pw), 2)))
bad = sorted(x for x in res if x[1] > 0.2)
print(f"{code}: checked {len(res)} | paraphrased {len(bad)}: {bad}")
