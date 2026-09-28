"""Print PDF stem text (before options) + row type/figure count for given questions.
    python3 showpdf.py <CODE> q1,q2,... [offset]"""
import common as c, json, re, sys
code = sys.argv[1]; qs = [int(x) for x in sys.argv[2].split(",")]; off = int(sys.argv[3]) if len(sys.argv) > 3 else 0
pdf = json.load(open(f"{c.workdir(code)}/pdf_text.json"))
rows = {int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1)): r
        for r in c.get(f"question_versions?pyq_paper_code=eq.{code}&select=markdown_content,type,options_array")}
for q in qs:
    t = pdf.get(str(q - off if off and q > 10 else q), "")
    t = re.sub(r"GATE 20\d\d.*?Civil Engineering.*?(CE-?\s?\d|Set-?\s?\d)\)?|Organi[sz]ing Institute:? IIT \w+|Page \d+ of \d+|Civil Engineering \(CE\d?\)", "", t)
    stem = re.split(r"\s\(A\)\s", t, 1)[0]
    r = rows[q]
    print(f"Q{q} [{r['type']}, figs={r['markdown_content'].count('gate-media://')}]: {stem.strip()[:800]}")
