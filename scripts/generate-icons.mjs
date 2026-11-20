/**
 * Icon generator for the NIKI Kiosk PWA.
 * Renders the brand plane glyph (Lucide "plane", stroked) into the PNG set:
 *   - pwa-192x192.png, pwa-512x512.png (any)
 *   - pwa-maskable-512x512.png (full-bleed, 12%+ safe-zone padding)
 *   - apple-touch-icon.png (180x180, required by iOS Safari)
 *
 * Usage:  node scripts/generate-icons.mjs   (requires: npm i --no-save sharp)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PLANE_PATH =
  'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';

function iconSvg(size, { maskable = false } = {}) {
  // Glyph footprint (fraction of canvas): 68% for "any", 56% for maskable
  // (keeps the glyph inside the ~20% maskable safe zone on all platforms).
  const footprint = size * (maskable ? 0.56 : 0.68);
  const scale = footprint / 24; // 1 glyph unit -> scale px
  const strokeWidth = 1.9;      // glyph units — consistent visual weight
  const radius = Math.round(size * (112 / 512));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : radius}" fill="#006564"/>
  <g transform="translate(${size / 2},${size / 2}) rotate(45) scale(${scale}) translate(-12,-12)">
    <path d="${PLANE_PATH}" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const targets = [
  { name: 'pwa-192x192.png', size: 192, opts: {} },
  { name: 'pwa-512x512.png', size: 512, opts: {} },
  { name: 'pwa-maskable-512x512.png', size: 512, opts: { maskable: true } },
  { name: 'apple-touch-icon.png', size: 180, opts: {} },
];

for (const t of targets) {
  const svg = Buffer.from(iconSvg(t.size, t.opts));
  await sharp(svg)
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(root, 'public', t.name));
  console.log('wrote public/' + t.name);
}
console.log('done');
