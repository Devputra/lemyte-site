"""Parse an official GATE answer-key PDF (text layer) into .gate-work/<CODE>/key.json.

    python3 parsekey.py <CODE> <key.pdf>

Handles rows "Q, session, type, section, key, marks[, negative]" with GA numbered 1-10 and the
subject section numbered either 11-65 (continuous) or 1-55 (restart → DB Q = 10 + n).
Scanned keys have no text layer: read them visually and write key.json by hand.
"""
import json
import os
import re
import sys

import fitz

from common import workdir

TYPES = ("MCQ", "MSQ", "NAT")
# cells that can continue a wrapped key; anything else (page headers, footers) ends the row
KEYLIKE = re.compile(r"-?[\d.]+( to -?[\d.]+)?|to|OR|or|[A-D]([;,] ?[A-D])*[;,]?|MTA\*?|Marks? to all|-?[\d.]+ to", re.I)


def parse(pdf):
    toks = []
    for p in fitz.open(pdf):
        for l in p.get_text().split("\n"):
            l = l.strip().replace("\xa0", " ").replace("– ", "-").replace("−", "-")
            m = re.fullmatch(r"(\d+)\s+(MCQ|MSQ|NAT)", l)  # "7 MCQ": session and type in one cell
            toks += list(m.groups()) if m else ([l] if l else [])
    rows, i = [], 0
    while i < len(toks) - 5:
        if re.fullmatch(r"\d+", toks[i]) and re.fullmatch(r"\d+", toks[i + 1]) and toks[i + 2] in TYPES:
            q, t, sec = int(toks[i]), toks[i + 2], toks[i + 3]
            j, parts = i + 4, []
            # key may wrap over several cells; it ends at the marks cell (1 or 2) that is followed by
            # a negative-marks cell (1/3, 2/3, 0), the next row, or the end
            while j < len(toks) and len(parts) < 6:
                nxt = toks[j + 1] if j + 1 < len(toks) else ""
                nxt2 = toks[j + 2] if j + 2 < len(toks) else ""
                if parts and toks[j] in ("1", "2") and (re.fullmatch(r"[12]/3|0", nxt) or not KEYLIKE.fullmatch(nxt) or
                                                        (re.fullmatch(r"\d+", nxt) and re.fullmatch(r"\d+", nxt2))):
                    break
                parts.append(toks[j])
                j += 1
            if j < len(toks) and toks[j] in ("1", "2"):
                rows.append((q, t, sec, re.sub(r"\s+", " ", " ".join(parts)).strip(), int(toks[j])))
                i = j + 1
                continue
        i += 1
    key, off = {}, 0
    for q, t, sec, k, m in rows:
        if sec != "GA" and q == 1:  # subject section restarts at 1 → DB Q = 10 + n
            off = 10
        dbq = q + (off if sec != "GA" else 0)
        k = re.sub(r"\s*[;,]\s*", ";", k.rstrip("*").strip())
        if k.upper() in ("MTA", "MARKS TO ALL"):
            k = "MTA"
        key[str(dbq)] = dict(type=t, key=k, marks=m)
    return key


if __name__ == "__main__":
    code, pdf = sys.argv[1:3]
    key = parse(pdf)
    assert len(key) == 65 and set(key) == {str(n) for n in range(1, 66)}, f"parsed {len(key)} rows"
    json.dump(key, open(os.path.join(workdir(code), "key.json"), "w"))
    print(" ".join(f"{q}:{key[q]['key']}" for q in sorted(key, key=int)))
