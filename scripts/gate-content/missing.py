"""Print question ranges still lacking a draft: python3 missing.py <CODE>  ->  "1 33" / "34 65" lines."""
import glob
import json
import sys

from common import workdir

w = workdir(sys.argv[1])
have = {int(x["q"]) for f in glob.glob(f"{w}/draft_*.json") for x in json.load(open(f))}
for lo, hi in ((1, 33), (34, 65)):
    if any(q not in have for q in range(lo, hi + 1)):
        print(lo, hi)
