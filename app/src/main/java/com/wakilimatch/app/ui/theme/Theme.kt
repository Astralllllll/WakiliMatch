package com.wakilimatch.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// Light only, by design - the brief's screens are light cards on a dark
// navy page background (handled by AppScreen, not by a dark color scheme).
private val WakiliColorScheme = lightColorScheme(
    primary = Navy,
    onPrimary = White,
    secondary = Gold,
    onSecondary = Navy,
    background = White,
    onBackground = Body,
    surface = White,
    onSurface = Body,
    surfaceVariant = Ice,
    onSurfaceVariant = Slate,
    outline = BorderStrong,
    error = ErrorRed,
)

@Composable
fun WakiliMatchTheme(
    // Parameter kept for call-site clarity even though this theme is
    // intentionally always light - see comment above.
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = WakiliColorScheme,
        typography = MaterialTheme.typography,
        content = content,
    )
}
