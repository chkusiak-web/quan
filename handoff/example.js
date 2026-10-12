// ?mode=right   fill only the area right of the sidebar (option B)
// ?time=night   force a time block (morning, midday, afternoon, evening, night)
import { mountScene, TIME_ORDER } from './quan-scene.js';

const params = new URLSearchParams(location.search);
if (params.get('mode') === 'right') document.body.classList.add('right');
const time = TIME_ORDER.includes(params.get('time')) ? params.get('time') : null;

mountScene(document.getElementById('home-canvas'), {
  fit: document.getElementById('home-bg'),
  time,
});
