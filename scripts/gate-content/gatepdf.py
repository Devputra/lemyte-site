"""Reusable helpers for GATE question-paper PDFs (IIT table layout: columns at x=72/114/523)."""
import re
import fitz

COLS = [72, 73, 114, 115, 523]


def _near(v):
    return any(abs(v - c) < 1.6 for c in COLS)


def _is_rule(r):
    if r.width <= 2 and _near(r.x0):
        return True
    if r.height <= 2 and _near(r.x0) and _near(r.x1):
        return True
    return False


def _light(c):
    return c is not None and min(c) > 0.75


def _is_chrome_image(im, page_rect):
    """Watermark (large, centred) or header logo."""
    x0, y0, x1, y1 = im["bbox"]
    if y1 < 85:
        return True
    return (x1 - x0) > 0.6 * page_rect.width and (y1 - y0) > 0.4 * page_rect.height


def question_starts(page):
    out = []
    for b in page.get_text("blocks"):
        t = b[4].strip()
        m = re.match(r"Q\.(\d+)\s", t + " ")
        if m and not re.match(r"Q\.\d+\s*[–-]", t):
            out.append((b[1], int(m.group(1))))
    return out


def find_figures(doc, pad_join=12, min_w=25, min_h=15):
    """Return [{page, q, bbox}] clusters of vector drawings / embedded images, labels attached."""
    out, lastq = [], None
    for pn, p in enumerate(doc):
        els = []
        for x in p.get_drawings():
            r = x["rect"]
            if r.y0 < 85 or r.y1 > 775 or _is_rule(r) or (r.width == 0 and r.height == 0):
                continue
            if _light(x.get("fill")) and (x.get("color") is None or _light(x.get("color"))):
                continue
            els.append(fitz.Rect(r))
        for im in p.get_image_info(xrefs=True):
            if not _is_chrome_image(im, p.rect):
                els.append(fitz.Rect(im["bbox"]))
        labels = []
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if s["text"].strip() and s["font"].startswith(("Calibri", "Cambria", "Arial")) and 85 < s["bbox"][1] < 775:
                        labels.append(fitz.Rect(s["bbox"]))
        cl = [fitz.Rect(r) for r in els]
        changed = True
        while changed:
            changed, new = False, []
            for r in cl:
                for i, g in enumerate(new):
                    if fitz.Rect(g.x0 - pad_join, g.y0 - pad_join, g.x1 + pad_join, g.y1 + pad_join).intersects(r):
                        new[i] = g | r
                        changed = True
                        break
                else:
                    new.append(fitz.Rect(r))
            cl = new
        cl = [c for c in cl if c.width > min_w and c.height > min_h]
        for i, c in enumerate(cl):
            for L in labels:
                if fitz.Rect(c.x0 - 25, c.y0 - 20, c.x1 + 30, c.y1 + 20).intersects(L):
                    cl[i] = cl[i] | L
        qs = question_starts(p)
        for c in sorted(cl, key=lambda c: (round(c.y0), c.x0)):
            q = lastq
            for y, n in qs:
                if y <= c.y0 + 2:
                    q = n
            out.append(dict(page=pn + 1, q=q, bbox=[round(v, 1) for v in c]))
        if qs:
            lastq = qs[-1][1]
    return out


def strip_chrome(page):
    for im in page.get_image_info(xrefs=True):
        if _is_chrome_image(im, page.rect):
            try:
                page.delete_image(im["xref"])
            except Exception:
                pass


def render_clip(page, bbox, pad=(-6, -6, 6, 6), zoom=8, white_thresh=195):
    """Render a clip at high DPI, whiten faint watermark, trim to content + margin. Returns PIL image."""
    import numpy as np
    from PIL import Image
    r = fitz.Rect(bbox) + pad
    r.x0 = max(r.x0, 116)
    r.x1 = min(r.x1, 521)
    pix = page.get_pixmap(clip=r, matrix=fitz.Matrix(zoom, zoom), alpha=False)
    a = np.array(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    m = a.min(axis=2) >= white_thresh
    a[m] = 255
    im = Image.fromarray(a)
    bb = Image.fromarray((~m).astype("uint8") * 255).getbbox()
    if bb:
        W, H = im.size
        im = im.crop((max(bb[0] - 24, 0), max(bb[1] - 24, 0), min(bb[2] + 24, W), min(bb[3] + 24, H)))
    return im


def page_sheets(doc, pages, out_prefix, zoom=1.6):
    """Render pages two-up into PNG sheets for visual reading (<2000px)."""
    from PIL import Image
    imgs = []
    for pn in pages:
        pix = doc[pn].get_pixmap(clip=fitz.Rect(70, 85, 525, 780), matrix=fitz.Matrix(zoom, zoom))
        imgs.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    paths = []
    for i in range(0, len(imgs), 2):
        pair = imgs[i:i + 2]
        s = Image.new("RGB", (sum(x.width for x in pair) + 10, max(x.height for x in pair)), "gray")
        x = 0
        for im in pair:
            s.paste(im, (x, 0))
            x += im.width + 10
        path = f"{out_prefix}{i // 2 + 1:02d}.png"
        s.save(path)
        paths.append(path)
    return paths


def question_text(doc):
    """{qnum: flattened text} split on 'Q.n' markers, page headers removed."""
    full = ""
    for p in doc:
        t = p.get_text()
        t = re.sub(r"[^\n]*Organizing Institute[^\n]*\n?", "", t)
        t = re.sub(r"Page \d+ of \d+\s*\n?", "", t)
        full += t
    full = re.sub(r"[ \t]*\n[ \t]*", " \n", full)
    parts = re.split(r"\nQ\.(\d+) \n", "\n" + full)
    out = {}
    for i in range(1, len(parts), 2):
        body = re.split(r"\nQ\.\d+ – Q\.\d+|END OF THE QUESTION PAPER", parts[i + 1])[0]
        out[int(parts[i])] = re.sub(r"\s*\n\s*", " ", body).strip()
    return out
