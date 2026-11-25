package com.wakilimatch.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.*

/** Light-blue info box, e.g. "YOUR CASE" summary (brief section B2). */
@Composable
fun SummaryBox(title: String?, body: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Ice, RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        if (title != null) {
            Text(title, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Navy, modifier = Modifier.padding(bottom = 2.dp))
        }
        Text(body, fontSize = 10.5.sp, color = Slate, lineHeight = 15.sp)
    }
}

data class Stat(val value: String, val label: String)

/** Up to 3 stat tiles. Caller filters to only stats backed by real data -
 * never pads with zeros or placeholders. */
@Composable
fun StatTriplet(stats: List<Stat>, modifier: Modifier = Modifier) {
    if (stats.isEmpty()) return
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        stats.forEach { stat ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .border(BorderStroke(1.dp, BorderColor), RoundedCornerShape(8.dp))
                    .padding(vertical = 8.dp),
                horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            ) {
                Text(stat.value, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Navy)
                Text(stat.label, fontSize = 9.sp, color = Slate)
            }
        }
    }
}

enum class Outcome { WON, SETTLED, ONGOING, LOST, WITHDRAWN }

@Composable
fun ResultTag(outcome: Outcome?, modifier: Modifier = Modifier) {
    if (outcome == null) return
    val (bg, fg) = when (outcome) {
        Outcome.WON -> Navy to White
        Outcome.SETTLED -> Ice to Navy
        else -> White to Slate
    }
    Text(
        text = outcome.name,
        color = fg,
        fontSize = 9.sp,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .background(bg, RoundedCornerShape(4.dp))
            .border(BorderStroke(1.dp, if (outcome == Outcome.WON) Navy else BorderColor), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

@Composable
fun HistoryItem(title: String, detail: String?, outcome: Outcome?, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .border(BorderStroke(0.dp, BorderColor))
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.Top,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Navy)
            if (detail != null) {
                Text(detail, fontSize = 9.5.sp, color = Slate, modifier = Modifier.padding(top = 1.dp))
            }
        }
        ResultTag(outcome)
    }
}

/** Inquiry card with an AI (or mock "Draft") summary (brief section B2).
 * Pass onClick only when the lawyer can act on it - an unconfirmed
 * candidate match (brief section B5) is read-only. */
@Composable
fun InquiryCard(
    title: String,
    meta: String?,
    summary: String?,
    isAiGenerated: Boolean,
    modifier: Modifier = Modifier,
    scorePct: Int? = null,
    onClick: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, BorderColor), RoundedCornerShape(10.dp))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(12.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Navy, modifier = Modifier.weight(1f))
            if (scorePct != null) {
                Text("$scorePct%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = GoldText)
            }
        }
        if (meta != null) {
            Text(meta, fontSize = 9.5.sp, color = Slate, modifier = Modifier.padding(top = 2.dp, bottom = 6.dp))
        }
        if (summary != null) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Ice, RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 6.dp),
            ) {
                Text(
                    if (isAiGenerated) "✦ AI SUMMARY" else "DRAFT SUMMARY",
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldText,
                    modifier = Modifier.padding(bottom = 2.dp),
                )
                Text(summary, fontSize = 10.sp, color = Body, lineHeight = 14.sp)
            }
        }
    }
}
