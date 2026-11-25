package com.wakilimatch.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// Dark only, by design - brand-gold-on-black per the new palette. Every
// screen is built against this scheme, so a system light/dark setting
// never flips the app into an unstyled Material default.
private val WakiliColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = TextOnPrimary,
    secondary = PrimaryLight,
    onSecondary = TextOnPrimary,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceRaised,
    onSurfaceVariant = TextSecondary,
    outline = Border,
    error = Error,
    onError = TextPrimary,
)

@Composable
fun WakiliMatchTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = WakiliColorScheme,
        typography = MaterialTheme.typography,
        content = content,
    )
}
