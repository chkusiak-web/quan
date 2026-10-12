# Prompt for the app-building thread

Paste everything below the line into the other session. Attach or copy in
the `handoff/` folder (or point the agent at the quan repo branch).

---

We have a finished home-screen background for the app, built in a separate
project. Please integrate it. Don't redesign it; treat it as a finished asset.

**What it is:** an animated 512 × 320 pixel-art scene of Baotu Spring and
Daming Lake in Jinan, with Chaoran Tower on the island. It recolours itself
for five times of day (morning 05–10, midday 10–14, afternoon 14–17, evening
17–20, night 20–05), chosen once from the device clock when it mounts, and
animates at 6 fps (fountains, lake glints, petals on a breeze, swallows,
ducks, egret, willows, stream foam, night lights and fireflies). It pauses
when hidden and shows a still frame under `prefers-reduced-motion`.

**Where it is:** the `handoff/` folder from repo `chkusiak-web/quan`, branch
`claude/trusting-volta-hfso85`:
- `handoff/quan-scene.js`: single ES module, no dependencies, ~700 KB. This is
  the only file the app needs at runtime.
- `handoff/HANDOFF.md`: full write-up: API, time blocks, layout notes,
  Phaser notes, how to change and rebuild it.
- `handoff/example.html`: minimal working page.
- `handoff/assets/`: still composites per time of day, per-layer PNGs,
  sprite PNGs and preview GIFs (for splash screens, docs, store images; not
  needed at runtime).

**API:**
```js
import { mountScene, currentTime, stillFrame, WIDTH, HEIGHT } from './quan-scene.js';
const scene = mountScene(canvas);           // or mountScene(canvas, { time: 'night' })
scene.stop();                               // when the home screen closes
```
CSS for the canvas: `width/height` to fill the screen, `object-fit: cover`,
`image-rendering: pixelated`.

**Please:**
1. Copy `quan-scene.js` into the app (e.g. `src/vendor/quan-scene.js` or
   `public/`), unmodified. Treat it as generated code; changes are made in
   the quan repo and the bundle is re-exported.
2. Show it as the background of the home screen only: mount on entering the
   home screen, call `stop()` when leaving. It should sit behind all home UI.
   If the app is Phaser, either place it on a DOM canvas behind a
   transparent Phaser canvas, or draw it into a Phaser canvas texture (see
   HANDOFF.md, "In a Phaser game"); use `pixelArt: true`.
3. Let the time of day follow the device clock (the default). Add a dev-only
   way to force a block (e.g. `?time=night`) for testing.
4. Make sure it fills the screen at any window size with `object-fit: cover`
   and stays crisp. Check that Chaoran Tower (right of centre) stays visible
   on narrow screens; adjust `object-position` if needed.
5. The ducks and egret on the lake (right of centre, below the tower) are
   over-scale; plan the home UI so a panel covers that stretch of the lake.
6. Don't add other animation or overlays on top of the canvas itself; DOM UI
   above it is fine.

Before building, tell me your plan (where it mounts, how it's layered with
the UI, how it behaves on narrow screens) and ask any questions as
multiple choice.
