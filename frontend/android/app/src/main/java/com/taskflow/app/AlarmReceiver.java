package com.taskflow.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "taskflow_alarms_v3";
    public static final String ACTION_DISMISS = "com.taskflow.app.ACTION_DISMISS";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        int notifId = intent.getIntExtra("notifId", 1);

        // ─── Handle dismiss (from notification action button) ─────────────
        if (ACTION_DISMISS.equals(intent.getAction())) {
            manager.cancel(notifId);
            // Stop sound/vibration via AlarmActivity static method
            AlarmActivity.stopAlarm();
            return;
        }

        String title = intent.getStringExtra("title");
        if (title == null) title = "任務提醒";

        // ─── Alarm sound URI ──────────────────────────────────────────────
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // ─── Notification Channel ─────────────────────────────────────────
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

        // ─── FullScreenIntent → AlarmActivity (stays until dismissed) ─────
        Intent alarmActivityIntent = new Intent(context, AlarmActivity.class);
        alarmActivityIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        alarmActivityIntent.putExtra("title", title);
        alarmActivityIntent.putExtra("notifId", notifId);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent fullScreenPI = PendingIntent.getActivity(
            context, notifId, alarmActivityIntent, flags
        );

        // ─── Dismiss action (from notification shade) ─────────────────────
        Intent dismissIntent = new Intent(context, AlarmReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS);
        dismissIntent.putExtra("notifId", notifId);
        PendingIntent dismissPI = PendingIntent.getBroadcast(context, notifId + 5000, dismissIntent, flags);

        // ─── Build notification ───────────────────────────────────────────
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ 任務鬧鐘響起")
            .setContentText(title)
            .setStyle(new NotificationCompat.BigTextStyle().bigText("📌 " + title + "\n\n請及時處理您的任務！"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSound(alarmUri)
            .setVibrate(new long[]{0, 400, 200, 400})
            .setFullScreenIntent(fullScreenPI, true)   // Launches AlarmActivity
            .setContentIntent(fullScreenPI)             // Tap notification → AlarmActivity
            .addAction(android.R.drawable.ic_delete, "✕ 關閉鬧鐘", dismissPI);

        manager.notify(notifId, builder.build());
    }
}
