package com.wakilimatch.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.AppState
import com.wakilimatch.app.ui.nav.AppNavGraph
import com.wakilimatch.app.ui.theme.Background
import com.wakilimatch.app.ui.theme.WakiliMatchTheme

class MainActivity : ComponentActivity() {
    private val apiService = ApiService.create()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Dark theme throughout (brief's new palette) - status bar icons must
        // be light content so they stay visible against the near-black
        // background, on every OS version, not just API 35+'s forced
        // edge-to-edge default.
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        setContent {
            WakiliMatchTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = Background) {
                    val appState = remember { AppState() }
                    AppNavGraph(apiService = apiService, appState = appState)
                }
            }
        }
    }
}
