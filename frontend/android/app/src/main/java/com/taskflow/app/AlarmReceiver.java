package com.taskflow.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "taskflow_alarms";
    public static final String ACTION_DISMISS = "com.taskflow.app.ACTION_DISMISS";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        int notifId = intent.getIntExtra("notifId", 1);

        if (ACTION_DISMISS.equals(intent.getAction())) {
            manager.cancel(notifId);
            return;
        }

        String title = intent.getStringExtra("title");
        if (title == null) title = "任務提醒";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "TaskFlow 鬧鐘提醒",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setSound(
                android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI,
                new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            manager.createNotificationChannel(channel);
        }

        int currentNotifId = (int) System.currentTimeMillis();

        // Intent for the Close button
        Intent dismissIntent = new Intent(context, AlarmReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS);
        dismissIntent.putExtra("notifId", currentNotifId);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= 0x04000000; // PendingIntent.FLAG_IMMUTABLE
        }

        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
            context, 
            currentNotifId, 
            dismissIntent, 
            flags
        );


        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ 任務提醒")
            .setContentText(title)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI)
            .setVibrate(new long[]{0, 500, 300, 500})
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "關閉鬧鐘", dismissPendingIntent);

        manager.notify(currentNotifId, builder.build());
    }
}

