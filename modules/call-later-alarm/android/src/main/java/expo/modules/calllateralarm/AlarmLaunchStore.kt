package expo.modules.calllateralarm

import android.content.Context

/**
 * Queues a reminder id from a notification tap so JS can open reminder detail.
 */
object AlarmLaunchStore {
  private const val PREFS = "call_later_alarm_launch"
  private const val KEY_REMINDER_ID = "reminder_id"
  private const val KEY_ALARM_ID = "alarm_id"
  private const val KEY_PENDING = "pending"

  fun setPending(context: Context, reminderId: String, alarmId: String) {
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_PENDING, true)
      .putString(KEY_REMINDER_ID, reminderId)
      .putString(KEY_ALARM_ID, alarmId)
      .apply()
  }

  fun consumePending(context: Context): Map<String, String>? {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_PENDING, false)) return null
    val reminderId = prefs.getString(KEY_REMINDER_ID, null) ?: return null
    val alarmId = prefs.getString(KEY_ALARM_ID, reminderId) ?: reminderId
    prefs
      .edit()
      .putBoolean(KEY_PENDING, false)
      .remove(KEY_REMINDER_ID)
      .remove(KEY_ALARM_ID)
      .apply()
    return mapOf(
      "reminderId" to reminderId,
      "alarmId" to alarmId,
    )
  }
}
