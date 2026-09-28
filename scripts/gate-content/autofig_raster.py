"""Figure candidates for image-only papers (GATE 2020 style: every stem/option is a screenshot).

    python3 autofig_raster.py <CODE> <questions.pdf> [--sheet]

Owner question from the text-layer "Q.No. N" labels; option images sit right of "(A)".."(D)".
Stem screenshots are split into horizontal bands at blank rows; bands taller than MINH points
(text lines are ~10 pt) are figure candidates (tables too — drop those, drafts carry them as markdown).
Tall option screenshots become option-x crops. Writes images/tmp_*.png like autofig.py.
"""
import json
import os
import re
import sys

import fitz
import numpy as np
from PIL import Image, ImageDraw

from croputil import finish
from common import QUESTIONS_ROOT, workdir

MINH = 28
code, pdfname = sys.argv[1:3]
w = workdir(code)
meta = json.load(open(os.path.join(w, "meta.json")))
out = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
os.makedirs(out, exist_ok=True)
d = fitz.open(os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], pdfname))
Z = 4

labels, optlab = [], []
off, prev = 0, 0
for i, p in enumerate(d):
    for bl in p.get_text("dict")["blocks"]:
        for l in bl.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            m = re.match(r"Q\.\s?No\.?\s?(\d+)$", t)
            if m:
                n = int(m.group(1))
                if n <= 2 and prev >= 10 and off == 0:
                    off = 10
                prev = n
                labels.append((i, l["bbox"][1], n + off))
            m = re.match(r"\(([A-D])\)$", t)
            if m:
                optlab.append((i, l["bbox"], m.group(1).lower()))
labels.sort()


def owner(pg, y):
    cand = [l for l in labels if (l[0], l[1]) <= (pg, y + 4)]
    return cand[-1][2] if cand else None


def render(pg, r):
    pix = d[pg].get_pixmap(clip=r, matrix=fitz.Matrix(Z, Z), alpha=False)
    return np.array(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))


figs = []
for i, p in enumerate(d):
    for im in p.get_image_info():
        r = fitz.Rect(im["bbox"])
        if r.height < 12 and r.width < 40:
            continue
        opt = next((o for o in optlab if o[0] == i and abs((o[1][1] + o[1][3]) / 2 - (r.y0 + min(r.height, 12) / 2)) < 8
                    and o[1][2] <= r.x0 + 2), None)
        q = owner(i, r.y0)
        if q is None:
            continue
        if opt:
            if r.height >= MINH:
                figs.append(dict(q=q, part="option-" + opt[2], page=i + 1, rect=list(r)))
            continue
        a = render(i, r)
        dark = (a.min(axis=2) < 160).any(axis=1)
        bands, start, gap = [], None, 0
        for y, v in enumerate(dark):
            if v:
                if start is None:
                    start = y
                gap = 0
            elif start is not None:
                gap += 1
                if gap > 3 * Z:  # blank gap of >3 pt ends a band
                    bands.append((start, y - gap))
                    start, gap = None, 0
        if start is not None:
            bands.append((start, len(dark) - 1))
        for y0, y1 in bands:
            if (y1 - y0) / Z >= MINH:
                figs.append(dict(q=owner(i, r.y0 + y0 / Z), part="stem", page=i + 1,
                                 rect=[r.x0, r.y0 + y0 / Z - 2, r.x1, r.y0 + y1 / Z + 2]))
seen = {}
for f in figs:
    k = (f["q"], f["part"])
    seen[k] = seen.get(k, 0) + 1
    f["suffix"] = "" if seen[k] == 1 else chr(ord("a") + seen[k] - 1)
json.dump(figs, open(os.path.join(w, "figs.json"), "w"), indent=0)
for f in os.listdir(out):
    if f.startswith("tmp_"):
        os.remove(os.path.join(out, f))
names = []
for f in figs:
    a = render(f["page"] - 1, fitz.Rect(f["rect"]))
    im = finish(a, 200)
    fn = f"tmp_q{f['q']:02d}{f['suffix']}_{f['part']}.png"
    im.save(os.path.join(out, fn))
    names.append(fn)
print(code, "figures", len(figs), "questions", len({f['q'] for f in figs}))
if "--sheet" in sys.argv:
    names.sort()
    for s in range(0, len(names), 20):
        sheet = Image.new("RGB", (1800, 1500), "white")
        dr = ImageDraw.Draw(sheet)
        for k, fn in enumerate(names[s:s + 20]):
            t = Image.open(os.path.join(out, fn))
            t.thumbnail((340, 270))
            x, y = (k % 5) * 360, (k // 5) * 300
            sheet.paste(t, (x, y + 15))
            dr.text((x, y), fn, fill="red")
        sheet.save(os.path.join(w, f"autofig{s // 20}.png"))
