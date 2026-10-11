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

const LAND = 0, SKY = 1, WATER = 2, CLOUD = 3, MOUNTAIN = 4, LIGHT = 5;
export const CLOUD_STEPS = 6;
export const MOUNTAIN_STEPS = 5;

// What each light turns into after dark, keyed by its daytime colour.
const NIGHT_LIGHT = {
  '#d3c6a2': '#ffd889', // tower lattice: warm light
  '#596d88': '#ffd889', // house window openings: warm light
  '#9b908c': '#f0a040', // window bars, railing posts: deeper orange
  '#ded3c4': '#ffcf7a', // balcony railings
  '#7d7b83': '#f5b552', // eave lips and the ridge
  '#d9a441': '#ffe9a8', // gold, lit
  '#a8762c': '#e6a344', // gold, shaded
  // Chaoran Tower (tools/tower-sprite.py)
  '#b4ab9b': '#ffd889', // wall panels and rails: warm light
  '#c49a4e': '#ffe9a8', // gold
  '#76605f': '#c06a34', // wood
  '#56484c': '#7c3c24', // wood in shade
  '#4a4250': '#e89a3a', // open bays: lit interiors
  // The rest of the floodlit tower (and window frames): warm, dimmer.
  '#996460': '#d0743a', // lit columns
  '#71524b': '#a8552e', // columns
  '#55413c': '#7c3c24', // walls
  '#3f3132': '#4c2418', // doorways, frames
  '#4a5264': '#6a4a44', // roof, lit side
  '#3b4048': '#523a3a', // roof, shaded side
  '#23242f': '#24182a', // tile lines
};
// Halo radius and strength around each kind of light.
const HALO = { '#596d88': [6, 0.7], '#d3c6a2': [6, 0.7], '#b4ab9b': [4, 0.45], '#c49a4e': [3, 0.35], '#4a4250': [3, 0.3], '#9b908c': [3, 0.3], '#ded3c4': [3, 0.3], '#7d7b83': [3, 0.28], '#d9a441': [3, 0.35], '#a8762c': [2, 0.2] };
const HALO_RGB = [255, 176, 82];
const WATERLINE = 158; // the island's edge, for the tower's reflection

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
  const lut = new Uint8ClampedArray(6 * n * 4);
  pix.PALETTE.forEach((h, c) => {
    const base = hex(h), graded = grade(base, t);
    const sky = hex(t.skyFlat); // the sky is one flat colour; clouds hold the horizon
    const lit = NIGHT_LIGHT[h] ? mix(graded, hex(NIGHT_LIGHT[h]), t.emissive) : graded;
    const byRegion = [graded, sky, mix(graded, horizon, t.waterSky), cloud(c) ?? base, mountain(c) ?? graded, lit];
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

// Cheap stable hash in [0, 1) for breaking reflections into ripples.
function ripple(x, y) {
  let v = Math.imul(x >> 1, 374761393) + Math.imul(y, 668265263);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}

// Light spill after dark: a soft warm halo around every light, and the
// tower's lights broken into ripples on the lake. Returns per-pixel alpha.
function glowMap(pix, t) {
  const { W, H, PIXELS, REGION, PALETTE, LAYER, LAYERS } = pix;
  const a = new Float32Array(W * H);
  const k = t.glow * 2;
  if (!k) return a;
  const tower = LAYERS.indexOf('tower'), lake = LAYERS.indexOf('lake');
  for (let p = 0; p < PIXELS.length; p++) {
    if (REGION[p] !== LIGHT) continue;
    const halo = HALO[PALETTE[PIXELS[p]]];
    if (!halo) continue;
    const [r, s] = halo;
    const x = p % W, y = (p / W) | 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const qx = x + dx, qy = y + dy;
      if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const q = qy * W + qx;
      a[q] = Math.max(a[q], s * k * (1 - d / (r + 1)) ** 2);
    }
    // Reflection: mirrored below the waterline, every third row a gap.
    if (LAYER[p] === tower) {
      // Broken into short ripples that sway sideways and fade with depth.
      const ry = Math.round(WATERLINE + (WATERLINE - y) * 0.9);
      for (const yy of [ry, ry + 1]) {
        if (yy >= H || yy % 3 === 2) continue;
        const sway = Math.round(Math.sin(yy * 1.7) * 1.5);
        if (ripple(x + sway, yy) < 0.4) continue;
        const q = yy * W + x + sway;
        const fade = 1 - (yy - WATERLINE) / 60;
        if (LAYER[q] === lake) a[q] = Math.max(a[q], (0.5 * s + 0.2) * k * fade);
      }
    }
  }
  // The floodlit tower glows as a whole: a soft aura around its edges,
  // strongest close in.
  const R = 6;
  for (let p = 0; p < PIXELS.length; p++) {
    if (LAYER[p] !== tower) continue;
    const x = p % W, y = (p / W) | 0;
    for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) {
      const qx = x + dx, qy = y + dy;
      if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const q = qy * W + qx;
      a[q] = Math.max(a[q], 0.22 * k * (1 - d / (R + 1)) ** 2);
    }
  }
  // The glow sits around the building, not over it: the tower's own lit
  // colours stay crisp.
  for (let p = 0; p < a.length; p++) a[p] = LAYER[p] === tower ? 0 : Math.min(a[p], 0.85);
  return a;
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
  // Light spill sits on top of everything; ask for the 'glow' layer to get
  // it alone, as a transparent overlay.
  if (!keep || layers.has('glow')) {
    const a = glowMap(pix, TIMES[timeId]);
    for (let p = 0, o = 0; p < a.length; p++, o += 4) {
      if (!a[p]) continue;
      if (keep && !keep[LAYER[p]]) {
        if (out[o + 3] === 0) { out.set(HALO_RGB, o); out[o + 3] = Math.round(a[p] * 255); }
        continue;
      }
      for (let i = 0; i < 3; i++) out[o + i] += (HALO_RGB[i] - out[o + i]) * a[p];
    }
  }
  return out;
}

export function drawPixmap(canvas, pix, timeId = 'midday', layers = null) {
  const { W, H } = pix;
  canvas.width = W;
  canvas.height = H;
  canvas.getContext('2d').putImageData(new ImageData(renderPixmap(pix, timeId, layers), W, H), 0, 0);
}
