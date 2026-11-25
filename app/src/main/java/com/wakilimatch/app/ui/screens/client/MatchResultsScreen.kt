package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import kotlin.math.roundToInt

private const val DISCLAIMER = "WakiliMatch suggests lawyers; it does not give legal advice."

@Composable
fun MatchResultsScreen(
    caseState: CaseState,
    onBack: () -> Unit,
    onOpenProfile: (MatchResult) -> Unit,
    onRephrase: () -> Unit,
) {
    val status = caseState.status
    val isNonSuccess = status != null && status != "success" && status != "no_lawyers_found"

    AppScreen {
        TitleBar(title = "Match Results", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            SummaryBox(
                title = "YOUR CASE",
                body = listOfNotNull(caseState.title, caseState.jurisdiction, caseState.legalCategory.ifBlank { null })
                    .joinToString(" · "),
            )
            Spacer(modifier = Modifier.height(10.dp))

            when {
                isNonSuccess -> StatusMessageCard(status!!, caseState.message, caseState.exampleQueries, onRephrase)
                else -> {
                    Text(
                        "${caseState.matches.size} advocate${if (caseState.matches.size == 1) "" else "s"} found",
                        fontSize = 11.sp,
                        color = Slate,
                        modifier = Modifier.padding(bottom = 10.dp),
                    )
                    caseState.xai?.let { XaiCard(it) }
                    if (status == "no_lawyers_found" && caseState.message != null) {
                        SummaryBox(title = null, body = caseState.message!!, modifier = Modifier.padding(bottom = 10.dp))
                    }
                    if (caseState.matches.isEmpty()) {
                        if (status != "no_lawyers_found") {
                            Text("No matches yet. Try broadening your description.", fontSize = 12.sp, color = Slate)
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(caseState.matches.sortedByDescending { it.similarity_score ?: 0.0 }) { match ->
                                LawyerResultCard(match, caseState.xai?.threshold, onOpenProfile)
                            }
                        }
                    }
                }
            }

            Text(
                DISCLAIMER,
                fontSize = 10.sp,
                color = Slate,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

@Composable
private fun XaiCard(xai: XaiBlock) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(androidx.compose.ui.graphics.Color(0xFFFFFDF5), RoundedCornerShape(10.dp))
            .border(BorderStroke(1.dp, Gold), RoundedCornerShape(10.dp))
            .padding(12.dp)
            .padding(bottom = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AIBadge(text = "✦ AI EXPLANATION", soft = true)
            xai.matched_area?.let {
                Text(it, fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = Navy, modifier = Modifier.padding(start = 6.dp))
            }
        }
        Text(xai.explanation, fontSize = 11.5.sp, color = Body, modifier = Modifier.padding(top = 6.dp, bottom = 6.dp))
        xai.top_precedent?.let { tp ->
            Text("Top precedent: ${tp.title ?: "—"}${tp.court?.let { " — $it" } ?: ""}${tp.year?.let { " ($it)" } ?: ""}", fontSize = 10.5.sp, color = Slate)
            Text(
                "${"%.1f".format(tp.similarity_pct)}% semantic similarity · ${xai.precedent_count} precedent${if (xai.precedent_count == 1) "" else "s"} considered",
                fontSize = 10.5.sp,
                color = Slate,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun StatusMessageCard(status: String, message: String?, exampleQueries: List<String>, onRephrase: () -> Unit) {
    val titles = mapOf(
        "empty_query" to "Tell us what happened",
        "invalid_input" to "We couldn't read that",
        "unsupported_language" to "English only for now",
        "low_confidence" to "No strong match found",
        "no_lawyers_found" to "No lawyers available yet",
    )
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, BorderColor), RoundedCornerShape(10.dp))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(titles[status] ?: "Something went wrong", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Navy)
        Text(message ?: "", fontSize = 12.5.sp, color = Slate, modifier = Modifier.padding(top = 6.dp, bottom = 10.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        if (exampleQueries.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Ice, RoundedCornerShape(8.dp))
                    .padding(10.dp),
            ) {
                Text("Try something like:", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Navy, modifier = Modifier.padding(bottom = 6.dp))
                exampleQueries.forEach { q -> Text("\"$q\"", fontSize = 11.sp, color = Body, modifier = Modifier.padding(bottom = 4.dp)) }
            }
            Spacer(modifier = Modifier.height(10.dp))
        }
        PrimaryButton(text = "Rephrase my case", onClick = onRephrase)
    }
}

@Composable
private fun LawyerResultCard(match: MatchResult, threshold: Double?, onOpenProfile: (MatchResult) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val scorePct = ((match.similarity_score ?: 0.0) * 100).roundToInt()
    val semantic = match.component_scores?.semantic
    val precedent = match.component_scores?.precedent
    val isTopMatch = (match.similarity_score ?: 0.0) >= (threshold ?: 0.0)
    val isLimited = (semantic != null && semantic < (threshold ?: 0.328)) || precedent == null || precedent == 0.0

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, BorderColor), RoundedCornerShape(10.dp))
            .padding(12.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier.size(36.dp).background(Ice, CircleShape).clearAndSetSemantics {},
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initials(match.full_name), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Navy)
                }
                Text(
                    match.full_name ?: "Advocate",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Navy,
                    modifier = Modifier.padding(start = 8.dp).clickable { onOpenProfile(match) },
                )
            }
            Text("$scorePct%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = GoldText)
        }

        Row(modifier = Modifier.padding(top = 8.dp, bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            if (isTopMatch) Tag("TOP MATCH", TagVariant.Top)
            if (!isTopMatch && isLimited) Tag("LIMITED MATCH", TagVariant.Limited)
            match.years_of_experience?.takeIf { it > 0 }?.let { Tag("$it yrs") }
        }

        val reason = match.why?.plain_text ?: match.match_reason
        if (reason != null) Text(reason, fontSize = 11.sp, color = Slate, modifier = Modifier.padding(bottom = 4.dp))

        if (match.why != null) {
            Text(
                if (expanded) "Hide details" else "Why this lawyer?",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Navy,
                modifier = Modifier.clickable { expanded = !expanded }.padding(top = 4.dp),
            )
        }

        if (expanded && match.why != null) {
            Column(modifier = Modifier.padding(top = 10.dp)) {
                if (match.why.precedent_cases.isNotEmpty()) {
                    Text("LINKED PRECEDENTS", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate)
                    match.why.precedent_cases.forEach { c ->
                        Text(
                            "${c.title}${c.similarity_pct?.let { " — %.1f%% similarity".format(it) } ?: ""}",
                            fontSize = 10.5.sp, color = Body, modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
                match.why.components?.let { comp ->
                    Text("MATCH BREAKDOWN", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Slate, modifier = Modifier.padding(bottom = 4.dp))
                    ComponentBar("Profile match", comp.profile_semantic)
                    ComponentBar("Case precedent", comp.precedent)
                    ComponentBar("Category", comp.category)
                    ComponentBar("Jurisdiction", comp.jurisdiction)
                    ComponentBar("Case history", comp.history)
                }
            }
        }
    }
}

@Composable
private fun ComponentBar(label: String, value: Double?) {
    if (value == null) return
    val pct = (value * 100).roundToInt()
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 10.5.sp, color = Slate, modifier = Modifier.width(90.dp))
        Box(modifier = Modifier.weight(1f).height(6.dp).background(BorderColor, RoundedCornerShape(3.dp))) {
            Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(pct / 100f).background(Navy, RoundedCornerShape(3.dp)))
        }
        Text("$pct%", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Navy, modifier = Modifier.padding(start = 6.dp))
    }
}

private fun initials(name: String?): String {
    if (name.isNullOrBlank()) return "LM"
    val parts = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return when {
        parts.isEmpty() -> "LM"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> "${parts.first()[0]}${parts.last()[0]}".uppercase()
    }
}
