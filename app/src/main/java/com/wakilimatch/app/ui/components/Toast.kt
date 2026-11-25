package com.wakilimatch.app.ui.components

import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarData
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.wakilimatch.app.ui.theme.Navy
import com.wakilimatch.app.ui.theme.White

/** Styled snackbar matching the brief's bottom toast (section B2). Use
 * with a standard Scaffold(snackbarHost = { SnackbarHost(hostState) { WakiliSnackbar(it) } }). */
@Composable
fun WakiliSnackbar(data: SnackbarData) {
    Snackbar(containerColor = Navy, contentColor = White) {
        Text(data.visuals.message)
    }
}
