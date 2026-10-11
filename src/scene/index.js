// The scene: every layer, back to front, with its parallax depth.
// depth 0 = infinitely far (sky), 1 = the nearest foreground.

import { Layer } from '../core/buffer.js';
import sky, { nightSky } from './layers/sky.js';
import clouds, { hazeClouds } from './layers/clouds.js';
import { farMountains, hills } from './layers/mountains.js';
import { farShore, island } from './layers/shore.js';
import { lake, lakeLife } from './layers/lake.js';
import village from './layers/village.js';
import { willows, bridgeStream, rightBank } from './layers/riverside.js';
import slope from './layers/ground.js';
import pool from './layers/pool.js';
import cherry from './layers/cherry.js';
import { front, birds, petals } from './layers/front.js';

// Composite order, back to front.
export const LAYERS = [sky, nightSky, hazeClouds, clouds, farMountains, hills, farShore, lake, island, lakeLife, village, willows, bridgeStream, rightBank, slope, pool, birds, cherry, front, petals];

// Some layers read others (the lake mirrors the island), so they are built
// in dependency order, then stacked in composite order.
export function buildScene() {
  const built = {};
  const pending = [...LAYERS];
  while (pending.length) {
    const i = pending.findIndex((d) => (d.needs ?? []).every((n) => built[n]));
    if (i < 0) throw new Error('Layer dependency cycle');
    const def = pending.splice(i, 1)[0];
    const layer = new Layer(def.id);
    const glow = new Layer(def.id + '-glow');
    def.draw(layer, { built, glow });
    built[def.id] = { id: def.id, label: def.label, depth: def.depth, layer, glow: glow.data.some(Boolean) ? glow : null };
  }
  return LAYERS.map((d) => built[d.id]);
}
