package com.wakilimatch.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.Navy
import com.wakilimatch.app.ui.theme.White

/** Full-screen white content area (brief section B1) - the mobile-only
 * equivalent of the web app's Screen.jsx (no desktop-centering concern on
 * a native app, so this is just the content column). */
@Composable
fun AppScreen(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(White),
        content = content,
    )
}

/** Navy title bar: back chip left, title centre (uppercase bold,
 * letter-spaced), action chip right (brief section B2). */
@Composable
fun TitleBar(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Navy)
            .padding(horizontal = 4.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (onBack != null) {
                ChipButton(text = "← Back", onClick = onBack)
            }
        }
        Text(
            text = title.uppercase(),
            color = White,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            letterSpacing = 0.8.sp,
            modifier = Modifier.weight(2f),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            if (actionLabel != null && onAction != null) {
                ChipButton(text = actionLabel, onClick = onAction)
            }
        }
    }
}

@Composable
private fun ChipButton(text: String, onClick: () -> Unit) {
    androidx.compose.material3.TextButton(onClick = onClick) {
        Text(text = text, color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}
