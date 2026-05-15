package com.taskflow.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native plugins before super.onCreate
        registerPlugin(AlarmPlugin.class);
        
        super.onCreate(savedInstanceState);
        
        // Custom WebViewClient to handle intent:// schemes
        this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                
                if (url.startsWith("intent://") || url.startsWith("intent:#Intent")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            // Fix EXTRA_DAYS: convert int to ArrayList<Integer> for SET_ALARM
                            if ("android.intent.action.SET_ALARM".equals(intent.getAction())) {
                                int dayInt = intent.getIntExtra("android.intent.extra.alarm.DAYS", -1);
                                if (dayInt != -1) {
                                    intent.removeExtra("android.intent.extra.alarm.DAYS");
                                    ArrayList<Integer> days = new ArrayList<>();
                                    days.add(dayInt);
                                    intent.putIntegerArrayListExtra("android.intent.extra.alarm.DAYS", days);
                                }
                            }
                            startActivity(intent);
                            return true;
                        }
                    } catch (Exception e) {
                        return false;
                    }
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }
}

