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
| `example.html` | Minimal page that mounts the scene full-window. Serve the folder and open it; `?time=night` previews a block. |
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

## Using it

```js
import { mountScene } from './quan-scene.js';

const canvas = document.querySelector('#home-bg');
const scene = mountScene(canvas);                 // time chosen from the device clock
// mountScene(canvas, { time: 'night' })          // force a block (testing)
// mountScene(canvas, { animate: false })         // a still frame only
scene.stop();                                     // when leaving the home screen
```

```css
#home-bg {
  position: fixed; inset: 0; width: 100vw; height: 100vh;
  object-fit: cover;                              /* fills the screen, crops the edges */
  image-rendering: pixelated;                     /* crisp pixels when scaled up */
}
```

### API (`quan-scene.js`)

| Export | Meaning |
|---|---|
| `mountScene(canvas, { time?, animate? })` | Sizes the canvas to 512 × 320, draws, and starts the loop. Returns `{ time, stop() }`. |
| `currentTime(date?)` | The time block for a `Date` (default now): `'morning' \| 'midday' \| 'afternoon' \| 'evening' \| 'night'`. |
| `stillFrame(time?)` | A full still frame as RGBA bytes (`Uint8ClampedArray`, 512 × 320 × 4), e.g. for a texture or loading screen. |
| `WIDTH`, `HEIGHT`, `FPS`, `TIME_ORDER`, `timeForHour(h)` | Constants and helpers. |

### Time blocks

The block is chosen **once, when the scene mounts** (no blending between
blocks; the home screen is only shown at open).

| Block | Hours | Look |
|---|---|---|
| Morning | 05:00–10:00 | Soft blue sky, peach-white clouds, gentle haze |
| Midday | 10:00–14:00 | The reference look: bright blue, white cumulus |
| Afternoon | 14:00–17:00 | Warmer light, creamy clouds |
| Evening | 17:00–20:00 | Salmon-pink sky, peach clouds, purple mountains; lights warming up |
| Night | 20:00–05:00 | Navy sky, moon, grey clouds; windows and the tower lit gold, fireflies |

### Behaviour

* 6 fps, stepped like hand animation; positions snap to whole pixels.
* Pauses while the tab/page is hidden.
* Respects `prefers-reduced-motion`: shows a still frame.
* Cost: one 512 × 320 `putImageData` per frame plus a few thousand pixel
  writes. Fine on phones.

### In a Phaser game

Simplest: put the scene on a plain `<canvas>` **behind** the Phaser canvas
(Phaser with `transparent: true`) on the home screen. Or draw it into a
texture:

```js
import { stillFrame, WIDTH, HEIGHT } from './quan-scene.js';
// Inside a Phaser.Scene:
const tex = this.textures.createCanvas('home-bg', WIDTH, HEIGHT);
tex.context.putImageData(new ImageData(stillFrame(), WIDTH, HEIGHT), 0, 0);
tex.refresh();
this.add.image(0, 0, 'home-bg').setOrigin(0).setScale(4);   // still version
// For the animated version, call mountScene on tex.canvas and tex.refresh()
// each frame (e.g. in update()).
```

Remember to set `pixelArt: true` (or `roundPixels` + nearest filtering) in
the Phaser config so it scales crisply.

---

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

* **Aspect ratio 16:10.** With `object-fit: cover` on other ratios it crops
  the edges. On a tall phone screen it crops heavily left/right; the
  interesting parts are the tree (left), pool (bottom-left), tower (right of
  centre) and lake (right). Consider `object-position` to keep the tower in
  view, or design the home UI around the crop.
* **Free space for UI:** the sky at top centre/right and the lower-right
  corner (bushes) are the calmest areas. Petals and fireflies draw over
  everything, including anything you paint into the canvas, but not over
  DOM UI on top of it.
* **Scale:** 512 × 320 at ×3 = 1536 × 960, ×4 = 2048 × 1280. Whole-number
  scales look best.
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
