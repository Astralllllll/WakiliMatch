package com.wakilimatch.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.*

/** Dashboard tile with an optional count badge (brief section B2). dim=true
 * means "not wired in this demo" - shown as "Coming soon", never a dead
 * link that pretends to work. */
@Composable
fun Tile(
    label: String,
    modifier: Modifier = Modifier,
    badgeCount: Int? = null,
    dark: Boolean = false,
    dim: Boolean = false,
    onClick: () -> Unit = {},
) {
    val bg = if (dark) Navy else White
    val fg = if (dark) White else if (dim) Slate else Navy
    val border = if (dark) Navy else BorderStrong

    val a11yLabel = buildString {
        append(label)
        if (dim) append(", coming soon")
        if (badgeCount != null && badgeCount > 0) append(", $badgeCount new")
    }

    Box(
        modifier = modifier
            .height(64.dp)
            .alpha(if (dim) 0.6f else 1f)
            .background(bg, RoundedCornerShape(10.dp))
            .border(BorderStroke(1.dp, border), RoundedCornerShape(10.dp))
            .then(
                if (dim) Modifier
                else Modifier.clickable(onClick = onClick, role = Role.Button)
            )
            .semantics(mergeDescendants = true) { contentDescription = a11yLabel }
            .padding(8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, color = fg, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, textAlign = TextAlign.Center)
            if (dim) {
                Text("Coming soon", color = Slate, fontSize = 8.5.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
        if (badgeCount != null && badgeCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 6.dp, y = (-6).dp)
                    .size(18.dp)
                    .background(Navy, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("$badgeCount", color = White, fontSize = 9.5.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/** 4-step progress dots: 1 intake, 2 category, 3 details, 4 matches (brief
 * section B3). */
@Composable
fun StepDots(current: Int, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Step $current of 4" },
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        for (n in 1..4) {
            val done = n < current
            val now = n == current
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .background(if (done) Navy else White, CircleShape)
                    .border(BorderStroke(1.5.dp, if (done) Navy else if (now) Gold else BorderStrong), CircleShape)
                    .clearAndSetSemantics {},
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (done) "✓" else "$n",
                    color = if (done) White else if (now) GoldText else Slate,
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            if (n < 4) {
                Box(modifier = Modifier.width(16.dp).height(1.dp).background(BorderStrong))
            }
        }
    }
}
