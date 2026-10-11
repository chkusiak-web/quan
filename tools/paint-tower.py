"""Chaoran Tower (超然楼) for the pixel map, drawn with the map's own colours.

Seen from across the lake, top to bottom: a bottle finial; a hip-and-gable
top roof with the gable facing us; an attic band with the name plaque; then
three storeys, each a deep charcoal eave with upturned corners over a gold
bracket band, red-brown columns and lattice windows, and a pale balcony
railing. The lowest storey sinks into the island trees.

  python3 tools/paint-tower.py erase   # paint the old tower out of the base map (once)
  python3 tools/paint-tower.py         # write public/reference/chaoran-tower.png
"""
import sys
from PIL import Image

BASE = 'public/reference/baotu-512x320.png'
OUT = 'public/reference/chaoran-tower.png'
CX = 397  # centre column

# Colours, by hex, all from the map's 72-colour palette.
INK = '#23242f'      # deepest roof shadow, tile lines
ROOF_D = '#3b4048'   # roof, shaded side
ROOF = '#4a5264'     # roof, lit side
RIDGE = '#7d7b83'    # ridge and eave lips
WOOD_D = '#3f3132'   # doorway, shadow under eaves
WOOD = '#55413c'     # walls between columns
COL = '#71524b'      # columns
COL_L = '#996460'    # lit columns, left side
LATTICE = '#d3c6a2'  # window lattice (warm, lights up at night)
RAIL = '#ded3c4'     # balcony railing
RAIL_D = '#9b908c'   # railing posts and base
GOLD = '#d0d56d'     # finial, bracket highlights, plaque frame


def tower():
    px = {}

    def put(x, y, c):
        px[(CX + x, y)] = c

    def row(y, hw, fn):
        for x in range(-hw, hw + 1):
            c = fn(x)
            if c:
                put(x, y, c)

    def tiles(x, i):
        # Tile rows: every other row is a shadow line; lit on the left.
        if i % 2:
            return ROOF_D if x < 0 else INK
        return ROOF if x < 0 else ROOF_D

    def corners(y, hw):
        # The eave lip sweeps up at both ends, two pixels thick.
        for s in (-1, 1):
            put(s * (hw + 1), y - 1, RIDGE)
            put(s * hw, y - 1, ROOF if s < 0 else ROOF_D)
            put(s * (hw + 2), y - 2, RIDGE)
            put(s * (hw + 1), y - 2, ROOF if s < 0 else ROOF_D)

    # Finial: a gold bottle on a grey base.
    put(0, 93, GOLD)
    put(0, 94, GOLD)
    row(95, 1, lambda x: GOLD if x <= 0 else RIDGE)
    row(96, 1, lambda x: GOLD if x <= 0 else RIDGE)
    put(0, 97, RIDGE)
    row(98, 2, lambda x: RIDGE)

    # Top roof, hip-and-gable: a short ridge with upturned ends, a gable
    # facing us framed in gold, and steep hips either side.
    row(99, 6, lambda x: RIDGE)
    for s in (-1, 1):
        put(s * 7, 98, RIDGE)
    for i, y in enumerate(range(100, 108)):
        hw = 7 + (i * 3) // 2
        g = i * 1.1
        def roof_px(x, i=i, g=g):
            if i < 6 and abs(x) <= g:
                if abs(x) >= g - 0.9:
                    return GOLD
                return COL_L if (i + x) % 2 else COL
            return tiles(x, i)
        row(y, hw, roof_px)
    row(108, 18, lambda x: RIDGE)               # eave lip
    corners(108, 18)
    row(109, 15, lambda x: INK)                 # shadow under the eave

    # Attic band with the name plaque.
    for y in (110, 111):
        row(y, 11, lambda x: COL if abs(x) % 4 == 3 else (LATTICE if y == 110 and abs(x) > 3 else WOOD))
    row(110, 3, lambda x: GOLD if abs(x) == 3 else INK)
    row(111, 3, lambda x: GOLD)

    # Three storeys, widening slightly toward the bottom.
    y = 112
    for k, (top, bot, wall, rail) in enumerate([(12, 18, 12, 14), (13, 19, 13, 15), (14, 20, 14, 16)]):
        for i in range(4):                       # eave: slopes out and down
            hw = top + (bot - top) * (i + 1) // 4
            row(y + i, hw, lambda x, i=i: tiles(x, i))
        row(y + 4, bot + 1, lambda x: RIDGE)    # lip
        corners(y + 4, bot + 1)
        row(y + 5, wall, lambda x: GOLD if x % 2 == 0 else WOOD_D)   # bracket band
        if k == 2:
            break                                # the lowest storey hides in the trees
        for j in range(4):                       # columns, lattice windows, doorway
            def wall_px(x, j=j):
                if abs(x) % 4 == 0:
                    return COL_L if x < 0 else COL
                if abs(x) <= 1:
                    return WOOD_D
                return LATTICE if j in (1, 2) else WOOD
            row(y + 6 + j, wall, wall_px)
        row(y + 10, rail, lambda x: RAIL)                       # railing
        row(y + 11, rail, lambda x: RAIL_D if x % 2 else RAIL)  # posts
        y += 12
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
    im.save(BASE, optimize=True)
    print('erased old tower')
else:
    out = Image.new('RGBA', (512, 320), (0, 0, 0, 0))
    for (x, y), c in tower().items():
        out.putpixel((x, y), rgb(c) + (255,))
    out.save(OUT, optimize=True)
    print('wrote', OUT)
