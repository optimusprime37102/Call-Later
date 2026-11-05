package expo.modules.calllateralarm

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Notification tap trampoline: dismiss native overlay, queue reminder for JS,
 * then bring the React Native app forward.
 */
class OpenInAppReminderActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val reminderId = intent.getStringExtra(AlarmReceiver.EXTRA_REMINDER_ID)
    val alarmId =
      intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID) ?: reminderId

    if (!reminderId.isNullOrBlank()) {
      AlarmLaunchStore.setPending(this, reminderId, alarmId ?: reminderId)
      AlarmOverlayController.dismiss(this, alarmId)
    } else {
      AlarmOverlayController.dismiss(this)
    }

    val launch = packageManager.getLaunchIntentForPackage(packageName)
    if (launch != null) {
      launch.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
      )
      if (!reminderId.isNullOrBlank()) {
        launch.putExtra(AlarmReceiver.EXTRA_REMINDER_ID, reminderId)
      }
      startActivity(launch)
    }

    finish()
  }
}
