import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

function writeWav(filePath, samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function sineTone(freq, durationSec, sampleRate, volume = 0.35, fadeMs = 16) {
  const count = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(count);
  const fadeSamples = Math.floor((fadeMs / 1000) * sampleRate);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    let amp = volume;
    if (i < fadeSamples) amp *= i / fadeSamples;
    if (i > count - fadeSamples) amp *= (count - i) / fadeSamples;
    out[i] = Math.sin(2 * Math.PI * freq * t) * amp;
  }
  return out;
}

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function silence(durationSec, sampleRate) {
  return new Float32Array(Math.floor(sampleRate * durationSec));
}

function repeat(partFactory, times) {
  return concat(Array.from({ length: times }).flatMap((_, i) => partFactory(i)));
}

const sampleRate = 44100;

const tones = {
  classic_alarm: repeat(
    i => [
      sineTone(i % 2 === 0 ? 880 : 660, 0.28, sampleRate, 0.44),
      silence(0.12, sampleRate),
    ],
    12
  ),
  soft_chime: repeat(
    () => [
      sineTone(523.25, 0.45, sampleRate, 0.3),
      silence(0.08, sampleRate),
      sineTone(659.25, 0.45, sampleRate, 0.3),
      silence(0.08, sampleRate),
      sineTone(783.99, 0.65, sampleRate, 0.32),
      silence(0.35, sampleRate),
    ],
    3
  ),
  digital_beep: repeat(
    () => [
      sineTone(1046, 0.14, sampleRate, 0.4),
      silence(0.1, sampleRate),
    ],
    20
  ),
  gentle_bell: repeat(
    () => [
      sineTone(440, 1.1, sampleRate, 0.34, 50),
      silence(0.15, sampleRate),
      sineTone(554.37, 0.95, sampleRate, 0.28, 50),
      silence(0.25, sampleRate),
    ],
    3
  ),
};

for (const [name, samples] of Object.entries(tones)) {
  const filePath = path.join(outDir, `${name}.wav`);
  writeWav(filePath, samples, sampleRate);
  const seconds = (samples.length / sampleRate).toFixed(1);
  console.log(`Wrote ${filePath} (${seconds}s)`);
}
