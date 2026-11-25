package com.wakilimatch.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.Background
import com.wakilimatch.app.ui.theme.PrimaryLight
import com.wakilimatch.app.ui.theme.Surface
import com.wakilimatch.app.ui.theme.TextPrimary

/** Full-screen content area (brief section B1) - the mobile-only
 * equivalent of the web app's Screen.jsx (no desktop-centering concern on
 * a native app, so this is just the content column).
 *
 * Every screen in the app renders through here, so this is also the single
 * place that keeps content clear of the status bar / display cutout
 * (Dynamic-Island-style notches included) and the bottom navigation bar:
 * `windowInsetsPadding(WindowInsets.systemBars)` reserves exactly the real
 * inset on whatever device/OS version is running (zero on a device with no
 * cutout and no gesture bar), then a flat 8dp is added below the top inset
 * so headers never sit flush against it. */
@Composable
fun AppScreen(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Background)
            .windowInsetsPadding(WindowInsets.systemBars)
            .padding(top = 8.dp),
        content = content,
    )
}

/** Header bar: back chip left, title centre (uppercase bold,
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
            .background(Surface)
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
            color = TextPrimary,
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
        Text(text = text, color = PrimaryLight.copy(alpha = 0.9f), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}
