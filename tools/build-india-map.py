"""Build src/data/india-map.json for the growth map: a hex dot grid of India
tagged by state, plus simplified state outlines, all in one projected
coordinate space (see components/growth/growth-map.ts).

Usage (from the project root):  npm run map
  Downloads the two boundary files into .cache/india-map/ (once), then writes
  src/data/india-map.json. Needs Python 3 with Pillow.

Sources
  india.geojson   AbhinavSwami28/india-official-geojson (MIT): official
                  boundaries incl. full J&K, Ladakh and Arunachal Pradesh.
  gb-adm1.geojson geoBoundaries IND ADM1 from DataMeet (CC BY 2.5 IN): used
                  only for Andhra Pradesh and Telangana, which the first set
                  still has as one pre-2014 state.
Keep the official boundaries: never swap in a dataset cut at the Line of Control.
"""
import json, math, os, sys, urllib.request
from PIL import Image, ImageDraw

SOURCES = {
    "india.geojson": "https://raw.githubusercontent.com/AbhinavSwami28/india-official-geojson/main/india-states-simplified.geojson",
    "gb-adm1.geojson": "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1_simplified.geojson",
}
geo_dir = sys.argv[1] if len(sys.argv) > 1 else ".cache/india-map"
out_path = sys.argv[2] if len(sys.argv) > 2 else "src/data/india-map.json"
os.makedirs(geo_dir, exist_ok=True)
for name, url in SOURCES.items():
    path = os.path.join(geo_dir, name)
    if not os.path.exists(path):
        print("downloading", name)
        urllib.request.urlretrieve(url, path)

official = json.load(open(f"{geo_dir}/india.geojson"))["features"]
gb = json.load(open(f"{geo_dir}/gb-adm1.geojson"))["features"]

rename = {"Orissa": "Odisha", "Uttaranchal": "Uttarakhand", "Andaman and Nicobar": "Andaman and Nicobar Islands"}
states = []
for f in official:
    name = f["properties"]["NAME_1"]
    if name == "Andhra Pradesh":
        continue
    states.append((rename.get(name, name), f["geometry"]))
for f in gb:
    n = f["properties"]["shapeName"]
    if n in ("Andhra Pradesh", "Telangāna"):
        states.append(("Telangana" if n.startswith("Telang") else n, f["geometry"]))


def polygons(geom):
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


# Projection: equirectangular, x scaled by cos of the mid latitude
lons, lats = [], []
for _, g in states:
    for poly in polygons(g):
        for lon, lat in poly[0]:
            lons.append(lon); lats.append(lat)
lon_min, lon_max, lat_min, lat_max = min(lons), max(lons), min(lats), max(lats)
cos0 = math.cos(math.radians((lat_min + lat_max) / 2))
W = 1000
pad = 16
k = (W - 2 * pad) / ((lon_max - lon_min) * cos0)
H = round((lat_max - lat_min) * k + 2 * pad)


def project(lon, lat):
    return (pad + (lon - lon_min) * cos0 * k, pad + (lat_max - lat) * k)


# Paint a label raster: biggest states first so small UTs stay on top
def ring_area(r):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]))) / 2


projected = []
for name, g in states:
    polys = [[[project(*p) for p in ring] for ring in poly] for poly in polygons(g)]
    area = sum(ring_area(p[0]) for p in polys)
    projected.append((name, polys, area))
projected.sort(key=lambda s: -s[2])

SS = 4  # raster supersampling
label = Image.new("I", (W * SS, H * SS), 0)
draw = ImageDraw.Draw(label)
for idx, (name, polys, _) in enumerate(projected, start=1):
    for poly in polys:
        draw.polygon([(x * SS, y * SS) for x, y in poly[0]], fill=idx)
        for hole in poly[1:]:
            draw.polygon([(x * SS, y * SS) for x, y in hole], fill=0)
px = label.load()

# Hex grid of dots, stored per row as runs: [row, startCol, length, state]
S = 8.5
RH = S * math.sqrt(3) / 2
runs, count = [], 0
rows = int((H - 2) / RH)
cols = int(W / S) + 1
for r in range(rows):
    y = 2 + r * RH + RH / 2
    off = S / 2 if r % 2 else 0
    run = None
    for c in range(cols):
        x = c * S + off + S / 4
        v = px[int(x * SS), int(y * SS)] if x < W and y < H else 0
        if run and run[3] == v and run[1] + run[2] == c:
            run[2] += 1
            continue
        if run and run[3]:
            runs.append(run); count += run[2]
        run = [r, c, 1, v]
    if run and run[3]:
        runs.append(run); count += run[2]

# Islands too small to catch a grid point still get one dot each, unless a
# dot already sits nearby (coastal islets would only add noise)
taken = []
for r_, c0, n, _ in runs:
    for c in range(c0, c0 + n):
        taken.append((c * S + (S / 2 if r_ % 2 else 0) + S / 4, 2 + r_ * RH + RH / 2))
extra = []
for idx, (name, polys, _) in enumerate(projected, start=1):
    for poly in polys:
        ring = poly[0]
        if ring_area(ring) > S * RH:
            continue
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        if any((cx - x) ** 2 + (cy - y) ** 2 < (S * 1.6) ** 2 for x, y in taken):
            continue
        taken.append((cx, cy))
        extra.append([round(cx, 1), round(cy, 1), idx])


# Outlines, simplified (Ramer-Douglas-Peucker) to about a unit
def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / norm
        if d > best:
            best, idx = d, i
    if best > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def path(polys):
    out = []
    for poly in polys:
        for ring in poly:
            if ring_area(ring) < 12:
                continue
            # A closed ring has no baseline, so simplify it as two halves
            half = len(ring) // 2
            pts = rdp(ring[: half + 1], 1.1)[:-1] + rdp(ring[half:], 1.1)
            if len(pts) < 4:
                continue
            out.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts[:-1]) + "Z")
    return "".join(out)


data = {
    "width": W,
    "height": H,
    "spacing": S,
    "rowHeight": round(RH, 4),
    "projection": {"lonMin": lon_min, "latMax": lat_max, "cos": cos0, "k": k, "pad": pad},
    "states": [{"name": name, "d": path(polys)} for name, polys, _ in projected],
    "runs": [v for run in runs for v in run],
    "islands": [v for e in extra for v in e],
}
with open(out_path, "w") as fh:
    json.dump(data, fh, separators=(",", ":"), ensure_ascii=False)
print("size", W, H, "dots", count + len(extra), "runs", len(runs), "states", len(projected))
