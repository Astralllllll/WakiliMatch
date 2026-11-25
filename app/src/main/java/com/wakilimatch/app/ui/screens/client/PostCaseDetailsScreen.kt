package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.*
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PostCaseDetailsScreen(
    apiService: ApiService,
    currentUser: User,
    caseState: CaseState,
    onBack: () -> Unit,
    onSubmitted: () -> Unit,
) {
    var descriptionError by remember { mutableStateOf<String?>(null) }
    var urgencyError by remember { mutableStateOf<String?>(null) }
    var submitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun submit() {
        descriptionError = when {
            caseState.description.isBlank() -> "Please describe your case."
            caseState.description.trim().length < 50 -> "Please provide more detail — at least 50 characters."
            else -> null
        }
        urgencyError = if (caseState.urgencyLevel.isBlank()) "Select an urgency level." else null
        if (descriptionError != null || urgencyError != null) return

        submitting = true
        submitError = null
        scope.launch {
            try {
                val budgetRange = if (caseState.budgetMin.isNotBlank() || caseState.budgetMax.isNotBlank()) {
                    "KES ${caseState.budgetMin.ifBlank { "0" }} - ${caseState.budgetMax.ifBlank { "0" }}"
                } else null

                val issueResp = withContext(Dispatchers.IO) {
                    apiService.createIssue(
                        CreateIssueRequest(
                            client_id = currentUser.id,
                            issue_title = caseState.title.trim(),
                            issue_description = caseState.description.trim(),
                            legal_category = caseState.legalCategory.ifBlank { null },
                            jurisdiction = caseState.jurisdiction.ifBlank { null },
                            urgency_level = caseState.urgencyLevel.ifBlank { null },
                            budget_range = budgetRange,
                            budget_min = caseState.budgetMin.toDoubleOrNull(),
                            budget_max = caseState.budgetMax.toDoubleOrNull(),
                        ),
                    )
                }
                val issueId = issueResp.body()?.issue?.issue_id
                if (!issueResp.isSuccessful || issueId == null) {
                    submitError = "Failed to submit your case. Please try again."
                    return@launch
                }

                val genResp = withContext(Dispatchers.IO) {
                    apiService.generateMatches(
                        GenerateMatchesRequest(
                            client_id = currentUser.id,
                            issue_id = issueId,
                            issue_text = "${caseState.title}. ${caseState.description}",
                        ),
                    )
                }

                caseState.caseId = issueId
                caseState.matches = genResp.matches
                caseState.status = genResp.status
                caseState.message = genResp.message
                caseState.exampleQueries = genResp.example_queries
                caseState.xai = genResp.xai
                onSubmitted()
            } catch (e: Exception) {
                submitError = "Failed to submit your case. Please try again."
            } finally {
                submitting = false
            }
        }
    }

    AppScreen {
        TitleBar(title = "Post a Case", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            StepDots(current = 3, modifier = Modifier.padding(bottom = 16.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
            ) {
            Field(
                label = "Case description *",
                hint = "Include relevant background, what outcome you need, and any key dates. More detail improves your matches.",
                error = descriptionError,
            ) {
                AppTextField(value = caseState.description, onValueChange = { caseState.description = it }, singleLine = false, minLines = 4)
            }

            Spacer(modifier = Modifier.height(16.dp))
            Field(label = "Urgency level *", error = urgencyError) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    URGENCY_LEVELS.forEach { u ->
                        val selected = caseState.urgencyLevel == u.value
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (selected) Ice else White, RoundedCornerShape(8.dp))
                                .border(BorderStroke(1.dp, if (selected) Navy else BorderStrong), RoundedCornerShape(8.dp))
                                .clickable { caseState.urgencyLevel = u.value }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(u.label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Navy else Body)
                                Text(u.description, fontSize = 11.sp, color = Slate)
                            }
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .background(if (selected) Navy else White, CircleShape)
                                    .border(BorderStroke(2.dp, if (selected) Navy else BorderStrong), CircleShape),
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Field(label = "Budget range (KES)", hint = "Optional. Helps lawyers assess whether they can assist within your means.") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppTextField(value = caseState.budgetMin, onValueChange = { caseState.budgetMin = it }, placeholder = "Min", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                    AppTextField(value = caseState.budgetMax, onValueChange = { caseState.budgetMax = it }, placeholder = "Max", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                }
            }

            Text(
                "Details hidden from lawyers until you select one.",
                fontSize = 10.5.sp,
                color = Slate,
                modifier = Modifier
                    .padding(top = 12.dp)
                    .border(BorderStroke(1.dp, BorderStrong), RoundedCornerShape(6.dp))
                    .padding(8.dp),
            )

            if (submitError != null) {
                Text(submitError!!, fontSize = 12.sp, color = ErrorRed, modifier = Modifier.padding(top = 8.dp))
            }
            } // end scrollable content column

            Spacer(modifier = Modifier.height(12.dp))
            PrimaryButton(text = "Find matches →", onClick = ::submit, loading = submitting)
        }
    }
}
