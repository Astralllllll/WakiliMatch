package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
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
import com.wakilimatch.app.ui.components.OutlineButton
import com.wakilimatch.app.ui.components.Tile
import com.wakilimatch.app.ui.components.TitleBar
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Shared split logic, reused by the dashboard's badge count and the
 * Inquiries screen - mirrors LawyerDashboard.jsx exactly (brief B5): a
 * raw-status 'pending' match (details_confirmed=false) is an unconfirmed
 * candidate the client hasn't committed to yet; 'requested' + confirmed is
 * an actual decision the lawyer owes; 'ongoing'/'completed' are real cases. */
fun splitLawyerCases(cases: List<LawyerCaseView>): LawyerCaseSplit {
    val unconfirmed = cases.filter { it.details_confirmed == false }
    val needsDecision = cases.filter { it.details_confirmed != false && it.status == "requested" }
    val ongoing = cases.filter { it.status == "ongoing" }
    val completed = cases.filter { it.status == "completed" }
    return LawyerCaseSplit(unconfirmed, needsDecision, ongoing, completed)
}

data class LawyerCaseSplit(
    val unconfirmedCandidates: List<LawyerCaseView>,
    val needsDecision: List<LawyerCaseView>,
    val ongoing: List<LawyerCaseView>,
    val completed: List<LawyerCaseView>,
) {
    val inquiriesCount get() = unconfirmedCandidates.size + needsDecision.size
}

@Composable
fun LawyerDashboardScreen(
    apiService: ApiService,
    currentUser: User,
    onInquiries: () -> Unit,
    onMyCases: () -> Unit,
    onProfile: () -> Unit,
    onCompleteProfile: () -> Unit,
    onSignOut: () -> Unit,
) {
    var split by remember { mutableStateOf<LawyerCaseSplit?>(null) }
    var profileIncomplete by remember { mutableStateOf(false) }

    LaunchedEffect(currentUser.id) {
        try {
            val resp = withContext(Dispatchers.IO) { apiService.getLawyerCases(currentUser.id) }
            split = splitLawyerCases(resp.cases)
        } catch (e: Exception) {
            split = LawyerCaseSplit(emptyList(), emptyList(), emptyList(), emptyList())
        }
        try {
            val profileResp = withContext(Dispatchers.IO) { apiService.getLawyerProfile(currentUser.id) }
            val p = if (profileResp.isSuccessful) profileResp.body() else null
            profileIncomplete = p?.biography.isNullOrBlank() || p?.specializations.isNullOrBlank()
        } catch (e: Exception) {
            profileIncomplete = false
        }
    }

    AppScreen {
        TitleBar(title = "Lawyer Dashboard")
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text("Advocate panel", fontSize = 12.sp, color = TextSecondary)
            Text(
                currentUser.fullName ?: currentUser.email,
                fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary,
                modifier = Modifier.padding(bottom = 16.dp),
            )

            if (profileIncomplete) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 14.dp)
                        .border(BorderStroke(1.dp, PrimaryLight), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                ) {
                    Text(
                        "Complete your profile to appear in matches",
                        fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    OutlineButton(text = "Complete profile", onClick = onCompleteProfile)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Tile(label = "INQUIRIES", badgeCount = split?.inquiriesCount, onClick = onInquiries, modifier = Modifier.weight(1f))
                Tile(label = "PROFILE", onClick = onProfile, modifier = Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Tile(label = "MY CASES", onClick = onMyCases, modifier = Modifier.weight(1f))
                Tile(label = "REPORTS", dim = true, modifier = Modifier.weight(1f))
            }

            split?.let { s ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 14.dp)
                        .border(BorderStroke(1.dp, Border), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                ) {
                    Text("QUICK STATS", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                    StatRow("New inquiries", "${s.inquiriesCount}")
                    StatRow("Ongoing cases", "${s.ongoing.size}")
                    StatRow("Completed", "${s.completed.size}")
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            com.wakilimatch.app.ui.components.OutlineButton(text = "Log out", onClick = onSignOut)
        }
    }
}

@Composable
private fun StatRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 11.sp, color = TextSecondary)
        Text(value, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
    }
}
