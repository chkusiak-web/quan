"""Write a palette-indexed PNG from pixelate.py as a JS module.

Each pixel also gets a region (land, sky, water, cloud) so the page can
recolour each separately per time of day. Colours and regions are stored as
two byte arrays, PIXELS and REGION.

Usage: python3 tools/pixmap-to-js.py public/reference/baotu-512x320.png src/pixmap/baotu.js
"""
import base64
import colorsys
import sys
from collections import deque
from PIL import Image

LAND, SKY, WATER, CLOUD, MOUNTAIN = 0, 1, 2, 3, 4
HORIZON = 140  # rows below this can be water; sky never reaches it

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
assert im.mode == "P", "expected a palette PNG from pixelate.py"
w, h = im.size
used = sorted({i for _, i in im.getcolors()})
n = len(used)
remap = {old: new for new, old in enumerate(used)}
pal = im.getpalette()
colors = ["#%02x%02x%02x" % tuple(pal[i * 3:i * 3 + 3]) for i in used]
hsv = [colorsys.rgb_to_hsv(*(int(c[k:k + 2], 16) / 255 for k in (1, 3, 5))) for c in colors]
idx = [remap[p] for p in im.tobytes()]


def pinkish(c):
    hu, s, v = hsv[c]
    return s > 0.05 and (hu > 0.8 or hu < 0.15)


def skyish(c):
    hu, s, v = hsv[c]
    if pinkish(c):  # blossom highlights, never sky
        return False
    return v > 0.9 and ((0.53 < hu < 0.62 and s > 0.12) or s < 0.15)


def cloud_core(c):
    hu, s, v = hsv[c]
    return v > 0.93 and s < 0.12 and not pinkish(c)


def cloud_shade(c):
    hu, s, v = hsv[c]
    return cloud_core(c) or (v > 0.93 and s < 0.38 and 0.5 < hu < 0.65)


def waterish(c):
    hu, s, v = hsv[c]
    return 0.5 < hu < 0.62 and s > 0.2 and v > 0.45


# Sky: flood fill from the top edge through sky blues and cloud whites.
region = [LAND] * (w * h)
queue = deque(x for x in range(w) if skyish(idx[x]))
for p in queue:
    region[p] = SKY
while queue:
    p = queue.popleft()
    x, y = p % w, p // w
    for q, ok in ((p - 1, x > 0), (p + 1, x < w - 1), (p - w, y > 0), (p + w, y < h - 1)):
        if ok and region[q] == LAND and skyish(idx[q]):
            region[q] = SKY
            queue.append(q)

# Close specks: cloud outlines and gaps between blossoms that the fill
# skipped, when mostly surrounded by sky.
for _ in range(3):
    flip = []
    for y in range(1, HORIZON):
        for x in range(1, w - 1):
            p = y * w + x
            if region[p] == LAND and sum(region[q] == SKY for q in (p - 1, p + 1, p - w, p + w)) >= 3:
                flip.append(p)
    for p in flip:
        region[p] = SKY

for p in range(HORIZON * w, w * h):
    if waterish(idx[p]):
        region[p] = WATER

# Clouds: grow from the white cores through their pale-blue shading, so a
# cloud's own shadows are recoloured as cloud, not as sky.
queue = deque(p for p in range(w * h) if region[p] == SKY and cloud_core(idx[p]))
for p in queue:
    region[p] = CLOUD
while queue:
    p = queue.popleft()
    x, y = p % w, p // w
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            qx, qy = x + dx, y + dy
            if 0 <= qx < w and 0 <= qy < h:
                q = qy * w + qx
                if region[q] == SKY and cloud_shade(idx[q]):
                    region[q] = CLOUD
                    queue.append(q)

# Mountains: the distant ranges are painted in sky blues, so they are found
# by shape. RIDGE is the skyline of the ranges, traced by hand; FOOT is
# where they meet the far shore. Between them, every blue or grey-blue pixel
# is mountain; blossoms, branches, trees and the tower are left alone.
RIDGE = [(0, 112), (40, 112), (60, 110), (80, 111), (100, 113), (120, 112), (140, 111), (155, 110), (170, 113),
         (180, 118), (190, 121), (205, 119), (220, 113), (240, 110), (260, 112), (275, 111), (290, 113), (300, 112),
         (310, 114), (325, 117), (335, 117), (350, 113), (365, 110), (385, 108), (400, 109), (415, 112), (430, 117),
         (440, 121), (455, 121), (470, 118), (485, 115), (500, 118), (511, 118)]
FOOT = [(0, 142), (250, 142), (290, 138), (511, 138)]


def along(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return round(y0 + (y1 - y0) * (x - x0) / (x1 - x0))
    return pts[-1][1]


def mountainish(c):
    hu, s, v = hsv[c]
    return not pinkish(c) and v > 0.6 and (0.5 < hu < 0.78 or s < 0.15)


ridge = [along(RIDGE, x) for x in range(w)]
for x in range(w):
    for y in range(ridge[x], along(FOOT, x) + 1):
        p = y * w + x
        if mountainish(idx[p]):
            region[p] = MOUNTAIN

# Above the ridge, pale sky is horizon haze and goes with the clouds; deeper
# blue stays flat sky.
for x in range(w):
    for y in range(90, ridge[x]):
        p = y * w + x
        if region[p] == SKY and hsv[idx[p]][1] < 0.42:
            region[p] = CLOUD

data = bytes(idx)
regions = bytes(region)

hexes = ",\n".join("  " + ", ".join(f"'{c}'" for c in colors[i:i + 8]) for i in range(0, n, 8))


def b64lines(raw):
    b64 = base64.b64encode(raw).decode()
    return "\n".join(f"  '{b64[i:i + 120]}' +" for i in range(0, len(b64), 120)).rstrip(" +")


with open(dst, "w") as f:
    f.write(f"""// Generated by tools/pixmap-to-js.py from {src}. Do not edit by hand.
// {w} x {h} pixels, {n} colours. PIXELS holds each pixel's colour, REGION its region.

export const W = {w};
export const H = {h};

export const REGIONS = ['land', 'sky', 'water', 'cloud', 'mountain'];

export const PALETTE = [
{hexes},
];

export const PIXELS = Uint8Array.from(atob(
{b64lines(data)}
), (c) => c.charCodeAt(0));

export const REGION = Uint8Array.from(atob(
{b64lines(regions)}
), (c) => c.charCodeAt(0));
""")
print(dst, w, h, n, "colours")
