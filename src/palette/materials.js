// Material ramps. Every pixel in every layer is one step of one ramp.
// Colours here are the midday look, sampled from the reference; other times
// of day are derived from them in times.js.
//
// Ramps run dark -> light. Flags:
//   group   how times.js grades it (scene, sky, cloud, haze, water, pool,
//           emissive, star, moon, glow, animal)
//   haze    0..1 distance; far things blend toward the horizon colour
//   refl    which reflection ramp it uses when mirrored in the lake

export const MATERIALS = [];
export const M = {};

function ramp(name, colors, opts = {}) {
  M[name] = colors.map((hex, step) => {
    const glow = opts.glow ? opts.glow[step] : undefined;
    MATERIALS.push({ name, step, steps: colors.length, hex, group: 'scene', haze: 0, ...opts, glow });
    return MATERIALS.length; // index 0 is reserved for transparent
  });
}

// Sky and clouds
ramp('sky', ['#2a86de', '#3393ea', '#3c9ff1', '#49aaf4', '#5db5f6', '#78c2f8', '#98d0fa', '#bde2fb'], { group: 'sky' });
ramp('cloud', ['#86b9ea', '#a2cdf5', '#bcdcf9', '#d3e8fb', '#e8f3fd', '#fbfdfd'], { group: 'cloud', refl: 'white' });
ramp('hazeCloud', ['#9dcdf6', '#b3d9f9', '#c9e4fb', '#ddeefc', '#f1f8fe'], { group: 'haze' });

// Distance
ramp('mtnFar', ['#6ea9e4', '#80b8ee', '#95c6f4', '#acd4f8'], { haze: 0.75, refl: 'white' });
ramp('mtnMid', ['#4c8fcf', '#5a9cd9', '#6aabe3', '#80bcec'], { haze: 0.6, refl: 'white' });
ramp('hill', ['#3a7aa4', '#4789b3', '#5598c0', '#64a8cc', '#78b9d6'], { haze: 0.45, refl: 'dark' });
ramp('farTree', ['#3f7f7c', '#4f9283', '#66a68b', '#83b995', '#a3cba3'], { haze: 0.35, refl: 'green' });
ramp('farPink', ['#c99abb', '#e3b4cd', '#f4cddc'], { haze: 0.3, refl: 'pink' });
ramp('farWall', ['#aab8c8', '#d3dde7', '#f0f4f7'], { haze: 0.3, refl: 'white' });
ramp('farRoof', ['#3e4e70', '#52648a'], { haze: 0.3, refl: 'dark' });

// Chaoran Tower. Day colours are charcoal roofs, red-brown wood, pale
// balconies; after dark the whole tower is lit gold (the `glow` colours).
const T = { group: 'emissive', haze: 0.14 };
ramp('towerRoof', ['#1d2129', '#2a2f3a', '#3a404c', '#555b66'], { ...T, refl: 'tower', glow: ['#5a3818', '#8a5a26', '#b07a34', '#d8a24c'] });
ramp('towerEave', ['#6f747e', '#9a9ea6'], { ...T, refl: 'tower', glow: ['#ffcf68', '#fff0b8'] });
ramp('towerWood', ['#3e2420', '#5e322a', '#7e4434', '#9c5a40'], { ...T, refl: 'tower', glow: ['#7a4418', '#a8641e', '#d08a2e', '#f0b04a'] });
ramp('towerRail', ['#a9a49a', '#d6d2c8', '#efece4'], { ...T, refl: 'tower', glow: ['#e8a840', '#ffd47a', '#fff0c0'] });
ramp('towerWin', ['#4c3a34', '#c8b48c'], { ...T, refl: 'tower', glow: ['#e89a3a', '#ffe4a0'] });
ramp('towerGold', ['#8a6a2c', '#c8a050', '#ecd38a'], { ...T, refl: 'tower', glow: ['#d89a3a', '#ffd070', '#fff4c8'] });
ramp('red', ['#6e2430', '#9a3238', '#bd433c', '#d9604a'], { refl: 'red' });
ramp('stone', ['#7d8792', '#a2abb4', '#c8ced3', '#e6e9ea', '#fafafa'], { refl: 'white' });

// Lights that come on after dark
ramp('window', ['#3b3e4e', '#54586a'], { group: 'emissive', refl: 'glow', glow: ['#e89238', '#ffc866'] });
ramp('lantern', ['#8e2a2a', '#c8443a'], { group: 'emissive', refl: 'glow', glow: ['#e8402a', '#ff8a5a'] });

// Foliage
ramp('leafFar', ['#24504c', '#336652', '#467d57', '#5f955c', '#7cad66', '#9fc477'], { haze: 0.12, refl: 'green' });
ramp('leaf', ['#1a3a33', '#28533d', '#3c6f42', '#578c43', '#78a947', '#9fc455', '#c6dc74'], { refl: 'green' });
ramp('willow', ['#244738', '#346041', '#4b7c48', '#679a4d', '#88b555', '#a9cc66', '#cfe38a'], { refl: 'green' });
ramp('blossom', ['#6a3a55', '#93709f', '#cf7aa2', '#ec90b2', '#f6afc7', '#fbcadb', '#feecf2'], { refl: 'pink' });
ramp('bark', ['#1c1820', '#30262c', '#463533', '#634a42', '#86695c', '#a99083', '#cdbfbb'], { refl: 'dark' });
ramp('moss', ['#3f5534', '#5d7a3c', '#86a64c', '#b2c862', '#d3e08a']);
ramp('grass', ['#244b35', '#33673a', '#4b853b', '#6aa23f', '#8ebc49', '#b5d35e', '#d9e888']);

// Buildings
ramp('roof', ['#181d30', '#262d47', '#363f5b', '#4c5671', '#6c748d', '#959cb0', '#c4c8d4'], { refl: 'dark' });
ramp('wall', ['#878a94', '#b4b5bb', '#d8d6d6', '#f1efeb'], { refl: 'white' });
ramp('trim', ['#4e3029', '#7c4c3c', '#a8684e']);
ramp('rock', ['#363b3a', '#4f5450', '#6f6f66', '#928c7c', '#b5ab95', '#d4cab2', '#ece3cc']);

// Water
ramp('lake', ['#3a80bd', '#468ecb', '#539dd6', '#62acdf', '#76bae8', '#8dc7ef', '#a9d5f5', '#cbe6fa', '#effaff'], { group: 'water' });
ramp('reflDark', ['#35679a', '#4577a9'], { group: 'water' });
ramp('reflGreen', ['#43819c', '#5595a9'], { group: 'water' });
ramp('reflPink', ['#a58fc3', '#c9a7d3'], { group: 'water' });
ramp('reflRed', ['#a64a62', '#c96a72'], { group: 'water' });
ramp('reflWhite', ['#9ccaee', '#c6e2f8'], { group: 'water' });
ramp('reflGold', ['#c0a070', '#e0c890'], { group: 'water' });
ramp('reflTower', ['#8a4a58', '#c48c8c'], { group: 'emissive', glow: ['#c87a2c', '#ffcf70'] });
ramp('reflGlow', ['#5f86b0', '#7c9cc0'], { group: 'emissive', glow: ['#c88a3a', '#ffd27a'] });
ramp('pool', ['#0f2c45', '#16425c', '#1c5a74', '#26748f', '#3592ad', '#55b0c8', '#94d8e6', '#e4faff'], { group: 'pool' });
ramp('lily', ['#264f3e', '#356c4c', '#4d8c5a', '#73ad70'], { refl: 'green' });
ramp('lotus', ['#c24f78', '#ea86a8', '#fdd5e1']);

// Small flowers
ramp('yellow', ['#b58a1c', '#e6c434', '#fbea7c']);
ramp('white', ['#cfcab8', '#f2efe4', '#ffffff']);

// Animals (hidden at night)
ramp('duck', ['#221a18', '#4a3022', '#7a4c30', '#a8744a', '#2c5848', '#e0d8c8'], { group: 'animal' });
ramp('egret', ['#5c6470', '#a9b4c0', '#dfe5ea', '#ffffff', '#e2a832', '#262830'], { group: 'animal' });
ramp('swallow', ['#141832', '#262e58', '#e8e8ec', '#b8443a'], { group: 'animal' });
ramp('animalRefl', ['#6b9ac8', '#b8d8f2'], { group: 'animal' });

// Night only
ramp('star', ['#8ea4d8', '#e8eeff'], { group: 'star' });
ramp('moon', ['#a8582a', '#c8743a', '#e0904a', '#f0a85c', '#fcc47c'], { group: 'moon' });
ramp('moonRefl', ['#b86a34', '#f0a85c'], { group: 'moon' });
ramp('glow', ['#ffb050', '#ffd890'], { group: 'glow' });

if (MATERIALS.length > 255) throw new Error(`Too many palette slots: ${MATERIALS.length}`);

// The reflection ramp for a material index (two steps: shadow, light).
const REFL = {
  dark: M.reflDark, green: M.reflGreen, pink: M.reflPink, red: M.reflRed,
  white: M.reflWhite, gold: M.reflGold, glow: M.reflGlow, tower: M.reflTower,
};
export function reflectionOf(index) {
  const m = MATERIALS[index - 1];
  if (!m || !m.refl) return 0;
  const r = REFL[m.refl];
  return r[m.step >= m.steps / 2 ? 1 : 0];
}
