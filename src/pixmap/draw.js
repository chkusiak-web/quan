// Paints a pixmap (see tools/pixmap-to-js.py) onto a canvas in the colours
// of one time of day. Land is graded like the procedural scene; sky takes the
// time's sky and cloud ramps by brightness; water picks up the horizon tint.

import { TIMES, hex, mix, grade } from '../palette/times.js';

const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
const sat = (rgb) => { const hi = Math.max(...rgb); return hi ? (hi - Math.min(...rgb)) / hi : 0; };

// Sample a ramp of hex colours at t in [0, 1], blending between steps.
function ramp(stops, t) {
  const f = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(f), stops.length - 2);
  return mix(hex(stops[i]), hex(stops[i + 1]), f - i);
}

// Brightness range of the colours that appear in the sky, split into clouds and blue.
function skyRanges({ PALETTE, PIXELS }) {
  const n = PALETTE.length, seen = new Set();
  for (const b of PIXELS) if (b >= n && b < 2 * n) seen.add(b - n);
  const r = { cloud: [1, 0], blue: [1, 0] };
  for (const c of seen) {
    const rgb = hex(PALETTE[c]), k = sat(rgb) < 0.15 ? 'cloud' : 'blue', l = lum(rgb);
    r[k] = [Math.min(r[k][0], l), Math.max(r[k][1], l)];
  }
  return r;
}

function buildLut(pix, timeId) {
  const t = TIMES[timeId], n = pix.PALETTE.length, horizon = hex(t.horizon), ranges = skyRanges(pix);
  const lut = new Uint8ClampedArray(3 * n * 4);
  pix.PALETTE.forEach((h, c) => {
    const base = hex(h), graded = grade(base, t);
    let sky = base;
    if (t.sky) {
      const k = sat(base) < 0.15 ? 'cloud' : 'blue', [lo, hi] = ranges[k];
      const at = hi > lo ? (lum(base) - lo) / (hi - lo) : 0.5;
      sky = k === 'cloud' ? ramp(t.cloud, at) : ramp(t.sky, at);
    }
    [graded, sky, mix(graded, horizon, t.waterSky)].forEach((rgb, region) => {
      const o = (region * n + c) * 4;
      for (let i = 0; i < 3; i++) lut[o + i] = Math.round(rgb[i] * 255);
      lut[o + 3] = 255;
    });
  });
  return lut;
}

// The moon, only where the sky shows through.
function night(out, { W, H, PALETTE, PIXELS }, t) {
  const n = PALETTE.length, isSky = (x, y) => { const b = PIXELS[y * W + x]; return b >= n && b < 2 * n; };
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

export function drawPixmap(canvas, pix, timeId = 'midday') {
  const { W, H, PIXELS } = pix;
  const lut = buildLut(pix, timeId);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < PIXELS.length; p++) {
    const l = PIXELS[p] * 4, o = p * 4;
    out[o] = lut[l]; out[o + 1] = lut[l + 1]; out[o + 2] = lut[l + 2]; out[o + 3] = 255;
  }
  night(out, pix, TIMES[timeId]);
  canvas.width = W;
  canvas.height = H;
  canvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
}
