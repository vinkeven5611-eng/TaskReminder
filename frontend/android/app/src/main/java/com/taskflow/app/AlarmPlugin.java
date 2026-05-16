package com.taskflow.app;

import android.app.AlarmManager;
import android.app.DownloadManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void setAlarm(PluginCall call) {
        long timestamp = call.getLong("timestamp", 0L);
        String title = call.getString("title", "任務提醒");

        if (timestamp <= 0) {
            call.reject("Invalid timestamp");
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("title", title);

        int requestCode = (int) (timestamp % Integer.MAX_VALUE);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) { // Build.VERSION_CODES.M
            flags |= 0x04000000; // PendingIntent.FLAG_IMMUTABLE
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            flags
        );

        if (Build.VERSION.SDK_INT >= 31) { // Build.VERSION_CODES.S
            if (!alarmManager.canScheduleExactAlarms()) {
                call.reject("Exact alarm permission not granted.");
                return;
            }
        }

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            timestamp,
            pendingIntent
        );

        JSObject ret = new JSObject();
        ret.put("scheduled", true);
        ret.put("requestCode", requestCode);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        int requestCode = call.getInt("requestCode", -1);
        if (requestCode == -1) {
            call.reject("Invalid requestCode");
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) { // Build.VERSION_CODES.M
            flags |= 0x04000000; // PendingIntent.FLAG_IMMUTABLE
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            flags
        );

        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();

        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("URL is required");
            return;
        }

        Context context = getContext();
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle("TaskFlow Update");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);

        
        String fileName = "TaskFlow_Update.apk";
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

        final DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        final long downloadId = downloadManager.enqueue(request);

        BroadcastReceiver onComplete = new BroadcastReceiver() {
            public void onReceive(Context c, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (downloadId == id) {
                    File file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName);
                    Uri apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);

                    Intent installIntent = new Intent(Intent.ACTION_VIEW);
                    installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    
                    context.startActivity(installIntent);
                    context.unregisterReceiver(this);
                }
            }
        };

        if (Build.VERSION.SDK_INT >= 33) {
            context.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), 2); // RECEIVER_EXPORTED
        } else {
            context.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }

        call.resolve();
    }
}


