// The big cherry tree in the foreground: a gnarled trunk with a knot-hole
// you can see the sky through, dark tapering branches, and clumps of
// cross-shaped florets that are pale on top and lavender underneath.

import { M } from '../../palette/materials.js';
import { rampPick } from '../../core/buffer.js';
import { noise2, hash2, fbm } from '../../core/rng.js';
import { fillPoly, spline } from '../../core/shapes.js';
import { blossoms, polyAt } from '../../core/paint.js';

// Right-hand edge of the trunk, bottom to top. The left side runs off-screen.
const TRUNK_EDGE = [[108, 296], [92, 288], [76, 276], [62, 260], [55, 240], [52, 214], [53, 190], [57, 168], [61, 150], [63, 130], [64, 112], [66, 94], [70, 78], [78, 62], [90, 46], [104, 30], [117, 14], [127, 0]];
// The same edge as x for a given y, for shading.
const EDGE_BY_Y = TRUNK_EDGE.map(([x, y]) => [y, x]).reverse();
const KNOT = { x: 47, y: 131, rx: 8, ry: 13 };

const BRANCHES = [
  { pts: [[60, 74], [84, 50], [108, 28], [134, 10], [162, -2]], w: [8, 4] },
  { pts: [[62, 94], [94, 82], [128, 84], [168, 93], [208, 100], [246, 108], [268, 112]], w: [6, 1] },
  { pts: [[58, 142], [88, 126], [118, 128], [148, 140], [176, 152]], w: [5, 1] },
  { pts: [[54, 176], [70, 188], [90, 200]], w: [4, 1] },
  { pts: [[104, 30], [148, 30], [196, 24], [238, 30], [282, 20]], w: [4, 1] },
  { pts: [[128, 84], [146, 64], [174, 56]], w: [3, 1] },
  { pts: [[44, 60], [22, 42], [-2, 32]], w: [6, 4] },
  { pts: [[196, 24], [214, 8], [228, -2]], w: [2, 1] },
  { pts: [[168, 93], [190, 76], [212, 74]], w: [2, 1] },
];

const E = (x, y, rx, ry, lift = 0) => ({ x, y, rx, ry, lift });
// Back clumps first (darker), then the front of the canopy.
const BACK = [E(30, 14, 44, 24), E(92, 10, 44, 20), E(150, 14, 40, 22), E(210, 12, 42, 20), E(262, 18, 34, 20), E(10, 64, 22, 32), E(100, 60, 50, 30), E(170, 70, 40, 24), E(60, 170, 36, 30)];
const FRONT = [
  E(20, 20, 30, 18, 0.15), E(76, 18, 30, 16, 0.15), E(136, 20, 30, 16, 0.15), E(196, 18, 30, 15, 0.12), E(254, 22, 26, 16, 0.1),
  E(70, 56, 36, 24, 0.1), E(124, 50, 30, 22, 0.1), E(180, 50, 30, 20, 0.05), E(114, 88, 36, 22), E(164, 98, 30, 17),
  E(208, 88, 24, 15), E(248, 106, 22, 12), E(280, 32, 14, 14), E(86, 118, 26, 14), E(134, 122, 26, 14), E(174, 144, 18, 11),
  E(22, 108, 18, 18), E(80, 180, 30, 22), E(72, 208, 24, 15), E(104, 198, 15, 11), E(32, 192, 14, 12), E(236, 40, 24, 15),
  E(10, 160, 14, 16), E(226, 66, 16, 10),
];

function bark(layer, x, y, t) {
  layer.set(x, y, rampPick(M.bark, t, x, y, 0.3));
}

function branch(layer, { pts, w }) {
  const path = spline(pts);
  const n = path.length;
  path.forEach(([x, y], i) => {
    const rad = (w[0] + (w[1] - w[0]) * (i / n)) / 2;
    for (let dy = -Math.ceil(rad); dy <= Math.ceil(rad); dy++) for (let dx = -Math.ceil(rad); dx <= Math.ceil(rad); dx++) {
      if (dx * dx + dy * dy > rad * rad + 0.3) continue;
      // Top edge catches the light, underside is near-black.
      const t = 0.3 - (dy / (rad + 0.5)) * 0.22 + (noise2((x + dx) * 0.4, (y + dy) * 0.4, 7) - 0.5) * 0.15;
      bark(layer, Math.round(x + dx), Math.round(y + dy), t);
    }
  });
}

export default {
  id: 'cherry',
  label: 'Cherry tree',
  depth: 0.9,
  draw(layer) {
    blossoms(layer, M.blossom, BACK.map((c) => ({ ...c, lift: -0.22 })), { seed: 151, leafRamp: M.leaf, size: [1, 3], density: 0.9 });

    // Trunk with vertical bark streaks; the lit side is toward the middle,
    // the right edge falls into shadow.
    fillPoly([[-2, 300], ...TRUNK_EDGE, [-2, -2]], (x, y) => {
      const edge = polyAt(EDGE_BY_Y, y);
      const u = edge - x; // distance in from the right edge
      const lean = (300 - y) * 0.12; // streaks follow the trunk's lean
      const streak = noise2((x - lean) * 0.32, y * 0.045, 3);
      const fine = noise2((x - lean) * 1.1, y * 0.2, 4);
      let t = 0.22 + streak * 0.55 + (fine - 0.5) * 0.22;
      if (streak > 0.7) t += 0.15; // pale ridges of bark
      if (u < 2) t = 0.05;
      else if (u < 5) t -= 0.15;
      else if (u > 18 && u < 36) t += 0.08;
      if (x < 10) t -= 0.12;
      bark(layer, x, y, t);
      // Lichen flecks.
      if (fbm(x * 0.12, y * 0.12, 9, 2) > 0.7 && hash2(x >> 1, y >> 1, 8) < 0.45) layer.set(x, y, M.moss[hash2(y, x, 2) < 0.5 ? 1 : 2]);
    });
    // Roots spreading into the grass.
    branch(layer, { pts: [[60, 276], [86, 288], [118, 298]], w: [9, 3] });
    branch(layer, { pts: [[30, 280], [44, 296], [52, 304]], w: [10, 5] });

    // Knot-hole: punch through to the sky, with a dark rim and lit lower lip.
    for (let y = KNOT.y - KNOT.ry - 2; y <= KNOT.y + KNOT.ry + 2; y++) for (let x = KNOT.x - KNOT.rx - 2; x <= KNOT.x + KNOT.rx + 2; x++) {
      const d = Math.hypot((x + 0.5 - KNOT.x) / KNOT.rx, (y + 0.5 - KNOT.y) / KNOT.ry);
      if (d < 1) layer.put(x, y, 0);
      else if (d < 1.25) layer.set(x, y, M.bark[y > KNOT.y + 4 ? 4 : 0]);
    }

    BRANCHES.forEach((b) => branch(layer, b));
    blossoms(layer, M.blossom, FRONT, { seed: 152, leafRamp: M.leaf, size: [1, 3], density: 1.0 });
  },
};
