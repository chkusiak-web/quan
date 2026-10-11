"""Chaoran Tower (超然楼) as a standalone pixel sprite, traced from a photo
taken across Daming Lake.

The shape follows the photo: the tower is square in plan, seen corner-on
with a side face on the left and the front face on the right, both drawn
the same (the side a shade darker). Each face has a raised gold-framed
gable on the top roof, a plaque on the attic, and the same bays of cream
panels, doors and dark openings on each storey. A gold bottle finial sits
where the ridges meet; three wide, thin eaves separate the storeys. The
base is left to the island trees.

From a distance the tower reads as a dark silhouette striped with thin
light bands (railings, wall panels, plaques). Colours are the ones the
island buildings around it use, so it sits in the same haze.

  python3 tools/tower-sprite.py out.png [preview.png]   # sprite and preview
  python3 tools/tower-sprite.py erase                   # paint the old tower out (once)
  python3 tools/tower-sprite.py bake                    # write the map overlays
"""
import math
import sys
from PIL import Image

W, H = 50, 62
OFF = 7  # drawing coordinates start this far in from the sprite's left edge
NC = 15   # the near corner: side face to the left, front face to the right

# Palette, sampled from the island buildings.
NAVY = '#275978'      # shadow under the eaves: blue-teal, like the island's shadows
TEAL = '#447773'      # the softer second step of that shadow
DARK = '#3b4048'      # dark wood, columns
SLATE = '#4a5264'     # roof tiles in shade, side-face wood
TILE = '#596d88'      # roof tiles catching the sky
EDGE = '#7d7b83'      # eave edges, ridge
PANEL = '#b4ab9b'     # warm grey-cream wall panels, toned down for the distance
PANEL_D = '#9b908c'   # the same panels in shade
RAIL = '#b4ab9b'      # balcony railings, lit
RAIL_D = '#9b908c'    # railings, side
WOOD = '#76605f'      # wood: columns, doors, posts; cool and muted like the island's (added to the palette)
WOOD_D = '#56484c'    # wood in shade (added to the palette)
OPEN = '#4a4250'      # dark openings, lifted for the haze (added to the palette)
GOLD = '#c49a4e'      # muted gold, added to the palette
GOLD_D = '#a8762c'
DOOR_BOARD = '#76605f'  # gable boards
SOFT = '#9e96bc'      # soft accent at the eave tips, close to the haze

px = {}


def put(x, y, c):
    x += OFF
    if 0 <= x < W and 0 <= y < H:
        px[(x, y)] = c


def hline(x0, x1, y, c, side=None):
    """A row; `side` is the colour to use left of the near corner."""
    for x in range(x0, x1 + 1):
        put(x, y, side if side and x < NC else c)


def eave(y, xl, xr, inset=3):
    """A thin, wide roof plate: a tiled top surface narrowing upward, a pale
    edge, a deep shadow underneath, and tips that flick up at each end."""
    hline(xl + inset, xr - inset, y, SLATE)                 # tiles toward the wall
    hline(xl + 1, xr - 1, y + 1, TILE, side=SLATE)         # tiles catching the sky
    hline(xl, xr, y + 2, EDGE, side=TILE)                  # the eave edge
    hline(xl + 2, xr - 2, y + 3, NAVY)                     # shadow under the eave
    # Tips: just a hint of the curve. The edge runs one pixel further, then a
    # single soft pixel steps up at the very end.
    for x0, d in ((xl, -1), (xr, 1)):
        put(x0 + d, y + 2, EDGE)
        put(x0 + 2 * d, y + 1, SOFT)
    # Hip line over the near corner.
    put(NC, y, EDGE)
    put(NC, y + 1, EDGE)
    return y + 4


def storey(y, xl, xr, rows=6):
    """Recessed walls: brown columns framing a regular row of cream panels
    on each face, with a door in the middle bay, then a railing projecting
    past the walls."""
    for j in range(rows):
        for x in range(xl, xr + 1):
            side = x < NC
            # Three bays on the side face, five on the front, evenly spaced;
            # the middle bay is a brown door, the rest cream panels.
            x0, x1, nb = (xl, NC, 3) if side else (NC, xr, 5)
            cols = [x0 + round(i * (x1 - x0) / nb) for i in range(nb + 1)]
            k = max(i for i in range(nb) if cols[i] <= x)
            bay = 'd' if k == nb // 2 else 'p'
            if x in cols:
                c = WOOD_D if side else WOOD                 # columns
            elif j == 0:
                c = TEAL                                     # second step of the eave shadow
            elif j == rows - 1:
                c = WOOD_D                                   # sill
            elif bay == 'o':
                c = OPEN
            elif bay == 'd':
                c = (WOOD_D if side else WOOD) if j > 1 else WOOD_D
            else:
                c = PANEL_D if side else PANEL
            put(x, y + j, c)
    # Balcony: rail, then posts.
    y += rows
    hline(xl - 2, xr + 2, y, RAIL, side=RAIL_D)
    for x in range(xl - 2, xr + 3):
        put(x, y + 1, (WOOD if x % 2 else RAIL_D) if x >= NC else (WOOD_D if x % 2 else SLATE))
    return y + 2


def gable(gc, gw, gh, peak, side):
    """A gable: brown boards framed by continuous gold bargeboards, a band of
    roof tiles riding on each bargeboard, a gold boss and small ornaments."""
    edge_c = GOLD_D if side else GOLD
    board = WOOD_D if side else DOOR_BOARD
    tile = SLATE if side else TILE
    prev = 0
    for r in range(gh):
        half = round(gw * (r + 1) / gh)
        y = peak + r
        for x in range(gc - half, gc + half + 1):
            # Every pixel the edge passes through on this row is bargeboard,
            # so the line stays continuous however steep or shallow.
            put(x, y, edge_c if abs(x - gc) > prev - 1 or abs(x - gc) == half else board)
            if abs(x - gc) > prev - 1:
                put(x, y - 1, tile)               # tiles ride on top of the bargeboard
        prev = half
    put(gc, peak - 1, tile)
    put(gc, peak + gh // 2, GOLD_D)               # boss


def horn(x, y):
    """A roof horn: a small upright beast, dark with a light tip."""
    put(x, y, DARK)
    put(x, y - 1, DARK)
    put(x, y - 2, EDGE)


def top_roof(y, xl, xr):
    """The top roof as in the photo, back to front: a secondary roof raised
    behind with the gold bottle finial on its ridge; a gable on each visible
    face (the side one seen as its sloping roof, the front one facing us,
    just right of the finial); the tiled hip falling to a wide eave. Five
    horns, left to right: the side gable's corner, the left end of the back
    ridge, the front gable's peak, the right end of the back ridge, and the
    front gable's right corner."""
    gh = 6
    peak = y
    base = peak + gh
    span = xr - xl
    at = lambda f: xl + round(f * span)           # positions along the roof, as in the photo
    fx = at(0.50)                                 # finial
    fc, fw = at(0.59), 7                          # front gable, peak just right of the finial
    sc, sw = at(0.22), 6                          # side gable
    r0, r1 = at(0.31), at(0.69)                   # ends of the back ridge
    # Hip roof body, widening down to the eave.
    for yy in range(peak + 2, base + 2):
        d = base + 1 - yy
        hip = NC + d
        for x in range(xl + d, xr - d + 1):
            put(x, yy, SLATE if x < hip else TILE)
    # Secondary roof behind: a raised ridge with short hips at each end.
    top = peak
    for yy in range(top, base):
        d = yy - top
        for x in range(r0 - d, r1 + d + 1):
            put(x, yy, SLATE if x < fx else TILE)
    hline(r0, r1, top, EDGE)
    # Finial on the back ridge.
    put(fx, top - 1, GOLD_D)
    put(fx, top - 2, GOLD_D)
    for yy in range(top - 6, top - 2):
        put(fx - 1, yy, GOLD)
        put(fx, yy, GOLD)
        put(fx + 1, yy, GOLD_D)
    put(fx, top - 7, GOLD)
    # Side gable: seen from the corner as its sloping tiled roof, with a gold
    # bargeboard down its outer edge.
    for r in range(gh - 2):
        half = round(sw * (r + 1) / (gh - 2))
        yy = peak + 3 + r
        for x in range(sc - half, sc + half + 1):
            put(x, yy, GOLD_D if x == sc - half else (SLATE if x < sc else DARK))
    # Front gable, facing us.
    gable(fc, fw, gh, peak + 1, side=False)
    # The five horns.
    horn(sc - 1, peak + 2)                        # 1: side gable corner, low
    horn(r0, top - 1)                             # 2: back ridge, left end
    horn(fc, peak)                                # 3: front gable peak
    horn(r1, top - 1)                             # 4: back ridge, right end
    horn(fc + fw - 1, peak + 3)                   # 5: front gable corner, low
    return eave(base + 1, xl, xr, inset=5)


def attic(y, xl, xr):
    """A short dark band under the top roof with a plaque on each face."""
    for j in range(3):
        for x in range(xl, xr + 1):
            put(x, y + j, DARK if (x - xl) % 4 == 0 or j == 0 else (SLATE if x < NC else PANEL_D))
    for pc, w, side in (((NC + xr) // 2 + 1, 3, False), ((xl + NC) // 2, 2, True)):
        for x in range(pc - w, pc + w + 1):
            put(x, y, NAVY)
            put(x, y + 1, (GOLD_D if side else GOLD) if abs(x - pc) == w else NAVY)
            put(x, y + 2, GOLD_D if side else GOLD)
        put(pc - 1, y + 1, GOLD_D)
        put(pc + 1, y + 1, GOLD_D)
    return y + 3


def build():
    y = 11
    # The plan is close to square: the side face (left of NC) is now nearly
    # as wide as the front, foreshortened a little.
    y = top_roof(y, 1, 36)
    y = attic(y, 5, 32)
    y = eave(y, -2, 39)
    y = storey(y, 4, 33)
    y = eave(y, -2, 39)
    y = storey(y, 4, 33)
    y = eave(y, -2, 39)
    return px


def noise(x, y, k, scale=0.5):
    """Smooth value noise in 0..1, for clustered texture."""
    def h(ix, iy):
        v = (ix * 73856093) ^ (iy * 19349663) ^ (k * 83492791)
        v = (v ^ (v >> 13)) * 1274126177
        return ((v ^ (v >> 16)) & 0xffff) / 0xffff
    fx, fy = x * scale, y * scale
    ix, iy = int(fx), int(fy)
    tx, ty = fx - ix, fy - iy
    a, b, c, d = h(ix, iy), h(ix + 1, iy), h(ix, iy + 1), h(ix + 1, iy + 1)
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty


def hashf(x, y, k):
    v = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791)
    return (v & 0xffff) / 0xffff


# 1. Light comes from the upper left, like the trees and pavilion: the left
# face is lit and the front face is in shade.
LIT = {SLATE: TILE, DARK: SLATE, PANEL_D: PANEL, RAIL_D: RAIL, WOOD_D: WOOD, GOLD_D: GOLD}
SHADED = {TILE: SLATE, PANEL: PANEL_D, RAIL: RAIL_D, WOOD: WOOD_D, GOLD: GOLD_D, EDGE: TILE}

# 2. Clustered texture: each surface mixes in its neighbouring tone.
NEXT_TONE = {TILE: SLATE, SLATE: TILE, PANEL: PANEL_D, PANEL_D: PANEL}

LIGHTER = {NAVY: TEAL, TEAL: SLATE, DARK: SLATE, SLATE: TILE, TILE: EDGE, EDGE: '#9b908c',
           WOOD_D: WOOD, WOOD: '#996460', OPEN: WOOD_D, PANEL_D: PANEL, RAIL_D: RAIL}
SKY_RIM = '#6393b2'   # sky-tinted light catching the top edges


# 3. Distance haze: the darkest values lift a step everywhere, and the
# upper part of the tower (further into the haze) lifts a little more.
HAZE = {DARK: SLATE, NAVY: TEAL}
HAZE_HIGH = {SLATE: TILE, WOOD_D: WOOD, PANEL_D: PANEL}


def haze(px):
    out = {}
    top = min(y for _, y in px)
    bottom = max(y for _, y in px)
    for (x, y), c in px.items():
        c = HAZE.get(c, c) if hashf(x, y, 11) < 0.5 else c
        high = 1 - (y - top) / max(1, bottom - top)   # 1 at the top, 0 at the base
        if c in HAZE_HIGH and hashf(x, y, 12) < 0.35 * high:
            c = HAZE_HIGH[c]
        out[(x, y)] = c
    return out


def light(px):
    out = {}
    for (x, y), c in px.items():
        side = x - OFF < NC
        out[(x, y)] = (LIT if side else SHADED).get(c, c)
    return out


def texture(px):
    """Only inside large flat areas, so edges, lips, railings, columns and
    eave shadows stay crisp."""
    out = dict(px)
    for (x, y), c in px.items():
        if c not in NEXT_TONE:
            continue
        ring = [px.get((x + dx, y + dy)) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
        if all(r == c for r in ring) and noise(x, y, 7, 0.45) > 0.7 and hashf(x, y, 8) < 0.6:
            out[(x, y)] = NEXT_TONE[c]
    return out


def soften(px):
    """Uneven outline, lightly: a sparse rim of lighter pixels, and sky-tinted
    light along the roof tops on the lit side."""
    out = dict(px)
    for (x, y), c in px.items():
        n = [(x + dx, y + dy) in px for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))]
        top_open = (x, y - 1) not in px
        if top_open and c in (TILE, SLATE) and x - OFF < NC + 6 and hashf(x, y, 4) < 0.3:
            out[(x, y)] = SKY_RIM
        elif not all(n) and hashf(x, y, 1) < 0.2 and c in LIGHTER:
            out[(x, y)] = LIGHTER[c]
    return out


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def render():
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (x, y), c in haze(soften(texture(light(build())))).items():
        out.putpixel((x, y), hexrgb(c) + (255,))
    return out


# Tower colours that glow after dark (walls, wood, rails, gold, eave lips);
# roofs and blended edge pixels stay dark.
LIT_COLOURS = {PANEL, PANEL_D, RAIL, RAIL_D, WOOD, WOOD_D, OPEN, GOLD, GOLD_D, EDGE, DOOR_BOARD}
POS = (368, 90)        # where the sprite sits on the 512 x 320 map
WATERLINE = 158        # the island's edge, for the reflection


def place(scene, sprite, pos=POS, treeline=136):
    """Lay the tower into the scene so it sits in it rather than on it.
    Returns {(x, y): (rgb, lit)} for every pixel to draw over the map:
    1. island trees and roofs in front cover its base (anything below the
       treeline that isn't sky, haze or mountain stays in front);
    2. its outline blends into what's behind it: edge pixels take the
       colour halfway between the tower and the backdrop;
    3. contact shadow: the tree tops just in front of the base darken a
       little where the tower stands behind them."""
    import colorsys
    pal = scene.convert('RGB')
    sx, sy = pos
    w, h = sprite.size
    out = {}

    def backdrop(c):
        r, g, b = c[:3]
        hu, sa, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        return 0.5 < hu < 0.72 and v > 0.55   # sky, haze and mountain blues

    colours = sorted({pal.getpixel((x, y)) for x in range(pal.width) for y in range(pal.height)})

    def nearest(c, among=colours):
        return min(among, key=lambda p: sum((a - b) ** 2 for a, b in zip(p, c)))

    for y in range(h):
        for x in range(w):
            c = sprite.getpixel((x, y))
            if not c[3]:
                continue
            X, Y = sx + x, sy + y
            behind = pal.getpixel((X, Y))
            if Y >= treeline and not backdrop(behind):
                # A tree or roof in front. Just below the treeline, darken it.
                if Y < treeline + 3 and hashf(X, Y, 31) < 0.6:
                    out[(X, Y)] = (nearest(tuple(int(v * 0.78) for v in behind)), False)
                continue
            edge = any(not sprite.getpixel((x + dx, y + dy))[3]
                       for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))
                       if 0 <= x + dx < w and 0 <= y + dy < h)
            if edge and backdrop(behind) and hashf(x, y, 21) < 0.5:
                mid = tuple((a + b) // 2 for a, b in zip(c[:3], behind))
                out[(X, Y)] = (nearest(mid), False)
            else:
                hexc = '#%02x%02x%02x' % c[:3]
                out[(X, Y)] = (c[:3], hexc in LIT_COLOURS)
    return out


def reflect(scene, placed, treeline=136):
    """The tower in the lake, done like the island trees' reflections: one
    solid, even tone, mirrored at the waterline with its outline smeared
    over a few rows. It covers the lake's highlight streaks too, so no
    lines cut across it; only its outer edge is a step lighter."""
    import colorsys
    pal = scene.convert('RGB')

    def is_lake(c):
        hu, sa, v = colorsys.rgb_to_hsv(*(k / 255 for k in c))
        return 0.5 < hu < 0.7 and sa > 0.05 and v > 0.45

    mask = set()
    xs = [x for x, _ in placed]
    for r in range(WATERLINE + 2, 240):
        src = round(WATERLINE - (r - WATERLINE) / 0.9)
        if src >= treeline or src < 0:
            continue
        for X in range(min(xs) - 1, max(xs) + 2):
            if not is_lake(pal.getpixel((X, r))):
                continue
            if any((X, sy) in placed for sy in range(src - 1, src + 2) if sy < treeline):
                mask.add((X, r))
    # Colour: the water underneath, darkened and pulled toward deep lake
    # blue. Highlight streaks are first flattened to the lake's mid tone, so
    # they don't show through as lines.
    lake = [pal.getpixel((x, y)) for x in range(300, 512) for y in range(165, 235)
            if is_lake(pal.getpixel((x, y)))]
    mid = tuple(sorted(c[i] for c in lake)[len(lake) // 2] for i in range(3))
    colours = sorted(set(lake))

    def nearest(c):
        return min(colours, key=lambda p: sum((a - b) ** 2 for a, b in zip(p, c)))

    deep = (39, 89, 120)                             # '#275978'
    out = {}
    for (X, r) in mask:
        under = pal.getpixel((X, r))
        if sum(under) > sum(mid) + 40:
            under = mid
        edge = any((X + dx, r + dy) not in mask for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)))
        k = 0.25 if edge else 0.45                   # softer at the edge
        out[(X, r)] = nearest(tuple(int(a * (1 - k) + b * k) for a, b in zip(under, deep)))
    return out


def bake():
    """Write the tower and its reflection as overlays for the map generator:
    public/reference/chaoran-tower.png (alpha 255 = glows at night, 254 =
    stays dark) and public/reference/chaoran-reflection.png."""
    scene = Image.open('public/reference/baotu-512x320.png').convert('RGBA')
    placed = place(scene, render())
    tower = Image.new('RGBA', scene.size, (0, 0, 0, 0))
    for (X, Y), (c, lit) in placed.items():
        tower.putpixel((X, Y), tuple(c) + (255 if lit else 254,))
    tower.save('public/reference/chaoran-tower.png', optimize=True)
    refl = Image.new('RGBA', scene.size, (0, 0, 0, 0))
    for (X, Y), c in reflect(scene, placed).items():
        refl.putpixel((X, Y), tuple(c) + (254,))
    refl.save('public/reference/chaoran-reflection.png', optimize=True)
    print('baked', len(placed), 'tower pixels', 'and the reflection')


def erase():
    """Paint the old tower and its red reflection out of the base map (run
    once on a fresh map): the old tower's box takes the pixels 36 columns to
    the left, so clouds and ridges carry on behind; its reflection takes the
    lake 40 columns to the left."""
    path = 'public/reference/baotu-512x320.png'
    im = Image.open(path)
    p = im.load()
    for y in range(98, 136):
        for x in range(380, 415):
            p[x, y] = p[x - 36, y]
    for y in range(160, 206):
        for x in range(378, 418):
            p[x, y] = p[x - 40, y]
    erase_old_base(im)
    im.save(path, optimize=True)


def erase_old_base(im):
    """The old tower's red-brown base hall showed below the treeline: its
    warm pixels take the island trees 36 columns to the left."""
    import colorsys
    p = im.load()
    pal = im.getpalette()
    for y in range(136, 148):
        for x in range(378, 418):
            r, g, b = pal[p[x, y] * 3:p[x, y] * 3 + 3]
            hu, sa, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if (hu < 0.1 or hu > 0.9) and sa > 0.2 and v < 0.75:
                p[x, y] = p[x - 36, y]


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] in ('bake', 'erase'):
    {'bake': bake, 'erase': erase}[sys.argv[1]]()
    sys.exit()


if __name__ == '__main__':
    sprite = render()
    sprite.save(sys.argv[1])
    if len(sys.argv) > 2:
        # Preview: alone on sky, and in place on the scene (not baked in).
        scale = 8
        bg = Image.new('RGBA', (W, H), (163, 210, 248, 255))
        bg.alpha_composite(sprite)
        scene = Image.open('public/reference/baotu-512x320.png').convert('RGBA')
        for (X, Y), (c, _) in place(scene, sprite).items():
            scene.putpixel((X, Y), tuple(c) + (255,))
        ctx = scene.crop((340, 80, 460, 160))
        out = Image.new('RGBA', (W * scale + 10 + ctx.width * 5, max(H * scale, ctx.height * 5)), (30, 30, 30, 255))
        out.paste(bg.resize((W * scale, H * scale), Image.NEAREST), (0, 0))
        out.paste(ctx.resize((ctx.width * 5, ctx.height * 5), Image.NEAREST), (W * scale + 10, 0))
        out.save(sys.argv[2])
    print('bbox', sprite.getbbox())
