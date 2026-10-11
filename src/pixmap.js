// Pixmap page: the reference as a 512 x 320, 72-colour pixel map stored in code.

import * as baotu from './pixmap/baotu.js';
import { drawPixmap } from './pixmap/draw.js';

drawPixmap(document.getElementById('scene'), baotu);
