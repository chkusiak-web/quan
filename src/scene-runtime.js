// Quan home-screen scene: the public entry point for apps.
//
//   import { mountScene } from './quan-scene.js';
//   const scene = mountScene(canvas, { fit: areaElement });
//   scene.stop();                                // when the screen closes
//
// The scene is 512 x 320 pixels. With `fit`, the canvas is scaled by a
// whole number of device pixels (never fractional), the smallest whole
// number that covers the area, and the overflow is cropped evenly on each
// side. The time of day follows the clock: it is re-checked when the
// window regains focus and once an hour, and the scene remounts if the
// block has changed.

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

// The whole-number scale (in device pixels) that covers a w x h CSS area,
// and the crop: the scaled scene's CSS size and its offset in the area
// (negative, centred), snapped to device pixels.
export function coverFit(w, h, dpr = 1) {
  const scale = Math.max(1, Math.ceil(Math.max((w * dpr) / WIDTH, (h * dpr) / HEIGHT)));
  const dw = WIDTH * scale, dh = HEIGHT * scale;                    // device px
  return {
    scale,
    width: dw / dpr, height: dh / dpr,                              // CSS px
    left: Math.round((w * dpr - dw) / 2) / dpr,
    top: Math.round((h * dpr - dh) / 2) / dpr,
  };
}

// Draw the animated scene into a canvas. Options:
//   time       force a block ('morning' ... 'night'); otherwise follow the clock
//   animate    false for a still frame
//   fit        an element whose box the scene should cover (the canvas is
//              positioned inside it; give it `position: relative` or similar
//              and `overflow: hidden`). Without it, size the canvas yourself.
// Returns { get time(), stop() }.
export function mountScene(canvas, { time = null, animate = true, fit = null } = {}) {
  if (time && !TIMES[time]) throw new Error(`Unknown time "${time}"; use one of ${TIME_ORDER.join(', ')}`);
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.imageRendering = 'pixelated';
  const ctx = canvas.getContext('2d');
  const buf = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const img = new ImageData(buf, WIDTH, HEIGHT);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let block = time || currentTime();
  let scene = createScene(baotu, block);
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

  // Follow the clock: re-check on focus and hourly; rebuild if the block changed.
  const cleanups = [];
  if (!time) {
    const recheck = () => {
      const now = currentTime();
      if (now === block || stopped) return;
      block = now;
      scene = createScene(baotu, block);
      draw();
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    const hourly = setInterval(recheck, 60 * 60 * 1000);
    cleanups.push(() => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
      clearInterval(hourly);
    });
  }

  // Whole-number cover scaling inside `fit`, kept up to date on resize and
  // when the window moves between displays with different pixel ratios.
  if (fit) {
    const place = () => {
      const { width: w, height: h } = fit.getBoundingClientRect();
      const c = coverFit(w, h, window.devicePixelRatio || 1);
      Object.assign(canvas.style, {
        position: 'absolute', left: `${c.left}px`, top: `${c.top}px`,
        width: `${c.width}px`, height: `${c.height}px`, maxWidth: 'none', maxHeight: 'none',
      });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(fit);
    let mq;
    const watchDpr = () => {
      mq?.removeEventListener('change', onDpr);
      mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener('change', onDpr);
    };
    const onDpr = () => { place(); watchDpr(); };
    watchDpr();
    cleanups.push(() => { ro.disconnect(); mq?.removeEventListener('change', onDpr); });
  }

  return {
    get time() { return block; },
    stop() { stopped = true; cancelAnimationFrame(raf); cleanups.forEach((c) => c()); },
  };
}

// A still frame as RGBA pixels, e.g. for a loading screen or a texture.
export function stillFrame(time = currentTime()) {
  return renderPixmap(baotu, time);
}
