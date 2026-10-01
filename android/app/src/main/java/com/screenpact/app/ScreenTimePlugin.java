package com.screenpact.app;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(name = "ScreenTime")
public class ScreenTimePlugin extends Plugin {

    private static final String PREFS_NAME = "screenpact_collector";
    private static final String KEY_API_BASE_URL = "api_base_url";
    private static final String KEY_DEVICE_ID = "device_id";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    private static final String DEFAULT_API_BASE_URL = "http://10.0.2.2:8787";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private String apiBaseUrl() {
        String value = prefs().getString(KEY_API_BASE_URL, DEFAULT_API_BASE_URL);
        if (value == null || value.trim().isEmpty()) return DEFAULT_API_BASE_URL;
        return value.trim();
    }

    private String getDeviceId() {
        return prefs().getString(KEY_DEVICE_ID, null);
    }

    private String getDeviceToken() {
        return prefs().getString(KEY_DEVICE_TOKEN, null);
    }

    private void setApiBaseUrlInternal(@NonNull String apiBaseUrl) {
        prefs().edit().putString(KEY_API_BASE_URL, apiBaseUrl).apply();
    }

    private void setPairingInternal(@NonNull String deviceId, @NonNull String deviceToken) {
        prefs().edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_TOKEN, deviceToken)
            .apply();
    }

    private void clearPairingInternal() {
        prefs().edit().remove(KEY_DEVICE_ID).remove(KEY_DEVICE_TOKEN).apply();
    }

    private boolean hasUsageStatsPermission() {
        Context context = getContext();
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;

        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName());
        } else {
            mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName());
        }

        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private JSONObject doRequest(String method, String path, JSONObject body, boolean useDeviceToken) throws Exception {
        URL url = new URL(apiBaseUrl() + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");

        if (useDeviceToken) {
            String token = getDeviceToken();
            if (token == null || token.isEmpty()) {
                throw new IllegalStateException("Device token is missing. Pair this device first.");
            }
            connection.setRequestProperty("X-Device-Token", token);
        }

        if (body != null) {
            connection.setDoOutput(true);
            try (OutputStream os = connection.getOutputStream();
                 BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(os, StandardCharsets.UTF_8))) {
                writer.write(body.toString());
                writer.flush();
            }
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
        StringBuilder text = new StringBuilder();

        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    text.append(line);
                }
            }
        }

        JSONObject response = text.length() > 0 ? new JSONObject(text.toString()) : new JSONObject();
        response.put("httpStatus", status);

        if (status < 200 || status >= 300) {
            String error = response.optString("error", "Request failed");
            throw new IllegalStateException(error + " (" + status + ")");
        }

        return response;
    }

    private List<UsageStats> queryUsageStatsToday() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            return Collections.emptyList();
        }

        long now = System.currentTimeMillis();
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        calendar.setTimeInMillis(now);
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0);
        calendar.set(java.util.Calendar.MINUTE, 0);
        calendar.set(java.util.Calendar.SECOND, 0);
        calendar.set(java.util.Calendar.MILLISECOND, 0);
        long start = calendar.getTimeInMillis();

        List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now);
        return stats != null ? stats : Collections.emptyList();
    }

    private JSONObject buildTodayUsagePayload() throws JSONException {
        List<UsageStats> stats = queryUsageStatsToday();
        Map<String, Long> appMs = new HashMap<>();

        for (UsageStats item : stats) {
            long foregroundMs = item.getTotalTimeInForeground();
            if (foregroundMs <= 0) continue;
            String packageName = item.getPackageName();
            if (packageName == null || packageName.trim().isEmpty()) continue;
            appMs.put(packageName, appMs.getOrDefault(packageName, 0L) + foregroundMs);
        }

        List<Map.Entry<String, Long>> sorted = new ArrayList<>(appMs.entrySet());
        sorted.sort(Comparator.comparingLong(Map.Entry<String, Long>::getValue).reversed());

        int totalMinutes = 0;
        JSONArray apps = new JSONArray();
        int limit = Math.min(8, sorted.size());

        for (int i = 0; i < limit; i++) {
            Map.Entry<String, Long> entry = sorted.get(i);
            int minutes = (int) Math.round(entry.getValue() / 60000.0);
            if (minutes <= 0) continue;
            totalMinutes += minutes;

            JSONObject row = new JSONObject();
            row.put("name", entry.getKey());
            row.put("icon", "📱");
            row.put("minutes", minutes);
            apps.put(row);
        }

        if (totalMinutes > 1440) totalMinutes = 1440;

        JSONObject topApp = new JSONObject();
        if (apps.length() > 0) {
            JSONObject first = apps.getJSONObject(0);
            topApp.put("name", first.optString("name", "Unknown"));
            topApp.put("icon", first.optString("icon", "📱"));
            topApp.put("minutes", first.optInt("minutes", 0));
        } else {
            topApp.put("name", "Unknown");
            topApp.put("icon", "📱");
            topApp.put("minutes", 0);
        }

        JSONObject payload = new JSONObject();
        payload.put("totalMinutes", totalMinutes);
        payload.put("topApp", topApp);
        payload.put("apps", apps);
        return payload;
    }

    @PluginMethod
    public void setApiBaseUrl(PluginCall call) {
        String apiBaseUrl = call.getString("apiBaseUrl");
        if (apiBaseUrl == null || apiBaseUrl.trim().isEmpty()) {
            call.reject("apiBaseUrl is required");
            return;
        }

        setApiBaseUrlInternal(apiBaseUrl.trim());

        JSObject result = new JSObject();
        result.put("apiBaseUrl", apiBaseUrl.trim());
        call.resolve(result);
    }

    @PluginMethod
    public void getCollectorState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("apiBaseUrl", apiBaseUrl());
        result.put("deviceId", getDeviceId());
        result.put("isPaired", getDeviceToken() != null);
        result.put("hasUsageAccess", hasUsageStatsPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void clearPairing(PluginCall call) {
        clearPairingInternal();
        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void checkUsageAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasUsageStatsPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }

    @PluginMethod
    public void consumePairingCode(PluginCall call) {
        String code = call.getString("code", "").trim();
        String name = call.getString("name", Build.MODEL != null ? Build.MODEL : "Android device");
        String platform = call.getString("platform", "android");

        if (code.isEmpty()) {
            call.reject("code is required");
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("code", code.toUpperCase(Locale.US));
            body.put("name", name);
            body.put("platform", platform);

            JSONObject response = doRequest("POST", "/api/devices/pairing/consume", body, false);
            JSONObject device = response.optJSONObject("device");
            String token = response.optString("deviceToken", "");
            String deviceId = device != null ? String.valueOf(device.opt("id")) : null;

            if (token.isEmpty() || deviceId == null) {
                call.reject("Pairing response missing device token or device id");
                return;
            }

            setPairingInternal(deviceId, token);

            JSObject result = new JSObject();
            result.put("deviceId", deviceId);
            result.put("paired", true);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject(ex.getMessage());
        }
    }

    @PluginMethod
    public void updatePermissionStatus(PluginCall call) {
        String status = call.getString("status", "").trim().toLowerCase(Locale.US);
        String deviceId = getDeviceId();

        if (deviceId == null || deviceId.isEmpty()) {
            call.reject("Device is not paired");
            return;
        }

        if (!(status.equals("unknown") || status.equals("requested") || status.equals("granted") || status.equals("denied") || status.equals("restricted"))) {
            call.reject("Invalid status");
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("status", status);
            doRequest("POST", "/api/devices/" + deviceId + "/permission", body, true);

            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("status", status);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject(ex.getMessage());
        }
    }

    @PluginMethod
    public void sendSyncHeartbeat(PluginCall call) {
        String deviceId = getDeviceId();

        if (deviceId == null || deviceId.isEmpty()) {
            call.reject("Device is not paired");
            return;
        }

        try {
            JSONObject response = doRequest("POST", "/api/devices/" + deviceId + "/sync-heartbeat", new JSONObject(), true);
            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("lastSyncedAt", response.optString("lastSyncedAt", null));
            call.resolve(result);
        } catch (Exception ex) {
            call.reject(ex.getMessage());
        }
    }

    @PluginMethod
    public void syncTodayUsage(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Usage access is not granted");
            return;
        }

        try {
            JSONObject payload = buildTodayUsagePayload();
            JSONObject response = doRequest("POST", "/api/usage/sync", payload, true);

            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("synced", response.optBoolean("synced", false));
            result.put("date", response.optString("date", null));
            result.put("stored", response.optJSONObject("stored"));
            call.resolve(result);
        } catch (Exception ex) {
            call.reject(ex.getMessage());
        }
    }
}
