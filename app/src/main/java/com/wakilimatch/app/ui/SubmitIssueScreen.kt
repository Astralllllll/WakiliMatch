package com.wakilimatch.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.CreateIssueRequest
import com.wakilimatch.app.data.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubmitIssueScreen(
    currentUser: User,
    apiService: ApiService,
    onIssueSubmitted: () -> Unit,
    onCancel: () -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("Family Law") }
    var jurisdiction by remember { mutableStateOf("Nairobi") }
    var selectedUrgency by remember { mutableStateOf("Medium") }
    var budgetMin by remember { mutableStateOf("") }
    var budgetMax by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val categories = listOf("Family Law", "Criminal Law", "Corporate & Commercial", "Real Estate & Land", "Employment & Labor", "Intellectual Property", "Civil Litigation")
    val urgencyLevels = listOf("Low", "Medium", "High", "Critical")

    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Post New Legal Issue") },
                navigationIcon = {
                    TextButton(onClick = onCancel) {
                        Text("Cancel")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = "Describe your legal matter to find the right lawyer.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Issue Title *") },
                placeholder = { Text("e.g. Land Dispute Resolution in Kajiado") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Detailed Description *") },
                placeholder = { Text("Provide details about your situation, key dates, and what assistance you need...") },
                minLines = 4,
                maxLines = 8,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text("Legal Category", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))

            Column {
                categories.chunked(2).forEach { rowCategories ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowCategories.forEach { category ->
                            FilterChip(
                                selected = selectedCategory == category,
                                onClick = { selectedCategory = category },
                                label = { Text(category, style = MaterialTheme.typography.labelSmall) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = jurisdiction,
                onValueChange = { jurisdiction = it },
                label = { Text("Jurisdiction / Location") },
                placeholder = { Text("e.g. Nairobi, Mombasa, Nakuru") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text("Urgency Level", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                urgencyLevels.forEach { level ->
                    FilterChip(
                        selected = selectedUrgency == level,
                        onClick = { selectedUrgency = level },
                        label = { Text(level) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = budgetMin,
                    onValueChange = { budgetMin = it },
                    label = { Text("Min Budget (KES)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = budgetMax,
                    onValueChange = { budgetMax = it },
                    label = { Text("Max Budget (KES)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            Button(
                onClick = {
                    if (title.isBlank()) {
                        errorMessage = "Please enter an issue title."
                        return@Button
                    }
                    if (description.isBlank()) {
                        errorMessage = "Please enter an issue description."
                        return@Button
                    }

                    errorMessage = null
                    isLoading = true

                    coroutineScope.launch {
                        try {
                            val request = CreateIssueRequest(
                                client_id = currentUser.id,
                                issue_title = title.trim(),
                                issue_description = description.trim(),
                                legal_category = selectedCategory,
                                jurisdiction = jurisdiction.trim().ifBlank { null },
                                urgency_level = selectedUrgency,
                                budget_min = budgetMin.toDoubleOrNull(),
                                budget_max = budgetMax.toDoubleOrNull()
                            )

                            withContext(Dispatchers.IO) {
                                val response = apiService.createIssue(request)
                                if (!response.isSuccessful) {
                                    throw Exception(response.errorBody()?.string() ?: "Failed to submit issue.")
                                }
                            }
                            onIssueSubmitted()
                        } catch (e: Exception) {
                            errorMessage = e.localizedMessage ?: "Error submitting issue."
                        } finally {
                            isLoading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Submit Issue")
                }
            }
        }
    }
}
