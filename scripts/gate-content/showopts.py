"""Print PDF options text vs DB options for given questions.  python3 showopts.py <CODE> q1,q2"""
import common as c, json, re, sys
code = sys.argv[1]; qs = [int(x) for x in sys.argv[2].split(",")]
pdf = json.load(open(f"{c.workdir(code)}/pdf_text.json"))
rows = {int(re.search(r"-Q(\d+)\]", r["markdown_content"]).group(1)): r
        for r in c.get(f"question_versions?pyq_paper_code=eq.{code}&select=markdown_content,options_array")}
for q in qs:
    t = pdf.get(str(q), "")
    o = (re.split(r"\s\(A\)\s", t, 1) + [""])[1][:500]
    print(f"Q{q} PDF: {o}")
    print(f"    DB : {[o['markdown'] for o in rows[q]['options_array'] or []]}")
