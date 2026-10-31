"""Compare the parity screenshots from tests/parity.spec.ts.

For each section shot on both sites it prints how much of the image differs
and writes a side-by-side image (prototype left, new site right) into
tests/screenshots/parity/compare/. Needs Python 3 with Pillow.
Usage (from the project root):  python3 tools/compare-parity.py
"""
import glob, os
from PIL import Image, ImageChops

folder = "tests/screenshots/parity"
out = os.path.join(folder, "compare")
os.makedirs(out, exist_ok=True)

for ref_path in sorted(glob.glob(f"{folder}/*-ref.png")):
    new_path = ref_path.replace("-ref.png", "-new.png")
    name = os.path.basename(ref_path)[: -len("-ref.png")]
    if not os.path.exists(new_path):
        print(f"{name:28} missing on the new site")
        continue
    a = Image.open(ref_path).convert("RGB")
    b = Image.open(new_path).convert("RGB")
    w, h = max(a.width, b.width), max(a.height, b.height)
    pa, pb = Image.new("RGB", (w, h), "white"), Image.new("RGB", (w, h), "white")
    pa.paste(a, (0, 0))
    pb.paste(b, (0, 0))
    diff = ImageChops.difference(pa, pb).convert("L").point(lambda v: 255 if v > 24 else 0)
    changed = sum(diff.histogram()[255:]) / (w * h) * 100
    size_note = "" if a.size == b.size else f"  size {a.size} -> {b.size}"
    print(f"{name:28} {changed:6.2f}% differs{size_note}")
    side = Image.new("RGB", (w * 2 + 16, h), (255, 0, 120))
    side.paste(pa, (0, 0))
    side.paste(pb, (w + 16, 0))
    side.save(os.path.join(out, f"{name}.png"))
