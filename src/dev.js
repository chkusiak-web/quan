// Scene lab: switch time of day, toggle layers, compare with the reference.

import { W, H } from './core/buffer.js';
import { buildScene } from './scene/index.js';
import { composite } from './render.js';
import { TIMES, TIME_ORDER, timeForHour } from './palette/times.js';

const stack = buildScene();
const hidden = new Set();
let time = timeForHour(new Date().getHours());
let zoom = 2;

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const ref = document.getElementById('ref');

function draw() {
  ctx.putImageData(new ImageData(composite(stack, time, hidden), W, H), 0, 0);
  canvas.style.width = `${W * zoom}px`;
  canvas.style.height = `${H * zoom}px`;
}

function buttons(el, items, current, onPick) {
  el.innerHTML = '';
  for (const [id, label] of items) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = id === current() ? 'on' : '';
    b.onclick = () => { onPick(id); buttons(el, items, current, onPick); draw(); };
    el.append(b);
  }
}

buttons(document.getElementById('times'), TIME_ORDER.map((t) => [t, TIMES[t].label]), () => time, (t) => (time = t));
buttons(document.getElementById('zooms'), [1, 2, 3].map((z) => [z, `×${z}`]), () => zoom, (z) => (zoom = z));

const list = document.getElementById('layers');
for (const entry of stack) {
  const li = document.createElement('li');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = true;
  box.id = `l-${entry.id}`;
  box.onchange = () => { box.checked ? hidden.delete(entry.id) : hidden.add(entry.id); draw(); };
  const label = document.createElement('label');
  label.htmlFor = box.id;
  label.textContent = entry.label;
  const depth = document.createElement('small');
  depth.textContent = entry.depth.toFixed(2);
  li.append(box, label, depth);
  list.append(li);
}

const overlay = document.getElementById('overlay');
overlay.oninput = () => (ref.style.opacity = overlay.value / 100);
let flicker = null;
document.getElementById('flip').onchange = (e) => {
  clearInterval(flicker);
  if (e.target.checked) flicker = setInterval(() => (ref.style.opacity = ref.style.opacity === '1' ? '0' : '1'), 600);
  else ref.style.opacity = overlay.value / 100;
};

draw();
