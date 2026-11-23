package com.wakilimatch.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.Lawyer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LawyersListScreen(
    apiService: ApiService
) {
    var lawyers by remember { mutableStateOf<List<Lawyer>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()

    fun fetchLawyers() {
        isLoading = true
        errorMessage = null
        coroutineScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    apiService.getLawyers()
                }
                lawyers = result
            } catch (e: Exception) {
                errorMessage = e.localizedMessage ?: "Failed to fetch lawyers list."
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchLawyers()
    }

    val filteredLawyers = remember(lawyers, searchQuery) {
        if (searchQuery.isBlank()) {
            lawyers
        } else {
            lawyers.filter { lawyer ->
                (lawyer.full_name?.contains(searchQuery, ignoreCase = true) == true) ||
                (lawyer.specializations?.contains(searchQuery, ignoreCase = true) == true) ||
                (lawyer.lsk_registration_number?.contains(searchQuery, ignoreCase = true) == true)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = { Text("Search Lawyers or Specializations...") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        Box(modifier = Modifier.weight(1f)) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (errorMessage != null) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = errorMessage!!,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(onClick = { fetchLawyers() }) {
                        Text("Retry")
                    }
                }
            } else if (filteredLawyers.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No lawyers found.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredLawyers) { lawyer ->
                        LawyerCard(lawyer = lawyer)
                    }
                }
            }
        }
    }
}

@Composable
fun LawyerCard(lawyer: Lawyer) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = lawyer.full_name ?: "Lawyer Advocate",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                if (!lawyer.lsk_registration_number.isNull_or_blank()) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = MaterialTheme.shapes.extraSmall
                    ) {
                        Text(
                            text = lawyer.lsk_registration_number!!,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            if (!lawyer.specializations.isNull_or_blank()) {
                Text(
                    text = "Specializations: ${lawyer.specializations}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (lawyer.years_of_experience != null) {
                    Text(
                        text = "${lawyer.years_of_experience} yrs experience",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }

                if (!lawyer.price_guidance.isNull_or_blank()) {
                    Text(
                        text = lawyer.price_guidance!!,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
            }

            if (!lawyer.academic_qualifications.isNull_or_blank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Qualifications: ${lawyer.academic_qualifications}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    }
}

private fun String?.isNull_or_blank(): Boolean {
    return this == null || this.trim().isEmpty()
}
