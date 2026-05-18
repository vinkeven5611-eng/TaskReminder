package com.taskflow.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "taskflow_alarms_v3";
    public static final String ACTION_DISMISS = "com.taskflow.app.ACTION_DISMISS";

    // Static reference so the dismiss action can stop it
    private static MediaPlayer activePlayer = null;
    private static Vibrator activeVibrator = null;

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        int notifId = intent.getIntExtra("notifId", 1);

        // ─── Handle dismiss ───────────────────────────────────────────────
        if (ACTION_DISMISS.equals(intent.getAction())) {
            manager.cancel(notifId);
            // Stop MediaPlayer
            if (activePlayer != null) {
                try {
                    if (activePlayer.isPlaying()) activePlayer.stop();
                    activePlayer.release();
                } catch (Exception ignored) {}
                activePlayer = null;
            }
            // Stop Vibrator
            if (activeVibrator != null) {
                activeVibrator.cancel();
                activeVibrator = null;
            }
            return;
        }

        // ─── Alarm fire ───────────────────────────────────────────────────
        String title = intent.getStringExtra("title");
        if (title == null) title = "任務提醒";

        // Get alarm URI with fallback chain
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // ─── Notification Channel (USAGE_ALARM = STREAM_ALARM track) ─────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "TaskFlow 鬧鐘", NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            channel.setSound(alarmUri, audioAttributes);
            channel.setBypassDnd(true);
            manager.createNotificationChannel(channel);
        }

        // ─── Dismiss PendingIntent (BroadcastReceiver) ────────────────────
        Intent dismissIntent = new Intent(context, AlarmReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS);
        dismissIntent.putExtra("notifId", notifId);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent dismissPI = PendingIntent.getBroadcast(context, notifId, dismissIntent, flags);

        // ─── FullScreen intent → main Activity (forces heads-up popup) ────
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent fullScreenPI = null;
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            fullScreenPI = PendingIntent.getActivity(context, notifId + 1000, launchIntent, flags);
        }

        // ─── Ringer mode → choose vibration pattern ────────────────────────
        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        boolean isSilent = audioManager.getRingerMode() != AudioManager.RINGER_MODE_NORMAL;

        long[] silentVibration = {0, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400};
        long[] normalVibration  = {0, 400, 200, 400};

        // ─── Build notification ───────────────────────────────────────────
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(isSilent ? "🚨 任務提醒" : "⏰ 任務鬧鐘響起")
            .setContentText(title)
            // BigTextStyle forces expanded view so action button is visible immediately
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText("📌 " + title + "\n\n請及時處理您的任務！"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSound(alarmUri)
            .setVibrate(isSilent ? silentVibration : normalVibration)
            .setFullScreenIntent(fullScreenPI, true) // Triggers heads-up popup
            .addAction(android.R.drawable.ic_delete, "✕  關閉鬧鐘", dismissPI);

        manager.notify(notifId, builder.build());

        // ─── Play sound via MediaPlayer (STREAM_ALARM guarantees sound) ───
        if (!isSilent) {
            try {
                if (activePlayer != null) {
                    try { activePlayer.stop(); activePlayer.release(); } catch (Exception ignored) {}
                    activePlayer = null;
                }
                MediaPlayer mp = new MediaPlayer();
                mp.setDataSource(context, alarmUri);
                mp.setAudioStreamType(AudioManager.STREAM_ALARM);
                mp.setLooping(false);
                mp.prepare();
                mp.start();
                mp.setOnCompletionListener(MediaPlayer::release);
                activePlayer = mp;
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            // Silent/vibrate mode: loop strong vibration
            Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vib != null && vib.hasVibrator()) {
                activeVibrator = vib;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vib.vibrate(VibrationEffect.createWaveform(silentVibration, 0));
                } else {
                    vib.vibrate(silentVibration, 0);
                }
            }
        }
    }
}
