// Paints a pixmap (see tools/pixmap-to-js.py) onto a canvas in the colours
// of one time of day. Land is graded like the procedural scene; sky takes the
// time's single flat sky colour, clouds take exactly CLOUD_STEPS shades of
// the time's cloud ramp; water picks up the horizon tint.

import { TIMES, hex, mix, grade } from '../palette/times.js';

const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
const sat = (rgb) => { const hi = Math.max(...rgb); return hi ? (hi - Math.min(...rgb)) / hi : 0; };

// Sample a ramp of hex colours at t in [0, 1], blending between steps.
function ramp(stops, t) {
  const f = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(f), stops.length - 2);
  return mix(hex(stops[i]), hex(stops[i + 1]), f - i);
}

const LAND = 0, SKY = 1, WATER = 2, CLOUD = 3, MOUNTAIN = 4;
export const CLOUD_STEPS = 6;
export const MOUNTAIN_STEPS = 5;

// Colours used by a region, sorted dark to light.
function usedIn({ PALETTE, PIXELS, REGION }, region) {
  const seen = new Set();
  for (let p = 0; p < PIXELS.length; p++) if (REGION[p] === region) seen.add(PIXELS[p]);
  return [...seen].sort((a, b) => lum(hex(PALETTE[a])) - lum(hex(PALETTE[b])));
}

// Every colour in a region lands on one of `steps` shades by brightness
// rank, so the region uses the same number of colours at every time of
// day. Midday keeps shades picked from the picture's own colours; other
// times sample their ramp between `from` and 1.
function rankedShades(pix, region, steps, stops, from = 0) {
  const used = usedIn(pix, region);
  const rankOf = new Map(used.map((c, i) => [c, i]));
  const stepOf = (c) => Math.round((rankOf.get(c) / Math.max(1, used.length - 1)) * (steps - 1));
  const shades = stops
    ? Array.from({ length: steps }, (_, k) => ramp(stops, from + ((1 - from) * k) / (steps - 1)))
    : Array.from({ length: steps }, (_, k) => hex(pix.PALETTE[used[Math.round((k / (steps - 1)) * (used.length - 1))]]));
  return (c) => (rankOf.has(c) ? shades[stepOf(c)] : null);
}

function buildLut(pix, timeId) {
  const t = TIMES[timeId], n = pix.PALETTE.length, horizon = hex(t.horizon);
  // Cloud shadows use the lighter part of the ramp so bellies stay soft.
  const cloud = rankedShades(pix, CLOUD, CLOUD_STEPS, t.cloud, 0.4);
  const mountain = rankedShades(pix, MOUNTAIN, MOUNTAIN_STEPS, t.mountain);
  const lut = new Uint8ClampedArray(5 * n * 4);
  pix.PALETTE.forEach((h, c) => {
    const base = hex(h), graded = grade(base, t);
    const sky = hex(t.skyFlat); // the sky is one flat colour; clouds hold the horizon
    const byRegion = [graded, sky, mix(graded, horizon, t.waterSky), cloud(c) ?? base, mountain(c) ?? graded];
    byRegion.forEach((rgb, region) => {
      const o = (region * n + c) * 4;
      for (let i = 0; i < 3; i++) lut[o + i] = Math.round(rgb[i] * 255);
      lut[o + 3] = 255;
    });
  });
  return lut;
}

// The moon, only where the sky shows through.
function night(out, { W, REGION }, t) {
  const isSky = (x, y) => REGION[y * W + x] === SKY;
  const put = (x, y, rgb, a) => {
    const o = (y * W + x) * 4;
    for (let i = 0; i < 3; i++) out[o + i] += (rgb[i] - out[o + i]) * a;
  };
  if (t.moon) {
    const cx = 330, cy = 34, r = 7;
    for (let y = cy - r - 3; y <= cy + r + 3; y++) {
      for (let x = cx - r - 3; x <= cx + r + 3; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (!isSky(x, y)) continue;
        if (d <= r) put(x, y, Math.hypot(x - cx - 3, y - cy + 2) < 3 ? [226, 222, 200] : [246, 242, 220], t.moon);
        else if (d <= r + 3) put(x, y, [120, 140, 190], 0.25 * t.moon * (r + 3 - d) / 3);
      }
    }
  }
}

// Colours one time of day into RGBA. `layers` (a set of layer names) keeps
// only those layers; the rest come out transparent.
export function renderPixmap(pix, timeId = 'midday', layers = null) {
  const { W, H, PIXELS, REGION, PALETTE, LAYER, LAYERS } = pix;
  const lut = buildLut(pix, timeId);
  const keep = layers && LAYERS.map((name) => layers.has(name));
  const out = new Uint8ClampedArray(W * H * 4);
  // The sky layer is the full frame in the flat sky colour, so anything
  // drawn just above it (birds, the moon) has sky behind it everywhere.
  if (!keep || keep[LAYERS.indexOf('sky')]) {
    const sky = hex(TIMES[timeId].skyFlat).map((v) => Math.round(v * 255));
    for (let o = 0; o < out.length; o += 4) { out[o] = sky[0]; out[o + 1] = sky[1]; out[o + 2] = sky[2]; out[o + 3] = 255; }
  }
  for (let p = 0; p < PIXELS.length; p++) {
    if (keep && !keep[LAYER[p]]) continue;
    const l = (REGION[p] * PALETTE.length + PIXELS[p]) * 4, o = p * 4;
    out[o] = lut[l]; out[o + 1] = lut[l + 1]; out[o + 2] = lut[l + 2]; out[o + 3] = 255;
  }
  if (!keep || keep[LAYERS.indexOf('sky')]) night(out, pix, TIMES[timeId]);
  return out;
}

export function drawPixmap(canvas, pix, timeId = 'midday', layers = null) {
  const { W, H } = pix;
  canvas.width = W;
  canvas.height = H;
  canvas.getContext('2d').putImageData(new ImageData(renderPixmap(pix, timeId, layers), W, H), 0, 0);
}
