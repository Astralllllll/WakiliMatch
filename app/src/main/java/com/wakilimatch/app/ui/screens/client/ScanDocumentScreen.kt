package com.wakilimatch.app.ui.screens.client

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.DraftCaseResponse
import com.wakilimatch.app.data.LEGAL_CATEGORIES
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.Border
import com.wakilimatch.app.ui.theme.SurfaceRaised
import com.wakilimatch.app.ui.theme.TextSecondary

/**
 * Scan Document (brief sections B3/B6). No real OCR exists, so this never
 * uploads or processes the picked image - the fields below are an
 * editable demo starting point, clearly labelled as such, not a claim
 * that AI read the document.
 */
@Composable
fun ScanDocumentScreen(onBack: () -> Unit, onUseInfo: (DraftCaseResponse) -> Unit) {
    var pickedFileName by remember { mutableStateOf<String?>(null) }
    var type by remember { mutableStateOf("Demand letter") }
    var responseDue by remember { mutableStateOf("14 days") }
    var parties by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }

    val pickImage = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        pickedFileName = uri?.lastPathSegment ?: pickedFileName
    }

    AppScreen {
        TitleBar(title = "Scan Document", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
            ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(SurfaceRaised, RoundedCornerShape(10.dp))
                    .border(BorderStroke(2.dp, Border), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📷", fontSize = 26.sp)
                    Text(pickedFileName ?: "Choose a file from your gallery", fontSize = 11.sp, color = TextSecondary, modifier = Modifier.padding(top = 6.dp))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            OutlineButton(text = "Choose from gallery", onClick = { pickImage.launch("image/*") })

            Spacer(modifier = Modifier.height(16.dp))
            ExtractBox(labelText = "EXTRACTED (basic extraction — demo)", isAiGenerated = false) {
                Field(label = "") { AppTextField(value = type, onValueChange = { type = it }, placeholder = "Type") }
                Spacer(modifier = Modifier.height(6.dp))
                Field(label = "") { AppTextField(value = responseDue, onValueChange = { responseDue = it }, placeholder = "Response due") }
                Spacer(modifier = Modifier.height(6.dp))
                Field(label = "") { AppTextField(value = parties, onValueChange = { parties = it }, placeholder = "Parties, e.g. Landlord vs tenant") }
                Spacer(modifier = Modifier.height(8.dp))
                Text("Suggested category", fontSize = 10.5.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 4.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(LEGAL_CATEGORIES) { c ->
                        Pill(label = c.label, active = category == c.value, onClick = { category = c.value })
                    }
                }
            }

            Text(
                "This demo does not upload or scan your document — the fields above are a sample for " +
                    "you to edit. Nothing is stored. (Kenya Data Protection Act, 2019.)",
                fontSize = 10.5.sp,
                color = TextSecondary,
                modifier = Modifier.padding(bottom = 16.dp),
            )
            } // end scrollable content column

            Spacer(modifier = Modifier.height(12.dp))
            PrimaryButton(
                text = "Use this info →",
                onClick = {
                    val title = listOfNotNull(type.ifBlank { null }, parties.ifBlank { null }).joinToString(" — ")
                    val description = listOfNotNull(
                        "Document type: $type.",
                        if (responseDue.isNotBlank()) "Response due: $responseDue." else null,
                        if (parties.isNotBlank()) "Parties: $parties." else null,
                    ).joinToString(" ")
                    onUseInfo(
                        DraftCaseResponse(
                            title = title,
                            description = description,
                            category = category.ifBlank { null },
                            jurisdiction = null,
                            urgency = null,
                            isAiGenerated = false,
                        ),
                    )
                },
            )
        }
    }
}
