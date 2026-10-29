const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Keep CMake/.cxx outputs on a short Windows path (C:/c).
 * Pair with scripts/ensure-windows-long-paths.js — Ninja still needs
 * Windows LongPathsEnabled for New Architecture object paths.
 */
function withWindowsCmakePathFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    let contents = config.modResults.contents;

    // Drop failed CMAKE_OBJECT_PATH_MAX=140 workaround (object dirs are already
    // ~120 chars, so CMake cannot hash and ninja still sees 300+ char paths).
    contents = contents.replace(
      /\n\s*externalNativeBuild\s*\{\s*cmake\s*\{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*arguments\s+"-DCMAKE_OBJECT_PATH_MAX=\d+"\s*\}\s*\}/g,
      '',
    );
    contents = contents.replace(
      /\n\s*externalNativeBuild\s*\{\s*cmake\s*\{\s*arguments\s+"-DCMAKE_OBJECT_PATH_MAX=\d+"\s*\}\s*\}/g,
      '',
    );

    if (!contents.includes('buildStagingDirectory file("C:/c")')) {
      if (!/signingConfigs\s*\{/.test(contents)) {
        throw new Error(
          'withWindowsCmakePathFix: could not find signingConfigs in app/build.gradle',
        );
      }
      contents = contents.replace(
        /signingConfigs\s*\{/,
        `// Keep CMake/.cxx outputs on a short path (Windows ninja MAX_PATH)
    externalNativeBuild {
        cmake {
            buildStagingDirectory file("C:/c")
        }
    }
    signingConfigs {`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withWindowsCmakePathFix;
