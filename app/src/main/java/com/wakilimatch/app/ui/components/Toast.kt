package com.wakilimatch.app.ui.components

import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarData
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.wakilimatch.app.ui.theme.SurfaceRaised
import com.wakilimatch.app.ui.theme.TextPrimary

/** Styled snackbar matching the brief's bottom toast (section B2). Use
 * with a standard Scaffold(snackbarHost = { SnackbarHost(hostState) { WakiliSnackbar(it) } }). */
@Composable
fun WakiliSnackbar(data: SnackbarData) {
    Snackbar(containerColor = SurfaceRaised, contentColor = TextPrimary) {
        Text(data.visuals.message)
    }
}
