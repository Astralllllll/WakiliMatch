package com.wakilimatch.app.ui.nav

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wakilimatch.app.ui.components.AppScreen
import com.wakilimatch.app.ui.components.OutlineButton
import com.wakilimatch.app.ui.components.TitleBar

/** Phase-1 stand-in for a screen not yet built with real content - proves
 * the nav graph/back-stack works end to end before any screen logic
 * exists. Replaced screen by screen in phases 2-3. */
@Composable
fun PlaceholderScreen(
    title: String,
    onBack: (() -> Unit)? = null,
    forward: List<Pair<String, () -> Unit>> = emptyList(),
) {
    AppScreen {
        TitleBar(title = title, onBack = onBack)
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            forward.forEach { (label, action) ->
                OutlineButton(text = label, onClick = action)
            }
        }
    }
}
