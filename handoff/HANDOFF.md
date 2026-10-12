# Quan home-screen scene: handoff

An animated pixel-art background of **Baotu Spring and Daming Lake, Jinan**, with
**Chaoran Tower (超然楼)** on the island. It is drawn in code at **512 × 320**,
recolours itself for **five times of day**, and animates at a calm **6 fps**.
It is meant to be the app's home screen, shown when the app opens, in the
palette for the current hour.

Source of truth: repo `chkusiak-web/quan`, branch `claude/trusting-volta-hfso85`.

---

## What's in this folder

| Path | What it is |
|---|---|
| `quan-scene.js` | **The drop-in runtime.** One ES module (~700 KB, no dependencies) containing the pixel map, palettes, renderer and all animation. |
| `quan-scene.classic.js` | The same runtime as a classic script that sets `window.QuanScene`, as a fallback for setups that can't load ES modules. Not needed in the tested Electron setup. |
| `example.html`, `example.js`, `example.css` | Minimal page with a 216 px sidebar that mounts the scene, CSP-clean (no inline script or style). Open it directly from disk; `?time=night` previews a block, `?mode=right` fills only the area right of the sidebar. |
| `assets/crops/` | The two sidebar options (A: scene runs behind the sidebar; B: scene fills only the area to its right) at a 1440 × 872 window, Retina. |
| `assets/composites/` | Still images of the full scene for each time of day, at 512 × 320 and 1536 × 960 (×3). |
| `assets/layers/<time>/` | The 10 scene layers (+ `glow`) as transparent PNGs, per time of day, back to front. |
| `assets/sprites/` | The animated pieces as PNGs: swallows (near/far × glide/half/down), duck, hen, egret, egret-dip, 4 petal frames. Daytime colours. |
| `assets/previews/` | `midday.gif`, `night.gif`: 30-second captures of the running scene. |
| `assets/reference-original-512x320.png` | The original 72-colour pixel map, before the birds/petals were painted out and the tower replaced. Needed only to re-extract sprites. |
| `AGENT-PROMPT.md` | A prompt to paste into the app-building thread. |

The PNGs are for design work, docs, splash screens or a fallback. **The app
should use `quan-scene.js`**, which renders everything (including recolouring
and animation) itself.

---

## Using it (Electron, vanilla JS)

```html
<!-- in the home screen; script-src 'self' is enough -->
<div id="home-bg"><canvas id="home-canvas"></canvas></div>
<script type="module" src="home.js"></script>
```

```css
#home-bg { position: fixed; top: 0; bottom: 0; right: 0; left: 0; overflow: hidden; }
/* option B, scene only right of the sidebar: left: 216px; */
```

```js
// home.js
import { mountScene } from './quan-scene.js';
const scene = mountScene(document.getElementById('home-canvas'), {
  fit: document.getElementById('home-bg'),   // whole-number cover scaling inside this box
});
// leaving the home screen:
scene.stop();
```

`mountScene` sizes and positions the canvas itself when given `fit`; don't
set its width/height/object-fit in CSS.

### API (`quan-scene.js`)

| Export | Meaning |
|---|---|
| `mountScene(canvas, { fit?, time?, animate? })` | Draws and animates the scene. `fit`: an element whose box the scene covers (it needs `overflow: hidden` and a positioned box). `time`: force a block for testing (turns off clock following). `animate: false`: still frame. Returns `{ time, stop() }`; `time` is the block currently shown. |
| `coverFit(w, h, dpr)` | The scaling maths used by `fit`, exposed for testing: `{ scale, width, height, left, top }`. |
| `currentTime(date?)` | The block for a `Date` (default now): `'morning' \| 'midday' \| 'afternoon' \| 'evening' \| 'night'`. |
| `stillFrame(time?)` | A still frame as RGBA bytes (`Uint8ClampedArray`, 512 × 320 × 4). |
| `WIDTH`, `HEIGHT`, `FPS`, `TIME_ORDER`, `timeForHour(h)` | Constants and helpers. |

### Scaling: whole numbers only

With `fit`, the scene is scaled by the **smallest whole number of device
pixels per scene pixel that covers the box**, never a fractional scale, and
the overflow is cropped evenly on each side (offsets snapped to device
pixels). It re-fits on resize (ResizeObserver) and when the window moves to
a display with a different pixel ratio. Examples (Retina, 2 device px per
CSS px):

| Area (CSS px) | Scale | Scene size | Cropped |
|---|---|---|---|
| 1440 × 872, behind the sidebar | ×6 | 1536 × 960 | 48 px each side, 44 px top and bottom |
| 1224 × 872, right of the sidebar | ×6 | 1536 × 960 | 156 px each side, 44 px top and bottom |
| 1280 × 773 | ×5 | 1280 × 800 | 13.5 px top and bottom |

### Time blocks

The block follows the device clock. It is checked when the scene mounts,
**again whenever the window regains focus or becomes visible, and once an
hour**; if the block has changed, the scene switches to the new palette
(no blending). Passing `time` turns this off.

| Block | Hours | Look |
|---|---|---|
| Morning | 05:00–10:00 | Soft blue sky, peach-white clouds, gentle haze |
| Midday | 10:00–14:00 | The reference look: bright blue, white cumulus |
| Afternoon | 14:00–17:00 | Warmer light, creamy clouds |
| Evening | 17:00–20:00 | Salmon-pink sky, peach clouds, purple mountains; lights warming up |
| Night | 20:00–05:00 | Navy sky, moon, grey clouds; windows and the tower lit gold, fireflies |

### Behaviour

* 6 fps, stepped like hand animation; positions snap to whole pixels.
* Pauses while the window is hidden.
* Respects `prefers-reduced-motion`: shows a still frame.
* Cost: one 512 × 320 `putImageData` per frame plus a few thousand pixel
  writes; the browser does the whole-number upscale.

### Verified in Electron

Tested in Electron 33 (Chromium 130) with the page loaded by `loadFile`
(file://), `contextIsolation` and `sandbox` on, and this CSP:

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:
```

The ES module loads and runs; the scene renders at a device pixel ratio of
2 with whole-number scaling in both sidebar layouts; and the clock re-check
switched evening to night after a focus event. The runtime uses no `eval`,
no inline scripts or styles, no network, no workers. It sets the canvas's
size and position through `element.style`, which a `style-src 'self'` CSP
allows.

If the real app differs (an older Electron, a custom protocol, or a
bundler that won't take the module), the smallest fix is
`quan-scene.classic.js`: load it with a plain `<script src>` and use
`window.QuanScene.mountScene(...)`.

## What the scene contains

**Layers, back to front:** sky (one flat colour per time) · clouds · mountains ·
island · tower · lake · village (houses, willows, bridge) · ground · pool ·
tree · glow (night halos). Stacked, they rebuild the picture exactly.

**Chaoran Tower:** a hand-built pixel sprite after photos from across the
lake: hip-and-gable top with a secondary roof, front and side gables, five
roof horns, gold bottle finial, plaque band, three thin wide eaves over two
storeys (3 bays on the side face, 5 on the front, a door in the middle bay).
Lit from the upper left like the rest of the scene, hazed for distance, sunk
into the island trees, with a soft reflection in the lake. At night it is
floodlit warm gold with a halo around its edges.

**Night lights:** six house windows plus small island lights glow warm at
evening and night; the tower glows gold; everything breathes very gently.

**Animation** (calm, sparse):

| Element | Behaviour | When |
|---|---|---|
| Spring fountains | Light falls down the three jets, droplets flick at the top, ripple rings spread | Always |
| Lake | Glints twinkle on open water; small rings spread slowly | Always |
| Petals | Up to 12 tumble from the canopy and drift diagonally on a breeze to the bottom of the screen | Always (6 at night) |
| Swallows | Two, taking turns crossing the sky; bursts of six wingbeats then glides; pass behind the cherry tree | Day, evening |
| Ducks | A pair swim to and fro across the lake at different paces, turning at each end, with a wake | Day, evening |
| Egret | Stands in the shallows; every ~13 s dips its head to peer into the water | Day, evening |
| Willows | Hanging strands shift a pixel in a slow wave | Always |
| Stream | Flecks of foam ride the current down from the bridge | Always |
| Lights | Windows and tower glow breathe by a few percent | Evening, night |
| Fireflies | 36 warm points wander the whole screen, glowing and fading | Night |

---

## Layout notes for the app

* **Aspect ratio 16:10.** On other window shapes the whole-number cover
  crops the edges evenly. The interesting parts are the tree (left), pool
  (bottom-left), tower (right of centre) and lake (right).
* **The 216 px sidebar:** option A runs the scene behind the sidebar (the
  tree trunk shows through a translucent sidebar); option B fills only the
  area to its right (the trunk is cropped out and the canopy frames the
  left edge). See `assets/crops/`.
* **Free space for UI:** the sky at top centre/right and the lower-right
  corner (bushes) are the calmest areas. Petals and fireflies draw over
  everything, including anything you paint into the canvas, but not over
  DOM UI on top of it.
* **Known caveat (accepted):** the ducks, egret and swallows are larger than
  true scale next to the houses. The plan is to cover the ducks and egret
  (on the lake, right of centre, just below the tower) with a UI panel.

---

## Changing it (in the quan repo)

| To change | Edit | Then run |
|---|---|---|
| Colours per time of day | `src/palette/times.js` (sky, clouds, mountains, grading), `src/pixmap/draw.js` (night lights) | rebuild the bundle |
| Tower | `tools/tower-sprite.py` | `python3 tools/tower-sprite.py bake` then the map step below |
| House windows | `tools/paint-windows.py` | `python3 tools/paint-windows.py` then the map step |
| The map itself / regions / layers | `public/reference/baotu-512x320.png`, `tools/pixmap-to-js.py` | `python3 tools/pixmap-to-js.py public/reference/baotu-512x320.png src/pixmap/baotu.js` |
| Animation | `src/pixmap/animate.js` | rebuild the bundle |
| Sprites | `tools/extract-swallows.py`, `tools/extract-wildlife.py` | see README |

Rebuild the drop-in bundle:

```sh
node -e "const {build}=await import('vite');await build({configFile:false,publicDir:false,build:{outDir:'handoff',emptyOutDir:false,minify:true,lib:{entry:'src/scene-runtime.js',formats:['es'],fileName:()=>'quan-scene.js'}}})"
```

Preview pages in the quan repo: `npm run dev`, then `/pixmap.html` (add
`?time=night` etc.). GIF frames: `node tools/preview-anim.js out/anim night 60 2`.
