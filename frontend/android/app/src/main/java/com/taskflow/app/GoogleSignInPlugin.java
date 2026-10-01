package com.taskflow.app;

import android.app.Activity;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "GoogleSignInPlugin")
public class GoogleSignInPlugin extends Plugin {

    // 與 Google Cloud Console 中的 Web Client ID 一致
    // （Android app 用 ID token 時，audience 必須是 Web Client ID）
    private static final String WEB_CLIENT_ID = "257438303289-5t37a514msdsi58m7kq6hv6hd7a90gj4.apps.googleusercontent.com";

    private GoogleSignInClient mGoogleSignInClient;
    private PluginCall savedCall;

    @Override
    public void load() {
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(WEB_CLIENT_ID)  // 必須用 Web Client ID 才能拿到 ID token
                .requestEmail()
                .build();
        mGoogleSignInClient = GoogleSignIn.getClient(getActivity(), gso);
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        savedCall = call;
        // 先登出確保每次都彈出帳號選擇器
        mGoogleSignInClient.signOut().addOnCompleteListener(task -> {
            Intent signInIntent = mGoogleSignInClient.getSignInIntent();
            startActivityForResult(call, signInIntent, "handleSignInResult");
        });
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            call.reject("Sign-In cancelled by user");
            return;
        }
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account.getIdToken();
            String email = account.getEmail();

            if (idToken == null) {
                call.reject("Failed to get ID token. Check Web Client ID configuration.");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", email);
            call.resolve(ret);
        } catch (ApiException e) {
            call.reject("Google Sign-In failed: " + e.getStatusCode(), String.valueOf(e.getStatusCode()));
        }
    }
}
