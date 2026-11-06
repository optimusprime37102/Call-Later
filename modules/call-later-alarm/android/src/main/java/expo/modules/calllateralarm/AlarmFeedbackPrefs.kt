package expo.modules.calllateralarm

import android.content.Context

object AlarmFeedbackPrefs {
  private const val PREFS = "call_later_alarm_feedback"
  private const val KEY_SOUND = "sound_enabled"
  private const val KEY_VIBRATE = "vibrate_enabled"
  private const val KEY_OVERLAY = "overlay_enabled"
  private const val KEY_SOUND_RESOURCE = "sound_resource"
  private const val DEFAULT_SOUND_RESOURCE = "alarm"

  fun set(
    context: Context,
    soundEnabled: Boolean,
    vibrateEnabled: Boolean,
    overlayEnabled: Boolean = true,
    soundResource: String = DEFAULT_SOUND_RESOURCE,
  ) {
    val normalized = normalizeSoundResource(soundResource)
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_SOUND, soundEnabled)
      .putBoolean(KEY_VIBRATE, vibrateEnabled)
      .putBoolean(KEY_OVERLAY, overlayEnabled)
      .putString(KEY_SOUND_RESOURCE, normalized)
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

  fun soundResource(context: Context): String {
    val stored = context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_SOUND_RESOURCE, DEFAULT_SOUND_RESOURCE)
    return normalizeSoundResource(stored)
  }

  fun soundUri(context: Context): android.net.Uri {
    val resource = soundResource(context)
    val resId = context.resources.getIdentifier(resource, "raw", context.packageName)
    if (resId != 0) {
      return android.net.Uri.parse("android.resource://${context.packageName}/$resId")
    }
    return android.net.Uri.parse("android.resource://${context.packageName}/raw/$DEFAULT_SOUND_RESOURCE")
  }

  private fun normalizeSoundResource(value: String?): String {
    val cleaned = value
      ?.trim()
      ?.lowercase()
      ?.replace(Regex("[^a-z0-9_]"), "")
      .orEmpty()
    return if (cleaned.isBlank()) DEFAULT_SOUND_RESOURCE else cleaned
  }
}
