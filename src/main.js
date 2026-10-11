// Home page: draw the scene once, in the palette for the current hour.
// Add ?time=night (or morning, midday, afternoon, evening) to preview.

import { W, H } from './core/buffer.js';
import { buildScene } from './scene/index.js';
import { composite } from './render.js';
import { TIMES, timeForHour } from './palette/times.js';

const asked = new URLSearchParams(location.search).get('time');
const time = TIMES[asked] ? asked : timeForHour(new Date().getHours());

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
ctx.putImageData(new ImageData(composite(buildScene(), time), W, H), 0, 0);
document.body.dataset.time = time;
