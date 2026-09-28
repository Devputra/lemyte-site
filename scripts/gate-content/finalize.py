"""AI drafts -> content.py, and tmp_ crops -> final topic-coded image names.

    python3 finalize.py <CODE> <prefix> [--prune]
      prefix: image-name prefix before <TOPIC>_qNN, e.g. gate_pyq_2021_set-1_ME_
      --prune: delete tmp crops the draft does not ask for (raster papers: text/table/logo bands)

Writes .gate-work/<CODE>/content.py (refuses to overwrite: delete it first to regenerate).
Leaves unknown/unused crops as tmp_ and reports them; build.py fails on tmp_ names, so fix those first.
"""
import glob
import json
import os
import re
import sys

from common import QUESTIONS_ROOT, workdir

code, prefix = sys.argv[1:3]
w = workdir(code)
meta = json.load(open(f"{w}/meta.json"))
img = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
D = {}
for f in sorted(glob.glob(f"{w}/draft_*.json")):
    for x in json.load(open(f)):
        D[int(x["q"])] = x
key = json.load(open(f"{w}/key.json"))
assert set(map(int, key)) <= set(D), f"drafts missing {sorted(set(map(int, key)) - set(D))}"


def mathfix(s):  # KaTeX warns on en/em dashes inside math
    return re.sub(r"\$\$.+?\$\$|\$[^$]+\$", lambda m: m.group(0).replace("–", "-").replace("—", "-"), s, flags=re.S)


def lit(s):
    s = mathfix(s)
    if '"""' not in s and not s.endswith("\\") and not s.endswith('"'):
        return 'r"""' + s + '"""'
    return repr(s)


cp = f"{w}/content.py"
if not os.path.exists(cp):
    out = [f"# {code} — drafted by AI (Codex/Gemini) from the official PDF; checked by draftcheck/build.", "Q = {}", ""]
    for q in sorted(map(int, key)):
        x = D[q]
        if x["stem"].count("{FIG}") > 1:  # several figures in one stem -> {FIG:a}, {FIG:b}, ... (crops qNN, qNNb, ...)
            parts = x["stem"].split("{FIG}")
            x["stem"] = parts[0] + "".join("{FIG:" + "abcdefgh"[i] + "}" + p for i, p in enumerate(parts[1:]))
        o = x.get("opts")
        ol = "None" if o is None else ('"IMG"' if o == "IMG" else "[" + ", ".join(lit(s) for s in o) + "]")
        out.append(f"Q[{q}] = dict(topic={x['topic']!r}, stem={lit(x['stem'].strip())},\n  opts={ol},\n"
                   f"  expl={lit(x['expl'].strip())})\n")
    open(cp, "w").write("\n".join(out))
    print("wrote content.py")
ns = {}
exec(open(cp).read(), ns)
Q = ns["Q"]

want = {}
for q, c in Q.items():
    if "{FIG" in c["stem"]:
        want[(q, "stem")] = True
    o = c["opts"]
    for l, t in zip("abcd", ["IMG"] * 4 if o == "IMG" else (o or [])):
        if t == "IMG" or "{IMG}" in t:
            want[(q, "option-" + l)] = True
left = []
for f in sorted(os.listdir(img)):
    m = re.match(r"tmp_q(\d+)([a-z]?)_(stem|option-[a-d])\.png$", f)
    if not m:
        continue
    q, suf, part = int(m.group(1)), m.group(2), m.group(3)
    if (q, part) not in want:
        if "--prune" in sys.argv:
            os.remove(os.path.join(img, f))
        else:
            left.append(f)
        continue
    t = Q[q]["topic"]
    tok = "GA" if t.startswith("GA-") else t
    os.rename(os.path.join(img, f), os.path.join(img, f"{prefix}{tok}_q{q:02d}{suf}_{part}.v1.png"))
have = {(int(m.group(1)), m.group(2)) for f in os.listdir(img)
        if (m := re.match(re.escape(prefix) + r"[A-Za-z]+_q(\d+)[a-z]?_(stem|option-[a-d])\.v1\.png$", f))}
print("unused crops:", left)
print("figures still needed:", sorted(k for k in want if k not in have))
