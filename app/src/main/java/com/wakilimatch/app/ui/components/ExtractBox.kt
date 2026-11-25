package com.wakilimatch.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.*

/** Editable "extracted fields" box for Scan Document (brief section B2).
 * labelText should say "basic extraction (demo)" in mock mode, never
 * claiming real AI/OCR happened (brief section B6). */
@Composable
fun ExtractBox(labelText: String, isAiGenerated: Boolean, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(androidx.compose.ui.graphics.Color(0xFFFFFDF5), RoundedCornerShape(10.dp))
            .border(BorderStroke(1.dp, Gold), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            AIBadge(text = if (isAiGenerated) "✦ AI" else "DRAFT", soft = true)
            Text(labelText, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Navy, modifier = Modifier.padding(start = 6.dp))
        }
        Spacer(modifier = Modifier.height(8.dp))
        content()
    }
}

@Composable
fun ExtractRow(label: String, value: String, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 10.5.sp, color = Slate)
        Text(value, fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = Navy)
    }
}
