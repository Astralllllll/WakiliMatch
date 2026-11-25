package com.wakilimatch.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.AppState
import com.wakilimatch.app.ui.nav.AppNavGraph
import com.wakilimatch.app.ui.theme.WakiliMatchTheme
import com.wakilimatch.app.ui.theme.White

class MainActivity : ComponentActivity() {
    private val apiService = ApiService.create()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WakiliMatchTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = White) {
                    val appState = remember { AppState() }
                    AppNavGraph(apiService = apiService, appState = appState)
                }
            }
        }
    }
}
