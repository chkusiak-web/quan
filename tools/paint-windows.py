"""Lattice windows for the village and island houses, so they can light up
at night.

By day a window is a soft recess in the wall, built from the house's own
tones: a shadow under the lintel, a darker frame on the shaded left, a
lighter one on the right, a pale sill, and a blue-grey lattice inside.
Only the lattice is a light (alpha 255 in the PNG); the frame (alpha 254)
stays wall at night.

  python3 tools/paint-windows.py   # writes public/reference/windows.png
"""
from PIL import Image

OUT = 'public/reference/windows.png'
GLASS = '#596d88'   # lattice openings: lit warm at night
BAR = '#7d7b83'     # lattice bars: lit amber at night

# Frame tones per wall colour: lintel shadow, shaded side, light side, sill.
WALLS = {
    'white': {'S': '#bbb9c8', 'F': '#9b908c', 'G': '#d3c6a2', 'H': '#fcfcfc'},
    'pink':  {'S': '#9e96bc', 'F': '#9e96bc', 'G': '#f7c9d7', 'H': '#fcfcfc'},
    'grey':  {'S': '#7d7b83', 'F': '#676667', 'G': '#9e96bc', 'H': '#dfeefa'},
}

WINDOW = ['.SS.',
          'FLLG',
          'FBBG',
          'FLLG',
          '.HH.']
SLIT = ['LL']  # far-off island windows: two pixels of light

WINDOWS = [
    (WINDOW, 'white', 161, 172),  # left house, white gable
    (WINDOW, 'pink', 244, 204),   # front house, pink gable
    (WINDOW, 'pink', 253, 204),
    (WINDOW, 'white', 313, 235),  # little house by the bridge
    (WINDOW, 'grey', 436, 264),   # right house, grey gable
    (WINDOW, 'grey', 444, 269),
    (SLIT, None, 408, 143),       # island buildings beside the tower
    (SLIT, None, 414, 143),
    (SLIT, None, 384, 154),
    (SLIT, None, 476, 143),
    (SLIT, None, 483, 143),
]


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


out = Image.new('RGBA', (512, 320), (0, 0, 0, 0))
for sprite, wall, x0, y0 in WINDOWS:
    tones = WALLS.get(wall, {})
    for dy, row in enumerate(sprite):
        for dx, ch in enumerate(row):
            if ch == '.':
                continue
            if ch == 'L':
                out.putpixel((x0 + dx, y0 + dy), rgb(GLASS) + (255,))
            elif ch == 'B':
                out.putpixel((x0 + dx, y0 + dy), rgb(BAR) + (255,))
            else:
                out.putpixel((x0 + dx, y0 + dy), rgb(tones[ch]) + (254,))
out.save(OUT, optimize=True)
print('wrote', OUT)
