package expo.modules.calllateralarm

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.view.WindowManager

/**
 * Standalone native alarm screen — does NOT open the React Native MainActivity.
 */
class AlarmOverlayActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    val payload = AlarmOverlayUi.payloadFromIntent(intent)
    if (payload == null) {
      finish()
      return
    }

    AlarmTonePlayer.start(this)
    setContentView(
      AlarmOverlayUi.build(this, payload) {
        finishAndRemoveTaskCompat()
      },
    )
  }

  private fun finishAndRemoveTaskCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      finishAndRemoveTask()
    } else {
      finish()
    }
  }

  override fun onDestroy() {
    AlarmTonePlayer.stop(this)
    super.onDestroy()
  }
}
