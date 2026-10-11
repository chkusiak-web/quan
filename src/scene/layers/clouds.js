// Cumulus tower on the right, and the low hazy band along the horizon.

import { M } from '../../palette/materials.js';
import { cloud, cloudShape } from '../../core/paint.js';
import { rng } from '../../core/rng.js';

const P = (x, y, r, ry) => ({ x, y, r, ry });

// Top contour of the cumulus, traced from the reference at 640 x 400.
const CUMULUS = [[355, 127], [357, 125], [358, 117], [360, 114], [362, 113], [367, 114], [369, 108], [372, 106], [381, 105], [385, 106], [386, 108], [392, 111], [393, 86], [395, 84], [397, 78], [407, 73], [408, 71], [414, 71], [416, 73], [422, 75], [425, 69], [430, 65], [435, 65], [437, 67], [440, 64], [449, 65], [453, 63], [461, 65], [464, 69], [468, 69], [470, 66], [471, 58], [473, 53], [478, 52], [479, 48], [482, 44], [487, 43], [491, 40], [499, 40], [501, 42], [506, 41], [511, 43], [515, 48], [517, 48], [520, 45], [521, 39], [523, 37], [524, 32], [525, 32], [526, 29], [535, 22], [539, 23], [542, 19], [544, 19], [546, 17], [563, 19], [569, 27], [572, 26], [573, 24], [579, 24], [580, 26], [584, 27], [586, 32], [589, 32], [591, 34], [593, 40], [594, 40], [596, 50], [598, 50], [600, 53], [604, 50], [610, 50], [618, 55], [619, 62], [622, 64], [623, 73], [628, 74], [629, 76], [634, 69], [639, 67]];

export const hazeClouds = {
  id: 'hazeClouds',
  label: 'Horizon clouds',
  depth: 0.04,
  draw(layer) {
    const r = rng(12);
    // Long low band hugging the mountains.
    const band = [];
    for (let x = -10; x < 660; x += r.int(10, 18)) band.push(P(x, r.int(134, 140), r.int(8, 14), r.int(5, 8)));
    cloud(layer, M.hazeCloud, band, { base: 150, seed: 3, bottomDark: 0.35, spread: 0.2 });
    // Soft puffs on the left, half hidden by the cherry tree.
    cloud(layer, M.hazeCloud, [
      P(60, 118, 12, 10), P(80, 112, 13, 11), P(100, 118, 11, 9), P(118, 124, 9, 7), P(44, 126, 9, 7),
      P(186, 122, 10, 8), P(204, 116, 12, 10), P(224, 120, 11, 9), P(246, 124, 12, 8), P(270, 122, 11, 8),
      P(292, 126, 10, 7), P(316, 128, 9, 6), P(214, 128, 10, 6), P(262, 130, 12, 6),
    ].map((p) => ({ ...p, r: p.r * 1.3, ry: p.ry * 1.3 })), { base: 136, seed: 4, bottomDark: 0.4, spread: 0.2 });
  },
};

export default {
  id: 'clouds',
  label: 'Cumulus',
  depth: 0.06,
  draw(layer) {
    cloudShape(layer, M.cloud, CUMULUS, { base: 140, seed: 9 });
  },
};
