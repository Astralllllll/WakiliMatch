package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.LawyerCaseView
import com.wakilimatch.app.data.User
import com.wakilimatch.app.ui.components.AppScreen
import com.wakilimatch.app.ui.components.TitleBar
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun LawyerMyCasesScreen(
    apiService: ApiService,
    currentUser: User,
    onBack: () -> Unit,
    onOpenCase: (LawyerCaseView) -> Unit,
) {
    var split by remember { mutableStateOf<LawyerCaseSplit?>(null) }

    LaunchedEffect(currentUser.id) {
        try {
            val resp = withContext(Dispatchers.IO) { apiService.getLawyerCases(currentUser.id) }
            split = splitLawyerCases(resp.cases)
        } catch (e: Exception) {
            split = LawyerCaseSplit(emptyList(), emptyList(), emptyList(), emptyList())
        }
    }

    AppScreen {
        TitleBar(title = "My Cases")
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            val s = split
            if (s == null) {
                Text("Loading…", fontSize = 13.sp, color = Slate)
            } else {
                Text("ONGOING (${s.ongoing.size})", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate, modifier = Modifier.padding(bottom = 6.dp))
                if (s.ongoing.isEmpty()) {
                    Text("No ongoing cases yet.", fontSize = 12.sp, color = Slate, modifier = Modifier.padding(bottom = 16.dp))
                } else {
                    s.ongoing.forEach { c -> CaseRow(c, onClick = { onOpenCase(c) }) }
                    Spacer(modifier = Modifier.height(16.dp))
                }
                Text("COMPLETED (${s.completed.size})", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate, modifier = Modifier.padding(bottom = 6.dp))
                if (s.completed.isEmpty()) {
                    Text("Cases you finish will appear here with client ratings.", fontSize = 12.sp, color = Slate)
                } else {
                    s.completed.forEach { c -> CaseRow(c, onClick = null) }
                }
            }
        }
    }
}

@Composable
private fun CaseRow(c: LawyerCaseView, onClick: (() -> Unit)?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, BorderColor), RoundedCornerShape(10.dp))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(12.dp)
            .padding(bottom = 8.dp),
    ) {
        Text(c.issue_title ?: "Untitled case", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Navy)
        Text(
            listOfNotNull(c.legal_category, c.client_display_name?.let { "Client: $it" }).joinToString(" · "),
            fontSize = 10.5.sp, color = Slate, modifier = Modifier.padding(top = 2.dp),
        )
        if (c.rating != null) {
            Text("Rating: ${c.rating}★ (${c.review_count ?: 0} reviews)", fontSize = 10.5.sp, color = GoldText, modifier = Modifier.padding(top = 2.dp))
        }
    }
    Spacer(modifier = Modifier.height(8.dp))
}
