// Paints a palette-indexed pixmap (see tools/pixmap-to-js.py) onto a canvas.

export function drawPixmap(canvas, { W, H, PALETTE, PIXELS }) {
  const lut = PALETTE.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  const out = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < PIXELS.length; p++) {
    const [r, g, b] = lut[PIXELS[p]];
    out[p * 4] = r; out[p * 4 + 1] = g; out[p * 4 + 2] = b; out[p * 4 + 3] = 255;
  }
  canvas.width = W;
  canvas.height = H;
  canvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
}
