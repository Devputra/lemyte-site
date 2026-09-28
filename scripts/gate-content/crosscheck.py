"""Second-opinion check of a paper with an OpenAI model.

    python3 crosscheck.py <CODE> [--via api|codex] [--model M] [--q 11,37]

For each DB row the model solves the question independently (stem + options + figures),
then compares with the stored key and reviews the explanation. Writes
.gate-work/<CODE>/crosscheck.json and prints only the rows that need a look.
Disagreements are prompts to re-check; the official key stays the source of truth.
--via api (default): OpenAI API, key OPENAI_API_KEY or CHATGPT_ONE_DAY_API in .env.local (paid credit).
--via codex: `codex exec` signed in with ChatGPT (subscription quota), read-only sandbox in an empty dir.
"""
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from common import ENV, QUESTIONS_ROOT, get, workdir

OPENAI_KEY = ENV.get("OPENAI_API_KEY") or ENV.get("CHATGPT_ONE_DAY_API")

PROMPT = """You are checking a GATE exam question stored in a question bank.

1. Solve the question yourself from the stem, options and figures, before looking at the stored answer.
2. Compare your answer with the stored answer (for NAT, the accepted range).
3. Review the stored explanation: is its reasoning and arithmetic correct, and does it reach the stored answer?
4. Note any transcription problem you can see (stem/options that look garbled, missing data, figure not matching text).

Reply with JSON only:
{"my_answer": "<letter(s) or number>", "agrees_with_key": true|false,
 "explanation_ok": true|false, "issues": ["short, specific issue", ...], "confidence": "high"|"medium"|"low"}
Keep "issues" empty when everything is fine. Be specific (quote the wrong step or number)."""


SCHEMA = {"type": "object", "additionalProperties": False,
          "required": ["my_answer", "agrees_with_key", "explanation_ok", "issues", "confidence"],
          "properties": {"my_answer": {"type": "string"}, "agrees_with_key": {"type": "boolean"},
                         "explanation_ok": {"type": "boolean"},
                         "issues": {"type": "array", "items": {"type": "string"}},
                         "confidence": {"type": "string", "enum": ["high", "medium", "low"]}}}


def local_images(md, subj, year):
    paths = (os.path.join(QUESTIONS_ROOT, subj, year, "images", os.path.basename(p))
             for p in re.findall(r"gate-media://([^)\s]+)", md))
    return [p for p in dict.fromkeys(paths) if os.path.exists(p)]


def image_parts(md, subj, year):
    return [{"type": "image_url", "image_url": {"url": "data:image/png;base64," +
                                                base64.b64encode(open(p, "rb").read()).decode()}}
            for p in local_images(md, subj, year)]


def stored_key(r):
    if r["type"] == "NAT":
        if r.get("grading_policy") == "MARKS_TO_ALL":
            return "marks to all"
        return f"{r['nat_lower_bound']} to {r['nat_upper_bound']}"
    opts = r["options_array"] or []
    key = ";".join(o["id"].upper() for o in opts if o.get("is_correct"))
    alt = ";".join(o["id"].upper() for o in opts if o.get("optional_correct"))
    return key + (f" (also accepted: {alt})" if alt else "")


def question_text(r):
    return (f"Type: {r['type']}\n\nQUESTION (markdown, LaTeX math):\n{r['markdown_content']}\n\n"
            f"STORED ANSWER: {stored_key(r)}\n\nSTORED EXPLANATION:\n{r.get('explanation_markdown') or ''}")


LIMIT_HIT = []  # set once the ChatGPT plan's usage limit is reached; skip the remaining rows


def check_codex(r, subj, year, model):
    if LIMIT_HIT:
        return {"error": "skipped: usage limit reached earlier in this run"}
    with tempfile.TemporaryDirectory() as tmp:
        schema, out = os.path.join(tmp, "schema.json"), os.path.join(tmp, "out.json")
        json.dump(SCHEMA, open(schema, "w"))
        cmd = ["codex", "exec", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral",
               "-C", tmp, "--output-schema", schema, "-o", out]
        if model:
            cmd += ["-m", model]
        for img in local_images(r["markdown_content"], subj, year):
            cmd += ["-i", img]
        prompt = PROMPT + "\n\nDo not run commands or read files; everything you need is below.\n\n" + question_text(r)
        try:
            p = subprocess.run(cmd + ["-"], input=prompt, capture_output=True, text=True, timeout=900)
            if not os.path.exists(out):
                err = (p.stderr or p.stdout)[-300:]
                if "usage limit" in err:
                    LIMIT_HIT.append(err)
                return {"error": err}
            return json.loads(open(out).read())
        except Exception as e:
            return {"error": str(e)[:300]}


def check(r, subj, year, model):
    text = question_text(r)
    md = r["markdown_content"]
    msgs = [{"role": "system", "content": PROMPT},
            {"role": "user", "content": [{"type": "text", "text": text}] + image_parts(md, subj, year)}]
    body = {"model": model, "messages": msgs, "response_format": {"type": "json_object"}}
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json"})
    try:
        resp = json.load(urllib.request.urlopen(req, timeout=600))
        out = json.loads(resp["choices"][0]["message"]["content"])
        out["tokens"] = resp.get("usage", {}).get("total_tokens")
    except Exception as e:  # keep going; report the failure for this row
        out = {"error": str(e)[:300]}
    return out


def main():
    code = sys.argv[1]
    args = sys.argv[2:]
    via = args[args.index("--via") + 1] if "--via" in args else "api"
    model = args[args.index("--model") + 1] if "--model" in args else ("gpt-5.5" if via == "api" else None)
    only = {int(x) for x in args[args.index("--q") + 1].split(",")} if "--q" in args else None
    assert via == "codex" or OPENAI_KEY, "no OPENAI_API_KEY / CHATGPT_ONE_DAY_API in .env.local"
    fn, workers = (check_codex, 3) if via == "codex" else (check, 8)
    meta = json.load(open(os.path.join(workdir(code), "meta.json")))
    rows = get(f"question_versions?pyq_paper_code=eq.{code}&select=markdown_content,type,options_array,"
               "nat_lower_bound,nat_upper_bound,grading_policy,explanation_markdown")
    byq = {}
    for r in rows:
        m = re.search(r"-Q(\d+)\]", r["markdown_content"])
        if m:
            byq[int(m.group(1))] = r
    qs = sorted(q for q in byq if only is None or q in only)
    with ThreadPoolExecutor(workers) as ex:
        res = dict(zip(qs, ex.map(lambda q: fn(byq[q], meta["subj"], meta["year"], model), qs)))
    path = os.path.join(workdir(code), "crosscheck.json")
    old = json.load(open(path)) if os.path.exists(path) and only else {}
    old.update({str(q): v for q, v in res.items()})
    json.dump(old, open(path, "w"), indent=1, ensure_ascii=False)
    flagged = 0
    for q in qs:
        v = res[q]
        if "error" in v or not v.get("agrees_with_key", True) or not v.get("explanation_ok", True) or v.get("issues"):
            flagged += 1
            print(f"Q{q}: key={stored_key(byq[q])} gpt={v.get('my_answer')} agree={v.get('agrees_with_key')} "
                  f"expl_ok={v.get('explanation_ok')} conf={v.get('confidence')} {v.get('error', '')}")
            for i in v.get("issues", []):
                print("    -", i)
    tok = sum(v.get("tokens") or 0 for v in res.values())
    print(f"checked {len(qs)} | flagged {flagged} | via {via} model {model or 'codex default'} | tokens {tok} | -> {path}")


if __name__ == "__main__":
    main()
