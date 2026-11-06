package expo.modules.calllateralarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * AlarmManager entries are cleared on reboot / time changes.
 * Restore future alarms from [AlarmScheduleStore].
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (
      action != Intent.ACTION_BOOT_COMPLETED &&
      action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      action != Intent.ACTION_TIME_CHANGED &&
      action != Intent.ACTION_TIMEZONE_CHANGED &&
      action != "android.intent.action.QUICKBOOT_POWERON" &&
      action != "com.htc.intent.action.QUICKBOOT_POWERON"
    ) {
      return
    }

    val pending = goAsync()
    try {
      AlarmScheduler.rescheduleAll(context.applicationContext)
    } catch (_: Exception) {
      // Best-effort; JS rehydrate on next launch is the backup path.
    } finally {
      pending.finish()
    }
  }
}
