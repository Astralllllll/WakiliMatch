package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.Issue
import com.wakilimatch.app.data.User
import com.wakilimatch.app.ui.components.AppScreen
import com.wakilimatch.app.ui.components.TitleBar
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun MyCasesScreen(apiService: ApiService, currentUser: User, onBack: () -> Unit) {
    var issues by remember { mutableStateOf<List<Issue>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(currentUser.id) {
        try {
            val resp = withContext(Dispatchers.IO) { apiService.getClientIssues(currentUser.id) }
            issues = resp.issues ?: emptyList()
        } catch (e: Exception) {
            error = e.localizedMessage ?: "Unable to load your case details."
        } finally {
            loading = false
        }
    }

    AppScreen {
        TitleBar(title = "My Cases", onBack = onBack)
        Box(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            when {
                loading -> Text("Loading your cases…", fontSize = 13.sp, color = TextSecondary)
                error != null -> Text(error!!, fontSize = 12.sp, color = Error)
                issues.isEmpty() -> Text("You have not posted any case details yet.", fontSize = 13.sp, color = TextSecondary)
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(issues) { issue -> CaseRow(issue) }
                }
            }
        }
    }
}

@Composable
private fun CaseRow(issue: Issue) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, Border), RoundedCornerShape(10.dp))
            .padding(14.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
            Text(issue.issue_title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.weight(1f))
            Text((issue.match_status ?: "pending").uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = PrimaryLight)
        }
        Text(issue.issue_description, fontSize = 12.sp, color = TextPrimary, modifier = Modifier.padding(top = 8.dp), maxLines = 3)
        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Category: ${issue.legal_category ?: "—"}", fontSize = 11.sp, color = TextSecondary)
            if (issue.lawyer_name != null) Text("Lawyer: ${issue.lawyer_name}", fontSize = 11.sp, color = TextSecondary)
        }
    }
}
