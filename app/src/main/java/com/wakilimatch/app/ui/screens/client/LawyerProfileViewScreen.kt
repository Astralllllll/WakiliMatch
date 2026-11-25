package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.*
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LawyerProfileViewScreen(
    apiService: ApiService,
    match: MatchResult,
    caseId: String?,
    onBack: () -> Unit,
    onConfirmed: () -> Unit,
    onShowToast: (String) -> Unit,
) {
    var pastCases by remember { mutableStateOf<List<PastCase>?>(null) }
    var pastCasesError by remember { mutableStateOf(false) }
    var confirming by remember { mutableStateOf(false) }
    var confirmError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(match.lawyer_id) {
        try {
            val resp = withContext(Dispatchers.IO) { apiService.getPastCases(match.lawyer_id) }
            pastCases = resp.pastCases
        } catch (e: Exception) {
            pastCasesError = true
        }
    }

    val stats = buildList {
        match.previous_cases_handled?.let { add(Stat("$it", "CASES")) }
        match.years_of_experience?.takeIf { it > 0 }?.let { add(Stat("$it", "YRS EXP")) }
        match.average_rating?.toDoubleOrNull()?.let { add(Stat("%.1f★".format(it), "RATING")) }
    }

    AppScreen {
        TitleBar(title = "Lawyer Profile", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
            ) {
            Box(
                modifier = Modifier.size(60.dp).align(Alignment.CenterHorizontally)
                    .background(Navy, CircleShape)
                    .clearAndSetSemantics {},
                contentAlignment = Alignment.Center,
            ) {
                Text(initialsFor(match.full_name), color = White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Text(
                match.full_name ?: "Advocate",
                fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Navy,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp),
            )
            match.lsk_registration_number?.let {
                Text("LSK #$it", fontSize = 12.sp, color = Slate, modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 2.dp, bottom = 8.dp))
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 8.dp)) {
                (match.specializations ?: "").split(",").map { it.trim() }.filter { it.isNotBlank() }.take(3).forEach { Tag(it) }
                Tag("✓ LSK Verified", TagVariant.Top)
            }

            StatTriplet(stats, modifier = Modifier.padding(vertical = 8.dp))

            Text("ABOUT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate)
            Text(match.biography ?: "No biography provided.", fontSize = 12.5.sp, color = Body, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                InfoColumn("QUALIFICATIONS", match.academic_qualifications, Modifier.weight(1f))
                InfoColumn("COURTS", match.courts, Modifier.weight(1f))
            }
            Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp)) {
                InfoColumn("LANGUAGES", match.languages, Modifier.weight(1f))
                InfoColumn("FEE GUIDANCE", match.price_guidance, Modifier.weight(1f))
            }

            Text("CASE HISTORY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate)
            when {
                pastCasesError -> Text("Case history is unavailable right now.", fontSize = 11.sp, color = Slate, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))
                pastCases == null -> Text("Loading case history…", fontSize = 11.sp, color = Slate, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))
                pastCases!!.isEmpty() -> Text("No case history recorded yet.", fontSize = 11.sp, color = Slate, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))
                else -> Column(modifier = Modifier.padding(bottom = 12.dp)) {
                    pastCases!!.forEach { c ->
                        HistoryItem(
                            title = "${c.case_type} · ${c.jurisdiction}",
                            detail = c.case_year.toString(),
                            outcome = c.outcome_tag?.let { tag -> Outcome.entries.find { it.name.equals(tag, ignoreCase = true) } },
                        )
                    }
                }
            }
            } // end scrollable content column

            Spacer(modifier = Modifier.height(12.dp))

            SummaryBox(title = "Select ${match.full_name ?: "this lawyer"}", body = "They will receive your full case details and contact you within 24 hrs.")
            if (confirmError != null) Text(confirmError!!, fontSize = 12.sp, color = ErrorRed, modifier = Modifier.padding(top = 6.dp))

            PrimaryButton(
                text = if (confirming) "Confirming…" else "Confirm selection",
                loading = confirming,
                onClick = {
                    if (caseId == null) {
                        confirmError = "Unable to select this lawyer right now. Missing case details."
                        return@PrimaryButton
                    }
                    confirming = true
                    confirmError = null
                    scope.launch {
                        try {
                            val resp = withContext(Dispatchers.IO) {
                                apiService.selectLawyer(SelectLawyerRequest(caseId, match.lawyer_id))
                            }
                            if (resp.isSuccessful) {
                                onShowToast("Selection confirmed — ${match.full_name} will be in touch within 24 hrs.")
                                onConfirmed()
                            } else {
                                confirmError = "Unable to complete lawyer selection. Please try again."
                            }
                        } catch (e: Exception) {
                            confirmError = "Unable to complete lawyer selection. Please try again."
                        } finally {
                            confirming = false
                        }
                    }
                },
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

@Composable
private fun InfoColumn(label: String, value: String?, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate)
        Text(value ?: "—", fontSize = 12.sp, color = Navy, modifier = Modifier.padding(top = 2.dp))
    }
}

private fun initialsFor(name: String?): String {
    if (name.isNullOrBlank()) return "LM"
    val parts = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return when {
        parts.isEmpty() -> "LM"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> "${parts.first()[0]}${parts.last()[0]}".uppercase()
    }
}
