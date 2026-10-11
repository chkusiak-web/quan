"""Paint the animals and loose petals out of the pixel map, so they can come
back as animated sprites.

Each box below holds one thing to remove. Inside a box, a pixel is erased
unless its colour is common on the box's border (the border is the
background around the thing). In petal boxes pink is always erased, even
where the border is pink too. Erased pixels are filled from the outside in,
each taking the most common colour among its already-filled neighbours.

Usage: python3 tools/erase-sprites.py public/reference/baotu-512x320.png
"""
import colorsys
import sys
from collections import Counter
from PIL import Image

BOXES = {
    # birds in the sky
    'swallow-1': (210, 40, 243, 65),
    'swallow-2': (263, 75, 289, 97),
    'swallow-3': (426, 111, 441, 124),
    # loose petals
    'petal-trunk-1': (29, 51, 40, 62),
    'petal-trunk-2': (20, 89, 31, 100),
    'petal-trunk-3': (4, 100, 16, 110),
    'petal-mountain': (89, 117, 101, 128),
    'petal-shore': (152, 136, 165, 149),
    'petal-edge': (5, 143, 16, 154),
    'petal-trunk-4': (15, 185, 28, 195),
    'petal-house': (135, 163, 148, 175),
    'petal-slope-1': (135, 186, 144, 195),
    'petal-slope-2': (132, 200, 152, 213),
    'petal-pool-1': (183, 260, 193, 270),
    'petal-pool-2': (228, 256, 240, 268),
    'petal-lake': (364, 188, 375, 199),
    'petal-far-trees': (111, 153, 121, 162),
    'petal-slope-3': (247, 242, 258, 253),
    'petal-slope-4': (308, 248, 319, 259),
    'petal-pool-3': (197, 271, 208, 282),
    'petal-bank': (453, 292, 464, 303),
    # lake birds and their reflections
    'ducks': (421, 197, 449, 211),
    'egret': (459, 190, 481, 232),
}

path = sys.argv[1]
im = Image.open(path)
px = im.load()
w, h = im.size
pal = im.getpalette()


def pink(c):
    hu, s, v = colorsys.rgb_to_hsv(*(k / 255 for k in pal[c * 3:c * 3 + 3]))
    return (hu > 0.85 or hu < 0.05) and s > 0.08 and v > 0.6


for name, (x0, y0, x1, y1) in BOXES.items():
    border = Counter()
    for x in range(x0, x1 + 1):
        border[px[x, y0]] += 1
        border[px[x, y1]] += 1
    for y in range(y0, y1 + 1):
        border[px[x0, y]] += 1
        border[px[x1, y]] += 1
    total = sum(border.values())
    bg = {c for c, k in border.items() if k >= 0.08 * total}
    keep = (lambda c: c in bg and not pink(c)) if name.startswith('petal') else (lambda c: c in bg)
    hole = {(x, y) for y in range(y0 + 1, y1) for x in range(x0 + 1, x1) if not keep(px[x, y])}
    while hole:
        ring = []
        for (x, y) in hole:
            near = Counter(px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                           if (dx or dy) and (x + dx, y + dy) not in hole)
            if near:
                ring.append(((x, y), near.most_common(1)[0][0]))
        for (p, c) in ring:
            px[p] = c
            hole.discard(p)
    print(name, 'erased')

im.save(path, optimize=True)
