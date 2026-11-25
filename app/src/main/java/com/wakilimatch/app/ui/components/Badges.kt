package com.wakilimatch.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.*

enum class TagVariant { Default, Top, Limited }

/** default/top/limited tag chip (brief section B2). */
@Composable
fun Tag(text: String, variant: TagVariant = TagVariant.Default, modifier: Modifier = Modifier) {
    val (bg, fg, border) = when (variant) {
        TagVariant.Default -> Triple(SurfaceRaised, TextPrimary, Border)
        TagVariant.Top -> Triple(Primary, TextOnPrimary, Primary)
        TagVariant.Limited -> Triple(SurfaceRaised, Warning, Warning)
    }
    Text(
        text = text,
        color = fg,
        fontSize = 9.sp,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .background(bg, RoundedCornerShape(4.dp))
            .border(BorderStroke(1.dp, border), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

/** "NEW" / "AI" badge. soft=true uses primaryLight (never solid primary as
 * text) since it renders on a surface background (brief's contrast rule). */
@Composable
fun AIBadge(text: String = "AI", soft: Boolean = false, modifier: Modifier = Modifier) {
    val bg = if (soft) SurfaceRaised else Primary
    val fg = if (soft) PrimaryLight else TextOnPrimary
    Text(
        text = text,
        color = fg,
        fontSize = 8.5.sp,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .background(bg, RoundedCornerShape(10.dp))
            .then(if (soft) Modifier.border(BorderStroke(1.dp, PrimaryLight), RoundedCornerShape(10.dp)) else Modifier)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}
