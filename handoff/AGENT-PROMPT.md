# Prompt for the app-building thread

Paste everything below the line into the other session, along with the
`handoff/` folder (or point the agent at repo `chkusiak-web/quan`, branch
`claude/trusting-volta-hfso85`, folder `handoff/`).

---

We have a finished home-screen background for our Electron Mac app (vanilla
JS). Please integrate it. Don't redesign it; treat it as a finished asset.

**What it is:** an animated 512 × 320 pixel-art scene of Baotu Spring and
Daming Lake in Jinan, with Chaoran Tower on the island. It recolours itself
for five times of day (morning 05–10, midday 10–14, afternoon 14–17, evening
17–20, night 20–05) and animates at 6 fps (fountains, lake glints, petals on
a breeze, swallows, ducks, egret, willows, stream foam, night lights,
fireflies). It pauses when the window is hidden and shows a still frame
under `prefers-reduced-motion`.

**Files (in `handoff/`):**
- `quan-scene.js`: the runtime, one dependency-free ES module (~700 KB). The
  only file the app needs. Treat it as generated code; don't edit it.
- `quan-scene.classic.js`: the same as a classic script (`window.QuanScene`),
  only as a fallback.
- `HANDOFF.md`: full write-up: API, scaling, time blocks, Electron/CSP notes,
  layout notes.
- `example.html` + `example.js` + `example.css`: a working, CSP-clean page
  with a 216 px sidebar. Open it from disk.
- `assets/`: stills per time of day, layers, sprites, preview GIFs, and
  `assets/crops/` (the two sidebar options).

**API:**
```js
import { mountScene } from './quan-scene.js';
const scene = mountScene(canvas, { fit: areaElement });  // follows the clock
scene.stop();                                              // leaving the home screen
// testing: mountScene(canvas, { fit, time: 'night' })
```
`fit` is the element the scene should cover (positioned, `overflow:
hidden`). The runtime sizes and places the canvas; don't style its size.

**What's already built into the runtime and verified** (Electron 33,
`loadFile` over file://, `contextIsolation` and `sandbox` on, CSP
`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:`):
- The ES module loads and runs under that CSP over file://. No eval, no
  inline script or style, no network.
- Whole-number scaling: with `fit`, it uses the smallest whole number of
  device pixels per scene pixel that covers the box, never fractional,
  crops the overflow centred, and re-fits on resize and display changes.
- Clock following: it re-checks the time block when the window regains
  focus or becomes visible, and once an hour, and switches palette if the
  block changed.

**Please:**
1. Copy `quan-scene.js` into the app unmodified (e.g. next to the home
   screen's script) and load it with `<script type="module">`.
2. Show it only on the home screen, behind all home UI: mount on entering
   the home screen, call `stop()` on leaving.
3. **Confirm it loads in our packaged app**, not only in dev: our actual
   Electron version, protocol (file:// or custom) and CSP. If it doesn't
   load, propose the smallest fix (first choice:
   `quan-scene.classic.js` via a plain `<script src>` and
   `window.QuanScene.mountScene`).
4. Use `fit` for scaling; never apply fractional scales (no `object-fit`,
   no CSS transforms on the canvas).
5. **Ask me** whether the scene should run **behind the 216 px sidebar**
   (option A) or **only fill the area to its right** (option B). Show me
   both crops: `assets/crops/A-behind-sidebar-1440x872.png` and
   `assets/crops/B-right-of-sidebar-1440x872.png`, or screenshots from our
   app.
6. Keep the default clock following (the app often stays open for hours).
   Add a dev-only way to force a block (e.g. `?time=night`) for testing.
7. The ducks and egret on the lake (right of centre, below the tower) are
   over-scale; plan the home UI so a panel covers that stretch of the lake.
8. Don't draw anything else into the canvas; DOM UI on top is fine.

Before building, tell me your plan (where it mounts, how it's layered with
the sidebar and UI, how you'll verify the packaged build) and ask any
questions as multiple choice.
