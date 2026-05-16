package com.taskflow.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "taskflow_alarms_v2";
    private static final String CURRENT_VERSION = "3.6";

    public static final String ACTION_DISMISS = "com.taskflow.app.ACTION_DISMISS";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        int notifId = intent.getIntExtra("notifId", 1);

        if (ACTION_DISMISS.equals(intent.getAction())) {
            manager.cancel(notifId);
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) {
                vibrator.cancel();
            }
            return;
        }


        String title = intent.getStringExtra("title");
        if (title == null) title = "任務提醒";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "TaskFlow 任務鬧鐘",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("用於發送定時任務的鬧鐘提醒");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            
            // Use RingtoneManager for more reliable sound
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
                
            channel.setSound(alarmUri, audioAttributes);
            manager.createNotificationChannel(channel);
        }

        int currentNotifId = intent.getIntExtra("notifId", (int) System.currentTimeMillis());

        // Intent for the Close button
        Intent dismissIntent = new Intent(context, AlarmReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS);
        dismissIntent.putExtra("notifId", currentNotifId);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) { // M
            flags |= 0x04000000; // FLAG_IMMUTABLE
        }

        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
            context, 
            currentNotifId, 
            dismissIntent, 
            flags
        );

        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) {
            alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        // Detect Ringer Mode
        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        boolean isSilent = audioManager.getRingerMode() != AudioManager.RINGER_MODE_NORMAL;

        // Pattern for silent mode (Very long and rhythmic)
        long[] silentVibration = {0, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400};
        // Pattern for normal mode (Standard)
        long[] normalVibration = {0, 500, 300, 500};

        long[] selectedPattern = isSilent ? silentVibration : normalVibration;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(isSilent ? "🚨 任務提醒 (靜音模式)" : "⏰ 任務鬧鐘響起")
            .setContentText(title)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(title + "\n\n請及時處理您的任務！"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSound(isSilent ? null : alarmUri) // No notification sound if silent (Vibrator handles it)
            .setVibrate(selectedPattern)
            .setFullScreenIntent(dismissPendingIntent, true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "【 點擊關閉鬧鐘 】", dismissPendingIntent);

        manager.notify(currentNotifId, builder.build());

        // If silent, also trigger a manual Vibrator for extra persistence on some devices
        if (isSilent) {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(silentVibration, -1));
                } else {
                    vibrator.vibrate(silentVibration, -1);
                }
            }
        }



    }
}


