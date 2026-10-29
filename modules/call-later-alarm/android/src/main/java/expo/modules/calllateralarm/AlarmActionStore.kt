package expo.modules.calllateralarm

import android.content.Context
import org.json.JSONArray

/**
 * Queues reminder side-effects from the native overlay so JS can apply them
 * the next time the React Native app starts (without opening the app now).
 */
object AlarmActionStore {
  private const val PREFS = "call_later_alarm_actions"
  private const val KEY_COMPLETED = "completed_ids"
  private const val KEY_SNOOZED = "snoozed"

  fun markCompleted(context: Context, reminderId: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = readStringArray(prefs.getString(KEY_COMPLETED, "[]"))
    if (!ids.contains(reminderId)) {
      ids.add(reminderId)
      prefs.edit().putString(KEY_COMPLETED, JSONArray(ids).toString()).apply()
    }
  }

  fun markSnoozed(context: Context, reminderId: String, triggerAt: Long) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_SNOOZED, "{}") ?: "{}"
    val map = org.json.JSONObject(raw)
    map.put(reminderId, triggerAt)
    prefs.edit().putString(KEY_SNOOZED, map.toString()).apply()
  }

  fun consumeCompletedIds(context: Context): List<String> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = readStringArray(prefs.getString(KEY_COMPLETED, "[]"))
    prefs.edit().putString(KEY_COMPLETED, "[]").apply()
    return ids
  }

  fun consumeSnoozed(context: Context): Map<String, Long> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_SNOOZED, "{}") ?: "{}"
    val map = org.json.JSONObject(raw)
    val result = mutableMapOf<String, Long>()
    val keys = map.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      result[key] = map.optLong(key)
    }
    prefs.edit().putString(KEY_SNOOZED, "{}").apply()
    return result
  }

  private fun readStringArray(raw: String?): MutableList<String> {
    return try {
      val arr = JSONArray(raw ?: "[]")
      MutableList(arr.length()) { i -> arr.getString(i) }
    } catch (_: Exception) {
      mutableListOf()
    }
  }
}
