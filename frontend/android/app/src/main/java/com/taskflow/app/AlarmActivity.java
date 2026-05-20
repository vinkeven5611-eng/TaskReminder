package com.taskflow.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
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
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private AudioManager.OnAudioFocusChangeListener focusChangeListener;

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

        // ─── AudioManager & Audio Focus Setup ─────────────────────────────
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        
        focusChangeListener = new AudioManager.OnAudioFocusChangeListener() {
            @Override
            public void onAudioFocusChange(int focusChange) {
                if (mediaPlayer != null) {
                    switch (focusChange) {
                        case AudioManager.AUDIOFOCUS_LOSS:
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                            // 當失去焦點或被通知 Duck 時，強制再次啟動播放並重設最大音量
                            try {
                                if (!mediaPlayer.isPlaying()) {
                                    mediaPlayer.start();
                                }
                                mediaPlayer.setVolume(1.0f, 1.0f);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                            break;
                        case AudioManager.AUDIOFOCUS_GAIN:
                            try {
                                if (!mediaPlayer.isPlaying()) {
                                    mediaPlayer.start();
                                }
                                mediaPlayer.setVolume(1.0f, 1.0f);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                            break;
                    }
                }
            }
        };

        // ─── Sound & vibration ────────────────────────────────────────────
        boolean isSilent = (audioManager != null && audioManager.getRingerMode() != AudioManager.RINGER_MODE_NORMAL);

        if (!isSilent) {
            try {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(this, alarmUri);
                
                // Configure MediaPlayer Audio Attributes
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AudioAttributes attributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build();
                    mediaPlayer.setAudioAttributes(attributes);
                } else {
                    mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                }
                
                mediaPlayer.setLooping(true);
                mediaPlayer.prepare();

                // Request Exclusive Audio Focus before playing
                requestExclusiveAudioFocus();

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

    private void requestExclusiveAudioFocus() {
        if (audioManager == null) return;
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(attributes)
                        .setAcceptsDelayedFocusGain(false)
                        .setOnAudioFocusChangeListener(focusChangeListener)
                        .build();
                
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(
                        focusChangeListener,
                        AudioManager.STREAM_ALARM,
                        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void abandonExclusiveAudioFocus() {
        if (audioManager == null) return;
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focusRequest != null) {
                    audioManager.abandonAudioFocusRequest(focusRequest);
                    focusRequest = null;
                }
            } else {
                if (focusChangeListener != null) {
                    audioManager.abandonAudioFocus(focusChangeListener);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void dismissAlarm() {
        // Abandon Audio Focus first
        abandonExclusiveAudioFocus();

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
        
        // Abandon Audio Focus
        abandonExclusiveAudioFocus();

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
