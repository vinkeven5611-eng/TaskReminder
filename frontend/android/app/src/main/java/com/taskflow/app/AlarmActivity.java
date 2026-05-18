package com.taskflow.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class AlarmActivity extends Activity {

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;

    // Static reference so AlarmReceiver can stop us from outside
    private static AlarmActivity instance = null;

    public static void stopAlarm() {
        if (instance != null) {
            instance.dismissAlarm();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        // ─── Show on lock screen & turn on screen ─────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            Window window = getWindow();
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // ─── Full-screen layout ───────────────────────────────────────────
        setContentView(R.layout.activity_alarm);

        // Display task title
        String title = getIntent().getStringExtra("title");
        if (title == null) title = "任務提醒";

        TextView tvTitle = findViewById(R.id.tv_alarm_title);
        if (tvTitle != null) tvTitle.setText(title);

        // ─── Dismiss button ───────────────────────────────────────────────
        Button btnDismiss = findViewById(R.id.btn_dismiss_alarm);
        if (btnDismiss != null) {
            btnDismiss.setOnClickListener(v -> dismissAlarm());
        }

        // ─── Sound & vibration ────────────────────────────────────────────
        AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
        boolean isSilent = (am != null && am.getRingerMode() != AudioManager.RINGER_MODE_NORMAL);

        if (!isSilent) {
            try {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(this, alarmUri);
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                mediaPlayer.setLooping(true);
                mediaPlayer.prepare();
                mediaPlayer.start();
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            long[] pattern = {0, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400};
            vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        }
    }

    private void dismissAlarm() {
        // Stop sound
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        // Stop vibration
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
        // Also cancel the notification
        int notifId = getIntent().getIntExtra("notifId", 1);
        android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(notifId);

        finish();
    }

    @Override
    public void onBackPressed() {
        // Don't let back button dismiss without stopping sound
        // Do nothing — user MUST press the dismiss button
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        instance = null;
        // Safety net
        if (mediaPlayer != null) {
            try { mediaPlayer.release(); } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
    }
}
