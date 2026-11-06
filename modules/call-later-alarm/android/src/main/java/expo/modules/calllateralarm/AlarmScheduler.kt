package expo.modules.calllateralarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Schedules call reminders with [AlarmManager.setAlarmClock] only.
 *
 * setAlarmClock is Doze-exempt and not subject to the
 * setExactAndAllowWhileIdle quota — required for on-time alerts under
 * battery optimization.
 */
object AlarmScheduler {
  fun schedule(
    context: Context,
    alarmId: String,
    triggerAt: Long,
    title: String,
    body: String,
    reminderId: String,
    contactName: String,
    phoneNumber: String,
    notes: String,
  ) {
    val appContext = context.applicationContext
    val fireAt = triggerAt.coerceAtLeast(System.currentTimeMillis())

    AlarmScheduleStore.put(
      appContext,
      AlarmScheduleStore.Entry(
        alarmId = alarmId,
        triggerAt = fireAt,
        title = title,
        body = body,
        reminderId = reminderId,
        contactName = contactName,
        phoneNumber = phoneNumber,
        notes = notes,
      ),
    )

    val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // Match Settings “Alarms & reminders” — ignore battery-exemption false positives.
    if (!CallLaterAlarmModule.isAlarmsAndRemindersEnabled(appContext)) {
      throw SecurityException("Exact alarm permission is required for reliable reminders")
    }

    val operation = firePendingIntent(
      appContext,
      alarmId,
      reminderId,
      title,
      body,
      contactName,
      phoneNumber,
      notes,
    )

    val showIntent = AlarmReceiver.buildOpenInAppIntent(appContext, alarmId, reminderId)
    val showPending = PendingIntent.getActivity(
      appContext,
      alarmId.hashCode() + 77,
      showIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    // Doze-exempt. Do not fall back to inexact / quota-limited APIs.
    alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(fireAt, showPending), operation)
  }

  fun cancel(context: Context, alarmId: String) {
    val appContext = context.applicationContext
    AlarmScheduleStore.remove(appContext, alarmId)
    val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = firePendingIntent(appContext, alarmId, alarmId, "", "", "", "", "")
    alarmManager.cancel(pending)
    pending.cancel()
  }

  /** Re-arm every future persisted alarm (boot / app update / time change). */
  fun rescheduleAll(context: Context) {
    val appContext = context.applicationContext
    val now = System.currentTimeMillis()
    for (entry in AlarmScheduleStore.all(appContext)) {
      if (entry.triggerAt <= now) {
        // Past due — drop; JS list still shows overdue, do not auto-spam on boot.
        AlarmScheduleStore.remove(appContext, entry.alarmId)
        continue
      }
      try {
        schedule(
          context = appContext,
          alarmId = entry.alarmId,
          triggerAt = entry.triggerAt,
          title = entry.title,
          body = entry.body,
          reminderId = entry.reminderId,
          contactName = entry.contactName,
          phoneNumber = entry.phoneNumber,
          notes = entry.notes,
        )
      } catch (_: Exception) {
        // Exact-alarm permission may be off after reboot; JS rehydrate prompts.
      }
    }
  }

  private fun firePendingIntent(
    context: Context,
    alarmId: String,
    reminderId: String,
    title: String,
    body: String,
    contactName: String,
    phoneNumber: String,
    notes: String,
  ): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = AlarmReceiver.ACTION_FIRE
      putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
      putExtra(AlarmReceiver.EXTRA_REMINDER_ID, reminderId)
      putExtra(AlarmReceiver.EXTRA_TITLE, title)
      putExtra(AlarmReceiver.EXTRA_BODY, body)
      putExtra(AlarmReceiver.EXTRA_CONTACT_NAME, contactName)
      putExtra(AlarmReceiver.EXTRA_PHONE_NUMBER, phoneNumber)
      putExtra(AlarmReceiver.EXTRA_NOTES, notes)
    }
    return PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
