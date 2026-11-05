package expo.modules.calllateralarm

import android.content.Context

object AlarmFeedbackPrefs {
  private const val PREFS = "call_later_alarm_feedback"
  private const val KEY_SOUND = "sound_enabled"
  private const val KEY_VIBRATE = "vibrate_enabled"
  private const val KEY_OVERLAY = "overlay_enabled"

  fun set(
    context: Context,
    soundEnabled: Boolean,
    vibrateEnabled: Boolean,
    overlayEnabled: Boolean = true,
  ) {
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_SOUND, soundEnabled)
      .putBoolean(KEY_VIBRATE, vibrateEnabled)
      .putBoolean(KEY_OVERLAY, overlayEnabled)
      .apply()
  }

  fun soundEnabled(context: Context): Boolean {
    return context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getBoolean(KEY_SOUND, true)
  }

  fun vibrateEnabled(context: Context): Boolean {
    return context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getBoolean(KEY_VIBRATE, true)
  }

  fun overlayEnabled(context: Context): Boolean {
    return context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getBoolean(KEY_OVERLAY, true)
  }
}
