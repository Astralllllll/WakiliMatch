package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.Lawyer
import com.wakilimatch.app.data.User
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Lawyer's own profile view (brief B3's lawyer "Profile" tile), with an
 * edit entry point into LawyerOnboardingScreen (Deliverable 4, bug 1). */
@Composable
fun LawyerOwnProfileScreen(apiService: ApiService, currentUser: User, onBack: () -> Unit, onEdit: () -> Unit) {
    var profile by remember { mutableStateOf<Lawyer?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(currentUser.id) {
        try {
            val resp = withContext(Dispatchers.IO) { apiService.getLawyerProfile(currentUser.id) }
            if (resp.isSuccessful) profile = resp.body() else error = "Unable to load profile."
        } catch (e: Exception) {
            error = "Unable to load profile."
        }
    }

    AppScreen {
        TitleBar(title = "Profile", onBack = onBack, actionLabel = "Edit", onAction = onEdit)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            when {
                error != null -> Text(error!!, fontSize = 12.sp, color = ErrorRed)
                profile == null -> Text("Loading…", fontSize = 13.sp, color = Slate)
                else -> {
                    val p = profile!!
                    Text(p.full_name ?: currentUser.fullName ?: "Advocate", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Navy)
                    p.lsk_registration_number?.let { Text(it, fontSize = 12.sp, color = Slate, modifier = Modifier.padding(bottom = 10.dp)) }

                    val stats = buildList {
                        p.years_of_experience?.let { add(Stat("$it", "Years exp.")) }
                        p.previous_cases_handled?.let { add(Stat("$it", "Cases handled")) }
                        p.success_rate?.toDoubleOrNull()?.let { add(Stat("${it.toInt()}%", "Success rate")) }
                        p.average_rating?.toDoubleOrNull()?.let { add(Stat("%.1f★".format(it), "${p.total_reviews ?: 0} reviews")) }
                    }
                    StatTriplet(stats, modifier = Modifier.padding(bottom = 14.dp))

                    Text("ABOUT", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate)
                    Text(p.biography ?: "No biography added yet.", fontSize = 12.5.sp, color = Body, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))

                    Text("SPECIALISATIONS", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate, modifier = Modifier.padding(bottom = 6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        (p.specializations ?: "").split(",").map { it.trim() }.filter { it.isNotBlank() }.take(4).forEach { Tag(it) }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Row(modifier = Modifier.fillMaxWidth()) {
                        InfoCol("Qualifications", p.academic_qualifications, Modifier.weight(1f))
                        InfoCol("Courts", p.courts, Modifier.weight(1f))
                    }
                    Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                        InfoCol("Languages", p.languages, Modifier.weight(1f))
                        InfoCol("Fee guidance", p.price_guidance, Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoCol(label: String, value: String?, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate)
        Text(value ?: "—", fontSize = 12.sp, color = Navy, modifier = Modifier.padding(top = 2.dp))
    }
}
