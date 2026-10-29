package expo.modules.calllateralarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

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
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = pendingIntent(
      context,
      alarmId,
      reminderId,
      title,
      body,
      contactName,
      phoneNumber,
      notes,
    )

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    } else {
      @Suppress("DEPRECATION")
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    }
  }

  fun cancel(context: Context, alarmId: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = pendingIntent(context, alarmId, alarmId, "", "", "", "", "")
    alarmManager.cancel(pending)
    pending.cancel()
  }

  private fun pendingIntent(
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
