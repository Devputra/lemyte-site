"""Shared helpers for the GATE content pipeline (see docs/GATE_CONTENT_PLAYBOOK.md)."""
import json
import os
import subprocess
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


def get(path):
    """GET a PostgREST path (gate schema), paginating past the 1000-row cap."""
    out, off = [], 0
    sep = "&" if "?" in path else "?"
    while True:
        req = urllib.request.Request(f"{URL}/rest/v1/{path}{sep}limit=1000&offset={off}", headers=HEADERS)
        batch = json.load(urllib.request.urlopen(req))
        out += batch
        off += 1000
        if len(batch) < 1000:
            return out


def patch(path, body):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", data=json.dumps(body).encode(), method="PATCH",
                                 headers={**HEADERS, "Prefer": "return=representation"})
    return json.load(urllib.request.urlopen(req))


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
