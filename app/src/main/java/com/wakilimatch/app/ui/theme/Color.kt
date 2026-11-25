package com.wakilimatch.app.ui.theme

import androidx.compose.ui.graphics.Color

// Design tokens (brief section B2) - kept in exact parity with the web
// app's Tailwind @theme tokens (legalmatch/src/index.css), so both
// clients read as one product.
val Navy = Color(0xFF1B2A4A)
val NavyDeep = Color(0xFF121D33)
val Ice = Color(0xFFEDF2FA)
val Gold = Color(0xFFC9A227)
val GoldText = Color(0xFF8A6A00) // gold fails contrast as text on white - use this instead
val Slate = Color(0xFF5B6B85)
val BorderColor = Color(0xFFDCE3EF)
val BorderStrong = Color(0xFFC7D0E3)
val Body = Color(0xFF33404E)
val White = Color(0xFFFFFFFF)

// Semantic colors reused from existing screens (status chips etc.)
val ErrorRed = Color(0xFFDC2626)
val SuccessGreen = Color(0xFF15803D)
