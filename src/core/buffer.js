// A layer is a grid of palette indices (0 = transparent), never RGB.
// Colour is applied at the very end through a time-of-day lookup table.

export const W = 640;
export const H = 400;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Ordered-dither threshold for a pixel, in (0, 1).
export function bayer(x, y) {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

// Pick an index from a ramp for a continuous tone t in [0, 1], dithering
// between neighbouring steps so bands break up into a pixel pattern.
export function rampPick(ramp, t, x, y, spread = 1) {
  const n = ramp.length;
  const v = Math.max(0, Math.min(0.9999, t)) * (n - 1);
  const lo = Math.floor(v);
  const f = v - lo;
  const step = (f - 0.5) * spread + 0.5 > bayer(x, y) ? 1 : 0;
  return ramp[Math.min(n - 1, lo + step)];
}

export class Layer {
  constructor(id, w = W, h = H) {
    this.id = id;
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h);
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x, y, i) {
    x |= 0; y |= 0;
    if (i && x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = i;
  }
  // Writes even when i is 0, to punch holes.
  put(x, y, i) {
    x |= 0; y |= 0;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = i;
  }
  get(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }
  rect(x0, y0, w, h, i) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, i);
  }
  hline(x0, x1, y, i) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, i);
  }
  // Stamp a sprite: rows of characters mapped through a key object.
  sprite(x0, y0, rows, key) {
    rows.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        const i = key[ch];
        if (i) this.set(x0 + dx, y0 + dy, i);
      });
    });
  }
}
