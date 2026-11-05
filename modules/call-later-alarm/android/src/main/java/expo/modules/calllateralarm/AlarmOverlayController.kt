package expo.modules.calllateralarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent

/**
 * Stops native overlay UI / tone when the user opens the in-app reminder screen.
 */
object AlarmOverlayController {
  fun dismiss(context: Context, alarmId: String? = null) {
    AlarmTonePlayer.stop(context)
    try {
      context.stopService(Intent(context, AlarmOverlayService::class.java))
    } catch (_: Exception) {
    }
    ReminderAlarmService.stop(context, alarmId)
    AlarmOverlayActivity.finishIfOpen()
    try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (!alarmId.isNullOrBlank()) {
        manager.cancel(alarmId.hashCode())
      }
      manager.cancel(OVERLAY_SERVICE_NOTIFICATION_ID)
    } catch (_: Exception) {
    }
  }

  // Keep in sync with AlarmOverlayService.SERVICE_NOTIFICATION_ID
  private const val OVERLAY_SERVICE_NOTIFICATION_ID = 71001
}
