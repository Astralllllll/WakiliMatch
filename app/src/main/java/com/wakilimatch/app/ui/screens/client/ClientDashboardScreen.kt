package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.User
import com.wakilimatch.app.ui.components.AppScreen
import com.wakilimatch.app.ui.components.Tile
import com.wakilimatch.app.ui.components.TitleBar
import com.wakilimatch.app.ui.theme.TextPrimary
import com.wakilimatch.app.ui.theme.TextSecondary

@Composable
fun ClientDashboardScreen(
    currentUser: User,
    onMyCases: () -> Unit,
    onNewCase: () -> Unit,
    onSignOut: () -> Unit,
) {
    AppScreen {
        TitleBar(title = "Client Dashboard")
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text("Good to see you", fontSize = 12.sp, color = TextSecondary)
            Text(
                currentUser.fullName ?: currentUser.email,
                fontSize = 16.sp,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 16.dp),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Tile(label = "MY CASES", onClick = onMyCases, modifier = Modifier.weight(1f))
                Tile(label = "MY LAWYERS", dim = true, modifier = Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Tile(label = "NEW CASE", onClick = onNewCase, modifier = Modifier.weight(1f))
                Tile(label = "MESSAGES", dim = true, modifier = Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.weight(1f))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Tile(label = "SETTINGS", dim = true, modifier = Modifier.weight(1f))
                Tile(label = "LOG OUT", dark = true, onClick = onSignOut, modifier = Modifier.weight(1f))
            }
        }
    }
}
