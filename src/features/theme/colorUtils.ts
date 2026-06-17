export type ThemePalette = {
  primary: string;
  accentSecondary: string;
  alertOptions: string;
};

export const DEFAULT_PALETTE: ThemePalette = {
  primary: '#5B4FCF',
  accentSecondary: '#625B71',
  alertOptions: '#E53935',
};

export const PALETTE_STORAGE_KEY = 'theme.palette.v1';

export function randomHex(): string {
  const n = Math.floor(Math.random() * 0xffffff);
  return `#${n.toString(16).padStart(6, '0')}`;
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim();
  const m = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

export function mix(hex1: string, hex2: string, weight: number): string {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(a.r * (1 - w) + b.r * w, a.g * (1 - w) + b.g * w, a.b * (1 - w) + b.b * w);
}

export function contrastText(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#1a1a1a' : '#ffffff';
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h < 60) { rn = c; gn = x; }
  else if (h < 120) { rn = x; gn = c; }
  else if (h < 180) { gn = c; bn = x; }
  else if (h < 240) { gn = x; bn = c; }
  else if (h < 300) { rn = x; bn = c; }
  else { rn = c; bn = x; }
  return rgbToHex((rn + m) * 255, (gn + m) * 255, (bn + m) * 255);
}

export function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}
