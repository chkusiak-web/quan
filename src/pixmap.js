// Pixmap page: the reference as a 512 x 320, 72-colour pixel map stored in code,
// in the palette for the current hour. Add ?time=night (or morning, midday,
// afternoon, evening) to preview.

import * as baotu from './pixmap/baotu.js';
import { drawPixmap } from './pixmap/draw.js';
import { TIMES, timeForHour } from './palette/times.js';

const asked = new URLSearchParams(location.search).get('time');
const time = TIMES[asked] ? asked : timeForHour(new Date().getHours());

drawPixmap(document.getElementById('scene'), baotu, time);
document.body.dataset.time = time;
