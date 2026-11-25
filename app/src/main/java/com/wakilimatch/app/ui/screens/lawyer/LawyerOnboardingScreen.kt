package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.*
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.ErrorRed
import com.wakilimatch.app.ui.theme.Navy
import com.wakilimatch.app.ui.theme.Slate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val BIOGRAPHY_MIN = 50
private const val BIOGRAPHY_MAX = 1000

/** Lawyer onboarding / edit-profile screen (Deliverable 4, bug 1). Android
 * had no way for a lawyer to create or edit their own profile - this screen
 * closes that gap, mirroring the web app's LawyerOnboarding.jsx field set
 * against the same POST /api/profiles/lawyer contract. Doubles as the editor
 * reachable from the dashboard/profile view (currentUser.id is used to
 * prefill from an existing profile when one exists). */
@Composable
fun LawyerOnboardingScreen(
    apiService: ApiService,
    currentUser: User,
    onComplete: () -> Unit,
    onBack: (() -> Unit)? = null,
) {
    var biography by remember { mutableStateOf("") }
    var specializations by remember { mutableStateOf(setOf<String>()) }
    var county by remember { mutableStateOf("") }
    var yearsOfExperience by remember { mutableStateOf("") }
    var firmName by remember { mutableStateOf("") }
    var languages by remember { mutableStateOf("") }

    var pastCases by remember { mutableStateOf<List<PastCase>>(emptyList()) }
    var newCaseType by remember { mutableStateOf("") }
    var newCaseJurisdiction by remember { mutableStateOf("") }
    var newCaseYear by remember { mutableStateOf("") }
    var newCaseOutcome by remember { mutableStateOf("") }
    var countyPickerOpen by remember { mutableStateOf(false) }
    var caseCountyPickerOpen by remember { mutableStateOf(false) }
    var caseTypePickerOpen by remember { mutableStateOf(false) }

    var errors by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var loading by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf(false) }
    var initialLoading by remember { mutableStateOf(true) }

    val scope = rememberCoroutineScope()

    LaunchedEffect(currentUser.id) {
        try {
            withContext(Dispatchers.IO) {
                val profileResp = apiService.getLawyerProfile(currentUser.id)
                val p = if (profileResp.isSuccessful) profileResp.body() else null
                if (p != null) {
                    biography = p.biography ?: ""
                    specializations = (p.specializations ?: "")
                        .split(",").map { it.trim() }.filter { it.isNotBlank() }
                        .filter { LAWYER_SPECIALIZATIONS.contains(it) }.toSet()
                    county = p.county ?: ""
                    yearsOfExperience = p.years_of_experience?.toString() ?: ""
                    firmName = p.firm_name ?: ""
                    languages = p.languages ?: ""
                }
                val casesResp = apiService.getPastCases(currentUser.id)
                pastCases = casesResp.pastCases
            }
        } catch (_: Exception) {
            // No existing profile yet - fine, this is a fresh onboarding.
        } finally {
            initialLoading = false
        }
    }

    fun validate(): Map<String, String> {
        val e = mutableMapOf<String, String>()
        val bioTrimmed = biography.trim()
        if (bioTrimmed.isEmpty()) {
            e["biography"] = "A brief biography is required."
        } else if (bioTrimmed.length < BIOGRAPHY_MIN || bioTrimmed.length > BIOGRAPHY_MAX) {
            e["biography"] = "Biography must be between $BIOGRAPHY_MIN and $BIOGRAPHY_MAX characters."
        }
        if (specializations.isEmpty()) e["specializations"] = "Select at least one practice area."
        if (county.isBlank()) e["county"] = "Select a county."
        if (languages.isBlank()) e["languages"] = "Languages spoken is required."
        val years = yearsOfExperience.toIntOrNull()
        if (years == null) e["yearsOfExperience"] = "Years of experience is required."
        else if (years < 0 || years > 60) e["yearsOfExperience"] = "Enter a realistic number."
        return e
    }

    fun submit() {
        submitError = null
        val nextErrors = validate()
        if (nextErrors.isNotEmpty()) { errors = nextErrors; return }
        errors = emptyMap()
        loading = true

        scope.launch {
            try {
                val resp = withContext(Dispatchers.IO) {
                    apiService.saveLawyerProfile(
                        SaveLawyerProfileRequest(
                            user_id = currentUser.id,
                            lsk_registration_number = currentUser.lskNumber ?: "",
                            full_name = currentUser.fullName,
                            biography = biography.trim(),
                            specializations = specializations.joinToString(", "),
                            years_of_experience = yearsOfExperience.toInt(),
                            firm_name = firmName.trim().ifBlank { null },
                            county = county,
                            languages = languages.trim(),
                        )
                    )
                }
                if (!resp.isSuccessful) {
                    loading = false
                    submitError = resp.errorBody()?.string()?.let { raw ->
                        runCatching {
                            val json = org.json.JSONObject(raw)
                            val fieldErrors = json.optJSONObject("fieldErrors")
                            if (fieldErrors != null && fieldErrors.length() > 0) {
                                fieldErrors.keys().asSequence().joinToString(" ") { k -> fieldErrors.getString(k) }
                            } else {
                                json.optString("error").ifBlank { null }
                            }
                        }.getOrNull()
                    } ?: "Something went wrong. Please try again."
                    return@launch
                }
                loading = false
                success = true
            } catch (e: Exception) {
                loading = false
                submitError = e.localizedMessage ?: "Unable to reach server. Please try again."
            }
        }
    }

    fun addPastCase() {
        val year = newCaseYear.toIntOrNull()
        if (newCaseType.isBlank() || newCaseJurisdiction.isBlank() || year == null || newCaseOutcome.trim().length < 5) return
        scope.launch {
            try {
                val resp = withContext(Dispatchers.IO) {
                    apiService.addPastCase(
                        currentUser.id,
                        AddPastCaseRequest(newCaseType, newCaseJurisdiction, year, newCaseOutcome.trim()),
                    )
                }
                val saved = resp.body()?.pastCase
                if (resp.isSuccessful && saved != null) {
                    pastCases = pastCases + saved
                    newCaseType = ""; newCaseJurisdiction = ""; newCaseYear = ""; newCaseOutcome = ""
                }
            } catch (_: Exception) {
                // Best-effort - past cases are optional; the lawyer can retry from the dashboard.
            }
        }
    }

    AppScreen {
        TitleBar(title = "Complete Your Profile", onBack = onBack)

        if (initialLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text("Loading…", fontSize = 13.sp, color = Slate)
            }
            return@AppScreen
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                "Detailed profiles improve match quality — clients find you based on your specialisations and case experience.",
                fontSize = 12.sp, color = Slate,
            )

            Field(label = "Biography *", error = errors["biography"]) {
                AppTextField(
                    value = biography, onValueChange = { biography = it },
                    placeholder = "Describe your background and what makes you effective for clients…",
                    singleLine = false, minLines = 4, isError = errors["biography"] != null,
                )
                Text(
                    "${biography.length} / $BIOGRAPHY_MAX chars",
                    fontSize = 11.sp, color = Slate,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Field(label = "Practice areas *", error = errors["specializations"]) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.height(160.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(LAWYER_SPECIALIZATIONS) { spec ->
                        Pill(
                            label = spec,
                            active = specializations.contains(spec),
                            onClick = {
                                specializations = if (specializations.contains(spec)) specializations - spec else specializations + spec
                            },
                        )
                    }
                }
            }

            Field(label = "County *", error = errors["county"]) {
                OutlineButton(text = county.ifBlank { "Select a county…" }, onClick = { countyPickerOpen = true })
            }
            if (countyPickerOpen) {
                SimplePickerDialog(
                    title = "Select a county",
                    options = KENYAN_COUNTIES,
                    onSelect = { county = it; countyPickerOpen = false },
                    onDismiss = { countyPickerOpen = false },
                )
            }

            Field(label = "Years of experience *", error = errors["yearsOfExperience"]) {
                AppTextField(
                    value = yearsOfExperience, onValueChange = { yearsOfExperience = it },
                    placeholder = "8", keyboardType = KeyboardType.Number,
                    isError = errors["yearsOfExperience"] != null,
                )
            }

            Field(label = "Firm / organisation", hint = "Leave blank if independent") {
                AppTextField(value = firmName, onValueChange = { firmName = it }, placeholder = "Kariuki & Associates")
            }

            Field(label = "Languages spoken *", hint = "Comma-separated", error = errors["languages"]) {
                AppTextField(value = languages, onValueChange = { languages = it }, placeholder = "English, Kiswahili")
            }

            Field(label = "LSK registration number") {
                Text(currentUser.lskNumber ?: "—", fontSize = 13.sp, color = Navy, fontWeight = FontWeight.SemiBold)
            }

            // ── Past case history (optional) ──────────────────────────────
            Text("Case history (optional)", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Navy)
            pastCases.forEach { c ->
                Text("${c.case_type} — ${c.jurisdiction}, ${c.case_year}", fontSize = 12.sp, color = Slate)
            }

            Field(label = "Case type") {
                OutlineButton(text = newCaseType.ifBlank { "Select a practice area…" }, onClick = { caseTypePickerOpen = true })
            }
            if (caseTypePickerOpen) {
                SimplePickerDialog(
                    title = "Select a practice area",
                    options = if (specializations.isNotEmpty()) specializations.toList() else LAWYER_SPECIALIZATIONS,
                    onSelect = { newCaseType = it; caseTypePickerOpen = false },
                    onDismiss = { caseTypePickerOpen = false },
                )
            }
            Field(label = "Case jurisdiction") {
                OutlineButton(text = newCaseJurisdiction.ifBlank { "Select a county…" }, onClick = { caseCountyPickerOpen = true })
            }
            if (caseCountyPickerOpen) {
                SimplePickerDialog(
                    title = "Select a county",
                    options = KENYAN_COUNTIES,
                    onSelect = { newCaseJurisdiction = it; caseCountyPickerOpen = false },
                    onDismiss = { caseCountyPickerOpen = false },
                )
            }
            Field(label = "Year") {
                AppTextField(value = newCaseYear, onValueChange = { newCaseYear = it }, placeholder = "2023", keyboardType = KeyboardType.Number)
            }
            Field(label = "Outcome", hint = "What was the matter, and how did it resolve?") {
                AppTextField(value = newCaseOutcome, onValueChange = { newCaseOutcome = it }, singleLine = false, minLines = 2)
            }
            OutlineButton(text = "+ Add case", onClick = ::addPastCase)

            if (submitError != null) {
                Text(submitError!!, color = ErrorRed, fontSize = 12.sp)
            }

            if (!success) {
                PrimaryButton(text = "Save profile", onClick = ::submit, loading = loading)
            } else {
                Text("✓ Profile saved successfully.", fontSize = 12.sp, color = Navy)
                PrimaryButton(text = "Continue", onClick = onComplete)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SimplePickerDialog(title: String, options: List<String>, onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text(title) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                options.forEach { option ->
                    Text(
                        option,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(option) }
                            .padding(vertical = 10.dp),
                    )
                }
            }
        },
    )
}
