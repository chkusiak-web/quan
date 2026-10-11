// Five times of day. Each one turns the material list into a 256-entry
// RGBA lookup table; the picture itself never changes, only its colours.

import { MATERIALS } from './materials.js';

export const TIME_ORDER = ['morning', 'midday', 'afternoon', 'evening', 'night'];

export const TIMES = {
  morning: {
    label: 'Morning', from: 5, to: 10,
    mountain: ['#6a7fb0', '#7f93c0', '#96a8cc', '#b0bed6', '#cad2de'], // distant ranges, dark to light
    skyFlat: '#5c9ee2', // one flat sky colour for the pixel map
    sky: ['#3a7fd0', '#4a8edb', '#5c9ee2', '#74ade6', '#93bde6', '#b6cde2', '#dcd8d8', '#f6dcc6'],
    cloud: ['#a3a7cc', '#bcbdd8', '#d6d0de', '#ecdfe2', '#f9ebe4', '#fff6ec'],
    hazeCloud: ['#c2c4d8', '#d4d2dc', '#e4dde0', '#f2e6e2', '#fcf0ea'],
    horizon: '#e4dcd8',
    mul: [1.0, 0.96, 0.95], lift: [0.03, 0.02, 0.04], sat: 0.85,
    haze: 0.45, waterSky: 0.2, emissive: 0, glow: 0, star: 0, moon: 0, animals: 1,
  },
  midday: {
    label: 'Midday', from: 10, to: 14,
    mountain: ['#4f8fcc', '#5f9cd6', '#71abe0', '#86bae8', '#9cc8ee'],
    cloud: ['#6fb6f0', '#8ac6f6', '#a9d5fa', '#c8e5fb', '#e4f1fb', '#fcfcfc'],
    skyFlat: '#3aa2f5', // one flat sky colour for the pixel map
    horizon: '#c9e6fc',
    mul: [1, 1, 1], lift: [0, 0, 0], sat: 1,
    haze: 0, waterSky: 0, emissive: 0, glow: 0, star: 0, moon: 0, animals: 1,
  },
  afternoon: {
    label: 'Afternoon', from: 14, to: 17,
    mountain: ['#3f78ae', '#5088be', '#6699c8', '#7eaad0', '#98bcd8'], // distant ranges, dark to light
    skyFlat: '#3c96de', // one flat sky colour for the pixel map
    sky: ['#2a7acc', '#3288d6', '#3c96de', '#4ca3e2', '#64b0e4', '#84bee2', '#aacede', '#d6dccc'],
    cloud: ['#9cb0cc', '#b8c6d6', '#d0d8dc', '#e6e6e0', '#f6f0e4', '#fffaee'],
    hazeCloud: ['#b4ccdc', '#c8d8e0', '#dae2e2', '#eaeae2', '#f8f4ea'],
    horizon: '#d8e0d6',
    mul: [1.05, 0.98, 0.86], lift: [0.02, 0.01, 0], sat: 1.05,
    haze: 0.15, waterSky: 0.1, emissive: 0, glow: 0, star: 0, moon: 0, animals: 1,
  },
  evening: {
    label: 'Evening', from: 17, to: 20,
    mountain: ['#5a3f78', '#6c4a86', '#805694', '#9663a0', '#ad72aa'], // distant ranges, dark to light
    skyFlat: '#c46a86', // one flat sky colour for the pixel map
    sky: ['#2c2a6a', '#3e3478', '#5a3e86', '#7e4a8a', '#a8588a', '#d46c80', '#f08c72', '#ffb070'],
    cloud: ['#4e3a6e', '#74507e', '#a0608a', '#d07a86', '#f4a080', '#ffd09a'],
    hazeCloud: ['#8a5a86', '#b06a88', '#d4808a', '#ee9a86', '#ffbc8c'],
    horizon: '#e8907a',
    mul: [0.98, 0.7, 0.6], lift: [0.05, 0.02, 0.06], sat: 1.0,
    haze: 0.5, waterSky: 0.35, emissive: 0.75, glow: 0.3, star: 0, moon: 0, animals: 1,
  },
  night: {
    label: 'Night', from: 20, to: 5,
    mountain: ['#141c38', '#1a2442', '#212c4c', '#283456', '#303e62'], // distant ranges, dark to light
    skyFlat: '#0e1630', // one flat sky colour for the pixel map
    sky: ['#050918', '#080e24', '#0c142e', '#111a38', '#162242', '#1c2a4c', '#243458', '#2e4064'],
    cloud: ['#121a30', '#1a243c', '#232e48', '#2e3a56', '#3e4c68', '#56668a'],
    hazeCloud: ['#1a2440', '#202c48', '#283652', '#323f5c', '#3c4a66'],
    horizon: '#28365a',
    mul: [0.2, 0.25, 0.42], lift: [0.02, 0.03, 0.07], sat: 0.55,
    haze: 0.45, waterSky: 0.3, emissive: 1, glow: 0.5, star: 1, moon: 1, animals: 0,
  },
};

// Which time block a clock hour falls into.
export function timeForHour(hour) {
  for (const id of TIME_ORDER) {
    const { from, to } = TIMES[id];
    if (from < to ? hour >= from && hour < to : hour >= from || hour < to) return id;
  }
  return 'midday';
}

export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function grade(rgb, t) {
  const lum = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
  return rgb.map((c, i) => (lum + (c - lum) * t.sat) * t.mul[i] + t.lift[i]);
}

function colorFor(m, t) {
  const base = hex(m.hex);
  const horizon = hex(t.horizon);
  const own = (key) => (t[key] ? hex(t[key][m.step]) : base);
  switch (m.group) {
    case 'sky': return [own('sky'), 1];
    case 'cloud': return [own('cloud'), 1];
    case 'haze': return [own('hazeCloud'), 1];
    case 'star': return [base, t.star];
    case 'moon': return [base, t.moon];
    case 'glow': return [base, t.glow * (m.step ? 1 : 0.6)];
    case 'animal': return [mix(grade(base, t), horizon, m.haze * t.haze), t.animals];
    case 'water': return [mix(grade(base, t), horizon, t.waterSky), 1];
    case 'pool': return [mix(grade(base, t), horizon, t.waterSky * 0.4), 1];
    case 'emissive': {
      const day = mix(grade(base, t), horizon, m.haze * t.haze);
      return [m.glow ? mix(day, hex(m.glow), t.emissive) : day, 1];
    }
    default: return [mix(grade(base, t), horizon, m.haze * t.haze), 1];
  }
}

export function buildLut(timeId) {
  const t = TIMES[timeId];
  const lut = new Uint8ClampedArray(256 * 4);
  MATERIALS.forEach((m, i) => {
    const [rgb, a] = colorFor(m, t);
    const o = (i + 1) * 4;
    lut[o] = Math.round(rgb[0] * 255);
    lut[o + 1] = Math.round(rgb[1] * 255);
    lut[o + 2] = Math.round(rgb[2] * 255);
    lut[o + 3] = Math.round(a * 255);
  });
  return lut;
}
