import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const svg = readFileSync(resolve('public/favicon.svg'));

const targets = [
  { out: 'public/icon.png',     size: 512 },
  { out: 'public/icon-512.png', size: 512 },
  { out: 'public/icon-192.png', size: 192 },
  { out: 'app/apple-icon.png',  size: 180 },
];

for (const { out, size } of targets) {
  await sharp(svg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`wrote ${out} at ${size}x${size}`);
}
