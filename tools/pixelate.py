"""Downsample the reference to a small 16:10 pixel map with a capped palette.

Usage: python3 tools/pixelate.py [width] [colors]
"""
import sys
from PIL import Image

W = int(sys.argv[1]) if len(sys.argv) > 1 else 128
COLORS = int(sys.argv[2]) if len(sys.argv) > 2 else 72
H = W * 10 // 16

src = Image.open("public/reference/baotu-reference.webp").convert("RGB")
# Crop to exact 16:10 (source is 1586x992, a hair off), centred.
sw, sh = src.size
cw = min(sw, sh * 16 // 10)
ch = cw * 10 // 16
src = src.crop(((sw - cw) // 2, (sh - ch) // 2, (sw - cw) // 2 + cw, (sh - ch) // 2 + ch))

small = src.resize((W, H), Image.Resampling.BOX)
pix = small.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT,
                     kmeans=4, dither=Image.Dither.NONE)

out = f"public/reference/baotu-{W}x{H}"
pix.save(out + ".png")
pix.convert("RGB").resize((W * 8, H * 8), Image.Resampling.NEAREST).save(out + "-x8.png")
print(out, "colors used:", len(pix.getcolors()))
