"""Shared crop finishing: whiten light pixels (watermarks), strip table rules on the edges, trim + pad."""
import numpy as np
from PIL import Image


def _strip_edges(ink):
    """Drop thin lines spanning >80% of the crop along any edge (table cell borders), repeatedly."""
    changed = True
    while changed and ink.any():
        changed = False
        rows = np.where(ink.any(axis=1))[0]
        cols = np.where(ink.any(axis=0))[0]
        y0, y1, x0, x1 = rows[0], rows[-1], cols[0], cols[-1]
        h, w = y1 - y0 + 1, x1 - x0 + 1
        for axis, first, last, span in ((1, y0, y1, w), (0, x0, x1, h)):
            frac = ink.sum(axis=axis) / max(span, 1)
            for edge, step in ((first, 1), (last, -1)):
                k = edge
                while 0 <= k < len(frac) and frac[k] > 0.8:
                    k += step
                n = abs(k - edge)
                gap = k
                while 0 <= gap < len(frac) and frac[gap] == 0:
                    gap += step
                if 0 < n <= 12 and abs(gap - k) >= 4:  # thin rule separated from the content by a blank gap
                    sl = slice(min(edge, k - step), max(edge, k - step) + 1)
                    if axis == 1:
                        ink[sl, :] = False
                    else:
                        ink[:, sl] = False
                    changed = True
    return ink


def template(doc, rect, zoom, skip=None, n=11):
    """Median render of `rect` over up to n other pages: the page-constant watermark/background there."""
    import fitz
    pages = [i for i in range(len(doc)) if i != skip]
    step = max(1, len(pages) // n)
    ims = []
    for i in pages[::step][:n]:
        pix = doc[i].get_pixmap(clip=rect, matrix=fitz.Matrix(zoom, zoom), alpha=False)
        ims.append(np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, 3))
    h = min(x.shape[0] for x in ims)
    w = min(x.shape[1] for x in ims)
    return np.median(np.stack([x[:h, :w] for x in ims]), axis=0).astype(np.int16)


def finish(a, thr=200, pad=15, tmpl=None):
    """a: HxWx3 uint8 array -> PIL image, whitened and trimmed to its content.
    With tmpl (see template()), only light pixels matching the page-constant watermark are whitened,
    so genuine light shading/fills in the figure survive."""
    light = a.min(axis=2) >= thr
    if tmpl is not None:
        h, w = min(a.shape[0], tmpl.shape[0]), min(a.shape[1], tmpl.shape[1])
        same = np.zeros(light.shape, bool)
        same[:h, :w] = np.abs(a[:h, :w].astype(np.int16) - tmpl[:h, :w]).max(axis=2) < 24
        light = (a.min(axis=2) >= 245) | ((a.min(axis=2) >= 120) & same)
    a = a.copy()
    a[light] = 255
    ink = _strip_edges(~light)
    a[~ink & ~light] = 255
    im = Image.fromarray(a)
    bb = Image.fromarray(ink.astype("uint8") * 255).getbbox()
    if bb:
        im = im.crop((max(bb[0] - pad, 0), max(bb[1] - pad, 0), min(bb[2] + pad, im.width), min(bb[3] + pad, im.height)))
    return im
