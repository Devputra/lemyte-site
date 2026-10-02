"""Mark past questions whose topic is no longer in the GATE 2027 syllabus.

    python3 syllabus2027.py find        # keyword candidates -> .gate-work/syllabus2027/candidates.json
    python3 syllabus2027.py classify    # Codex judges each candidate against the full 2027 syllabus -> verdicts.json
    python3 syllabus2027.py report      # what would be marked
    python3 syllabus2027.py apply       # write question_versions.syllabus_note for confirmed questions

The removed topics come from comparing each 2027 syllabus (IIT Madras brochure, Appendix D) with 2026, line by
line (see src/lib/gate/gate2027.ts). Keywords only find candidates; a question is marked only when its main
concept is clearly outside every 2027 syllabus item (e.g. disk *scheduling* stays: "CPU and I/O scheduling").
Syllabus texts: .gate-work/syllabus2027/<SUBJ>_2027.txt. EE, DA and GA are unchanged.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

from common import get, patch

W = os.path.join(os.path.dirname(__file__), "../../.gate-work/syllabus2027")
NOTE = "Not in the GATE 2027 syllabus: {}"

REMOVED = {
    "CS": [
        ("Secondary storage (magnetic disk)", r"\bdisk|\bsector|\bseek time|rotational (latency|delay)|\bcylinder|\bplatter"),
        ("Framing (data link layer)", r"\bframing|bit[- ]stuff|byte[- ]stuff|character stuff"),
        ("Ethernet bridging", r"\bbridge|spanning tree|learning switch"),
        ("Shortest-path and flooding routing", r"\bflooding|dijkstra.*rout|shortest[- ]path rout"),
        ("Classful IP addressing", r"class [abcd] (address|network)|classful|subnet mask|ip address"),
        ("ARP, DHCP and ICMP", r"\barp\b|\bdhcp\b|\bicmp\b|\brarp\b|traceroute|\bping\b"),
        ("UDP", r"\budp\b"),
        ("SMTP, FTP and e-mail protocols", r"\bsmtp\b|\bftp\b|\bpop3?\b|\bimap\b|e-?mail"),
        ("OSI and TCP/IP protocol stacks by name", r"\bosi\b|\bpresentation layer|\bsession layer"),
    ],
    "EC": [
        ("Nonlinear first-order differential equations", r"non-?linear.{0,40}differential|bernoulli.{0,20}equation|riccati|clairaut"),
        ("Discrete-time processing of continuous-time signals", r"discrete-time processing|c/d converter|d/c converter|ideal (c/d|d/c)"),
    ],
    "ME": [
        ("Lagrange's equation", r"lagrang"),
        ("Heisler's charts", r"heisler"),
        ("Testing with the universal testing machine", r"universal testing machine|\butm\b"),
    ],
    "CE": [
        ("Free vibration of undamped SDOF systems", r"natural frequency|free vibration|single degree of freedom|\bsdof\b|spring[- ]mass"),
        ("Prestressed concrete", r"prestress|pre-stress|tendon"),
        ("Plate girders and trusses in steel design", r"plate girder|gantry"),
        ("Dynamic pile formulae", r"engineering news|hiley|dynamic (pile )?formula|pile.{0,40}(hammer|blow|set per blow)"),
        ("Horizontal and vertical curves (surveying)", r"curve.{0,60}(chord|deflection angle|tangent length|rankine|offset|chainage|point of (curvature|intersection))|(simple|compound|reverse|transition) curve"),
        ("Remote sensing and GIS", r"remote sensing|\bgis\b|satellite|spectral|\bndvi\b|raster|vector data"),
    ],
    "AE": [
        ("Laplace transforms", r"laplace transform|\\mathcal\{l\}|inverse laplace"),
        ("Mean value theorem", r"mean value theorem|rolle"),
        ("Contour integrals and residues", r"residue|contour|cauchy'?s integral|laurent|\\oint"),
        ("Three-dimensional stress transformation", r"three-dimensional (state of )?stress|3-?d stress|stress tensor"),
        ("Wind tunnel testing and flow visualisation", r"wind tunnel|schlieren|shadowgraph|hot-?wire|smoke|interferometr|flow visuali"),
        ("Shock-boundary layer interaction", r"shock.{0,30}boundary layer interaction|boundary layer.{0,30}shock"),
        ("Vibration of beams", r"vibration of (a )?beam|beam.{0,40}(natural frequenc|mode shape)|cantilever.{0,40}natural frequenc"),
        ("Airy's stress function", r"airy"),
        ("Characteristics of aircraft structures and materials", r"aluminium alloy|aluminum alloy|composite material|monocoque|semi-?monocoque|stringer"),
        ("Compressor surge and stall", r"\bsurge\b|rotating stall|compressor stall"),
    ],
}

PROMPT = """You are checking GATE past-year questions against the NEW GATE 2027 syllabus.
For each question below, decide whether its MAIN tested concept is no longer covered anywhere in the 2027 syllabus.
Mark a question "out" ONLY if it clearly depends on one of the REMOVED topics and is not covered by any other item
of the 2027 syllabus (e.g. disk *scheduling* is still covered by "CPU and I/O scheduling"; B+ tree file indexing
is still covered by "File organization, indexing"; IPv4 subnetting with CIDR is still covered by "CIDR notation";
highway curve design is still covered by transportation "horizontal and vertical alignments").
If in doubt, answer "in".

Removed topics for this subject:
{removed}

Full GATE 2027 syllabus for this subject:
{syllabus}

Return ONLY a JSON array, one object per question:
[{{"id": "<id>", "verdict": "in" | "out", "removed_topic": "<one of the removed topics, or null>", "reason": "<one sentence>"}}]
"""


def strip_md(s):
    s = re.sub(r"\[gate-source[^\n]*\n", "", s or "")
    return re.sub(r"!\[[^\]]*\]\([^)]*\)", "[figure]", s).strip()


def rows():
    out = []
    for subj in REMOVED:
        out += get(f"question_versions?status=eq.PUBLISHED&pyq_paper_code=like.GATE20*_{subj}*&section_kind=neq.GA"
                   "&select=id,pyq_paper_code,markdown_content,options_array,explanation_markdown,syllabus_note")
    return out


def find():
    cand = []
    for r in rows():
        subj = re.match(r"GATE\d{4}_([A-Z]{2})", r["pyq_paper_code"]).group(1)
        text = " ".join([r["markdown_content"] or "", json.dumps(r["options_array"] or ""), r["explanation_markdown"] or ""]).lower()
        hits = [name for name, pat in REMOVED[subj] if re.search(pat, text)]
        if hits:
            m = re.search(r"-Q0*(\d+)[a-z]?\]", r["markdown_content"] or "")
            q = m.group(1) if m else "0"
            cand.append({"id": r["id"], "code": r["pyq_paper_code"], "q": int(q), "subj": subj, "hits": hits,
                         "text": strip_md(r["markdown_content"])[:1500],
                         "options": [strip_md(o.get("markdown")) for o in (r["options_array"] or [])],
                         "solution": strip_md(r["explanation_markdown"])[:800]})
    json.dump(cand, open(f"{W}/candidates.json", "w"), indent=1, ensure_ascii=False)
    print(len(cand), "candidates")


def codex(prompt):
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "out.txt")
        p = subprocess.run(["codex", "exec", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "-C", tmp,
                            "-o", raw, "-"], input=prompt, capture_output=True, text=True, timeout=3600)
        if not os.path.exists(raw):
            raise SystemExit("codex failed: " + (p.stderr or p.stdout)[-300:])
        s = open(raw).read()
        return json.loads(s[s.find("["):s.rfind("]") + 1])


def classify():
    cand = json.load(open(f"{W}/candidates.json"))
    path = f"{W}/verdicts.json"
    done = json.load(open(path)) if os.path.exists(path) else {}
    for subj in REMOVED:
        todo = [c for c in cand if c["subj"] == subj and c["id"] not in done]
        syllabus = re.sub(r"\s+", " ", open(f"{W}/{subj}_2027.txt").read())
        removed = "\n".join(f"- {n}" for n, _ in REMOVED[subj])
        for i in range(0, len(todo), 12):
            block = todo[i:i + 12]
            parts = [f"=== id: {c['id']} ({c['code']} Q{c['q']}; keyword hits: {', '.join(c['hits'])})\n{c['text']}\n"
                     + "".join(f"({chr(65 + k)}) {o}\n" for k, o in enumerate(c["options"]))
                     + f"Solution: {c['solution']}\n" for c in block]
            out = codex(PROMPT.format(removed=removed, syllabus=syllabus) + "\n\n" + "\n".join(parts))
            for v in out:
                done[v["id"]] = v
            json.dump(done, open(path, "w"), indent=1, ensure_ascii=False)
            print(f"{subj} {i + len(block)}/{len(todo)}: out={sum(1 for v in out if v['verdict'] == 'out')}", flush=True)


def report():
    cand = {c["id"]: c for c in json.load(open(f"{W}/candidates.json"))}
    v = json.load(open(f"{W}/verdicts.json"))
    outs = sorted((cand[i]["code"], cand[i]["q"], x["removed_topic"], x["reason"]) for i, x in v.items() if x["verdict"] == "out")
    for o in outs:
        print(f"{o[0]} Q{o[1]}: {o[2]} — {o[3]}")
    print(len(outs), "out of", len(v), "candidates")


def apply():
    v = json.load(open(f"{W}/verdicts.json"))
    review = json.load(open(f"{W}/reviewed.json")) if os.path.exists(f"{W}/reviewed.json") else {}
    n = 0
    for i, x in v.items():
        verdict = review.get(i, x["verdict"])  # a manual review overrides the model
        note = NOTE.format(x["removed_topic"]) if verdict == "out" and x.get("removed_topic") else None
        patch(f"question_versions?id=eq.{i}", {"syllabus_note": note})
        n += note is not None
    print("marked", n)


if __name__ == "__main__":
    {"find": find, "classify": classify, "report": report, "apply": apply}[sys.argv[1]]()
