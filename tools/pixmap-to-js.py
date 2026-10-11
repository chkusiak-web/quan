"""Write a palette-indexed PNG from pixelate.py as a JS module.

Each pixel also gets a region (land, sky, water, cloud) so the page can
recolour each separately per time of day, and a layer (sky, clouds, ...,
tree) so animated sprites can be drawn between layers. Colours, regions and
layers are stored as byte arrays: PIXELS, REGION and LAYER.

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

# Sky pockets: gaps between blossoms and branches are cut off from the top
# edge, so the fill misses them. The deep sky blues appear nowhere else in
# the upper picture, so any of them above the mountains is sky.
def deep_sky(c):
    hu, s, v = hsv[c]
    return 0.54 < hu < 0.6 and s > 0.55 and v > 0.93


for y in range(HORIZON):
    for x in range(w):
        p = y * w + x
        if region[p] == LAND and deep_sky(idx[p]):
            region[p] = SKY
        elif region[p] == LAND and y < 118:
            hu, sa, v = hsv[idx[p]]
            if 0.53 < hu < 0.62 and sa > 0.12 and v > 0.9:  # pale sky through the knot-hole
                region[p] = SKY

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
                if region[q] in (SKY, LAND) and qy < HORIZON and cloud_shade(idx[q]):
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

# Chaoran Tower is drawn separately (tools/paint-tower.py) and laid over the
# map here, in the map's own colours.
import os
tower_px = set()
overlay = os.path.join(os.path.dirname(src), 'chaoran-tower.png')
if os.path.exists(overlay):
    by_hex = {c: i for i, c in enumerate(colors)}
    ov = Image.open(overlay).convert('RGBA')
    for y in range(h):
        for x in range(w):
            r_, g_, b_, a_ = ov.getpixel((x, y))
            if a_:
                p = y * w + x
                idx[p] = by_hex['#%02x%02x%02x' % (r_, g_, b_)]
                region[p] = LAND
                tower_px.add(p)

# ---------------------------------------------------------------- layers
# Every pixel belongs to exactly one layer, so stacking them back to front
# rebuilds the picture. Animated sprites are drawn between layers.
LAYERS = ['sky', 'clouds', 'mountains', 'island', 'tower', 'lake', 'village', 'ground', 'pool', 'tree']
L = {name: i for i, name in enumerate(LAYERS)}
layer = [None] * (w * h)


def inside(poly, x, y):
    hit = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (x1 - x0) * (y - y0) / (y1 - y0):
            hit = not hit
    return hit


# The cherry tree: everything connected to the top-left corner through
# blossom pinks, bark browns and the dark of its branches.
def treeish(c, y):
    hu, s, v = hsv[c]
    if pinkish(c):
        return True
    if v < 0.42 and (hu < 0.12 or hu > 0.8):  # bark and branch shadow
        return True
    if v < 0.3 and s < 0.35:  # near-black cracks in the bark
        return True
    return y < 112 and 0.15 < hu < 0.45 and s > 0.3  # young leaves in the canopy


tree = set()
queue = deque([0])
tree.add(0)
while queue:
    p = queue.popleft()
    x, y = p % w, p // w
    for q, ok in ((p - 1, x > 0), (p + 1, x < w - 1), (p - w, y > 0), (p + w, y < 235)):
        if ok and q not in tree and q % w < 270 and region[q] == LAND and treeish(idx[q], q // w):
            tree.add(q)
            queue.append(q)

# Soften the tree's outline: edge pixels painted as a blend of blossom and
# sky blue get a blossom shadow (or bark, next to bark) instead, so the
# outline matches the tree at every time of day. Those pixels join the tree.
rgb = [tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) for c in colors]
lum = [0.3 * r + 0.59 * g + 0.11 * b for r, g, b in rgb]
blossom_shade = min((c for c in range(n) if pinkish(c) and 0.5 < hsv[c][2] < 0.9 and hsv[c][1] > 0.3),
                    key=lambda c: abs(lum[c] - 140))
for _ in range(2):  # a second pass reaches specks tucked one pixel further in
    fringe = []
    for p in range(w * h):
        x, y = p % w, p // w
        if p in tree or x >= 270 or y >= 235 or region[p] != LAND:
            continue
        hu, s, v = hsv[idx[p]]
        if not (0.5 < hu < 0.78 or s < 0.12):
            continue
        near = [q for q in (p - 1, p + 1, p - w, p + w, p - w - 1, p - w + 1, p + w - 1, p + w + 1)
                if 0 <= q < w * h and q in tree]
        if near:
            dark = sum(hsv[idx[q]][2] < 0.42 for q in near) > len(near) / 2
            fringe.append((p, min(near, key=lambda q: lum[idx[q]]) if dark else None))
    for p, bark in fringe:
        idx[p] = idx[bark] if bark is not None else blossom_shade
        tree.add(p)

# The knot-hole in the trunk shows plain sky above the ridge and mountain
# below it, instead of the jumble of bands it was painted with.
for y in range(80, 130):
    for x in range(20, 70):
        p = y * w + x
        if p not in tree and region[p] != LAND:
            region[p] = SKY if y < ridge[x] else MOUNTAIN

ISLAND = [(300, 128), (512, 128), (512, 163), (300, 163)]
FAR_SHORE = [(90, 138), (300, 138), (300, 160), (90, 160)]
LAKE = [(215, 145), (512, 145), (512, 252), (470, 246), (430, 226), (392, 216), (332, 200), (272, 166), (215, 160)]
POOL = [(0, 228), (60, 225), (130, 228), (200, 236), (240, 250), (258, 280), (250, 320), (0, 320)]
GROUND = [(0, 212), (60, 205), (120, 214), (200, 234), (262, 250), (300, 262), (332, 282), (360, 296), (512, 296),
          (512, 320), (0, 320)]

for p in range(w * h):
    x, y = p % w, p // w
    r = region[p]
    if p in tree:
        name = 'tree'
    elif p in tower_px:
        name = 'tower'
    elif r == SKY:
        name = 'sky'
    elif r == CLOUD:
        name = 'clouds'
    elif r == MOUNTAIN:
        name = 'mountains'
    elif r == LAND and (inside(ISLAND, x, y) or inside(FAR_SHORE, x, y)):
        name = 'island'
    elif inside(POOL, x, y):
        name = 'pool'
    elif inside(GROUND, x, y):
        name = 'ground'
    elif inside(LAKE, x, y) and (r == WATER or y > 165):
        name = 'lake'
    elif y < ridge[x] or (x < 250 and y < 132) or (x < 120 and y < 150):
        name = 'tree'  # loose florets and leaves just off the canopy
    elif y < 150:
        name = 'island'
    else:
        name = 'village'
    layer[p] = L[name]

data = bytes(idx)
regions = bytes(region)
layers = bytes(layer)

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

export const LAYERS = {LAYERS!r};

export const LAYER = Uint8Array.from(atob(
{b64lines(layers)}
), (c) => c.charCodeAt(0));

export const REGION = Uint8Array.from(atob(
{b64lines(regions)}
), (c) => c.charCodeAt(0));
""")
print(dst, w, h, n, "colours")
