// Animated pixel map. The layers are rendered once for the time of day and
// grouped into a few stacks; every frame the stacks are laid down back to
// front with the moving pieces drawn between them. Sprites take their
// colours from the map's palette through the same lookup table as the
// layers, so they recolour with the time of day.
//
// Everything works on plain RGBA buffers, so the same code drives the page
// and the preview tool (tools/preview-anim.js).

import { renderPixmap, buildLut } from './draw.js';
import { TIMES } from '../palette/times.js';
import { SWALLOWS } from './swallows.js';

export const FPS = 6;

// Layer stacks, back to front. Sprites go in the slots between them.
const STACKS = {
  back: ['sky', 'clouds', 'mountains', 'island', 'tower', 'lake'],
  mid: ['village', 'ground', 'pool'],
  front: ['tree', 'glow'],
};

const REGION = { land: 0, sky: 1, water: 2, cloud: 3, mountain: 4, light: 5 };

// Stable hash in [0, 1).
function hash(a, b, c = 0) {
  let v = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- fountains
// The three spring jets in the pool: x, top of the spray, base.
const JETS = [
  { x: 89, top: 239, base: 268 },
  { x: 115, top: 249, base: 280 },
  { x: 145, top: 245, base: 268 },
];

// ---------------------------------------------------------------- the scene
export function createScene(pix, timeId) {
  const { W, H, PALETTE, LAYER, LAYERS, REGION: REG } = pix;
  const n = PALETTE.length;
  const lut = buildLut(pix, timeId);
  const t = TIMES[timeId];

  const stacks = {};
  for (const [k, names] of Object.entries(STACKS)) stacks[k] = renderPixmap(pix, timeId, new Set(names));
  // Only the covered pixels of the upper stacks need laying down each frame.
  const covered = (buf) => {
    const idx = [];
    for (let p = 0; p < W * H; p++) if (buf[p * 4 + 3]) idx.push(p);
    return Int32Array.from(idx);
  };
  const midIdx = covered(stacks.mid);
  const frontIdx = covered(stacks.front);

  // A palette colour in a region, as RGB for this time of day.
  const nearestIndex = (hexc) => {
    const want = [1, 3, 5].map((i) => parseInt(hexc.slice(i, i + 2), 16));
    let best = 0, bd = Infinity;
    PALETTE.forEach((h, i) => {
      const c = [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
      const d = c.reduce((s, v, k) => s + (v - want[k]) ** 2, 0);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  const colour = (hexc, region) => {
    const o = (REGION[region] * n + nearestIndex(hexc)) * 4;
    return [lut[o], lut[o + 1], lut[o + 2]];
  };
  const C = {
    foam: colour('#fcfcfc', 'water'),
    spray: colour('#dfeefa', 'water'),
    ring: colour('#b0d9fa', 'water'),
    glint: colour('#fcfcfc', 'water'),
    glintSoft: colour('#a3d2f8', 'water'),
    petal: colour('#f7c9d7', 'land'),
    petalLight: colour('#fbe3e9', 'land'),
    petalShade: colour('#ef94b5', 'land'),
    bird: colour('#213b5c', 'land'),
    birdDark: colour('#23242f', 'land'),
    belly: colour('#ded3c4', 'land'),
    throat: colour('#996460', 'land'),
  };

  const layerIs = (name) => { const k = LAYERS.indexOf(name); return (p) => LAYER[p] === k; };
  const inPool = layerIs('pool');
  const inLake = layerIs('lake');
  const isWater = (p) => REG[p] === REGION.water;

  // Jet pixels: the bright spray inside each jet's column.
  const jetPx = JETS.map((j) => {
    const px = [];
    for (let y = j.top; y <= j.base; y++) for (let x = j.x - 7; x <= j.x + 7; x++) {
      const p = y * W + x, o = p * 4, b = stacks.mid;
      if (inPool(p) && b[o] + b[o + 1] + b[o + 2] > 600) px.push(p);
    }
    return px;
  });

  // Open lake water for glints: water pixels of the lake layer.
  const lakePx = [];
  // Only open water: well clear of the shore, bridge and willows.
  const open = (p) => {
    const x = p % W, y = (p / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -4; dx <= 6; dx++) {
      const q = (y + dy) * W + x + dx;
      if (!inLake(q) || !isWater(q)) return false;
    }
    return true;
  };
  for (let p = 0; p < W * H; p++) {
    const y = (p / W) | 0;
    if (y > 165 && y < 228 && p % W > 300 && open(p)) lakePx.push(p);
  }

  const put = (out, x, y, c, a = 1) => {
    x = Math.round(x); y = Math.round(y);         // a half-pixel y would shift half a row sideways
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4;
    for (let i = 0; i < 3; i++) out[o + i] += (c[i] - out[o + i]) * a;
  };
  const over = (out, buf, idx) => {
    for (let i = 0; i < idx.length; i++) {
      const o = idx[i] * 4, a = buf[o + 3] / 255;
      if (a === 1) { out[o] = buf[o]; out[o + 1] = buf[o + 1]; out[o + 2] = buf[o + 2]; }
      else for (let c = 0; c < 3; c++) out[o + c] += (buf[o + c] - out[o + c]) * a;
    }
  };

  // ---- lake: glints that twinkle in and out
  function lakeGlints(out, f) {
    const LIFE = 20, COUNT = 26;
    for (let i = 0; i < COUNT; i++) {
      const cycle = Math.floor((f + i * 7) / LIFE), age = (f + i * 7) % LIFE;
      const p = lakePx[Math.floor(hash(i, cycle, 3) * lakePx.length)];
      if (p === undefined) continue;
      const x = p % W, y = (p / W) | 0;
      const len = 2 + Math.floor(hash(i, cycle, 4) * 3);
      const mid = age > 5 && age < LIFE - 6;
      for (let k = 0; k < len; k++) {
        const q = y * W + x + k;
        if (!inLake(q) || !isWater(q)) continue;
        if (mid) put(out, x + k, y, k === 0 || k === len - 1 ? C.glintSoft : C.glint, 0.9 * (t.waterSky > 0.25 ? 0.6 : 1));
        else if (age <= 5 || age >= LIFE - 6) put(out, x + k, y, C.glintSoft, 0.6);
      }
    }
  }

  // Blossom pixels in the canopy, where petals let go.
  const inTree = layerIs('tree');
  const blossom = [];
  for (let p = 0; p < W * H; p++) {
    const x = p % W, y = (p / W) | 0;
    if (!inTree(p) || y > 150 || x > 250) continue;
    const o = p * 4, b = stacks.front;
    if (b[o] > 200 && b[o] > b[o + 2] + 20) blossom.push(p);   // pink
  }

  // ---- petals: drifting down from the canopy, tumbling and swaying
  // Tumbling petal frames, about the size of the petals painted in the
  // scene: L = light, P = pink, S = shade.
  const PETAL_SHAPES = [
    ['..LLP..', '.LLPPP.', 'LPPPPPS', '.PPPSS.', '..SS...'],   // flat, facing us
    ['.LLP..', 'LLPPP.', 'LPPPS.', '.PPSSS', '..SSS.'],         // tilted
    ['LLP', 'LPP', 'PPS', 'PSS', 'SS.'],                         // edge-on
    ['..LL.', '.LPPS', 'LPPPS', 'PPSS.', '.SS..'],               // tilted the other way
  ].map((rows) => rows.flatMap((row, dy) => [...row].flatMap((ch, dx) =>
    ch === '.' ? [] : [[dx, dy, { L: 'petalLight', P: 'petal', S: 'petalShade' }[ch]]])));
  function petals(out, f) {
    const LIFE = 400, COUNT = t.moon ? 6 : 12;
    for (let i = 0; i < COUNT; i++) {
      const offset = Math.floor(hash(i, 0, 21) * LIFE);
      const cycle = Math.floor((f + offset) / LIFE), age = (f + offset) % LIFE;
      const from = blossom[Math.floor(hash(i, cycle, 22) * blossom.length)];
      if (from === undefined) continue;
      // A breeze from the left carries them diagonally across the screen,
      // all the way down; it rises and falls slowly.
      const vx = 0.55 + hash(i, cycle, 23) * 0.35;
      const vy = 0.55 + hash(i, cycle, 24) * 0.3;
      const phase = hash(i, cycle, 25) * 6.28;
      const gust = 10 * Math.sin((f - age) * 0.01 + age * 0.012) - 10 * Math.sin((f - age) * 0.01);
      const x = from % W + vx * age + gust + 4 * Math.sin(age * 0.07 + phase);
      const y = ((from / W) | 0) + vy * age;
      if (y >= H || x >= W) continue;
      const shape = PETAL_SHAPES[Math.floor(age / 4 + i) % PETAL_SHAPES.length];
      for (const [dx, dy, c] of shape) put(out, x + dx, y + dy, C[c]);
    }
  }

  // ---- swallows: swooping across the sky, behind the tree
  // The two swallows painted in the reference (src/pixmap/swallows.js):
  // a nearer, bigger one and a farther, smaller one, each with its glide
  // pose and two flap frames (wing halfway, wing down). Colours go through the palette so they follow the time.
  const SWALLOW = Object.fromEntries(Object.entries(SWALLOWS).map(([k, v]) => [k, {
    w: v.w,
    frames: v.frames.map((fr) => fr.map(([dx, dy, h]) => [dx, dy, colour(h, 'land')])),
  }]));
  function swallows(out, f) {
    if (!t.animals) return;                            // roosting at night
    const COUNT = 3, PERIOD = 320;
    for (let i = 0; i < COUNT; i++) {
      const offset = Math.floor(hash(i, 0, 31) * PERIOD);
      const cycle = Math.floor((f + offset) / PERIOD), age = (f + offset) % PERIOD;
      const speed = 2 + hash(i, cycle, 32) * 1.2;      // px per frame
      const dir = hash(i, cycle, 33) < 0.6 ? 1 : -1;   // mostly with the breeze
      const x = dir > 0 ? -12 + age * speed : W + 12 - age * speed;
      if (x < -12 || x > W + 12) continue;             // between passes
      // A swooping path: a slow wave with one deeper dip.
      const base = 25 + hash(i, cycle, 34) * 60;
      const y = base + 14 * Math.sin(age * 0.035 + i) + 18 * Math.exp(-(((age - 70) / 25) ** 2));
      // A burst of three full wingbeats (up, half, down, half), then a glide.
      const bird = SWALLOW[i === 0 ? 'near' : 'far'];
      const beat = (age + i * 9) % 36;
      const frame = beat < 12 ? [0, 1, 2, 1][beat % 4] : 0;
      for (const [dx, dy, c] of bird.frames[frame]) put(out, x + (dir > 0 ? dx : bird.w - 1 - dx), y + dy - 8, c);
    }
  }

  // ---- lake: small rings spreading slowly here and there
  function lakeRipples(out, f) {
    const LIFE = 30, COUNT = 7;
    for (let i = 0; i < COUNT; i++) {
      const cycle = Math.floor((f + i * 11) / LIFE), age = (f + i * 11) % LIFE;
      const p = lakePx[Math.floor(hash(i, cycle, 9) * lakePx.length)];
      if (p === undefined) continue;
      const cx = p % W, cy = (p / W) | 0;
      const rx = 1.5 + age * 0.22, ry = Math.max(1, rx * 0.35);
      const fade = 1 - age / LIFE;
      for (let a = 0; a < Math.PI * 2; a += 0.9 / rx) {
        if (Math.sin(a * 3 + i) < -0.3) continue;
        const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
        const q = y * W + x;
        if (inLake(q) && isWater(q)) put(out, x, y, C.glint, 0.6 * fade);
      }
    }
  }

  // ---- pool: shimmering jets, flickering spray, spreading ripples
  function fountains(out, f) {
    JETS.forEach((j, ji) => {
      // Bands of light travel up each jet.
      for (const p of jetPx[ji]) {
        const x = p % W, y = (p / W) | 0;
        const band = (((y - f + ji * 3) % 6) + 6) % 6;   // light falls down the spray
        if (band === 0) put(out, x, y, C.foam);
        else if (band === 3 && hash(x, y, f >> 1) < 0.5) put(out, x, y, C.spray, 0.7);
      }
      // Spray flicking off the crown.
      for (let k = 0; k < 5; k++) {
        const g = f >> 1;                                  // changes every other frame
        const r = hash(ji, g, k);
        const dx = Math.round((r - 0.5) * 8), dy = -1 - Math.floor(hash(k, g, ji) * 4);
        put(out, j.x + dx, j.top + dy + Math.abs(dx) / 2, r < 0.5 ? C.foam : C.spray, 0.85);
      }
      // Ripple rings spreading from the base.
      const PERIOD = 26;
      for (let ring = 0; ring < 2; ring++) {
        const age = (f + ji * 5 + ring * PERIOD / 2) % PERIOD;
        const rx = 4 + age * 0.6, ry = rx * 0.32;
        const fade = 1 - age / PERIOD;
        for (let a = 0; a < Math.PI * 2; a += 1 / rx) {
          if (Math.sin(a * rx * 0.8) < -0.1) continue;          // dashed
          const x = Math.round(j.x + Math.cos(a) * rx), y = Math.round(j.base + Math.sin(a) * ry);
          const p = y * W + x;
          if (inPool(p) && isWater(p)) put(out, x, y, C.ring, 0.75 * fade);
        }
      }
    });
  }

  return {
    W, H,
    // Draw frame number f into out (a W * H * 4 RGBA buffer).
    frame(out, f) {
      out.set(stacks.back);
      lakeRipples(out, f);
      lakeGlints(out, f);
      swallows(out, f);
      over(out, stacks.mid, midIdx);
      fountains(out, f);
      over(out, stacks.front, frontIdx);
      petals(out, f);
      return out;
    },
  };
}

// Browser loop: runs at FPS, pauses when hidden, still frame for reduced motion.
export function play(canvas, pix, timeId) {
  const scene = createScene(pix, timeId);
  canvas.width = scene.W;
  canvas.height = scene.H;
  const ctx = canvas.getContext('2d');
  const buf = new Uint8ClampedArray(scene.W * scene.H * 4);
  const img = new ImageData(buf, scene.W, scene.H);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let f = 0, last = 0;
  const draw = () => { scene.frame(buf, f); ctx.putImageData(img, 0, 0); };
  draw();
  if (still) return;
  const tick = (now) => {
    if (now - last >= 1000 / FPS) { last = now; f++; draw(); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
