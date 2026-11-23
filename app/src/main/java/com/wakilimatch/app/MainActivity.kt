package com.wakilimatch.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.User
import com.wakilimatch.app.ui.*

class MainActivity : ComponentActivity() {
    private val apiService = ApiService.create()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WakiliMatchApp(apiService = apiService)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WakiliMatchApp(apiService: ApiService) {
    var currentUser by remember { mutableStateOf<User?>(null) }
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Auth) }

    if (currentUser == null) {
        AuthScreen(
            apiService = apiService,
            onAuthSuccess = { user ->
                currentUser = user
                currentScreen = Screen.Dashboard
            }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("WakiliMatch", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text(
                                text = "Logged in as ${currentUser?.fullName ?: currentUser?.email} (${currentUser?.role})",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    },
                    actions = {
                        TextButton(
                            onClick = {
                                currentUser = null
                                currentScreen = Screen.Auth
                            }
                        ) {
                            Text("Sign Out")
                        }
                    }
                )
            },
            bottomBar = {
                if (currentScreen != Screen.SubmitIssue) {
                    NavigationBar {
                        NavigationBarItem(
                            selected = currentScreen == Screen.Dashboard,
                            onClick = { currentScreen = Screen.Dashboard },
                            icon = { Text("📋") },
                            label = { Text("My Cases") }
                        )
                        NavigationBarItem(
                            selected = currentScreen == Screen.LawyersList,
                            onClick = { currentScreen = Screen.LawyersList },
                            icon = { Text("⚖️") },
                            label = { Text("Lawyers") }
                        )
                    }
                }
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                when (currentScreen) {
                    Screen.Auth -> {
                        AuthScreen(
                            apiService = apiService,
                            onAuthSuccess = { user ->
                                currentUser = user
                                currentScreen = Screen.Dashboard
                            }
                        )
                    }
                    Screen.Dashboard -> {
                        DashboardScreen(
                            currentUser = currentUser!!,
                            apiService = apiService,
                            onCreateIssueClick = {
                                currentScreen = Screen.SubmitIssue
                            }
                        )
                    }
                    Screen.SubmitIssue -> {
                        SubmitIssueScreen(
                            currentUser = currentUser!!,
                            apiService = apiService,
                            onIssueSubmitted = {
                                currentScreen = Screen.Dashboard
                            },
                            onCancel = {
                                currentScreen = Screen.Dashboard
                            }
                        )
                    }
                    Screen.LawyersList -> {
                        LawyersListScreen(
                            apiService = apiService
                        )
                    }
                }
            }
        }
    }
}
