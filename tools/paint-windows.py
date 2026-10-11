"""Lattice windows for the village and island houses, so they can light up
at night. Drawn in daytime colours (dark frame, cream lattice); the
generator marks the lattice as a light.

  python3 tools/paint-windows.py   # writes public/reference/windows.png
"""
from PIL import Image

OUT = 'public/reference/windows.png'
FRAME = '#3f3132'
LATTICE = '#d3c6a2'
BAR = '#9b908c'

SMALL = ['FFFF',
         'FLLF',
         'FFFF']
LARGE = ['FFFFF',
         'FLBLF',
         'FLBLF',
         'FFFFF']
SLIT = ['LL']  # far-off windows, two pixels of light

WINDOWS = [
    (SMALL, 161, 173),   # left house, white gable
    (SMALL, 179, 177),   # left house, pink side wall
    (SMALL, 243, 205),   # front house, pink gable
    (SMALL, 253, 205),
    (SMALL, 313, 235),   # little house by the bridge
    (LARGE, 436, 264),   # right house, grey gable
    (SMALL, 445, 270),
    (SLIT, 408, 143),    # island buildings beside the tower
    (SLIT, 414, 143),
    (SLIT, 384, 154),
    (SLIT, 476, 143),
    (SLIT, 483, 143),
]

COLOURS = {'F': FRAME, 'L': LATTICE, 'B': BAR}


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


out = Image.new('RGBA', (512, 320), (0, 0, 0, 0))
for sprite, x0, y0 in WINDOWS:
    for dy, row in enumerate(sprite):
        for dx, ch in enumerate(row):
            out.putpixel((x0 + dx, y0 + dy), rgb(COLOURS[ch]) + (255,))
out.save(OUT, optimize=True)
print('wrote', OUT)
