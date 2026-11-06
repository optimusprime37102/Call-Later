package expo.modules.calllateralarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persists scheduled alarm payloads so they can be restored after reboot /
 * package update (AlarmManager entries are cleared by the system).
 */
object AlarmScheduleStore {
  private const val PREFS = "call_later_alarm_schedule"
  private const val KEY_ALARMS = "alarms"

  data class Entry(
    val alarmId: String,
    val triggerAt: Long,
    val title: String,
    val body: String,
    val reminderId: String,
    val contactName: String,
    val phoneNumber: String,
    val notes: String,
  )

  @Synchronized
  fun put(context: Context, entry: Entry) {
    val map = loadMap(context).toMutableMap()
    map[entry.alarmId] = entry
    saveMap(context, map)
  }

  @Synchronized
  fun remove(context: Context, alarmId: String) {
    val map = loadMap(context).toMutableMap()
    if (map.remove(alarmId) != null) {
      saveMap(context, map)
    }
  }

  @Synchronized
  fun all(context: Context): List<Entry> = loadMap(context).values.toList()

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun loadMap(context: Context): Map<String, Entry> {
    val raw = prefs(context).getString(KEY_ALARMS, null) ?: return emptyMap()
    return try {
      val array = JSONArray(raw)
      buildMap {
        for (i in 0 until array.length()) {
          val obj = array.optJSONObject(i) ?: continue
          val id = obj.optString("alarmId")
          if (id.isBlank()) continue
          put(
            id,
            Entry(
              alarmId = id,
              triggerAt = obj.optLong("triggerAt"),
              title = obj.optString("title", "Call Later"),
              body = obj.optString("body", "Time to call"),
              reminderId = obj.optString("reminderId", id),
              contactName = obj.optString("contactName"),
              phoneNumber = obj.optString("phoneNumber"),
              notes = obj.optString("notes"),
            ),
          )
        }
      }
    } catch (_: Exception) {
      emptyMap()
    }
  }

  private fun saveMap(context: Context, map: Map<String, Entry>) {
    val array = JSONArray()
    for (entry in map.values) {
      array.put(
        JSONObject()
          .put("alarmId", entry.alarmId)
          .put("triggerAt", entry.triggerAt)
          .put("title", entry.title)
          .put("body", entry.body)
          .put("reminderId", entry.reminderId)
          .put("contactName", entry.contactName)
          .put("phoneNumber", entry.phoneNumber)
          .put("notes", entry.notes),
      )
    }
    // commit() so the schedule survives process death before reboot restore.
    prefs(context).edit().putString(KEY_ALARMS, array.toString()).commit()
  }
}
