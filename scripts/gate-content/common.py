"""Shared helpers for the GATE content pipeline (see docs/GATE_CONTENT_PLAYBOOK.md)."""
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QUESTIONS_ROOT = "/media/devputra/F414D25114D21708/OFFICE/DXOCTAGON/Products/Lemyte/Product/GATE/Questions"
BUCKET = "learnamyte-gate-media"
AWS_REGION = "ap-south-2"


def load_env():
    env = {}
    for name in (".env.local",):
        path = os.path.join(REPO, name)
        if os.path.exists(path):
            for line in open(path):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
URL = ENV.get("SUPABASE_URL") or ENV["NEXT_PUBLIC_SUPABASE_URL"]
KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Accept-Profile": "gate",
           "Content-Profile": "gate", "Content-Type": "application/json"}


def _open(req, tries=4):
    """urlopen with a timeout and retries on transient network errors."""
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(req, timeout=60))
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            if isinstance(e, urllib.error.HTTPError) and e.code < 500 or i == tries - 1:
                raise
            time.sleep(3 * (i + 1))


MAX_PAGES = 50  # 50,000 rows; the whole question bank is under 10,000


def get(path):
    """GET a PostgREST path (gate schema), paginating past the 1000-row cap.

    Do not put limit= or offset= in `path`: this function pages itself. On 1 Oct 2026 a path that already had
    limit/offset made PostgREST return the same 1,000 rows on every page, so the loop never ended and pulled
    ~52 GB of egress (Supabase free quota is 5 GB). Hence the checks below."""
    if re.search(r"[?&](limit|offset)=", path):
        raise ValueError("get() pages by itself; remove limit=/offset= from the path (or use get_page)")
    out, off, seen_first = [], 0, set()
    sep = "&" if "?" in path else "?"
    for _ in range(MAX_PAGES):
        req = urllib.request.Request(f"{URL}/rest/v1/{path}{sep}limit=1000&offset={off}", headers=HEADERS)
        batch = _open(req)
        if batch and json.dumps(batch[0], sort_keys=True) in seen_first:
            raise RuntimeError(f"get(): page at offset {off} repeats an earlier page; stopping ({path[:80]})")
        if batch:
            seen_first.add(json.dumps(batch[0], sort_keys=True))
        out += batch
        off += 1000
        if len(batch) < 1000:
            return out
    raise RuntimeError(f"get(): more than {MAX_PAGES} pages for {path[:80]}; stopping")


def get_page(path):
    """One PostgREST request, no paging (for paths that set their own limit/offset)."""
    return _open(urllib.request.Request(f"{URL}/rest/v1/{path}", headers=HEADERS))


def patch(path, body):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", data=json.dumps(body).encode(), method="PATCH",
                                 headers={**HEADERS, "Prefer": "return=representation"})
    return _open(req)


def aws(*args):
    env = {**os.environ, "AWS_ACCESS_KEY_ID": ENV["AWS_ACCESS_KEY_ID"],
           "AWS_SECRET_ACCESS_KEY": ENV["AWS_SECRET_ACCESS_KEY"], "AWS_DEFAULT_REGION": AWS_REGION}
    return subprocess.run(["aws", *args], env=env, capture_output=True, text=True)


def s3_names(folder):
    """PNG file names in s3://BUCKET/<folder>/ (folder like 'EC/pyq/2024_ec')."""
    res = aws("s3", "ls", f"s3://{BUCKET}/{folder}/")
    return sorted(l.split()[-1] for l in res.stdout.splitlines() if l.strip().endswith(".png"))


def workdir(paper_code):
    d = os.path.join(REPO, ".gate-work", paper_code)
    os.makedirs(d, exist_ok=True)
    return d
