package com.wakilimatch.app.ui.theme

import androidx.compose.ui.graphics.Color

// Design tokens - dark theme with a brand-gold accent (single source of
// truth for every color in the app; no screen/component may hardcode a hex
// value of its own).
val Background = Color(0xFF0B0B0C)
val Surface = Color(0xFF161514)
val SurfaceRaised = Color(0xFF211F1C)
val Border = Color(0xFF3A3324)

val Primary = Color(0xFF997938) // primary buttons, active tab/chip, highlights
val PrimaryLight = Color(0xFFC9A65A) // gold text/icons on dark backgrounds, links
val PrimaryDark = Color(0xFF7A602C) // pressed/disabled primary buttons

val TextPrimary = Color(0xFFF5F0E6)
val TextSecondary = Color(0xFFA8A196)
val TextOnPrimary = Color(0xFF0B0B0C) // labels on gold buttons

val Success = Color(0xFF4E9A6B)
val Error = Color(0xFFC0564B)
val Warning = Color(0xFFD98E3A)
