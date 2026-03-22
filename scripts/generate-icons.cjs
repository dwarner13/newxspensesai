#!/usr/bin/env node
/**
 * Generate PWA icons from SVG crown logo
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'public');

// XspensesAI crown on dark rounded square
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0b1220"/>
  <path d="M256 128l48 96 80-48-24 128H152l-24-128 80 48z" fill="#c8a64e"/>
  <path d="M152 304h208v24H152z" fill="#c8a64e"/>
  <circle cx="256" cy="128" r="14" fill="#c8a64e"/>
  <circle cx="384" cy="176" r="12" fill="#c8a64e"/>
  <circle cx="128" cy="176" r="12" fill="#c8a64e"/>
</svg>`;

// Maskable variant: slightly smaller icon with safe-zone padding
const svgMaskable = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0b1220"/>
  <g transform="translate(64,64) scale(0.75)">
    <path d="M256 128l48 96 80-48-24 128H152l-24-128 80 48z" fill="#c8a64e"/>
    <path d="M152 304h208v24H152z" fill="#c8a64e"/>
    <circle cx="256" cy="128" r="14" fill="#c8a64e"/>
    <circle cx="384" cy="176" r="12" fill="#c8a64e"/>
    <circle cx="128" cy="176" r="12" fill="#c8a64e"/>
  </g>
</svg>`;

async function generate() {
  const tasks = [
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'favicon-32x32.png', size: 32, maskable: false },
    { name: 'favicon-16x16.png', size: 16, maskable: false },
  ];

  for (const t of tasks) {
    const svgStr = t.maskable ? svgMaskable(512) : svg(512);
    const buf = Buffer.from(svgStr);
    await sharp(buf)
      .resize(t.size, t.size)
      .png()
      .toFile(path.join(OUT, t.name));
    console.log(`  ✓ ${t.name} (${t.size}x${t.size})`);
  }

  // Also generate favicon.ico from the 32px version
  // (sharp can't make .ico, so we just copy the 32px png — browsers accept png favicons)
  fs.copyFileSync(
    path.join(OUT, 'favicon-32x32.png'),
    path.join(OUT, 'favicon.png')
  );
  console.log('  ✓ favicon.png (copy of 32x32)');

  console.log('\nAll PWA icons generated in public/');
}

generate().catch(err => { console.error(err); process.exit(1); });
