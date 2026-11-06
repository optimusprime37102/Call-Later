package expo.modules.calllateralarm

import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallLaterAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is null")

  override fun definition() = ModuleDefinition {
    Name("CallLaterAlarm")

    AsyncFunction("scheduleAlarm") { params: Map<String, Any?> ->
      val id = params["id"] as? String ?: throw IllegalArgumentException("id required")
      val triggerAt = (params["triggerAt"] as? Number)?.toLong()
        ?: throw IllegalArgumentException("triggerAt required")
      val title = params["title"] as? String ?: "Call Later"
      val body = params["body"] as? String ?: "Time to call"
      val reminderId = params["reminderId"] as? String ?: id
      val contactName = params["contactName"] as? String ?: ""
      val phoneNumber = params["phoneNumber"] as? String ?: ""
      val notes = params["notes"] as? String ?: ""

      // Require the real Alarms & reminders toggle — not battery-exemption alone.
      if (!isAlarmsAndRemindersEnabled(context)) {
        throw Exception("Exact alarm permission is required for reliable reminders")
      }

      AlarmScheduler.schedule(
        context = context,
        alarmId = id,
        triggerAt = triggerAt,
        title = title,
        body = body,
        reminderId = reminderId,
        contactName = contactName,
        phoneNumber = phoneNumber,
        notes = notes,
      )

      "native:$id"
    }

    AsyncFunction("cancelAlarm") { id: String ->
      val alarmId = id.removePrefix("native:")
      AlarmScheduler.cancel(context, alarmId)
      AlarmOverlayController.dismiss(context, alarmId)
    }

    AsyncFunction("setAlarmFeedbackOptions") { params: Map<String, Any?> ->
      val soundEnabled = params["soundEnabled"] as? Boolean ?: true
      val vibrateEnabled = params["vibrateEnabled"] as? Boolean ?: true
      val overlayEnabled = params["overlayEnabled"] as? Boolean ?: true
      val soundResource = params["soundResource"] as? String ?: "alarm"
      AlarmFeedbackPrefs.set(
        context,
        soundEnabled,
        vibrateEnabled,
        overlayEnabled,
        soundResource,
      )
    }

    AsyncFunction("startAlarmFeedback") {
      AlarmTonePlayer.start(context)
    }

    AsyncFunction("stopAlarmFeedback") {
      AlarmTonePlayer.stop(context)
    }

    AsyncFunction("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT < 34) {
        return@AsyncFunction true
      }
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.canUseFullScreenIntent()
    }

    AsyncFunction("openFullScreenIntentSettings") {
      val intent = if (Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
          data = Uri.parse("package:${context.packageName}")
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    AsyncFunction("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    AsyncFunction("openOverlaySettings") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}"),
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    /**
     * Matches the system Settings → Alarms & reminders toggle.
     * Do NOT use AlarmManager.canScheduleExactAlarms() here — that also returns
     * true when the app is battery-unrestricted, which falsely shows “Allowed”.
     */
    AsyncFunction("canScheduleExactAlarms") {
      isAlarmsAndRemindersEnabled(context)
    }

    AsyncFunction("openExactAlarmSettings") {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${context.packageName}")
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    AsyncFunction("isIgnoringBatteryOptimizations") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        return@AsyncFunction true
      }
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    AsyncFunction("requestIgnoreBatteryOptimizations") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        return@AsyncFunction null
      }
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      if (powerManager.isIgnoringBatteryOptimizations(context.packageName)) {
        return@AsyncFunction null
      }
      try {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      } catch (_: Exception) {
        val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(fallback)
      }
      null
    }

    AsyncFunction("openBatteryOptimizationSettings") {
      try {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      } catch (_: Exception) {
        val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(fallback)
      }
    }

    AsyncFunction("reschedulePersistedAlarms") {
      AlarmScheduler.rescheduleAll(context)
    }

    AsyncFunction("consumePendingActions") {
      val completed = AlarmActionStore.consumeCompletedIds(context)
      val snoozed = AlarmActionStore.consumeSnoozed(context)
      mapOf(
        "completedIds" to completed,
        "snoozed" to snoozed.mapValues { it.value.toDouble() },
      )
    }

    AsyncFunction("dismissAlarmOverlay") { alarmId: String? ->
      AlarmOverlayController.dismiss(context, alarmId)
    }

    AsyncFunction("consumePendingReminderOpen") {
      AlarmLaunchStore.consumePending(context)
    }
  }

  companion object {
    // Literal — AppOpsManager.OPSTR_SCHEDULE_EXACT_ALARM is API 31 and missing on some stubs.
    private const val OPSTR_SCHEDULE_EXACT_ALARM = "android:schedule_exact_alarm"
    private const val PERMISSION_SCHEDULE_EXACT_ALARM =
      "android.permission.SCHEDULE_EXACT_ALARM"

    /**
     * True only when the user enabled Alarms & reminders for this app.
     * Battery unrestricted must NOT count as granted.
     */
    fun isAlarmsAndRemindersEnabled(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true

      try {
        val appOps = context.getSystemService(AppOpsManager::class.java)
        if (appOps != null) {
          val mode = appOps.unsafeCheckOpNoThrow(
            OPSTR_SCHEDULE_EXACT_ALARM,
            Process.myUid(),
            context.packageName,
          )
          return when (mode) {
            AppOpsManager.MODE_ALLOWED -> true
            AppOpsManager.MODE_DEFAULT ->
              context.checkSelfPermission(PERMISSION_SCHEDULE_EXACT_ALARM) ==
                PackageManager.PERMISSION_GRANTED
            else -> false
          }
        }
      } catch (_: Exception) {
      }

      return context.checkSelfPermission(PERMISSION_SCHEDULE_EXACT_ALARM) ==
        PackageManager.PERMISSION_GRANTED
    }
  }
}
