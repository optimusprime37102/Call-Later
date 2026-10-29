const {
  withAndroidManifest,
  AndroidConfig,
} = require('expo/config-plugins');

/**
 * Permissions for native alarm overlay (draw-over-apps + full-screen intent).
 * Overlay UI is a separate Activity/Service — MainActivity is not launched.
 */
function withAndroidAlarmFullscreen(config) {
  return AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.USE_FULL_SCREEN_INTENT',
    'android.permission.WAKE_LOCK',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  ]);
}

module.exports = withAndroidAlarmFullscreen;
