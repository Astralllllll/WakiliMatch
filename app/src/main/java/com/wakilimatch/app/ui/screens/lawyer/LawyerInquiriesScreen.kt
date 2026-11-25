package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.LawyerCaseView
import com.wakilimatch.app.data.User
import com.wakilimatch.app.ui.components.AIBadge
import com.wakilimatch.app.ui.components.AppScreen
import com.wakilimatch.app.ui.components.InquiryCard
import com.wakilimatch.app.ui.components.TitleBar
import com.wakilimatch.app.ui.theme.Slate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun LawyerInquiriesScreen(
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
        TitleBar(title = "Inquiries")
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            val s = split
            if (s == null) {
                Text("Loading…", fontSize = 13.sp, color = Slate)
            } else if (s.inquiriesCount == 0) {
                Text(
                    "No new inquiries right now. You'll appear here once a client's case matches your profile.",
                    fontSize = 12.sp, color = Slate,
                )
            } else {
                Row(modifier = Modifier.padding(bottom = 10.dp)) {
                    Text("${s.inquiriesCount} new inquiries", fontSize = 11.sp, color = Slate)
                    if (s.needsDecision.any { it.ai_summary != null }) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("·", fontSize = 11.sp, color = Slate)
                        Spacer(modifier = Modifier.width(6.dp))
                        AIBadge(text = "AI summaries ready", soft = true)
                    }
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(s.needsDecision) { c ->
                        InquiryCard(
                            title = c.issue_title ?: "Untitled case",
                            meta = listOfNotNull(c.jurisdiction, c.legal_category).joinToString(" · "),
                            summary = c.ai_summary,
                            isAiGenerated = false,
                            onClick = { onOpenCase(c) },
                        )
                    }
                    items(s.unconfirmedCandidates) { c ->
                        InquiryCard(
                            title = c.legal_category ?: "General",
                            meta = "Awaiting the client's final choice of lawyer",
                            summary = c.ai_summary,
                            isAiGenerated = false,
                            onClick = null,
                        )
                    }
                }
            }
        }
    }
}
