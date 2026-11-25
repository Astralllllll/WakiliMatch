package com.wakilimatch.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.theme.*

/** Solid button, >=48dp touch target (brief section B2). */
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Navy, contentColor = White, disabledContainerColor = Navy.copy(alpha = 0.5f)),
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = White, strokeWidth = 2.dp)
        } else {
            Text(text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        }
    }
}

@Composable
fun OutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, BorderStrong),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy),
    ) {
        Text(text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

/** Labeled form field wrapper with optional hint/error (brief section B2). */
@Composable
fun Field(
    label: String,
    modifier: Modifier = Modifier,
    hint: String? = null,
    error: String? = null,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Navy)
        content()
        if (error != null) {
            Text(error, fontSize = 12.sp, color = ErrorRed)
        } else if (hint != null) {
            Text(hint, fontSize = 12.sp, color = Slate)
        }
    }
}

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    isError: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = placeholder?.let { { Text(it, color = Slate) } },
        isError = isError,
        singleLine = singleLine,
        minLines = minLines,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = visualTransformation,
        shape = RoundedCornerShape(8.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Navy,
            unfocusedBorderColor = BorderStrong,
            errorBorderColor = ErrorRed,
            focusedContainerColor = White,
            unfocusedContainerColor = White,
        ),
    )
}

/** Selectable pill, e.g. legal-category chooser (brief section B2). */
@Composable
fun Pill(label: String, active: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val bg = if (active) Navy else White
    val fg = if (active) White else Navy
    val border = if (active) Navy else BorderStrong
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .height(44.dp)
            .semantics { selected = active },
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, border),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = bg, contentColor = fg),
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 4.dp),
    ) {
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
    }
}
