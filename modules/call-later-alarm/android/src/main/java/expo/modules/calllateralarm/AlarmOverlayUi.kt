package expo.modules.calllateralarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

data class AlarmOverlayPayload(
  val alarmId: String,
  val reminderId: String,
  val contactName: String,
  val phoneNumber: String,
  val notes: String,
)

object AlarmOverlayUi {
  fun build(
    context: Context,
    payload: AlarmOverlayPayload,
    onClose: () -> Unit,
  ): View {
    val density = context.resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()

    val root = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#061016"))
      setPadding(dp(24), dp(48), dp(24), dp(32))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.MATCH_PARENT,
      )
    }

    val badge = TextView(context).apply {
      text = "TIME TO CALL"
      setTextColor(Color.parseColor("#2DD4BF"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
      setTypeface(typeface, Typeface.BOLD)
      letterSpacing = 0.12f
    }
    root.addView(badge)

    val scroll = ScrollView(context).apply {
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        0,
        1f,
      )
      isFillViewport = true
    }
    val content = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(0, dp(40), 0, dp(24))
    }

    val avatar = TextView(context).apply {
      text = payload.contactName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#2DD4BF"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 36f)
      setTypeface(typeface, Typeface.BOLD)
      background = rounded(Color.argb(0x29, 0x2D, 0xD4, 0xBF), dp(28))
      layoutParams = LinearLayout.LayoutParams(dp(96), dp(96)).apply {
        gravity = Gravity.CENTER_HORIZONTAL
        bottomMargin = dp(20)
      }
    }
    content.addView(avatar)

    content.addView(
      TextView(context).apply {
        text = payload.contactName.ifBlank { "Contact" }
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#F4F7F9"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
        setTypeface(typeface, Typeface.BOLD)
      },
    )
    content.addView(
      TextView(context).apply {
        text = payload.phoneNumber.ifBlank { "No number" }
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#B8CDD8"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
        setPadding(0, dp(8), 0, 0)
      },
    )
    if (payload.notes.isNotBlank()) {
      content.addView(
        TextView(context).apply {
          text = payload.notes
          setTextColor(Color.parseColor("#E8EEF2"))
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
          setPadding(dp(16), dp(16), dp(16), dp(16))
          background = rounded(Color.parseColor("#14FFFFFF"), dp(16))
          layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
          ).apply { topMargin = dp(24) }
        },
      )
    }
    scroll.addView(content)
    root.addView(scroll)

    val actions = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
    }

    actions.addView(
      actionButton(context, "Call Now", Color.parseColor("#0D9488"), Color.WHITE) {
        openDialer(context, payload.phoneNumber)
        finishAlarm(context, payload.alarmId, onClose)
      },
    )

    val snoozeRow = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply { topMargin = dp(12) }
    }
    listOf(10 to "10m", 30 to "30m", 60 to "1h").forEachIndexed { index, (minutes, label) ->
      val chip = actionButton(
        context,
        label,
        Color.parseColor("#14FFFFFF"),
        Color.parseColor("#E8EEF2"),
      ) {
        snooze(context, payload, minutes)
        finishAlarm(context, payload.alarmId, onClose)
      }
      chip.layoutParams = LinearLayout.LayoutParams(0, dp(48), 1f).apply {
        if (index > 0) marginStart = dp(8)
      }
      snoozeRow.addView(chip)
    }
    actions.addView(snoozeRow)

    actions.addView(
      actionButton(
        context,
        "Mark completed",
        Color.parseColor("#1AFFFFFF"),
        Color.parseColor("#F4F7F9"),
      ) {
        AlarmActionStore.markCompleted(context, payload.reminderId)
        finishAlarm(context, payload.alarmId, onClose)
      }.apply {
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          dp(52),
        ).apply { topMargin = dp(12) }
      },
    )

    actions.addView(
      actionButton(context, "Dismiss", Color.TRANSPARENT, Color.parseColor("#B8CDD8")) {
        finishAlarm(context, payload.alarmId, onClose)
      }.apply {
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          dp(48),
        ).apply { topMargin = dp(4) }
      },
    )

    root.addView(actions)
    return root
  }

  private fun actionButton(
    context: Context,
    label: String,
    background: Int,
    textColor: Int,
    onClick: () -> Unit,
  ): TextView {
    val density = context.resources.displayMetrics.density
    val height = (56 * density).toInt()
    val radius = (14 * density).toInt()
    return TextView(context).apply {
      text = label
      gravity = Gravity.CENTER
      setTextColor(textColor)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      setTypeface(typeface, Typeface.BOLD)
      this.background = rounded(background, radius)
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        height,
      )
      setOnClickListener { onClick() }
    }
  }

  private fun rounded(color: Int, radius: Int): GradientDrawable {
    return GradientDrawable().apply {
      setColor(color)
      cornerRadius = radius.toFloat()
    }
  }

  private fun openDialer(context: Context, phoneNumber: String) {
    if (phoneNumber.isBlank()) return
    try {
      val intent = Intent(Intent.ACTION_DIAL).apply {
        data = Uri.parse("tel:${Uri.encode(phoneNumber)}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    } catch (_: Exception) {
    }
  }

  private fun snooze(context: Context, payload: AlarmOverlayPayload, minutes: Int) {
    val triggerAt = System.currentTimeMillis() + minutes * 60_000L
    AlarmActionStore.markSnoozed(context, payload.reminderId, triggerAt)
    AlarmScheduler.schedule(
      context = context,
      alarmId = payload.reminderId,
      triggerAt = triggerAt,
      title = "Call Later",
      body = "Time to call ${payload.contactName} · ${payload.phoneNumber}",
      reminderId = payload.reminderId,
      contactName = payload.contactName,
      phoneNumber = payload.phoneNumber,
      notes = payload.notes,
    )
  }

  private fun finishAlarm(context: Context, alarmId: String, onClose: () -> Unit) {
    AlarmTonePlayer.stop(context)
    try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.cancel(alarmId.hashCode())
    } catch (_: Exception) {
    }
    onClose()
  }

  fun payloadFromIntent(intent: Intent?): AlarmOverlayPayload? {
    if (intent == null) return null
    val reminderId = intent.getStringExtra(AlarmReceiver.EXTRA_REMINDER_ID) ?: return null
    return AlarmOverlayPayload(
      alarmId = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID) ?: reminderId,
      reminderId = reminderId,
      contactName = intent.getStringExtra(AlarmReceiver.EXTRA_CONTACT_NAME) ?: "",
      phoneNumber = intent.getStringExtra(AlarmReceiver.EXTRA_PHONE_NUMBER) ?: "",
      notes = intent.getStringExtra(AlarmReceiver.EXTRA_NOTES) ?: "",
    )
  }
}
