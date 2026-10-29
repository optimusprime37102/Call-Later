package expo.modules.calllateralarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
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

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val alarmManager =
          context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        if (!alarmManager.canScheduleExactAlarms()) {
          throw Exception("Exact alarm permission is required for full-screen reminders")
        }
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
      try {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(alarmId.hashCode())
      } catch (_: Exception) {
      }
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

    AsyncFunction("consumePendingActions") {
      val completed = AlarmActionStore.consumeCompletedIds(context)
      val snoozed = AlarmActionStore.consumeSnoozed(context)
      mapOf(
        "completedIds" to completed,
        "snoozed" to snoozed.mapValues { it.value.toDouble() },
      )
    }
  }
}
