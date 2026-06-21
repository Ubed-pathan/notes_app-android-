const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOUND_RESOLVER_REL =
  'node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/SoundResolver.java';

const PATCH_MARKER = 'Custom alarm files from app storage';

/**
 * Patches expo-notifications so Android notification channels accept file:// and content:// URIs.
 * Required for user-picked alarm tones when the app is in the background or screen is off.
 */
function withCustomAlarmSound(config) {
  return withDangerousMod(config, [
    'android',
    async cfg => {
      const projectRoot = cfg.modRequest.projectRoot;
      const soundResolverPath = path.join(projectRoot, SOUND_RESOLVER_REL);

      if (!fs.existsSync(soundResolverPath)) {
        console.warn(
          '[withCustomAlarmSound] SoundResolver.java not found — run npm install and prebuild again.'
        );
        return cfg;
      }

      let source = fs.readFileSync(soundResolverPath, 'utf8');
      if (source.includes(PATCH_MARKER)) {
        return cfg;
      }

      const needle = '    String packageName = mContext.getPackageName();';
      const patch = `    // ${PATCH_MARKER}
    if (filename.startsWith("file://") || filename.startsWith("content://")) {
      return Uri.parse(filename);
    }

    String packageName = mContext.getPackageName();`;

      if (!source.includes(needle)) {
        throw new Error(
          '[withCustomAlarmSound] Could not patch SoundResolver.java — expo-notifications layout may have changed.'
        );
      }

      source = source.replace(needle, patch);
      fs.writeFileSync(soundResolverPath, source);
      return cfg;
    },
  ]);
}

module.exports = withCustomAlarmSound;
