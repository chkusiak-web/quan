"""Chaoran Tower (超然楼) for the pixel map, in the map's own colours.

Drawn in three-quarter view like the village houses: a lit front face on
the left, a shaded side face on the right that rises slightly as it
recedes, and the near corner between them. Roofs are tiled like the house
roofs, with tile lines fanning down and out over multicoloured grey-blues.
Top to bottom: gold bottle finial, hip-and-gable roof with the gable on the
side face, then three storeys of upturned eaves over gold brackets, red
columns, lattice windows and pale balconies. The lowest storey sinks into
the island trees.

Pixels at alpha 255 are lights (they glow at night); roofs are drawn at
alpha 254 and stay dark.

  python3 tools/paint-tower.py erase   # paint the old tower and its reflection out of the base map (once)
  python3 tools/paint-tower.py         # write chaoran-tower.png and chaoran-reflection.png
"""
import math
import random
import sys
from PIL import Image

BASE = 'public/reference/baotu-512x320.png'
OUT = 'public/reference/chaoran-tower.png'
REFLECTION = 'public/reference/chaoran-reflection.png'
WATERLINE = 158
XC = 402  # the near corner

# Roof tiles, from the house roofs.
NAVY = '#213b5c'
INK = '#23242f'
SLATE_D = '#3b4048'
SLATE = '#4a5264'
SLATE_L = '#596d88'
GREY = '#676667'
RIDGE = '#7d7b83'
# Woodwork and trim.
WOOD_D = '#3f3132'
WOOD = '#55413c'
COL = '#71524b'
COL_L = '#996460'
LATTICE = '#d3c6a2'
RAIL = '#ded3c4'
RAIL_D = '#9b908c'
GOLD = '#d9a441'    # added to the palette
GOLD_D = '#a8762c'  # added to the palette
# How the tower's colours look mirrored in the lake.
MIRROR = {NAVY: '#3e85b1', INK: '#3e85b1', SLATE_D: '#3e85b1', SLATE: '#4994c9', SLATE_L: '#4994c9', GREY: '#4994c9',
          WOOD_D: '#bc6c91', WOOD: '#bc6c91', COL: '#d680a6', COL_L: '#d680a6', RIDGE: '#88c9f9',
          LATTICE: '#b0d9fa', RAIL: '#b0d9fa', RAIL_D: '#88c9f9', GOLD: '#d3c6a2', GOLD_D: '#d3c6a2'}

px = {}
rand = random.Random(7)


def put(x, y, c, lit=True):
    px[(x, y)] = (c, lit)


def rise(x):
    """The side face climbs one pixel for every four it recedes."""
    return (x - XC) // 4 if x > XC else 0


def tile(u, width, n, r, front):
    """Colour of a roof pixel: u in 0..1 across its face, r the row."""
    d = abs(u * n - round(u * n)) * width / n
    if d < 0.5:
        return (SLATE if rand.random() < 0.4 else NAVY) if front else INK
    k = int(u * n)
    if front:
        c = SLATE_L if k % 2 else SLATE
        if rand.random() < (0.25 if r < 2 else 0.1):
            c = RIDGE
    else:
        c = SLATE_D if k % 2 else SLATE
        if rand.random() < 0.08:
            c = SLATE_L
    if rand.random() < 0.06:
        c = GREY
    return c


def eave(y0, f, s, e, h=3):
    """A roof skirt: rows widen downward, tiles fan out, lip sweeps up."""
    for r in range(h):
        out = round(e * (r + 1) / h)
        xl, xr = XC - f - out, XC + s + out
        for x in range(xl, xr + 1):
            if x <= XC:
                c = tile((x - xl) / max(1, XC - xl), XC - xl, max(2, (XC - xl) // 3), r, True)
            else:
                c = tile((x - XC) / max(1, xr - XC), xr - XC, max(2, (xr - XC) // 3), r, False)
            if x == XC or x == XC + 1 and r > 2:
                c = RIDGE  # the hip over the near corner
            put(x, y0 + r - rise(x), c, False)
    lip = y0 + h
    xl, xr = XC - f - e, XC + s + e
    for x in range(xl, xr + 1):
        put(x, lip - rise(x), RIDGE if x <= XC else GREY, True)
        put(x, lip + 1 - rise(x), INK, False)
    # Upturned ends.
    put(xl - 1, lip - 1, RIDGE)
    put(xl - 2, lip - 2, RIDGE)
    put(xl - 1, lip - 2, SLATE_L, False)
    put(xr + 1, lip - 1 - rise(xr + 1), GREY)
    put(xr + 2, lip - 2 - rise(xr + 2), GREY)
    put(xr + 1, lip - 2 - rise(xr + 1), SLATE, False)
    return lip + 2


def brackets(y, f, s):
    for x in range(XC - f, XC + s + 1):
        lit = x <= XC
        put(x, y - rise(x), (GOLD if lit else GOLD_D) if x % 2 == 0 else WOOD_D)


def walls(y, f, s, rows):
    for j in range(rows):
        for x in range(XC - f, XC + s + 1):
            if x <= XC:
                k = XC - x
                if k % 4 == 0:
                    c = COL_L
                elif abs(x - (XC - f // 2)) <= 0:
                    c = WOOD_D  # doorway in the middle of the front
                else:
                    c = LATTICE if j in (1, 2) else WOOD
            else:
                k = x - XC
                c = COL if k % 4 == 0 else (RAIL_D if j in (1, 2) else WOOD_D)
            put(x, y + j - rise(x), c)
    return y + rows


def balcony(y, f, s):
    for x in range(XC - f, XC + s + 1):
        front = x <= XC
        put(x, y - rise(x), RAIL if front else RAIL_D)
        put(x, y + 1 - rise(x), (RAIL_D if x % 2 else RAIL) if front else (WOOD_D if x % 2 else RAIL_D))
    return y + 2


def top_roof(y0, f, s):
    """Hip-and-gable: tiled front slope, gable on the side face, ridge."""
    h = 7
    for r in range(h):
        out = (r * 3) // 4
        xl, xr = XC - f + 3 - out, XC + s - 2 + out // 2
        for x in range(xl, min(xr, XC) + 1):
            put(x, y0 + r, tile((x - xl) / max(1, XC - xl), XC - xl, max(2, (XC - xl) // 3), r, True), False)
        # Gable on the side face: a triangle of wood framed in gold.
        gw = r  # half-width grows down
        gc = XC + s // 2 + 1
        for x in range(XC + 1, xr + 3):
            dx = x - gc
            if abs(dx) <= gw * 0.8:
                edge = abs(dx) > gw * 0.8 - 1
                put(x, y0 + r - rise(x), GOLD_D if edge else (COL if (x + r) % 2 else WOOD))
            else:
                put(x, y0 + r - rise(x), tile(0.5, 4, 2, r, False), False)
    for x in range(XC - f + 3, XC + s // 2 + 2):
        put(x, y0 - 1 - rise(x), RIDGE)          # the ridge
    put(XC - f + 2, y0 - 2, RIDGE)               # ridge ends curl up
    put(XC + s // 2 + 2, y0 - 2 - rise(XC + s // 2 + 2), GREY)
    # Finial over the middle of the ridge.
    fx = XC - f // 2 + 1
    put(fx, y0 - 7, GOLD)
    put(fx, y0 - 6, GOLD)
    for dy in (-5, -4):
        put(fx - 1, y0 + dy, GOLD)
        put(fx, y0 + dy, GOLD)
        put(fx + 1, y0 + dy, GOLD_D)
    put(fx, y0 - 3, RIDGE)
    for dx in (-1, 0, 1):
        put(fx + dx, y0 - 2, RIDGE)
    return y0 + h


def tower():
    y = 100
    y = top_roof(y, 11, 7)
    y = eave(y, 11, 7, 5, h=2)          # top roof's own skirt
    # Attic with the plaque.
    for x in range(XC - 10, XC + 7):
        put(x, y - rise(x), WOOD if x <= XC else WOOD_D)
        put(x, y + 1 - rise(x), LATTICE if x <= XC else RAIL_D)
    for dx in range(-3, 4):
        put(XC - 5 + dx, y, GOLD if abs(dx) == 3 else INK)
        put(XC - 5 + dx, y + 1, GOLD)
    y += 2
    for k, (f, s) in enumerate([(12, 7), (13, 8), (14, 8)]):
        y = eave(y, f, s, 4)
        brackets(y, f - 1, s - 1)
        y += 1
        if k == 2:
            break
        y = walls(y, f - 1, s - 1, 4)
        y = balcony(y, f + 1, s + 1)
    return px


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


if len(sys.argv) > 1 and sys.argv[1] == 'erase':
    # Paint the old tower out: above the island treeline (row 136) every
    # pixel in its box is replaced by the pixel 36 columns to the left on the
    # same row, so clouds and ridges carry on behind the new tower.
    im = Image.open(BASE)
    p = im.load()
    for y in range(98, 136):
        for x in range(380, 415):
            p[x, y] = p[x - 36, y]
    # ...and its red reflection: the lake 40 columns to the left carries on.
    for y in range(160, 206):
        for x in range(378, 418):
            p[x, y] = p[x - 40, y]
    im.save(BASE, optimize=True)
    print('erased old tower')
else:
    out = Image.new('RGBA', (512, 320), (0, 0, 0, 0))
    for (x, y), (c, lit) in tower().items():
        if 0 <= x < 512 and 0 <= y < 320:
            out.putpixel((x, y), rgb(c) + (255 if lit else 254,))
    out.save(OUT, optimize=True)
    print('wrote', OUT, out.getbbox())
    # The reflection: mirrored about the waterline, squashed a little, broken
    # into ripples that sway sideways and thin out with depth.
    ref = Image.new('RGBA', (512, 320), (0, 0, 0, 0))
    rr = random.Random(11)
    for (x, y), (c, lit) in sorted(px.items()):
        ry = round(WATERLINE + 2 + (WATERLINE - y) * 0.9)
        if ry % 4 == 3 or rr.random() < 0.05 + (ry - WATERLINE) / 160:
            continue
        rx = x + round(math.sin(ry * 1.7))
        if 0 <= rx < 512 and ry < 320:
            ref.putpixel((rx, ry), rgb(MIRROR[c]) + (254,))
    ref.save(REFLECTION, optimize=True)
    print('wrote', REFLECTION)
