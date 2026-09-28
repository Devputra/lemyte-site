"""Manual (re)crop of figures, in PDF points (page image px / 1.4).

    python3 fixcrop.py <CODE> <questions.pdf> <name>:<page>:<x0>,<y0>,<x1>,<y1> ...   (name like q44_option-b, q09b_stem)
    python3 fixcrop.py <CODE> <questions.pdf> --rm q44_option-c ...

Writes <images>/tmp_<name>.png with the same whitening/trim as autofig.py.
"""
import json
import os
import sys

import fitz
import numpy as np
from PIL import Image

from croputil import finish
from common import QUESTIONS_ROOT, workdir

code, pdfname, *specs = sys.argv[1:]
meta = json.load(open(os.path.join(workdir(code), "meta.json")))
out = os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], "images")
d = fitz.open(os.path.join(QUESTIONS_ROOT, meta["subj"], meta["year"], pdfname))
thr = int(os.environ.get("WHITEN", 200))
if specs and specs[0] == "--rm":
    for n in specs[1:]:
        os.remove(os.path.join(out, f"tmp_{n}.png"))
        print("removed", n)
    sys.exit()
for s in specs:
    name, pg, box = s.split(":")
    r = fitz.Rect(*[float(v) for v in box.split(",")])
    pix = d[int(pg) - 1].get_pixmap(clip=r, matrix=fitz.Matrix(5, 5), alpha=False)
    a = np.array(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    im = finish(a, thr)
    im.save(os.path.join(out, f"tmp_{name}.png"))
    print("saved", name, im.size)
