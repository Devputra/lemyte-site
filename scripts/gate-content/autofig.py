"""Auto-detect and crop figures per question for text-layer papers.

    python3 autofig.py <CODE> <questions.pdf> [--sheet]

Finds embedded images and vector-drawing clusters (ignoring page chrome, watermarks and table rules),
assigns each to the question above it, and marks it `option-x` when it sits on an option row "(A)".."(D)".
Writes <images>/tmp_qNN_<part>.png (renamed with topic codes later) and .gate-work/<CODE>/figs.json.
"""
import json
import os
import re
import sys

import fitz
import numpy as np
from PIL import Image, ImageDraw

from croputil import finish, template
from common import QUESTIONS_ROOT, workdir

code, pdfname = sys.argv[1:3]
w = workdir(code)
meta = json.load(open(os.path.join(w, "meta.json")))
out = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
os.makedirs(out, exist_ok=True)
d = fitz.open(os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], pdfname))
H = d[0].rect.height


def chrome(r, pr):
    return r.y1 < 75 or r.y0 > pr.height - 60 or (r.width > 0.6 * pr.width and r.height > 0.45 * pr.height)


labels = []  # (page, y, q)
off, prev = 0, 0
for i, p in enumerate(d):
    for b in p.get_text("blocks"):
        m = re.match(r"\s*Q\.\s?(?:No\.?\s?)?(\d+)\s", b[4] + " ")
        if m and not re.search(r"–|Carry|carry|Multiple|Numerical", b[4][:40]):
            n = int(m.group(1))
            if n <= 2 and prev >= 10 and off == 0:  # a real restart goes back to 1 (blocks can be out of order)
                off = 10
            prev = n
            labels.append((i, b[1], n + off))
labels.sort()


def owner(pg, y):
    cand = [l for l in labels if (l[0], l[1]) <= (pg, y + 2)]
    return cand[-1][2] if cand else None


import collections
xcount = collections.Counter(x["xref"] for p in d for x in p.get_image_info(xrefs=True))
repeated = {x for x, n in xcount.items() if n >= max(3, len(d) // 4)}  # logos / watermarks
dsig = lambda x: (tuple(round(v) for v in x["rect"]), x.get("fill") and tuple(round(c, 2) for c in x["fill"]))
dcount = collections.Counter(dsig(x) for p in d for x in p.get_drawings())
rep_draw = {k for k, n in dcount.items() if n >= max(3, len(d) // 4)}
# table rules: thin axis-aligned lines touching the most common vertical-rule x positions
vx = collections.Counter(round(it[1].x0) for p in d for x in p.get_drawings() for it in x["items"]
                         if it[0] == "re" and it[1].width <= 2.5 and it[1].height > 8)
cols = [x for x, n in vx.most_common(6) if n >= max(4, len(d) // 3)]
def table_rule(r):
    thin_h, thin_v = r.height <= 2.5, r.width <= 2.5
    if not (thin_h or thin_v):
        return False
    if thin_v:
        return any(abs(r.x0 - c) <= 2 for c in cols)
    return any(abs(r.x0 - c) <= 3 or abs(r.x1 - c) <= 3 for c in cols) and r.width > 20
figs = []
for i, p in enumerate(d):
    pr = p.rect
    rects = [fitz.Rect(x["bbox"]) for x in p.get_image_info(xrefs=True)
             if not chrome(fitz.Rect(x["bbox"]), pr) and x["xref"] not in repeated]
    rich = list(rects)  # evidence of a real figure (tables are only axis-aligned lines / plain boxes)
    for x in p.get_drawings():
        if chrome(x["rect"], pr) or dsig(x) in rep_draw:
            continue
        for it in x["items"]:
            if it[0] == "re":
                r = fitz.Rect(it[1])
            elif it[0] == "qu":
                r = it[1].rect
            else:
                r = fitz.Rect(it[1], it[1])
                for pt in it[2:]:
                    r |= pt
            r.normalize()
            fill = x.get("fill")
            if it[0] in ("c", "qu") or (it[0] == "l" and r.width > 0.5 and r.height > 0.5) or (
                    fill and max(fill) - min(fill) > 0.1 and r.width > 3 and r.height > 3):
                rich.append(fitz.Rect(r))
            if (r.height <= 2.5 and r.width > 250) or table_rule(r):
                continue
            if r.width < 0.5 and r.height < 0.5:
                continue
            if r.width < 1:  # zero-width/height lines never "intersect" in PyMuPDF: give them thickness
                r.x0, r.x1 = r.x0 - 0.5, r.x1 + 0.5
            if r.height < 1:
                r.y0, r.y1 = r.y0 - 0.5, r.y1 + 0.5
            rects.append(r)
    rects = [r for r in rects if r.width * r.height > 4 or r.width > 8 or r.height > 8]
    cl = []
    for r in sorted(rects, key=lambda r: r.y0):
        for j, c in enumerate(cl):
            if r.intersects(c + (-12, -12, 12, 12)):
                cl[j] = c | r  # (c |= r would only rebind the loop variable)
                break
        else:
            cl.append(fitz.Rect(r))
    merged = True
    while merged:
        merged = False
        for a in range(len(cl)):
            for b in range(a + 1, len(cl)):
                if cl[a].intersects(cl[b] + (-12, -12, 12, 12)):
                    cl[a] |= cl[b]
                    del cl[b]
                    merged = True
                    break
            if merged:
                break
    blocks = p.get_text("blocks")
    for c in cl:
        if c.width < 25 or c.height < 18 or not any(c.intersects(r) for r in rich):
            continue
        # grow to include labels (text blocks overlapping / just touching the cluster, short ones)
        for b in blocks:
            br = fitz.Rect(b[:4])
            if len(b[4].strip()) < 40 and br.intersects(c + (-6, -6, 6, 6)) and not re.match(r"\s*\(?[A-D]\)", b[4]):
                c |= br
        q = owner(i, c.y0)
        if q is None:
            continue
        # option row?  find option label blocks of this page
        part = "stem"
        for b in blocks:
            m = re.match(r"\s*\(([A-D])\)", b[4])
            if m and abs((b[1] + b[3]) / 2 - (c.y0 + min(c.height, 40) / 2)) < max(14, c.height / 2) and b[0] < c.x0:
                part = "option-" + m.group(1).lower()
        figs.append(dict(q=q, part=part, page=i + 1, rect=[round(v, 1) for v in c]))

grouped = {}
for f in figs:  # one crop per (question, part, page): union the pieces
    k = (f["q"], f["part"], f["page"])
    if k in grouped:
        grouped[k]["rect"] = [round(v, 1) for v in (fitz.Rect(grouped[k]["rect"]) | fitz.Rect(f["rect"]))]
    else:
        grouped[k] = f
figs = list(grouped.values())
seen = {}
for f in figs:
    k = (f["q"], f["part"])
    seen[k] = seen.get(k, 0) + 1
    f["suffix"] = "" if seen[k] == 1 else chr(ord("a") + seen[k] - 1)
json.dump(figs, open(os.path.join(w, "figs.json"), "w"), indent=0)

for f in os.listdir(out):
    if f.startswith("tmp_"):
        os.remove(os.path.join(out, f))
for pg in {f["page"] for f in figs}:
    p = d[pg - 1]
    for im in p.get_image_info(xrefs=True):
        if chrome(fitz.Rect(im["bbox"]), p.rect) or im["xref"] in repeated:
            try:
                p.delete_image(im["xref"])
            except Exception:
                pass
names = []
for f in figs:
    p = d[f["page"] - 1]
    pix = p.get_pixmap(clip=fitz.Rect(f["rect"]) + (-3, -3, 3, 3), matrix=fitz.Matrix(5, 5), alpha=False)
    a = np.array(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    im = finish(a, 200, tmpl=template(d, fitz.Rect(f["rect"]) + (-3, -3, 3, 3), 5, skip=f["page"] - 1))
    fn = f"tmp_q{f['q']:02d}{f['suffix']}_{f['part']}.png"
    im.save(os.path.join(out, fn))
    names.append(fn)
print(code, "figures", len(figs), "questions", len({f['q'] for f in figs}))
if "--sheet" in sys.argv:
    names.sort()
    for s in range(0, len(names), 20):
        sheet = Image.new("RGB", (1800, 1500), "white")
        dr = ImageDraw.Draw(sheet)
        for i, fn in enumerate(names[s:s + 20]):
            t = Image.open(os.path.join(out, fn))
            t.thumbnail((340, 270))
            x, y = (i % 5) * 360, (i // 5) * 300
            sheet.paste(t, (x, y + 15))
            dr.text((x, y), fn, fill="red")
        sheet.save(os.path.join(w, f"autofig{s // 20}.png"))
