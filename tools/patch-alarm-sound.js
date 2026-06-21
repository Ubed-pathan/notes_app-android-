const fs = require('fs');
const path = require('path');

const SOUND_RESOLVER = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'notifications',
  'notifications',
  'SoundResolver.java'
);

const MARKER = 'Custom alarm files from app storage';
const NEEDLE = '    String packageName = mContext.getPackageName();';
const PATCH = `    // ${MARKER}
    if (filename.startsWith("file://") || filename.startsWith("content://")) {
      return Uri.parse(filename);
    }

    String packageName = mContext.getPackageName();`;

if (!fs.existsSync(SOUND_RESOLVER)) {
  process.exit(0);
}

const source = fs.readFileSync(SOUND_RESOLVER, 'utf8');
if (source.includes(MARKER)) {
  process.exit(0);
}

if (!source.includes(NEEDLE)) {
  console.warn('[patch-alarm-sound] SoundResolver.java layout changed — patch skipped.');
  process.exit(0);
}

fs.writeFileSync(SOUND_RESOLVER, source.replace(NEEDLE, PATCH));
console.log('[patch-alarm-sound] Patched SoundResolver for custom alarm file URIs.');
