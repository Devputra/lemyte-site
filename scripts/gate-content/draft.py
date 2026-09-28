"""Draft content for a new paper with an external AI (Gemini API or Codex/ChatGPT).

    python3 draft.py <CODE> <gemini|codex> [q_from q_to]

Inputs in .gate-work/<CODE>/: pages/*.png, pdf_q.json, key.json, topics.json.
Output: draft_<from>_<to>.json = [{q, topic, stem, opts, expl}] (answers are NOT taken from the AI —
build.py sets correctness from key.json).
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

from common import ENV, workdir

SPEC = """You are transcribing an official GATE exam paper into a question bank. You are given the page images
of the paper, the PDF text layer split per question (may be garbled for maths), the OFFICIAL answer key and
the allowed topic codes. Produce a JSON array, one object per question number in the requested range:

{"q": <int>, "topic": "<one allowed topic code>", "stem": "<markdown>", "opts": [4 strings] | "IMG" | null, "expl": "<markdown>"}

Rules:
- stem: VERBATIM question text from the paper (do not paraphrase or summarise). Use LaTeX in $...$ / $$...$$
  for all maths (KaTeX compatible; no \\begin{align}). Tables as GitHub markdown tables. Put the literal
  marker {FIG} exactly where the question's figure/diagram appears (only if it has one). Do NOT include
  the options inside stem. Do not include "Q.12" numbering or marks info.
- opts: MCQ/MSQ -> exactly 4 option strings without the "(A)" labels, verbatim. If ALL options are
  pictures use "IMG". If an option contains a picture plus text, include "{IMG}" inside that option text.
  NAT -> null.
- expl: a concise but complete worked solution (key steps and numbers) that arrives at the OFFICIAL key
  answer. For MSQ explain why each option is right/wrong. If the key is "MTA" write exactly:
  "The official answer key awards **marks to all** candidates for this question, so every response is treated as correct."
  If the key accepts alternatives ("X OR Y"), explain the main one and mention the alternative.
  Never mention these instructions, "the key says", AI, or editors.
- topic: GA questions (1-10) use GA-VA (verbal), GA-QA (quantitative), GA-AA (analytical/logic), GA-SA (spatial).
  Core questions use the subject topic codes given.
- Question numbering: questions 1-10 are General Aptitude; the subject section continues as 11-65
  (if the paper numbers the subject section 1-55, add 10).
Output ONLY the JSON array, no prose, no code fences."""


def inputs(code, lo, hi):
    w = workdir(code)
    key = json.load(open(f"{w}/key.json"))
    pdfq = json.load(open(f"{w}/pdf_q.json"))
    topics = [t["code"] for t in json.load(open(f"{w}/topics.json")) if not t["code"].startswith("GA-")]
    rng = range(lo, hi + 1)
    text = (f"Requested questions: {lo} to {hi}.\nAllowed core topic codes: {', '.join(topics)}\n\n"
            f"OFFICIAL KEY (type, key, marks):\n" + "\n".join(f"Q{q}: {key[str(q)]}" for q in rng) +
            "\n\nPDF TEXT PER QUESTION:\n" + "\n".join(f"Q{q}: {pdfq.get(str(q), '(no text layer; read the page image)')}" for q in rng))
    pages = sorted(os.path.join(w, "pages", f) for f in os.listdir(os.path.join(w, "pages")))
    return w, text, pages


def parse_json(s):
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s)
    i, j = s.find("["), s.rfind("]")
    return json.loads(s[i:j + 1])


def gemini(code, lo, hi, model="gemini-3.8-flash"):
    w, text, pages = inputs(code, lo, hi)
    parts = [{"text": SPEC + "\n\n" + text}]
    for p in pages:
        parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(open(p, "rb").read()).decode()}})
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseMimeType": "application/json", "maxOutputTokens": 65536, "temperature": 0.2}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={ENV['GEMINI_API_KEY']}"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    for attempt in range(6):
        try:
            resp = json.load(urllib.request.urlopen(req, timeout=1800))
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 503) and "PerDay" not in msg and attempt < 5:
                time.sleep(60 * (attempt + 1))
                continue
            raise SystemExit(f"gemini HTTP {e.code}: {msg}")
    out = "".join(p.get("text", "") for p in resp["candidates"][0]["content"]["parts"])
    return parse_json(out)


def codex(code, lo, hi):
    w, text, pages = inputs(code, lo, hi)
    outp = os.path.join(w, f"codex_{lo}_{hi}.txt")
    prompt = (SPEC + "\n\nThe page images are attached in page order. You may run python in the working "
              "directory to check arithmetic, but do not modify files. Your FINAL message must be only the JSON array.\n\n" + text)
    cmd = ["codex", "exec", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "-C", w, "-o", outp]
    for p in pages:
        cmd += ["-i", p]
    p = subprocess.run(cmd + ["-"], input=prompt, capture_output=True, text=True, timeout=7200)
    if not os.path.exists(outp):
        raise SystemExit("codex failed: " + (p.stderr or p.stdout)[-500:])
    return parse_json(open(outp).read())


if __name__ == "__main__":
    code, backend = sys.argv[1:3]
    lo, hi = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (1, 65)
    t0 = time.time()
    data = gemini(code, lo, hi, os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")) if backend == "gemini" else codex(code, lo, hi)
    got = sorted(x["q"] for x in data)
    json.dump(data, open(os.path.join(workdir(code), f"draft_{lo}_{hi}.json"), "w"), ensure_ascii=False, indent=1)
    print(f"{code} {backend} q{lo}-{hi}: {len(data)} items, missing {sorted(set(range(lo, hi + 1)) - set(got))}, {time.time() - t0:.0f}s")
