// Chaoran Tower (超然楼) seen from across Daming Lake, about 60 px tall.
// Top to bottom: bottle finial; hip-and-gable top roof with the gable facing
// us and ridge beasts; attic band with the name plaque; then three storeys,
// each a deep upturned eave over a bracket band, columns and windows, and a
// pale balcony railing. The base is hidden by island trees.
// Every material here is emissive, so at night the tower turns gold.

import { M } from '../palette/materials.js';
import { rampPick, bayer } from '../core/buffer.js';

const R = M.towerRoof, E = M.towerEave, Wd = M.towerWood, Rl = M.towerRail, Wn = M.towerWin, G = M.towerGold;

// An eave skirt: a sloped band from half-width a (top) to b (bottom),
// with corners that sweep up and out.
function eave(layer, cx, y0, h, a, b, curl = 3) {
  for (let y = y0; y < y0 + h; y++) {
    const t = (y - y0) / (h - 1);
    const hw = a + (b - a) * Math.pow(t, 0.8);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const row = (y - y0) % 2 === 1 ? -0.18 : 0;
      const left = x < cx - hw + 2 ? 0.12 : 0;
      layer.set(x, y, rampPick(R, 0.75 - t * 0.5 + row + left, x, y, 0.2));
    }
  }
  // Edge of the eave: a pale lip that lights up gold at night.
  const ey = y0 + h;
  for (let x = Math.round(cx - b); x <= Math.round(cx + b); x++) layer.set(x, ey, E[1]);
  for (let x = Math.round(cx - b) + 1; x < Math.round(cx + b); x++) layer.set(x, ey + 1, R[0]);
  // Upswept corners.
  for (let k = 1; k <= curl; k++) {
    layer.set(Math.round(cx - b) - k, ey - k + 1, E[k === curl ? 1 : 0]);
    layer.set(Math.round(cx + b) + k, ey - k + 1, E[k === curl ? 1 : 0]);
    layer.set(Math.round(cx - b) - k + 1, ey - k + 1, R[2]);
    layer.set(Math.round(cx + b) + k - 1, ey - k + 1, R[1]);
  }
}

// Bracket band (dougong) right under an eave: gold and shadow blocks.
function brackets(layer, cx, y, hw) {
  for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
    layer.set(x, y, (x - cx) % 2 === 0 ? G[1] : Wd[0]);
  }
}

// One storey: columns with window panels between, then a balcony.
function storey(layer, cx, y0, h, hw, railHw) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const col = Math.abs(x - cx) % 4 === 2;
      const edge = x <= cx - hw + 1 || x >= cx + hw - 1;
      let i;
      if (y === y0) i = Wd[0];
      else if (col || edge) i = Wd[x < cx ? 2 : 1];
      else if (Math.abs(x - cx) <= 1) i = Wn[0]; // the open central doorway
      else i = y === y0 + h - 1 ? Wd[1] : Wn[1];
      layer.set(x, y, i);
    }
  }
  // Balcony: rail, a row of posts, base
  const yb = y0 + h;
  for (let x = Math.round(cx - railHw); x <= Math.round(cx + railHw); x++) {
    layer.set(x, yb, Rl[2]);
    layer.set(x, yb + 1, (x - cx) % 2 === 0 ? Rl[1] : Wd[0]);
    layer.set(x, yb + 2, Rl[0]);
  }
}

export function drawTower(layer, cx, top) {
  let y = top;
  // Finial: a gold bottle on a short base.
  layer.set(cx, y, G[2]);
  for (let k = 1; k <= 3; k++) for (let dx = -1; dx <= 1; dx++) layer.set(cx + dx, y + k, G[dx < 0 ? 2 : dx === 0 ? 1 : 0]);
  layer.set(cx, y + 4, G[0]);
  for (let dx = -1; dx <= 1; dx++) layer.set(cx + dx, y + 5, G[1]);
  y += 6;

  // Top roof, hip-and-gable. Ridge with beasts on both ends.
  const ridgeHw = 10;
  for (let x = cx - ridgeHw; x <= cx + ridgeHw; x++) { layer.set(x, y, E[1]); layer.set(x, y + 1, R[1]); }
  for (const s of [-1, 1]) {
    layer.set(cx + s * ridgeHw, y - 1, R[2]); layer.set(cx + s * (ridgeHw + 1), y - 2, E[0]);
    layer.set(cx + s * (ridgeHw + 1), y - 1, R[1]);
  }
  // Gable triangle facing us, framed in wood with a gold line.
  for (let k = 0; k < 5; k++) {
    for (let x = cx - k * 1.6; x <= cx + k * 1.6; x++) {
      const xr = Math.round(x);
      const border = Math.abs(xr - cx) >= Math.floor(k * 1.6) - 0.5;
      layer.set(xr, y + 2 + k, border ? G[1] : Wd[k % 2 ? 2 : 3]);
    }
  }
  // Roof slopes either side of the gable, down to the eave line.
  for (let k = 0; k < 7; k++) {
    const yy = y + 2 + k;
    const hwTop = ridgeHw + 1 + k * 2;
    for (let x = cx - hwTop; x <= cx + hwTop; x++) {
      if (layer.get(x, yy) && Math.abs(x - cx) < k * 1.6 + 1 && k < 5) continue;
      const left = x < cx;
      layer.set(x, yy, rampPick(R, (left ? 0.7 : 0.45) - k * 0.05 + (k % 2 ? -0.15 : 0), x, yy, 0.2));
    }
  }
  y += 9;
  eave(layer, cx, y - 1, 1, 24, 25, 4);
  y += 2;

  // Attic band with the name plaque.
  for (let yy = y; yy < y + 3; yy++) for (let x = cx - 13; x <= cx + 13; x++) {
    layer.set(x, yy, yy === y ? Wd[0] : Math.abs(x - cx) % 4 === 2 ? Wd[2] : Wn[1]);
  }
  for (let x = cx - 3; x <= cx + 3; x++) { layer.set(x, y + 1, G[1]); layer.set(x, y + 2, R[0]); }
  layer.set(cx - 3, y + 2, G[1]); layer.set(cx + 3, y + 2, G[1]);
  y += 3;

  // Three storeys, eaves widening slightly toward the bottom.
  const levels = [
    { a: 14, b: 26, hw: 16, rail: 18 },
    { a: 15, b: 28, hw: 17, rail: 19 },
    { a: 16, b: 30, hw: 18, rail: 20 },
  ];
  for (const L of levels) {
    eave(layer, cx, y, 3, L.a, L.b, 3);
    y += 5;
    brackets(layer, cx, y, L.hw);
    y += 1;
    storey(layer, cx, y, 5, L.hw, L.rail);
    y += 8;
  }
  // Lanterns hang from the lowest eave corners.
  return y;
}

// Soft warm halo around the tower, drawn on the glow layer (night only).
export function towerHalo(glow, tower) {
  for (let y = 115; y < 200; y++) for (let x = 455; x < 545; x++) {
    if (tower.get(x, y)) continue;
    let d = 99;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      if (tower.get(x + dx, y + dy)) d = Math.min(d, Math.hypot(dx, dy));
    }
    if (d > 6) continue;
    const p = 1 - d / 7;
    if (bayer(x, y) < p * 0.8) glow.set(x, y, M.glow[d < 2.5 ? 1 : 0]);
  }
}
