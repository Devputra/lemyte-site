"""Re-render a paper's final figures with watermark-template whitening (keeps light shading).

    python3 recrop.py <CODE> <questions.pdf> <prefix> [--apply]

Crop boxes come from figs.json (autofig), overridden by fixcrop.sh specs; `mv tmp_a tmp_b` lines rename.
Without --apply: writes candidates whose ink grows a lot (lost shading) to .gate-work/<CODE>/recrop/ + sheet.
With --apply: overwrites those final images (same names; re-upload with apply.py --upload).
"""
import json
import os
import re
import shutil
import sys

import fitz
import numpy as np
from PIL import Image

from common import QUESTIONS_ROOT, workdir
from croputil import finish, template

code, pdfname, prefix = sys.argv[1:4]
w = workdir(code)
meta = json.load(open(f"{w}/meta.json"))
img = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
d = fitz.open(os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], pdfname))

box = {}  # (q, suffix, part) -> (page, rect, whiten)
for f in json.load(open(f"{w}/figs.json")):
    box[(f["q"], f["suffix"], f["part"])] = (f["page"], fitz.Rect(f["rect"]) + (-3, -3, 3, 3), 200)
fx = f"{w}/fixcrop.sh"
for line in (open(fx).read().splitlines() if os.path.exists(fx) else []):
    thr = int(m.group(1)) if (m := re.match(r"WHITEN=(\d+)", line)) else 200
    for n, pg, b in re.findall(r"q(\d+[a-z]?_[a-z-]+):(\d+):([\d.,]+)", line):
        q, rest = re.match(r"(\d+)([a-z]?)_(.+)", n).group(1, 2), n.split("_", 1)[1]
        box[(int(q[0]), q[1], rest)] = (int(pg), fitz.Rect(*map(float, b.split(","))), thr)
    for a, b in re.findall(r"mv \S*tmp_q(\S+?)\.png \S*tmp_q(\S+?)\.png", line):
        ka = re.match(r"(\d+)([a-z]?)_(.+)", a).groups()
        kb = re.match(r"(\d+)([a-z]?)_(.+)", b).groups()
        if (int(ka[0]), ka[1], ka[2]) in box:
            box[(int(kb[0]), kb[1], kb[2])] = box.pop((int(ka[0]), ka[1], ka[2]))

out = os.path.join(w, "recrop")
os.makedirs(out, exist_ok=True)
cands = []
for f in sorted(os.listdir(img)):
    m = re.match(re.escape(prefix) + r"[A-Za-z]+_q(\d+)([a-z]?)_(stem|option-[a-d])\.v1\.png$", f)
    if not m or (int(m.group(1)), m.group(2), m.group(3)) not in box:
        continue
    pg, r, thr = box[(int(m.group(1)), m.group(2), m.group(3))]
    pix = d[pg - 1].get_pixmap(clip=r, matrix=fitz.Matrix(5, 5), alpha=False)
    a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, 3).copy()
    new = finish(a, thr, tmpl=template(d, r, 5, skip=pg - 1))
    old = np.array(Image.open(os.path.join(img, f)).convert("L"))
    ink_old = (old < 245).mean() * old.size
    newa = np.array(new.convert("L"))
    ink_new = (newa < 245).mean() * newa.size
    if ink_new > 1.3 * ink_old and (ink_new - ink_old) > 0.01 * newa.size:
        cands.append(f)
        new.save(os.path.join(out, f))
        if "--apply" in sys.argv:
            shutil.copy(os.path.join(out, f), os.path.join(img, f))
print(code, "figures", len(box), "| shading recovered in", len(cands), cands)
