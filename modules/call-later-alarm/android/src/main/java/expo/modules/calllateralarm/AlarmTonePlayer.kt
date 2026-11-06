package expo.modules.calllateralarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object AlarmTonePlayer {
  private var player: MediaPlayer? = null
  private var vibrating = false

  @Synchronized
  fun start(context: Context) {
    val playSound = AlarmFeedbackPrefs.soundEnabled(context)
    val playVibrate = AlarmFeedbackPrefs.vibrateEnabled(context)

    // Already ringing (e.g. overlay service + full-screen activity both start): keep one stream.
    val alreadyPlaying = try {
      player?.isPlaying == true
    } catch (_: Exception) {
      false
    }
    if (alreadyPlaying && (!playVibrate || vibrating)) {
      return
    }

    stop(context)

    if (playSound) {
      try {
        val soundUri = AlarmFeedbackPrefs.soundUri(context)
        player = MediaPlayer().apply {
          setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
          setDataSource(context, soundUri)
          isLooping = true
          prepare()
          setVolume(1f, 1f)
          start()
        }
      } catch (_: Exception) {
        player = null
      }
    }

    if (playVibrate) {
      vibrate(context, repeat = true)
      vibrating = true
    }
  }

  @Synchronized
  fun stop(context: Context? = null) {
    try {
      player?.stop()
    } catch (_: Exception) {
    }
    try {
      player?.release()
    } catch (_: Exception) {
    }
    player = null
    vibrating = false

    context?.let { stopVibration(it) }
  }

  fun vibrate(context: Context, repeat: Boolean) {
    try {
      val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager =
          context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }

      val pattern = longArrayOf(0, 700, 250, 700, 250, 900)
      val repeatIndex = if (repeat) 0 else -1
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, repeatIndex))
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(pattern, repeatIndex)
      }
    } catch (_: Exception) {
    }
  }

  fun stopVibration(context: Context) {
    try {
      val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager =
          context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }
      vibrator.cancel()
    } catch (_: Exception) {
    }
  }
}
