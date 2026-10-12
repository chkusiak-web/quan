// Quan home-screen scene: the public entry point for apps.
//
//   import { mountScene } from './quan-scene.js';
//   const scene = mountScene(canvas);            // picks the time from the clock
//   const scene = mountScene(canvas, { time: 'night' });
//   scene.stop();                                // when the screen closes
//
// The scene is 512 x 320 pixels; scale the canvas up with CSS and keep
// `image-rendering: pixelated` so the pixels stay crisp.

import * as baotu from './pixmap/baotu.js';
import { createScene, FPS } from './pixmap/animate.js';
import { renderPixmap } from './pixmap/draw.js';
import { TIMES, TIME_ORDER, timeForHour } from './palette/times.js';

export const WIDTH = baotu.W;
export const HEIGHT = baotu.H;
export { FPS, TIME_ORDER, timeForHour };

// The time-of-day block for a Date (default: now).
export function currentTime(date = new Date()) {
  return timeForHour(date.getHours());
}

// Draw the animated scene into a canvas. Returns { time, stop }.
export function mountScene(canvas, { time = currentTime(), animate = true } = {}) {
  if (!TIMES[time]) throw new Error(`Unknown time "${time}"; use one of ${TIME_ORDER.join(', ')}`);
  const scene = createScene(baotu, time);
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const buf = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const img = new ImageData(buf, WIDTH, HEIGHT);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let f = 0, last = 0, raf = 0, stopped = false;
  const draw = () => { scene.frame(buf, f); ctx.putImageData(img, 0, 0); };
  draw();
  if (animate && !reduced) {
    const tick = (now) => {
      if (stopped) return;
      if (document.visibilityState !== 'hidden' && now - last >= 1000 / FPS) { last = now; f++; draw(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  return { time, stop() { stopped = true; cancelAnimationFrame(raf); } };
}

// A still frame as RGBA pixels, e.g. for a loading screen or a texture.
export function stillFrame(time = currentTime()) {
  return renderPixmap(baotu, time);
}
