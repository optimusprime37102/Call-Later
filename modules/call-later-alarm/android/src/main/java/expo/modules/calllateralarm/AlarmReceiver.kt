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
    val action = intent.action
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID)
    val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: alarmId

    // Notification action buttons (fullscreen overlay + silent ReminderAlarmService).
    when (action) {
      ACTION_STOP -> {
        AlarmOverlayController.dismiss(context, alarmId)
        return
      }
      ACTION_CALL_NOW -> {
        val phone = intent.getStringExtra(EXTRA_PHONE_NUMBER).orEmpty()
        openDialer(context, phone)
        AlarmOverlayController.dismiss(context, alarmId)
        return
      }
      ACTION_SNOOZE_10 -> {
        if (!reminderId.isNullOrBlank()) {
          snoozeReminder(
            context = context,
            reminderId = reminderId,
            minutes = 10,
            contactName = intent.getStringExtra(EXTRA_CONTACT_NAME) ?: "",
            phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: "",
            notes = intent.getStringExtra(EXTRA_NOTES) ?: "",
          )
        }
        AlarmOverlayController.dismiss(context, alarmId)
        return
      }
    }

    if (alarmId.isNullOrBlank()) return

    // Hold CPU until FGS / overlay is up — BroadcastReceiver otherwise ends under Doze.
    val pendingResult = goAsync()
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val wakeLock = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "calllater:alarm-fire",
    )
    wakeLock.setReferenceCounted(false)
    try {
      wakeLock.acquire(30_000L)
    } catch (_: Exception) {
    }

    try {
      deliverAlarm(context, intent, alarmId, reminderId)
    } finally {
      try {
        if (wakeLock.isHeld) wakeLock.release()
      } catch (_: Exception) {
      }
      pendingResult.finish()
    }
  }

  private fun deliverAlarm(
    context: Context,
    intent: Intent,
    alarmId: String,
    reminderId: String?,
  ) {
    val resolvedReminderId = reminderId?.takeIf { it.isNotBlank() } ?: alarmId
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "Call Later"
    val body = intent.getStringExtra(EXTRA_BODY) ?: "Time to call"
    val contactName = intent.getStringExtra(EXTRA_CONTACT_NAME) ?: ""
    val phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: ""
    val notes = intent.getStringExtra(EXTRA_NOTES) ?: ""
    val overlayEnabled = AlarmFeedbackPrefs.overlayEnabled(context)

    // One-shot fire — drop so reboot does not re-arm this trigger.
    AlarmScheduleStore.remove(context, alarmId)

    // Full-screen OFF: silent FGS notification + service-owned looping sound/vibrate.
    if (!overlayEnabled) {
      try {
        ReminderAlarmService.start(
          context = context,
          alarmId = alarmId,
          reminderId = resolvedReminderId,
          title = title,
          body = body,
          contactName = contactName,
          phoneNumber = phoneNumber,
          notes = notes,
        )
      } catch (_: Exception) {
        AlarmTonePlayer.start(context)
      }
      return
    }

    ensureChannels(context)
    ensureOverlaySilentChannel(context)

    val overlayIntent = buildOverlayActivityIntent(
      context,
      alarmId,
      resolvedReminderId,
      contactName,
      phoneNumber,
      notes,
    )
    val openInAppIntent = buildOpenInAppIntent(
      context,
      alarmId,
      resolvedReminderId,
    )

    val requestCode = alarmId.hashCode()
    val contentPendingIntent = PendingIntent.getActivity(
      context,
      requestCode,
      openInAppIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      requestCode + 1,
      overlayIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val stopPending = actionPendingIntent(
      context,
      requestCode + 11,
      ACTION_STOP,
      alarmId,
      resolvedReminderId,
      contactName,
      phoneNumber,
      notes,
      title,
      body,
    )
    val callPending = actionPendingIntent(
      context,
      requestCode + 12,
      ACTION_CALL_NOW,
      alarmId,
      resolvedReminderId,
      contactName,
      phoneNumber,
      notes,
      title,
      body,
    )
    val snoozePending = actionPendingIntent(
      context,
      requestCode + 13,
      ACTION_SNOOZE_10,
      alarmId,
      resolvedReminderId,
      contactName,
      phoneNumber,
      notes,
      title,
      body,
    )

    val iconRes = context.resources.getIdentifier(
      "notification_icon",
      "drawable",
      context.packageName,
    )
    val smallIcon =
      if (iconRes != 0) iconRes else android.R.drawable.ic_lock_idle_alarm

    // Overlay owns sound via AlarmTonePlayer — keep shade notification silent.
    val builder = NotificationCompat.Builder(context, CHANNEL_OVERLAY_SILENT)
      .setSmallIcon(smallIcon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setSound(null)
      .setVibrate(longArrayOf(0))
      .setDefaults(NotificationCompat.DEFAULT_LIGHTS)
      .setContentIntent(contentPendingIntent)
      .setDeleteIntent(stopPending)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setColor(0xFF0D9488.toInt())
      .addAction(0, "Call Now", callPending)
      .addAction(0, "Snooze 10m", snoozePending)
      .addAction(0, "Stop", stopPending)

    try {
      NotificationManagerCompat.from(context).notify(requestCode, builder.build())
    } catch (_: SecurityException) {
    }

    if (Settings.canDrawOverlays(context)) {
      try {
        AlarmOverlayService.start(context, overlayIntent)
        return
      } catch (_: Exception) {
        // Fall through to overlay activity.
      }
    }

    try {
      context.startActivity(overlayIntent)
    } catch (_: Exception) {
      AlarmTonePlayer.start(context)
    }
  }

  private fun snoozeReminder(
    context: Context,
    reminderId: String,
    minutes: Int,
    contactName: String,
    phoneNumber: String,
    notes: String,
  ) {
    val triggerAt = System.currentTimeMillis() + minutes * 60_000L
    AlarmActionStore.markSnoozed(context, reminderId, triggerAt)
    AlarmScheduler.schedule(
      context = context,
      alarmId = reminderId,
      triggerAt = triggerAt,
      title = "Call Later",
      body = "Time to call $contactName · $phoneNumber",
      reminderId = reminderId,
      contactName = contactName,
      phoneNumber = phoneNumber,
      notes = notes,
    )
  }

  private fun openDialer(context: Context, phoneNumber: String) {
    if (phoneNumber.isBlank()) return
    try {
      context.startActivity(
        Intent(Intent.ACTION_DIAL).apply {
          data = Uri.parse("tel:${Uri.encode(phoneNumber)}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
    } catch (_: Exception) {
    }
  }

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val soundUri = AlarmFeedbackPrefs.soundUri(context)
    val soundKey = AlarmFeedbackPrefs.soundResource(context)
    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    fun create(
      id: String,
      name: String,
      withSound: Boolean,
      withVibrate: Boolean,
    ) {
      if (manager.getNotificationChannel(id) != null) return
      val channel = NotificationChannel(
        id,
        name,
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Call Later alert feedback"
        enableVibration(withVibrate)
        vibrationPattern = if (withVibrate) VIBRATE_PATTERN else longArrayOf(0)
        if (withSound) {
          setSound(soundUri, attrs)
        } else {
          setSound(null, null)
        }
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }

    create(
      "$CHANNEL_SOUND_VIBRATE-$soundKey",
      "Call reminders",
      withSound = true,
      withVibrate = true,
    )
    create(
      "$CHANNEL_SOUND_ONLY-$soundKey",
      "Call reminders (sound)",
      withSound = true,
      withVibrate = false,
    )
    create(CHANNEL_VIBRATE_ONLY, "Call reminders (vibrate)", withSound = false, withVibrate = true)
    create(CHANNEL_MUTE, "Call reminders (silent)", withSound = false, withVibrate = false)
  }

  /**
   * High-importance but silent channel for overlay alarms.
   * Sound/vibrate are owned exclusively by [AlarmTonePlayer] on the overlay.
   * New id so devices don't keep an older channel that had a sound attached.
   */
  private fun ensureOverlaySilentChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_OVERLAY_SILENT) != null) return
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_OVERLAY_SILENT,
        "Call reminders (full-screen)",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Shows the full-screen alarm; sound plays from the overlay"
        setSound(null, null)
        enableVibration(false)
        vibrationPattern = longArrayOf(0)
        setShowBadge(false)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      },
    )
  }

  companion object {
    const val CHANNEL_SOUND_VIBRATE = "call-reminders-sound-vibrate"
    const val CHANNEL_SOUND_ONLY = "call-reminders-sound-only"
    const val CHANNEL_VIBRATE_ONLY = "call-reminders-vibrate-only"
    const val CHANNEL_MUTE = "call-reminders-mute"
    /** Silent high-importance channel — overlay AlarmTonePlayer owns audio. */
    const val CHANNEL_OVERLAY_SILENT = "call-reminders-overlay-silent-v1"

    const val ACTION_FIRE = "expo.modules.calllateralarm.FIRE_ALARM"
    const val ACTION_STOP = "expo.modules.calllateralarm.REMINDER_ALARM_STOP"
    const val ACTION_CALL_NOW = "expo.modules.calllateralarm.REMINDER_ALARM_CALL"
    const val ACTION_SNOOZE_10 = "expo.modules.calllateralarm.REMINDER_ALARM_SNOOZE_10"
    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_REMINDER_ID = "reminderId"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_CONTACT_NAME = "contactName"
    const val EXTRA_PHONE_NUMBER = "phoneNumber"
    const val EXTRA_NOTES = "notes"

    val VIBRATE_PATTERN = longArrayOf(0, 700, 250, 700, 250, 900, 250, 700)

    fun channelIdFor(context: Context, sound: Boolean, vibrate: Boolean): String {
      val soundKey = AlarmFeedbackPrefs.soundResource(context)
      return when {
        sound && vibrate -> "$CHANNEL_SOUND_VIBRATE-$soundKey"
        sound -> "$CHANNEL_SOUND_ONLY-$soundKey"
        vibrate -> CHANNEL_VIBRATE_ONLY
        else -> CHANNEL_MUTE
      }
    }

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

    fun buildOpenInAppIntent(
      context: Context,
      alarmId: String,
      reminderId: String,
    ): Intent {
      return Intent(context, OpenInAppReminderActivity::class.java).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS,
        )
        putExtra(EXTRA_ALARM_ID, alarmId)
        putExtra(EXTRA_REMINDER_ID, reminderId)
      }
    }

    fun actionPendingIntent(
      context: Context,
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
      val intent = Intent(context, AlarmReceiver::class.java).apply {
        this.action = action
        putExtra(EXTRA_ALARM_ID, alarmId)
        putExtra(EXTRA_REMINDER_ID, reminderId)
        putExtra(EXTRA_CONTACT_NAME, contactName)
        putExtra(EXTRA_PHONE_NUMBER, phoneNumber)
        putExtra(EXTRA_NOTES, notes)
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_BODY, body)
      }
      return PendingIntent.getBroadcast(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
