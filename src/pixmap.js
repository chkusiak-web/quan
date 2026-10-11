// Pixmap page: the animated 512 x 320 pixel map, in the palette for the
// current hour. Add ?time=night (or morning, midday,
// afternoon, evening) to preview.

import * as baotu from './pixmap/baotu.js';
import { play } from './pixmap/animate.js';
import { TIMES, timeForHour } from './palette/times.js';

const asked = new URLSearchParams(location.search).get('time');
const time = TIMES[asked] ? asked : timeForHour(new Date().getHours());

play(document.getElementById('scene'), baotu, time);
document.body.dataset.time = time;
