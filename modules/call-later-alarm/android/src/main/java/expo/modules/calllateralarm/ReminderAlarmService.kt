package expo.modules.calllateralarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

/**
 * Normal system notification alarm (full-screen overlay OFF):
 * - Foreground service posts a silent ongoing notification (UI + actions only)
 * - [AlarmTonePlayer] owns looping sound + vibrate (settings-driven)
 * - Auto-stops after [MAX_RING_MS] as a safety limit
 */
class ReminderAlarmService : Service() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var activeAlarmId: String? = null
  private val autoStopRunnable = Runnable {
    stopAlarm(activeAlarmId)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val alarmId = intent?.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID)
    val reminderId =
      intent?.getStringExtra(AlarmReceiver.EXTRA_REMINDER_ID) ?: alarmId
    if (alarmId.isNullOrBlank() || reminderId.isNullOrBlank()) {
      stopSelf()
      return START_NOT_STICKY
    }

    val title = intent.getStringExtra(AlarmReceiver.EXTRA_TITLE) ?: "Call Later"
    val body = intent.getStringExtra(AlarmReceiver.EXTRA_BODY) ?: "Time to call"
    val contactName = intent.getStringExtra(AlarmReceiver.EXTRA_CONTACT_NAME) ?: ""
    val phoneNumber = intent.getStringExtra(AlarmReceiver.EXTRA_PHONE_NUMBER) ?: ""
    val notes = intent.getStringExtra(AlarmReceiver.EXTRA_NOTES) ?: ""

    activeAlarmId = alarmId
    ensureSilentChannel()
    val notification = buildSilentNotification(
      alarmId = alarmId,
      reminderId = reminderId,
      title = title,
      body = body,
      contactName = contactName,
      phoneNumber = phoneNumber,
      notes = notes,
    )

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        notificationId(alarmId),
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(notificationId(alarmId), notification)
    }

    AlarmTonePlayer.start(this)
    scheduleAutoStop()
    return START_STICKY
  }

  private fun scheduleAutoStop() {
    mainHandler.removeCallbacks(autoStopRunnable)
    mainHandler.postDelayed(autoStopRunnable, MAX_RING_MS)
  }

  private fun clearAutoStop() {
    mainHandler.removeCallbacks(autoStopRunnable)
  }

  private fun stopAlarm(alarmId: String?) {
    clearAutoStop()
    AlarmTonePlayer.stop(this)
    try {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val id = alarmId ?: activeAlarmId
      if (!id.isNullOrBlank()) {
        manager.cancel(notificationId(id))
      }
    } catch (_: Exception) {
    }
    activeAlarmId = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun buildSilentNotification(
    alarmId: String,
    reminderId: String,
    title: String,
    body: String,
    contactName: String,
    phoneNumber: String,
    notes: String,
  ): Notification {
    val openInApp = AlarmReceiver.buildOpenInAppIntent(this, alarmId, reminderId)
    val contentPending = PendingIntent.getActivity(
      this,
      alarmId.hashCode(),
      openInApp,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    fun action(requestOffset: Int, action: String): PendingIntent =
      broadcastActionPending(
        requestCode = alarmId.hashCode() + requestOffset,
        action = action,
        alarmId = alarmId,
        reminderId = reminderId,
        contactName = contactName,
        phoneNumber = phoneNumber,
        notes = notes,
        title = title,
        body = body,
      )

    val stopPending = action(11, AlarmReceiver.ACTION_STOP)
    val callPending = action(12, AlarmReceiver.ACTION_CALL_NOW)
    val snooze10Pending = action(13, AlarmReceiver.ACTION_SNOOZE_10)

    val iconRes = resources.getIdentifier(
      "notification_icon",
      "drawable",
      packageName,
    )
    val smallIcon =
      if (iconRes != 0) iconRes else android.R.drawable.ic_lock_idle_alarm

    return NotificationCompat.Builder(this, CHANNEL_SILENT)
      .setSmallIcon(smallIcon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setSound(null)
      .setVibrate(longArrayOf(0))
      .setContentIntent(contentPending)
      .setDeleteIntent(stopPending)
      .setColor(0xFF0D9488.toInt())
      .addAction(0, "Call Now", callPending)
      .addAction(0, "Snooze 10m", snooze10Pending)
      .addAction(0, "Stop", stopPending)
      .build()
  }

  private fun broadcastActionPending(
    requestCode: Int,
    action: String,
    alarmId: String,
    reminderId: String,
    contactName: String,
    phoneNumber: String,
    notes: String,
    title: String,
    body: String,
  ): PendingIntent {
    val intent = Intent(this, AlarmReceiver::class.java).apply {
      this.action = action
      putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
      putExtra(AlarmReceiver.EXTRA_REMINDER_ID, reminderId)
      putExtra(AlarmReceiver.EXTRA_CONTACT_NAME, contactName)
      putExtra(AlarmReceiver.EXTRA_PHONE_NUMBER, phoneNumber)
      putExtra(AlarmReceiver.EXTRA_NOTES, notes)
      putExtra(AlarmReceiver.EXTRA_TITLE, title)
      putExtra(AlarmReceiver.EXTRA_BODY, body)
    }
    return PendingIntent.getBroadcast(
      this,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun ensureSilentChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_SILENT) != null) return
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_SILENT,
        "Call reminders (alarm service)",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Shows the call reminder while sound/vibrate play in-app"
        setSound(null, null)
        enableVibration(false)
        vibrationPattern = longArrayOf(0)
        setShowBadge(false)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      },
    )
  }

  override fun onDestroy() {
    clearAutoStop()
    AlarmTonePlayer.stop(this)
    super.onDestroy()
  }

  companion object {
    const val CHANNEL_SILENT = "call-later-reminder-alarm-silent-v1"
    private const val MAX_RING_MS = 2 * 60 * 1000L

    fun notificationId(alarmId: String): Int = alarmId.hashCode()

    fun start(
      context: Context,
      alarmId: String,
      reminderId: String,
      title: String,
      body: String,
      contactName: String,
      phoneNumber: String,
      notes: String,
    ) {
      val intent = Intent(context, ReminderAlarmService::class.java).apply {
        putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
        putExtra(AlarmReceiver.EXTRA_REMINDER_ID, reminderId)
        putExtra(AlarmReceiver.EXTRA_TITLE, title)
        putExtra(AlarmReceiver.EXTRA_BODY, body)
        putExtra(AlarmReceiver.EXTRA_CONTACT_NAME, contactName)
        putExtra(AlarmReceiver.EXTRA_PHONE_NUMBER, phoneNumber)
        putExtra(AlarmReceiver.EXTRA_NOTES, notes)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context, alarmId: String? = null) {
      try {
        AlarmTonePlayer.stop(context)
      } catch (_: Exception) {
      }
      try {
        context.stopService(Intent(context, ReminderAlarmService::class.java))
      } catch (_: Exception) {
      }
      if (!alarmId.isNullOrBlank()) {
        try {
          val manager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
          manager.cancel(notificationId(alarmId))
        } catch (_: Exception) {
        }
      }
    }
  }
}
