package expo.modules.calllateralarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat

/**
 * Draws a system overlay above other apps without launching MainActivity.
 * Requires SYSTEM_ALERT_WINDOW ("Display over other apps").
 */
class AlarmOverlayService : Service() {
  private var windowManager: WindowManager? = null
  private var overlayView: View? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val payload = AlarmOverlayUi.payloadFromIntent(intent)
    if (payload == null || !Settings.canDrawOverlays(this)) {
      stopSelf()
      return START_NOT_STICKY
    }

    startAsForeground(payload)
    AlarmTonePlayer.start(this)
    showOverlay(payload)
    return START_NOT_STICKY
  }

  private fun startAsForeground(payload: AlarmOverlayPayload) {
    ensureServiceChannel()
    val activityIntent = AlarmReceiver.buildOverlayActivityIntent(
      this,
      payload.alarmId,
      payload.reminderId,
      payload.contactName,
      payload.phoneNumber,
      payload.notes,
    )
    val pending = PendingIntent.getActivity(
      this,
      payload.alarmId.hashCode(),
      activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification: Notification = NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Call Later alarm")
      .setContentText("Reminder for ${payload.contactName}")
      .setContentIntent(pending)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        SERVICE_NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(SERVICE_NOTIFICATION_ID, notification)
    }
  }

  private fun showOverlay(payload: AlarmOverlayPayload) {
    if (overlayView != null) return

    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_UNCHANGED
    }

    overlayView = AlarmOverlayUi.build(this, payload) {
      removeOverlay()
      stopSelf()
    }
    windowManager?.addView(overlayView, params)
  }

  private fun removeOverlay() {
    AlarmTonePlayer.stop(this)
    try {
      overlayView?.let { windowManager?.removeView(it) }
    } catch (_: Exception) {
    }
    overlayView = null
  }

  override fun onDestroy() {
    removeOverlay()
    super.onDestroy()
  }

  private fun ensureServiceChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(SERVICE_CHANNEL_ID) != null) return
    manager.createNotificationChannel(
      NotificationChannel(
        SERVICE_CHANNEL_ID,
        "Alarm overlay service",
        NotificationManager.IMPORTANCE_LOW,
      ),
    )
  }

  companion object {
    private const val SERVICE_CHANNEL_ID = "call-later-overlay-service"
    private const val SERVICE_NOTIFICATION_ID = 71001

    fun start(context: Context, intent: Intent) {
      val serviceIntent = Intent(context, AlarmOverlayService::class.java).apply {
        putExtras(intent)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent)
      } else {
        context.startService(serviceIntent)
      }
    }
  }
}
