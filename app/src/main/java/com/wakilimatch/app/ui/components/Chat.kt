package com.wakilimatch.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.*

enum class ChatRole { AI, ME, DRAFT }

/** ai/me/draft chat bubble (brief section B2). */
@Composable
fun ChatBubble(text: String, role: ChatRole, modifier: Modifier = Modifier) {
    val alignment = if (role == ChatRole.ME) Alignment.End else Alignment.Start
    val shape = when (role) {
        ChatRole.ME -> RoundedCornerShape(12.dp, 12.dp, 4.dp, 12.dp)
        else -> RoundedCornerShape(12.dp, 12.dp, 12.dp, 4.dp)
    }
    val bg = when (role) {
        ChatRole.AI -> Ice
        ChatRole.ME -> Navy
        ChatRole.DRAFT -> White
    }
    val fg = if (role == ChatRole.ME) White else Body

    Column(modifier = modifier.fillMaxWidth(), horizontalAlignment = alignment) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .background(bg, shape)
                .then(if (role == ChatRole.DRAFT) Modifier.border(BorderStroke(1.dp, Gold), shape) else Modifier)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Text(text, color = fg, fontSize = 11.5.sp, lineHeight = 16.sp)
        }
    }
}
