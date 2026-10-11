// Daming Lake. The water is built from horizontal runs of colour; the far
// shore and island are mirrored into it as broken strips that thin out with
// distance. Ducks, an egret and lotus pads sit on a separate layer.

import { M, reflectionOf } from '../../palette/materials.js';
import { W } from '../../core/buffer.js';
import { rng, noise2, hash2 } from '../../core/rng.js';
import { clamp } from '../../core/shapes.js';
import { FAR_WATER, ISLAND_WATER } from './shore.js';
import { MOON } from './sky.js';

export const LAKE_BOTTOM = 320;
const waterline = (x) => (x >= 378 ? ISLAND_WATER : FAR_WATER);

export const lake = {
  id: 'lake',
  label: 'Lake',
  depth: 0.24,
  needs: ['island', 'farShore'],
  draw(layer, { built, glow }) {
    const r = rng(41);
    for (let y = FAR_WATER; y < LAKE_BOTTOM; y++) {
      const f = (y - FAR_WATER) / (LAKE_BOTTOM - FAR_WATER);
      const base = 0.78 - f * 0.45;
      let x = 0;
      while (x < W) {
        const len = r.int(3, 10 + Math.round(18 * (1 - f)));
        const roll = r();
        const off = roll < 0.16 ? 0.13 : roll < 0.3 ? -0.11 : roll < 0.33 ? 0.28 : 0;
        const step = Math.round(clamp(base + off) * (M.lake.length - 1));
        for (let k = 0; k < len && x < W; k++, x++) if (y >= waterline(x)) layer.set(x, y, M.lake[step]);
      }
    }

    // Mirror the shore. Nearer layers win, so read island first.
    const sources = ['island', 'farShore'].map((id) => built[id].layer);
    for (let x = 0; x < W; x++) {
      const wl = waterline(x);
      for (let y = wl; y < wl + 90; y++) {
        const d = y - wl;
        const jit = Math.round(Math.sin(y * 1.9) * 1.2 + (noise2(x * 0.1, y * 0.7, 3) - 0.5) * 2);
        // Broken into strips, thinning with distance.
        if (noise2(x * 0.09, y * 0.55, 5) < 0.15 + d / 140) continue;
        if (d > 3 && hash2(x >> 1, y, 6) < 0.12) continue;
        const sy = wl - 1 - Math.round(d * 0.95);
        let src = 0;
        for (const s of sources) { src = s.get(x + jit, sy); if (src) break; }
        const refl = src ? reflectionOf(src) : 0;
        if (refl) layer.set(x, y, refl);
      }
    }

    // Moonlight on the water: a broken column of dashes, on the glow layer
    // so it only shows at night.
    for (let y = FAR_WATER + 2; y < LAKE_BOTTOM; y += 2) {
      const half = 2 + (y - FAR_WATER) * 0.06;
      for (let x = Math.round(MOON.x - half - 2); x <= MOON.x + half + 2; x++) {
        if (y < waterline(x)) continue;
        if (noise2(x * 0.4, y * 0.3, 9) > 0.45 + Math.abs(x - MOON.x) / (half * 3)) glow.set(x, y, M.moonRefl[Math.abs(x - MOON.x) < half * 0.5 ? 1 : 0]);
      }
    }
  },
};

const DUCK = ['.h..', 'hbbb', '.ddd'];
const HEN = ['.h..', 'hbbb', '.ddd'];
const EGRET = ['yw..', '.w..', '.ww.', 'wwws', '.ww.', '..l.', '..l.'];
const LILY_PATCHES = [
  { x: 444, y: 258, w: 76, h: 24, n: 42 },
  { x: 566, y: 238, w: 74, h: 18, n: 30 },
  { x: 560, y: 268, w: 80, h: 26, n: 44 },
];

export const lakeLife = {
  id: 'lakeLife',
  label: 'Lotus, ducks and egret',
  depth: 0.3,
  draw(layer) {
    const r = rng(43);
    for (const p of LILY_PATCHES) {
      const pads = [];
      for (let i = 0; i < p.n; i++) {
        const u = r(), v = r();
        if ((u - 0.5) ** 2 / 0.25 + (v - 0.5) ** 2 / 0.25 > 1) continue;
        pads.push({ x: Math.round(p.x + u * p.w), y: Math.round(p.y + v * p.h) });
      }
      pads.sort((a, b) => a.y - b.y);
      for (const pad of pads) {
        const w = r.int(2, 4);
        for (let k = 0; k < w; k++) layer.set(pad.x + k, pad.y, M.lily[k === 0 ? 3 : 2]);
        for (let k = 0; k < w - 1; k++) layer.set(pad.x + k, pad.y + 1, M.lily[k === 0 ? 1 : 0]);
        if (r() < 0.22) {
          layer.set(pad.x + 1, pad.y - 1, M.lotus[1]);
          layer.set(pad.x + 1, pad.y - 2, M.lotus[2]);
          if (r() < 0.5) layer.set(pad.x + 2, pad.y - 1, M.lotus[0]);
        }
      }
    }

    // Ripple rings and reflections for the birds.
    const ripple = (cx, cy, rx) => {
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        if (Math.sin(a * 3) < 0) continue;
        layer.set(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * rx * 0.25), M.animalRefl[1]);
      }
    };
    const duck = (x, y, hen) => {
      layer.sprite(x, y, hen ? HEN : DUCK, { h: hen ? M.duck[2] : M.duck[4], b: hen ? M.duck[3] : M.duck[2], d: M.duck[1] });
      layer.set(x + 1, y + 3, M.animalRefl[0]); layer.set(x + 2, y + 3, M.animalRefl[0]);
      ripple(x + 2, y + 3, 6);
    };
    duck(532, 252, false);
    duck(543, 253, true);
    layer.sprite(588, 246, EGRET, { y: M.egret[4], w: M.egret[3], s: M.egret[1], l: M.egret[5] });
    for (let k = 0; k < 4; k++) layer.set(589 + (k > 1 ? 1 : 0), 253 + k, M.animalRefl[1]);
    ripple(590, 253, 5);
  },
};
