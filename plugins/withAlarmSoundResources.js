const {
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOUND_FILES = [
  'alarm.wav',
  'alarm2.wav',
  'alarm3.wav',
  'alarm4.wav',
  'alarm5.wav',
  'alarm6.wav',
  'alarm7.wav',
];

/**
 * Copies bundled alarm tones into android/app/src/main/res/raw so native
 * AlarmTonePlayer can resolve android.resource://…/raw/<name>.
 */
function withAlarmSoundResources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const rawDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'raw',
      );
      fs.mkdirSync(rawDir, { recursive: true });

      for (const fileName of SOUND_FILES) {
        const source = path.join(projectRoot, 'assets', 'sounds', fileName);
        const target = path.join(rawDir, fileName);
        if (!fs.existsSync(source)) {
          console.warn(`[withAlarmSoundResources] Missing ${source}`);
          continue;
        }
        fs.copyFileSync(source, target);
      }

      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withAlarmSoundResources,
  'withAlarmSoundResources',
  '1.0.0',
);
