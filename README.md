# Quan

Pixel-art home background: Baotu Spring and Daming Lake with Chaoran Tower,
drawn entirely in code at 640 × 400 and shown scaled up with crisp pixels.

## Run

```
npm install
npm run dev          # home page: http://localhost:5173/
                     # scene lab: http://localhost:5173/dev.html
npm run export       # PNGs of every layer + composite, per time of day, in out/
```

Home page picks the palette from the clock. Preview another with `?time=night`.

| Block | Hours |
|---|---|
| Morning | 05:00–10:00 |
| Midday | 10:00–14:00 |
| Afternoon | 14:00–17:00 |
| Evening | 17:00–20:00 |
| Night | 20:00–05:00 |

## How it works

- **Layers hold palette indices, not colours.** Each pixel is one step of a
  named material ramp (`src/palette/materials.js`). A time of day is just a
  lookup table from those indices to RGBA (`src/palette/times.js`), so the
  same picture recolours for free.
- **Night-only things are materials too.** Stars, the moon, window light,
  the tower's gold glow and halos are transparent or dark by day. Animals
  are hidden at night the same way.
- **Painters** (`src/core/paint.js`) reproduce the reference's techniques:
  contour-traced cumulus packed with puffs, leaf-blob foliage, cross-shaped
  blossom florets, willow strands, tiled roofs, mossy boulders.
- **Layers** (`src/scene/layers/`) each have a parallax `depth` (0 = sky,
  1 = nearest) for animation later. Drawing is deterministic (seeded).
- **Chaoran Tower** (`src/scene/tower.js`) is drawn as a ~60 px hero
  landmark: bottle finial, hip-and-gable roof, three balconied storeys.

## Pixmap

`pixmap.html` shows the reference as a 512 × 320, 72-colour pixel map stored
in code (`src/pixmap/baotu.js`: a palette plus one byte per pixel holding
its colour and region: land, sky or water). It uses the same time-of-day
palettes as the home page (`?time=night` to preview): land is graded, sky
and clouds take the time's ramps by brightness, water picks up the horizon
tint, and night adds stars and a moon where the sky shows.

```
python3 tools/pixelate.py 512 72     # reference -> public/reference/baotu-512x320.png
python3 tools/pixmap-to-js.py public/reference/baotu-512x320.png src/pixmap/baotu.js
```
