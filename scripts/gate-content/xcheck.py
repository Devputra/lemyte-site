"""Batched cross-check: one Codex call checks a block of questions (saves the ChatGPT usage cap).

    python3 xcheck.py <CODE> [lo hi]          # default 1-65 in 5 even blocks (<=16 questions)
    python3 xcheck.py <CODE> --via groq       # text-only questions via Groq gpt-oss (4 per call)
    python3 xcheck.py <CODE> --figures-only   # Codex only for questions with figures (saves its quota)
    python3 xcheck.py --report <CODE> ...     # print flagged rows from saved results

Live DB rows (any status) -> Codex solves each independently (figures attached), compares with the stored
answer, reviews the explanation and transcription. Results: .gate-work/<CODE>/xcheck_<lo>_<hi>.json.
The official key stays the source of truth; flags are prompts to re-check by hand.
"""
import glob
import json
import os
import re
import subprocess
import sys
import tempfile

from common import get, workdir
from crosscheck import local_images, stored_key

PROMPT = """You are solving GATE exam questions from a question bank, to audit it. For EACH question below:
1. Solve it yourself from the stem, options and figures (figures are attached; each question lists its figure file
   names in attachment order). MCQ: one letter. MSQ: all correct letters, e.g. "A;C". NAT: a number.
2. Note transcription problems: garbled/missing text or data, broken LaTeX, figure not matching the text,
   duplicated/wrong options, a question that cannot be solved as written.
Do not run commands or read files. Your FINAL message must be only a JSON array, one object per question:
{"q": <int>, "my_answer": "<letter(s) or number>", "issues": ["short, specific issue", ...], "confidence": "high"|"medium"|"low"}
"""


def rows(code):
    out = {}
    for r in get(f"question_versions?pyq_paper_code=eq.{code}&select=markdown_content,type,options_array,"
                 "nat_lower_bound,nat_upper_bound,grading_policy,explanation_markdown"):
        m = re.search(r"-Q(\d+)\]", r["markdown_content"])
        if m:
            out[int(m.group(1))] = r
    return out


def run(code, lo, hi):
    w = workdir(code)
    meta = json.load(open(f"{w}/meta.json"))
    R = rows(code)
    done = {int(x["q"]) for f in glob.glob(f"{w}/xcheck_*.json") for x in json.load(open(f))}
    qs = [q for q in range(lo, hi + 1) if q in R and R[q].get("grading_policy") != "MARKS_TO_ALL" and q not in done]
    if FIGURES_ONLY:  # keep Codex's limited quota for questions that need vision; Groq takes the text-only ones
        qs = [q for q in qs if "gate-media://" in R[q]["markdown_content"]]
    imgs, parts = [], []
    for q in qs:
        r = R[q]
        mine = local_images(r["markdown_content"], meta["subj"], meta["year"])
        imgs += mine
        parts.append(f"=== Q{q} ({r['type']}) figures: {[os.path.basename(p) for p in mine] or 'none'}\n"
                     f"{r['markdown_content'].strip()}\n")
    out = os.path.join(w, f"xcheck_{lo}_{hi}.json")
    if not qs:
        return
    if VIA == "groq":  # text-only model: only questions without figures
        keep = [i for i, q in enumerate(qs) if "figures: none" in parts[i].splitlines()[0]]
        qs, parts = [qs[i] for i in keep], [parts[i] for i in keep]
        if not qs:
            json.dump([], open(out, "w"))
            return
    data = None
    for attempt in (1, 2):  # models occasionally return malformed JSON: retry once, then leave the block for a rerun
        if VIA == "groq":
            from ai import chat
            s = chat("groq", PROMPT + "\n\n" + "\n".join(parts), model="openai/gpt-oss-120b", max_tokens=6000)
        else:
            s = codex_run(imgs, parts, code, lo, hi)
        s = re.sub(r"(?s)<think>.*?</think>", "", s)
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s.strip())
        try:
            data = json.loads(s[s.find("["):s.rfind("]") + 1])
            break
        except json.JSONDecodeError:
            print(f"{code} q{lo}-{hi} [{VIA}]: bad JSON (attempt {attempt})", flush=True)
    if data is None:
        return
    for x in data:
        x["via"] = VIA
        if int(x["q"]) in R:
            x["agrees_with_key"] = agrees(R[int(x["q"])], x.get("my_answer"))
    json.dump(data, open(out, "w"), indent=1, ensure_ascii=False)
    bad = [x for x in data if flagged(x)]
    print(f"{code} q{lo}-{hi} [{VIA}]: checked {len(data)}/{len(qs)}, flagged {len(bad)}", flush=True)


def codex_run(imgs, parts, code, lo, hi):
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "out.txt")
        cmd = ["codex", "exec", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "-C", tmp, "-o", raw]
        for p in imgs:
            cmd += ["-i", p]
        p = subprocess.run(cmd + ["-"], input=PROMPT + "\n\n" + "\n".join(parts), capture_output=True, text=True,
                           timeout=3600)
        if not os.path.exists(raw):
            err = (p.stderr or p.stdout)[-300:]
            raise SystemExit(("LIMIT " if "usage limit" in err else "FAIL ") + f"{code} q{lo}-{hi}: {err}")
        return open(raw).read()


def agrees(r, ans):
    """Blind answer vs stored key: MCQ/MSQ letter sets (alternatives accepted), NAT within range (+-1% slack)."""
    ans = str(ans or "").strip()
    if r["type"] == "NAT":
        m = re.search(r"-?\d+(?:\.\d+)?(?:[eE]-?\d+)?", ans.replace(",", ""))
        if not m or r["nat_lower_bound"] is None:
            return r["nat_lower_bound"] is None
        v, lo, hi = float(m.group()), r["nat_lower_bound"], r["nat_upper_bound"]
        slack = max(abs(lo), abs(hi)) * 0.01 + 1e-9
        return lo - slack <= v <= hi + slack
    got = set(re.findall(r"[A-D]", ans.upper()))
    opts = r["options_array"] or []
    key = {o["id"].upper() for o in opts if o.get("is_correct")}
    alt = key | {o["id"].upper() for o in opts if o.get("optional_correct")}
    return got in (key, alt) or (r["type"] == "MCQ" and len(got) == 1 and got <= alt)


def flagged(x):
    return bool(not x.get("agrees_with_key", True) or x.get("issues"))


def report(code):
    R = rows(code)
    res = {}
    for f in sorted(glob.glob(f"{workdir(code)}/xcheck_*.json")):
        for x in json.load(open(f)):
            res[int(x["q"])] = x
    print(f"== {code}: checked {len(res)}, flagged {sum(map(flagged, res.values()))}")
    for q, x in sorted(res.items()):
        if flagged(x):
            print(f"Q{q}: key={stored_key(R[q]) if q in R else '?'} ai={x.get('my_answer')} agree={x.get('agrees_with_key')} "
                  f"conf={x.get('confidence')}")
            for i in x.get("issues", []):
                print("    -", i)


VIA = "codex"
FIGURES_ONLY = False

if __name__ == "__main__":
    if sys.argv[1] == "--report":
        for c in sys.argv[2:]:
            report(c)
    else:
        if "--via" in sys.argv:
            i = sys.argv.index("--via")
            VIA = sys.argv[i + 1]
            del sys.argv[i:i + 2]
        if "--figures-only" in sys.argv:
            FIGURES_ONLY = True
            sys.argv.remove("--figures-only")
        code = sys.argv[1]
        lo, hi = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1, 65)
        per = 4 if VIA == "groq" else 16  # groq free tier: 8k tokens/min
        n = -(-(hi - lo + 1) // per)  # even blocks
        size = -(-(hi - lo + 1) // n)
        for a in range(lo, hi + 1, size):
            b = min(a + size - 1, hi)
            if not os.path.exists(os.path.join(workdir(code), f"xcheck_{a}_{b}.json")):
                run(code, a, b)
