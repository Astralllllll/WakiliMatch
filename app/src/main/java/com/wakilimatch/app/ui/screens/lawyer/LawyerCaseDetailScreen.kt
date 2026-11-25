package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.*
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Full case view for a lawyer, reached only from "needs decision" cards
 * (client-confirmed) - privacy gating (brief B5) means an unconfirmed
 * candidate never reaches this screen at all; it has no action available. */
@Composable
fun LawyerCaseDetailScreen(
    apiService: ApiService,
    currentUser: User,
    initialCase: LawyerCaseView,
    onBack: () -> Unit,
) {
    var caseView by remember { mutableStateOf(initialCase) }
    var decisionLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val isDecisionLocked = caseView.status == "ongoing" || caseView.status == "declined" || caseView.status == "completed" || caseView.details_confirmed == false

    fun decide(decision: String) {
        decisionLoading = true
        error = null
        scope.launch {
            try {
                val resp = withContext(Dispatchers.IO) {
                    apiService.matchDecision(MatchDecisionRequest(caseView.match_id, currentUser.id, decision))
                }
                if (resp.isSuccessful) {
                    caseView = caseView.copy(status = if (decision == "accept") "ongoing" else "declined")
                } else {
                    error = "Unable to update case decision."
                }
            } catch (e: Exception) {
                error = "Unable to update case decision."
            } finally {
                decisionLoading = false
            }
        }
    }

    AppScreen {
        TitleBar(title = "Case Detail", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
            ) {
            Text(caseView.issue_title ?: "Untitled case", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Navy)
            Spacer(modifier = Modifier.height(6.dp))
            Text("Category: ${caseView.legal_category ?: "—"}", fontSize = 12.sp, color = Slate)
            if (caseView.details_confirmed) {
                Text("Jurisdiction: ${caseView.jurisdiction ?: "—"}", fontSize = 12.sp, color = Slate)
                Text("Urgency: ${caseView.urgency_level ?: "—"}", fontSize = 12.sp, color = Slate)
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text("CASE DETAILS", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate)
            if (caseView.details_confirmed) {
                Text(caseView.issue_description ?: "No description provided.", fontSize = 13.sp, color = Body, modifier = Modifier.padding(top = 6.dp))
            } else {
                SummaryBox(
                    title = null,
                    body = "Full details are hidden until the client confirms you specifically for this case." +
                        (caseView.ai_summary?.let { "\n\n$it" } ?: ""),
                    modifier = Modifier.padding(top = 6.dp),
                )
            }

            if (caseView.details_confirmed) {
                Spacer(modifier = Modifier.height(12.dp))
                Text("CLIENT CONTACT", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate)
                Text("Name: ${caseView.client_display_name ?: "—"}", fontSize = 12.sp, color = Body, modifier = Modifier.padding(top = 4.dp))
                Text("Email: ${caseView.client_email ?: "—"}", fontSize = 12.sp, color = Body)
            }

            if (error != null) Text(error!!, fontSize = 12.sp, color = ErrorRed, modifier = Modifier.padding(top = 10.dp))
            } // end scrollable content column

            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PrimaryButton(
                    text = if (caseView.status == "ongoing") "Accepted" else "Accept case",
                    onClick = { decide("accept") },
                    enabled = !decisionLoading && !isDecisionLocked,
                    modifier = Modifier.weight(1f),
                )
                OutlineButton(
                    text = if (caseView.status == "declined") "Rejected" else "Reject case",
                    onClick = { decide("reject") },
                    enabled = !decisionLoading && !isDecisionLocked,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
