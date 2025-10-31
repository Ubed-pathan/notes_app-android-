import sharp from 'sharp';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const input = resolve(root, 'assets', 'icon-1024.png');

async function generateAdaptiveForeground() {
  const canvas = 432; // px
  const safe = 288;   // px (66% of 432)
  const pad = Math.round((canvas - safe) / 2);
  const out = resolve(root, 'assets', 'android-adaptive-foreground.png');
  await sharp(input)
    .resize(safe, safe, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  return out;
}



async function generateLegacyIcon() {
  const size = 1024; // px
  const scale = 0.8; // 80% content, 20% padding
  const inner = Math.round(size * scale);
  const pad = Math.round((size - inner) / 2);
  const out = resolve(root, 'assets', 'android-legacy-icon.png');
  await sharp(input)
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(out);
  return out;
}

(async () => {
  const fg = await generateAdaptiveForeground();
  const legacy = await generateLegacyIcon();
  console.log('Generated icons:', { adaptiveForeground: fg, legacyIcon: legacy });
})();

