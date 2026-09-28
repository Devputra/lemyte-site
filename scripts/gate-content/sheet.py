"""Contact sheet of given image files: python3 sheet.py out.png file1 file2 ..."""
import os
import sys

from PIL import Image, ImageDraw

out, *files = sys.argv[1:]
sheet = Image.new("RGB", (1800, 300 * ((len(files) + 4) // 5)), "white")
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    t = Image.open(f)
    t.thumbnail((340, 270))
    x, y = (i % 5) * 360, (i // 5) * 300
    sheet.paste(t, (x, y + 15))
    dr.text((x, y), os.path.basename(f), fill="red")
sheet.save(out)
