// ?mode=behind  run the scene behind the sidebar (option A, not chosen)
// ?time=night   force a time block (morning, midday, afternoon, evening, night)
import { mountScene, TIME_ORDER } from './quan-scene.js';

const params = new URLSearchParams(location.search);
if (params.get('mode') === 'behind') document.body.classList.add('behind');
const time = TIME_ORDER.includes(params.get('time')) ? params.get('time') : null;

mountScene(document.getElementById('home-canvas'), {
  fit: document.getElementById('home-bg'),
  time,
});
