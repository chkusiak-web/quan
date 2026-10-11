// Turns index layers into pixels for one time of day.

import { W, H } from './core/buffer.js';
import { buildLut } from './palette/times.js';

export function composite(stack, timeId, hidden = new Set()) {
  const lut = buildLut(timeId);
  const out = new Uint8ClampedArray(W * H * 4);
  for (const entry of stack) {
    if (hidden.has(entry.id)) continue;
    for (const layer of entry.glow ? [entry.layer, entry.glow] : [entry.layer]) blend(out, layer.data, lut);
  }
  return out;
}

export function renderLayer(entry, timeId) {
  const lut = buildLut(timeId);
  const out = new Uint8ClampedArray(W * H * 4);
  for (const layer of entry.glow ? [entry.layer, entry.glow] : [entry.layer]) blend(out, layer.data, lut);
  return out;
}

function blend(out, data, lut) {
  for (let p = 0; p < data.length; p++) {
    const i = data[p];
    if (!i) continue;
    const l = i * 4, a = lut[l + 3];
    if (!a) continue;
    const o = p * 4;
    if (a === 255) {
      out[o] = lut[l]; out[o + 1] = lut[l + 1]; out[o + 2] = lut[l + 2]; out[o + 3] = 255;
    } else {
      const f = a / 255, oa = out[o + 3] / 255;
      const na = f + oa * (1 - f);
      for (let c = 0; c < 3; c++) out[o + c] = (lut[l + c] * f + out[o + c] * oa * (1 - f)) / na;
      out[o + 3] = na * 255;
    }
  }
}
