package com.hania360.flight;

import android.app.Activity;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;

import java.util.ArrayList;
import java.util.Locale;
import org.json.JSONObject;

/**
 * Native shell for HaniaFlight. It shows the game from flight.hania360.com in a full-screen WebView, so the app
 * opens at once and the game keeps updating from the web. The page's service worker makes it work offline after
 * the first run. A small bridge gives the page the device's text-to-speech voice, which WebView lacks.
 */
public class MainActivity extends Activity {
    private static final String HOST = "flight.hania360.com";
    private static final String URL = "https://" + HOST + "/";

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean voiceReady;

    /* game controller state, passed to the page as a standard pad (WebView has no Gamepad API) */
    private final float[] pad = new float[6];
    private int padButtons;
    private long padSent;

    /* voice commands: the phone's speech recogniser, in Hebrew; results go back to the page as text */
    private SpeechRecognizer recognizer;
    private boolean listenAfterGrant;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0C1114);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " HaniaFlightApp");

        web.addJavascriptInterface(new Bridge(), "HFNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost()) || "file".equals(uri.getScheme())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) view.loadUrl("file:///android_asset/offline.html");
            }
        });

        tts = new TextToSpeech(getApplicationContext(), status -> {
            if (status != TextToSpeech.SUCCESS) return;
            Locale hebrew = new Locale("he", "IL");
            if (tts.isLanguageAvailable(hebrew) >= TextToSpeech.LANG_AVAILABLE) {
                tts.setLanguage(hebrew);
                voiceReady = true;
            }
        });
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String id) {
            }

            @Override
            public void onDone(String id) {
                spoke();
            }

            @Override
            public void onError(String id) {
                spoke();
            }
        });

        // Android 13+ delivers Back through a callback (and, for apps targeting Android 16, no longer calls onBackPressed)
        if (Build.VERSION.SDK_INT >= 33)
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);

        if (state == null) web.loadUrl(URL);
        else web.restoreState(state);
        immersive();
    }

    /** Tells the page that a radio call has finished. */
    private void spoke() {
        runOnUiThread(() -> web.evaluateJavascript("window.__hfSpoke&&window.__hfSpoke()", null));
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) immersive();
    }

    private static boolean fromPad(int source) {
        return (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
                || (source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD;
    }

    /** Standard-pad button index for an Android key code, or -1. */
    private static int padIndex(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_BUTTON_A: return 0;
            case KeyEvent.KEYCODE_BUTTON_B: return 1;
            case KeyEvent.KEYCODE_BUTTON_X: return 2;
            case KeyEvent.KEYCODE_BUTTON_Y: return 3;
            case KeyEvent.KEYCODE_BUTTON_L1: return 4;
            case KeyEvent.KEYCODE_BUTTON_R1: return 5;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
            case KeyEvent.KEYCODE_BUTTON_START: return 9;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
            case KeyEvent.KEYCODE_DPAD_UP: return 12;
            case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
            case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
            default: return -1;
        }
    }

    private void sendPad(boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - padSent < 12) return;
        padSent = now;
        String js = String.format(Locale.US, "window.__hfPad&&window.__hfPad(%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%d)",
                pad[0], pad[1], pad[2], pad[3], pad[4], pad[5], padButtons);
        web.evaluateJavascript(js, null);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        if (fromPad(e.getSource()) && e.getAction() == MotionEvent.ACTION_MOVE) {
            pad[0] = e.getAxisValue(MotionEvent.AXIS_X);
            pad[1] = e.getAxisValue(MotionEvent.AXIS_Y);
            pad[2] = e.getAxisValue(MotionEvent.AXIS_Z);
            pad[3] = e.getAxisValue(MotionEvent.AXIS_RZ);
            pad[4] = Math.max(e.getAxisValue(MotionEvent.AXIS_LTRIGGER), e.getAxisValue(MotionEvent.AXIS_BRAKE));
            pad[5] = Math.max(e.getAxisValue(MotionEvent.AXIS_RTRIGGER), e.getAxisValue(MotionEvent.AXIS_GAS));
            float hx = e.getAxisValue(MotionEvent.AXIS_HAT_X), hy = e.getAxisValue(MotionEvent.AXIS_HAT_Y);
            int hat = (hy < -0.5f ? 1 << 12 : 0) | (hy > 0.5f ? 1 << 13 : 0) | (hx < -0.5f ? 1 << 14 : 0) | (hx > 0.5f ? 1 << 15 : 0);
            int before = padButtons;
            padButtons = (padButtons & ~(0xF << 12)) | hat;
            sendPad(before != padButtons);
            return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int i = padIndex(e.getKeyCode());
        if (i >= 0 && fromPad(e.getSource())) {
            if (e.getAction() == KeyEvent.ACTION_DOWN) padButtons |= 1 << i;
            else if (e.getAction() == KeyEvent.ACTION_UP) padButtons &= ~(1 << i);
            sendPad(true);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    private void heard(String text) {
        String js = "window.__hfHeard&&window.__hfHeard(" + JSONObject.quote(text == null ? "" : text) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void startListening() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            listenAfterGrant = true;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 7);
            return;
        }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onResults(Bundle b) {
                    ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    heard(r == null ? "" : String.join("\n", r));
                }
                @Override public void onError(int error) { heard(""); }
                @Override public void onReadyForSpeech(Bundle b) { }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float v) { }
                @Override public void onBufferReceived(byte[] bytes) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onPartialResults(Bundle b) { }
                @Override public void onEvent(int t, Bundle b) { }
            });
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "he-IL");
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        recognizer.startListening(i);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code != 7) return;
        boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (ok && listenAfterGrant) startListening();
        else heard("");
        listenAfterGrant = false;
    }

    /** Back pauses a flight (the page handles it); from the briefing it leaves the app. */
    @Override
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        web.evaluateJavascript("!!(window.__hfBack&&window.__hfBack())", handled -> {
            if (!"true".equals(handled)) moveTaskToBack(true);
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) tts.stop();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        immersive();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        if (recognizer != null) recognizer.destroy();
        web.destroy();
        super.onDestroy();
    }

    /** Methods the game page can call as window.HFNative. Only our own site is ever loaded in this WebView. */
    private final class Bridge {
        @JavascriptInterface
        public boolean hasVoice() {
            return voiceReady;
        }

        @JavascriptInterface
        public void speak(String text, float pitch, float rate) {
            if (!voiceReady) return;
            tts.setPitch(pitch);
            tts.setSpeechRate(rate);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "radio");
        }

        @JavascriptInterface
        public boolean canListen() {
            return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
        }

        @JavascriptInterface
        public void listen() {
            runOnUiThread(MainActivity.this::startListening);
        }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(() -> { if (recognizer != null) recognizer.cancel(); });
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null) tts.stop();
        }
    }
}
