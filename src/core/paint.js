// Painters for the recurring techniques in the reference: piled cloud puffs,
// leafy masses, blossom florets, willow strands, tiled roofs, mossy rocks.

import { rampPick, bayer } from './buffer.js';
import { rng, hash2, noise2, fbm } from './rng.js';
import { clamp, sphereLight, fillEllipse, fillPoly, lerp } from './shapes.js';

// ---------------------------------------------------------------- clouds
// A cumulus is a pile of round puffs. Lower puffs sit in front of higher
// ones; each is lit on its upper left, the pile darkens toward a flat base,
// and puffs tucked behind a nearer one pick up a little shadow.
export function cloud(layer, ramp, puffs, { base, seed = 1, bottomDark = 0.45, edge = 2.2, spread = 0.4, lift = 0 } = {}) {
  const ps = [...puffs].sort((a, b) => a.y - b.y);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
  for (const p of ps) {
    x0 = Math.min(x0, p.x - p.r - 3); x1 = Math.max(x1, p.x + p.r + 3);
    y0 = Math.min(y0, p.y - (p.ry ?? p.r) - 3);
  }
  const bottom = base ?? Math.max(...ps.map((p) => p.y + (p.ry ?? p.r)));
  for (let y = Math.floor(y0); y <= bottom; y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const wob = (noise2(x * 0.22, y * 0.22, seed) - 0.5) * edge;
      let own = -1, light = 0;
      for (let k = ps.length - 1; k >= 0; k--) {
        const p = ps[k], ry = p.ry ?? p.r;
        const dx = x + 0.5 - p.x, dy = y + 0.5 - p.y;
        const d = Math.hypot(dx / p.r, dy / ry);
        if (d * p.r <= p.r + wob) {
          own = k;
          light = sphereLight(dx, dy, p.r + Math.max(wob, 0) + 0.01, ry + Math.max(wob, 0) + 0.01);
          if (light < 0) light = 0;
          break;
        }
      }
      if (own < 0) continue;
      // Shadow where a nearer puff overlaps this one.
      let ao = 0;
      for (let k = own + 1; k < ps.length; k++) {
        const p = ps[k], ry = p.ry ?? p.r;
        const out = Math.hypot((x + 0.5 - p.x) / p.r, (y + 0.5 - p.y) / ry) * p.r - p.r;
        if (out > 0 && out < 5) ao = Math.max(ao, 1 - out / 5);
      }
      const v = clamp((y - y0) / (bottom - y0));
      const jitter = (noise2(x * 0.5, y * 0.5, seed + 1) - 0.5) * 0.12;
      const tone = 0.32 + 0.5 * (1 - v) + 0.4 * (light - 0.5) - bottomDark * v * v - 0.4 * ao + lift + jitter;
      layer.set(x, y, rampPick(ramp, tone, x, y, spread));
    }
  }
}

// Interpolate a traced polyline [[x, y], ...] at column x.
export function polyAt(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return pts[pts.length - 1][1];
}

// A cloud whose outline is a traced top contour. The inside is packed with
// puffs (a jittered hex grid, plus small bumps riding the contour), and each
// pixel is shaded by the puff in front of it: lit top-left, shadowed in the
// crevice under the next puff, bluer toward the flat base.
export function cloudShape(layer, ramp, contour, { base, seed = 1, cell = 22, bump = 7, top = null, bottomDark = 0.45, lift = 0, rim = 0.18 } = {}) {
  const r = rng(seed);
  const x0 = Math.ceil(contour[0][0]), x1 = Math.floor(contour[contour.length - 1][0]);
  const yTop = top ?? Math.min(...contour.map((p) => p[1]));
  const puffs = [];
  for (let gy = yTop, row = 0; gy < base + cell; gy += cell * 0.8, row++) {
    for (let gx = x0 - cell + (row % 2) * cell * 0.5; gx < x1 + cell; gx += cell) {
      const px = gx + r.range(-3, 3), py = gy + r.range(-3, 3);
      if (py < polyAt(contour, px) - 2) continue;
      puffs.push({ x: px, y: py, r: cell * r.range(0.6, 1.15) });
    }
  }
  for (let x = x0; x <= x1; x += bump * r.range(0.9, 1.4)) {
    const br = bump * r.range(0.8, 1.25);
    puffs.push({ x, y: polyAt(contour, x) + br * 0.95, r: br });
  }
  puffs.sort((a, b) => a.y - b.y);
  for (let x = x0; x <= x1; x++) {
    const ty = polyAt(contour, x + 0.5);
    for (let y = Math.round(ty); y <= base; y++) {
      let own = -1;
      for (let k = puffs.length - 1; k >= 0; k--) {
        const p = puffs[k];
        if ((x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2 <= p.r * p.r) { own = k; break; }
      }
      let light = 0.5, ao = 0;
      if (own >= 0) {
        const p = puffs[own];
        light = Math.max(0, sphereLight(x + 0.5 - p.x, y + 0.5 - p.y, p.r + 0.01));
        for (let k = own + 1; k < puffs.length; k++) {
          const q = puffs[k];
          const out = Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) - q.r;
          if (out > 0 && out < 3) ao = Math.max(ao, 1 - out / 3);
        }
      }
      const v = clamp((y - yTop) / (base - yTop));
      const edge = y - ty < 2 ? rim : 0;
      const jitter = (noise2(x * 0.5, y * 0.5, seed + 1) - 0.5) * 0.1;
      const t = 0.42 + 0.42 * (1 - v) + 0.3 * (light - 0.5) - bottomDark * v * v - 0.22 * ao + edge + lift + jitter;
      layer.set(x, y, rampPick(ramp, t, x, y, 0.15));
    }
  }
}

// ---------------------------------------------------------------- foliage
// A leafy mass is the union of a few ellipses, filled with many small lit
// blobs (leaf clusters). Each blob is lit on its own and by its place in
// the mass, which gives the clumped, sparkly look of the reference.
export function massTest(ellipses, seed = 0, wobble = 2) {
  return (x, y) => {
    const w = (noise2(x * 0.3, y * 0.3, seed) - 0.5) * wobble;
    for (const e of ellipses) {
      const dx = (x + 0.5 - e.x) / (e.rx + w), dy = (y + 0.5 - e.y) / (e.ry + w);
      if (dx * dx + dy * dy <= 1) return true;
    }
    return false;
  };
}

export function bboxOf(ellipses) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of ellipses) {
    x0 = Math.min(x0, e.x - e.rx); x1 = Math.max(x1, e.x + e.rx);
    y0 = Math.min(y0, e.y - e.ry); y1 = Math.max(y1, e.y + e.ry);
  }
  return { x0: Math.floor(x0) - 3, y0: Math.floor(y0) - 3, x1: Math.ceil(x1) + 3, y1: Math.ceil(y1) + 3 };
}

export function foliage(layer, ramp, ellipses, {
  seed = 1, leaf = [2, 4], density = 0.55, lightBias = 0, wobble = 3, base = true, spread = 0.35, shadeY = 0.6,
} = {}) {
  const r = rng(seed);
  const inMass = massTest(ellipses, seed, wobble);
  const bb = bboxOf(ellipses);
  const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
  const massLight = (x, y) => {
    let best = 0;
    for (const e of ellipses) {
      const l = sphereLight(x - e.x, y - e.y, e.rx + 2, e.ry + 2);
      if (l > best) best = l;
    }
    return clamp(best * 0.8 + 0.25 - shadeY * 0.4 * ((y - bb.y0) / bh) + lightBias);
  };
  if (base) {
    for (let y = bb.y0; y <= bb.y1; y++) for (let x = bb.x0; x <= bb.x1; x++) {
      if (inMass(x, y)) layer.set(x, y, rampPick(ramp, massLight(x, y) * 0.35, x, y, 0.5));
    }
  }
  const leaves = [];
  const n = Math.round((bw * bh * density) / ((leaf[0] + leaf[1]) ** 2 / 4) * 0.9);
  for (let i = 0; i < n; i++) {
    const x = r.range(bb.x0, bb.x1), y = r.range(bb.y0, bb.y1);
    if (!inMass(x, y)) continue;
    leaves.push({ x, y, rad: r.range(leaf[0], leaf[1]), j: r.range(-0.1, 0.1) });
  }
  leaves.sort((a, b) => a.y - b.y);
  for (const lf of leaves) {
    const ml = massLight(lf.x, lf.y);
    fillEllipse(lf.x, lf.y, lf.rad, lf.rad * 0.85, (x, y, dx, dy) => {
      if (dx * dx + dy * dy > 0.75 && hash2(x, y, seed) < 0.5) return;
      const local = sphereLight(dx, dy, 1, 1);
      const t = 0.55 * ml + 0.5 * local - 0.12 + lf.j;
      layer.set(x, y, rampPick(ramp, t, x, y, spread));
    });
  }
  return inMass;
}

// ---------------------------------------------------------------- blossoms
const FLORETS = [
  ['.X.', 'XXX', '.X.'],
  ['.XX.', 'XXXX', 'XXXX', '.XX.'],
  ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
  ['.X.X.', 'XXXXX', '.XXX.', 'XXXXX', '.X.X.'],
];

// Clumps of small cross-shaped florets. Each floret takes one tone from its
// place on the clump (lit upper left, lavender shadow lower right); within a
// floret the upper-left petals are a step lighter and the lower-right a
// step darker, so every floret reads as its own little flower.
export function blossoms(layer, ramp, clumps, { seed = 1, leafRamp = null, size = [0, 3], density = 1 } = {}) {
  const r = rng(seed);
  const n1 = ramp.length - 1;
  const florets = [];
  for (const c of clumps) {
    const n = Math.round(((Math.PI * c.rx * c.ry) / 9) * density * (c.d ?? 1));
    for (let i = 0; i < n; i++) {
      // Bunched toward the middle, ragged at the rim.
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * (0.75 + 0.35 * noise2(Math.cos(a) * 2, Math.sin(a) * 2, seed));
      const x = c.x + Math.cos(a) * d * c.rx, y = c.y + Math.sin(a) * d * c.ry;
      const light = Math.max(0, sphereLight(x - c.x, y - c.y, c.rx + 1, c.ry + 1));
      florets.push({ x, y, light: light + (c.lift ?? 0), kind: r.int(size[0], size[1]), j: r.range(-0.1, 0.1), leaf: r() < 0.03 });
    }
  }
  florets.sort((a, b) => a.y - b.y);
  for (const f of florets) {
    const pat = FLORETS[f.kind];
    const h = pat.length, w = pat[0].length;
    const ox = Math.round(f.x - w / 2), oy = Math.round(f.y - h / 2);
    if (f.leaf && leafRamp) {
      layer.set(ox + 1, oy + 1, leafRamp[4]); layer.set(ox + 2, oy + 1, leafRamp[5]); layer.set(ox + 1, oy + 2, leafRamp[3]);
      continue;
    }
    const step = Math.round(clamp(0.05 + 0.95 * f.light + f.j) * n1);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      if (pat[py][px] !== 'X') continue;
      const side = (px - (w - 1) / 2) + (py - (h - 1) / 2);
      const centre = px === Math.floor(w / 2) && py === Math.floor(h / 2);
      let k = step + (side < -0.6 ? 1 : side > 0.6 ? -1 : 0);
      if (centre && step >= 3) k = step + 2;
      layer.set(ox + px, oy + py, ramp[Math.max(0, Math.min(n1, k))]);
    }
  }
}

// ---------------------------------------------------------------- willows
// A weeping willow: a low dome of 1px hanging strands. Strand colour varies
// per column, so the crown reads as vertical stripes; the lit side is upper
// left, and long strands at the edges trail off unevenly.
export function willow(layer, ramp, { x, top, hw, h, seed = 1, barkRamp = null, trunk = null, light = 0 }) {
  const r = rng(seed);
  if (trunk && barkRamp) {
    for (let y = top + h * 0.4; y < top + h + 2; y++) {
      for (let k = 0; k < trunk.w; k++) layer.set(trunk.x + k, y, barkRamp[k === 0 ? 4 : 2]);
    }
  }
  // A crown is a few overlapping domes; draw the higher, further ones first.
  const crowns = [
    { x: x + hw * 0.05, top, hw: hw * 0.7, h },
    { x: x - hw * 0.45, top: top + h * 0.2, hw: hw * 0.55, h: h * 0.82 },
    { x: x + hw * 0.5, top: top + h * 0.14, hw: hw * 0.52, h: h * 0.84 },
  ];
  crowns.forEach((c, i) => strands(layer, ramp, c, seed * 7 + i, light + (i === 1 ? 0.04 : i === 2 ? -0.06 : 0), r));
}

function strands(layer, ramp, { x, top, hw, h }, seed, light) {
  for (let cx = Math.floor(x - hw); cx <= Math.ceil(x + hw); cx++) {
    const u = (cx + 0.5 - x) / hw;
    if (Math.abs(u) > 1) continue;
    const crown = top + h * 0.3 * (u * u) + (noise2(cx * 0.3, 1, seed) - 0.5) * 4;
    const hang = top + h * (0.72 + 0.28 * Math.cos(u * 1.3)) + (hash2(cx, 7, seed) - 0.5) * h * 0.3;
    // Strands come in bunches of 2-3 columns that share a tone.
    const bunch = Math.floor((cx + hash2(cx >> 2, 3, seed) * 3) / 2.5);
    const col = (hash2(bunch, 3, seed) - 0.5) * 0.45;
    for (let y = Math.floor(crown); y <= hang; y++) {
      const v = (y - top) / h;
      if (v > 0.5 && noise2(cx * 0.8, y * 0.05, seed + 9) < (v - 0.5) * 0.8) continue;
      const domeLight = 1 - clamp((y - crown) / (h * 0.85));
      const wave = noise2(cx * 0.5, y * 0.09, seed);
      const t = 0.12 + 0.6 * domeLight - 0.2 * u + col + light + (wave - 0.5) * 0.35;
      layer.set(cx, y, rampPick(ramp, t, cx, y, 0.15));
    }
  }
}

// ---------------------------------------------------------------- roofs
// Grey-tile Chinese roof seen from the front: concave slope, eave corners
// curling up, rows of tiles, a pale ridge with upturned ends.
export function roof(layer, R, { x0, x1, ridgeY, eaveY, inset = 6, curl = 3, seed = 1, ridgeCap = true, gable = null, trimRamp = null }) {
  const ridgeX0 = x0 + inset, ridgeX1 = x1 - inset;
  const h = eaveY - ridgeY;
  const curlAt = (x) => {
    const d = Math.min(x - x0, x1 - x);
    const k = Math.max(4, (x1 - x0) * 0.12);
    return d < k ? curl * (1 - d / k) ** 2 : 0;
  };
  for (let y = ridgeY; y <= eaveY; y++) {
    const t = (y - ridgeY) / h;
    const tc = Math.pow(t, 1.7); // concave sweep
    const lx = lerp(ridgeX0, x0, tc), rx = lerp(ridgeX1, x1, tc);
    for (let x = Math.floor(lx); x <= Math.ceil(rx); x++) {
      if (y > eaveY - curlAt(x)) continue;
      const rowLine = (y - ridgeY) % 2 === 1;
      const channel = (x + (hash2(0, y, seed) > 0.5 ? 1 : 0)) % 3 === 0;
      let tone = 0.62 - 0.35 * t + (rowLine ? -0.2 : 0) + (channel ? -0.08 : 0) + (noise2(x * 0.3, y * 0.5, seed) - 0.5) * 0.15;
      if (x < lx + 1.5) tone += 0.12;
      layer.set(x, y, rampPick(R, tone, x, y, 0.3));
    }
    // eave edge highlight on the curled lip
  }
  for (let x = x0; x <= x1; x++) {
    const ey = Math.round(eaveY - curlAt(x));
    layer.set(x, ey, R[4]);
    layer.set(x, ey + 1, R[1]);
  }
  if (ridgeCap) {
    for (let x = ridgeX0; x <= ridgeX1; x++) {
      layer.set(x, ridgeY - 1, R[5]);
      layer.set(x, ridgeY, R[2]);
    }
    // upturned ridge ends
    layer.set(ridgeX0 - 1, ridgeY - 2, R[5]); layer.set(ridgeX0 - 1, ridgeY - 1, R[3]);
    layer.set(ridgeX1 + 1, ridgeY - 2, R[5]); layer.set(ridgeX1 + 1, ridgeY - 1, R[3]);
  }
  return { curlAt };
}

// Whitewashed wall with a dark band under the eave and a stone footing.
export function wall(layer, W, { x0, x1, y0, y1, footing = null, windows = [], winRamp = null }) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    let t = 0.85 - 0.1 * ((y - y0) / (y1 - y0 + 1)) + (hash2(x, y, 5) - 0.5) * 0.06;
    if (y - y0 < 2) t = 0.25;
    if (x === x1) t -= 0.25;
    layer.set(x, y, rampPick(W, t, x, y, 0.2));
  }
  if (footing) for (let x = x0; x <= x1; x++) {
    layer.set(x, y1, footing[1]);
    layer.set(x, y1 - 1, footing[2]);
  }
  if (winRamp) for (const w of windows) {
    for (let y = w.y; y < w.y + w.h; y++) for (let x = w.x; x < w.x + w.w; x++) layer.set(x, y, winRamp[(x + y) % 3 === 0 ? 1 : 0]);
  }
}

// ---------------------------------------------------------------- rocks
// Blocky rounded boulder: pale lit top, darker face and right side, a few
// cracks, and moss pooled on top and dripping over the edge.
export function boulder(layer, R, { x, y, w, h, seed = 1, moss = null, mossAmt = 0.5, power = 2.6 }) {
  const a = w / 2, b = h / 2, cx = x + a, cy = y + b;
  const r = rng(seed);
  const crackX = [r.int(x + 3, x + w - 3), r.int(x + 3, x + w - 3)];
  for (let py = Math.floor(y - 2); py <= y + h; py++) for (let px = Math.floor(x - 2); px <= x + w + 1; px++) {
    const wob = (noise2(px * 0.18, py * 0.18, seed) - 0.5) * 0.7 + (noise2(px * 0.6, py * 0.6, seed + 3) - 0.5) * 0.2;
    const ux = (px + 0.5 - cx) / a, uy = (py + 0.5 - cy) / b;
    const f = Math.abs(ux) ** power + Math.abs(uy) ** power;
    if (f > 1 + wob) continue;
    let nx = Math.sign(ux) * Math.abs(ux) ** (power - 1), ny = Math.sign(uy) * Math.abs(uy) ** (power - 1);
    const nz = Math.max(0.15, 1 - Math.hypot(nx, ny));
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl;
    const top = uy < -0.35;
    let t = 0.42 + -0.45 * nx * 0.6 + -ny * 0.5 + (top ? 0.18 : 0) + (fbm(px * 0.25, py * 0.25, seed, 2) - 0.5) * 0.3;
    if (crackX.includes(px) && !top && hash2(px, py, seed) > 0.3) t -= 0.3;
    if (uy > 0.75) t -= 0.25;
    layer.set(px, py, rampPick(R, t, px, py, 0.35));
    if (moss) {
      const m = fbm(px * 0.18, py * 0.18, seed + 4, 3);
      const drip = hash2(px, 1, seed) > 0.7 ? 0.25 : 0;
      if ((uy < -0.1 + drip && m > 1 - mossAmt) || (uy < -0.55 && m > 0.75 - mossAmt)) {
        const mt = 0.3 + -ny * 0.4 + -nx * 0.2 + (m - 0.5) * 0.6;
        layer.set(px, py, rampPick(moss, mt, px, py, 0.4));
      }
    }
  }
}

export { fillPoly, fillEllipse, bayer, rampPick };
