package expo.modules.calllateralarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
    val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: alarmId
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "Call Later"
    val body = intent.getStringExtra(EXTRA_BODY) ?: "Time to call"
    val contactName = intent.getStringExtra(EXTRA_CONTACT_NAME) ?: ""
    val phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: ""
    val notes = intent.getStringExtra(EXTRA_NOTES) ?: ""

    wakeScreen(context)
    ensureChannel(context)

    val overlayIntent = buildOverlayActivityIntent(
      context,
      alarmId,
      reminderId,
      contactName,
      phoneNumber,
      notes,
    )

    val requestCode = alarmId.hashCode()
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      requestCode,
      overlayIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val soundUri = Uri.parse("android.resource://${context.packageName}/raw/alarm")
    val iconRes = context.resources.getIdentifier(
      "notification_icon",
      "drawable",
      context.packageName,
    )
    val smallIcon =
      if (iconRes != 0) iconRes else android.R.drawable.ic_lock_idle_alarm

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(true)
      .setOngoing(true)
      .setSound(soundUri)
      .setVibrate(VIBRATE_PATTERN)
      .setDefaults(NotificationCompat.DEFAULT_LIGHTS)
      .setContentIntent(fullScreenPendingIntent)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setColor(0xFF0D9488.toInt())
      .build()

    try {
      NotificationManagerCompat.from(context).notify(requestCode, notification)
    } catch (_: SecurityException) {
    }

    // Prefer system overlay service — never opens the React Native app.
    if (Settings.canDrawOverlays(context)) {
      try {
        AlarmOverlayService.start(context, overlayIntent)
        return
      } catch (_: Exception) {
        // Fall through to overlay activity.
      }
    }

    // Lock-screen / no overlay permission: native AlarmOverlayActivity only.
    try {
      context.startActivity(overlayIntent)
    } catch (_: Exception) {
      // Full-screen intent on the notification still covers locked devices.
    }
  }

  private fun wakeScreen(context: Context) {
    try {
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      @Suppress("DEPRECATION")
      val wakeLock = powerManager.newWakeLock(
        PowerManager.FULL_WAKE_LOCK or
          PowerManager.ACQUIRE_CAUSES_WAKEUP or
          PowerManager.ON_AFTER_RELEASE,
        "calllater:alarm",
      )
      wakeLock.acquire(5000L)
      wakeLock.release()
    } catch (_: Exception) {
    }
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val soundUri = Uri.parse("android.resource://${context.packageName}/raw/alarm")
    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Call reminders",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Full-screen callback alarms"
      enableVibration(true)
      vibrationPattern = VIBRATE_PATTERN
      setSound(soundUri, attrs)
      lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  companion object {
    const val CHANNEL_ID = "call-reminders-v3"
    const val ACTION_FIRE = "expo.modules.calllateralarm.FIRE_ALARM"
    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_REMINDER_ID = "reminderId"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_CONTACT_NAME = "contactName"
    const val EXTRA_PHONE_NUMBER = "phoneNumber"
    const val EXTRA_NOTES = "notes"

    val VIBRATE_PATTERN = longArrayOf(0, 700, 250, 700, 250, 900, 250, 700)

    fun buildOverlayActivityIntent(
      context: Context,
      alarmId: String,
      reminderId: String,
      contactName: String,
      phoneNumber: String,
      notes: String,
    ): Intent {
      return Intent(context, AlarmOverlayActivity::class.java).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_NO_USER_ACTION or
            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS,
        )
        putExtra(EXTRA_ALARM_ID, alarmId)
        putExtra(EXTRA_REMINDER_ID, reminderId)
        putExtra(EXTRA_CONTACT_NAME, contactName)
        putExtra(EXTRA_PHONE_NUMBER, phoneNumber)
        putExtra(EXTRA_NOTES, notes)
        putExtra(EXTRA_TITLE, "Call Later")
        putExtra(EXTRA_BODY, "Time to call $contactName")
      }
    }
  }
}
