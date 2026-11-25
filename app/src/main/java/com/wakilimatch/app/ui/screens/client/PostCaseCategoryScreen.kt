package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wakilimatch.app.data.CaseState
import com.wakilimatch.app.data.KENYAN_COUNTIES
import com.wakilimatch.app.data.LEGAL_CATEGORIES
import com.wakilimatch.app.ui.components.*

@Composable
fun PostCaseCategoryScreen(caseState: CaseState, onBack: () -> Unit, onNext: () -> Unit) {
    var categoryError by remember { mutableStateOf<String?>(null) }
    var titleError by remember { mutableStateOf<String?>(null) }
    var jurisdictionError by remember { mutableStateOf<String?>(null) }
    var countyPickerOpen by remember { mutableStateOf(false) }

    fun validateAndContinue() {
        categoryError = if (caseState.legalCategory.isBlank()) "Select a legal category." else null
        titleError = when {
            caseState.title.isBlank() -> "Case title is required."
            caseState.title.trim().length < 10 -> "Title should be at least 10 characters."
            else -> null
        }
        jurisdictionError = if (caseState.jurisdiction.isBlank()) "Select a county." else null
        if (categoryError == null && titleError == null && jurisdictionError == null) onNext()
    }

    AppScreen {
        TitleBar(title = "Post a Case", onBack = onBack)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            StepDots(current = 2, modifier = Modifier.padding(bottom = 16.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
            ) {
            Field(label = "Legal category *", error = categoryError) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.height(100.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(LEGAL_CATEGORIES) { c ->
                        Pill(label = c.label.removeSuffix(" Law"), active = caseState.legalCategory == c.value, onClick = { caseState.legalCategory = c.value })
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Field(
                label = "Case title *",
                hint = "A short summary of your legal issue (e.g. 'Unfair dismissal from employment').",
                error = titleError,
            ) {
                AppTextField(value = caseState.title, onValueChange = { caseState.title = it }, placeholder = "Briefly describe your case in one line")
            }

            Spacer(modifier = Modifier.height(16.dp))
            Field(label = "Jurisdiction (county) *", error = jurisdictionError) {
                OutlineButton(text = caseState.jurisdiction.ifBlank { "Select a county…" }, onClick = { countyPickerOpen = true })
            }

            if (countyPickerOpen) {
                CountyPickerDialog(
                    onSelect = { caseState.jurisdiction = it; countyPickerOpen = false },
                    onDismiss = { countyPickerOpen = false },
                )
            }

            } // end scrollable content column

            Spacer(modifier = Modifier.height(12.dp))
            PrimaryButton(text = "Continue →", onClick = ::validateAndContinue)
        }
    }
}

@Composable
private fun CountyPickerDialog(onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text("Select a county") },
        text = {
            Column {
                KENYAN_COUNTIES.forEach { county ->
                    Text(
                        county,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(county) }
                            .padding(vertical = 10.dp),
                    )
                }
            }
        },
    )
}
