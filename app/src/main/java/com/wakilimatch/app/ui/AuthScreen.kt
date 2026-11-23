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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.Gson
import com.wakilimatch.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    apiService: ApiService,
    onAuthSuccess: (User) -> Unit
) {
    var isLogin by remember { mutableStateOf(true) }
    var selectedRole by remember { mutableStateOf("Client") } // "Client" or "Lawyer"

    var fullName by remember { mutableStateOf("") }
    var lskNumber by remember { mutableStateOf("") }
    var emailOrIdentifier by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "WakiliMatch",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = if (isLogin) "Welcome back! Sign in to continue." else "Create a new account.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Role Toggle (Client / Lawyer)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    FilterChip(
                        selected = selectedRole == "Client",
                        onClick = { selectedRole = "Client"; errorMessage = null },
                        label = { Text("Client") },
                        modifier = Modifier.padding(end = 8.dp)
                    )
                    FilterChip(
                        selected = selectedRole == "Lawyer",
                        onClick = { selectedRole = "Lawyer"; errorMessage = null },
                        label = { Text("Lawyer") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Input Fields
                if (!isLogin) {
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Full Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (selectedRole == "Lawyer") {
                        OutlinedTextField(
                            value = lskNumber,
                            onValueChange = { lskNumber = it },
                            label = { Text("LSK Registration Number") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                OutlinedTextField(
                    value = emailOrIdentifier,
                    onValueChange = { emailOrIdentifier = it },
                    label = { Text(if (selectedRole == "Lawyer" && isLogin) "Email or LSK Number" else "Email Address") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))

                if (!isLogin) {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number (Optional)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

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
                        errorMessage = null
                        isLoading = true
                        coroutineScope.launch {
                            try {
                                val user = withContext(Dispatchers.IO) {
                                    if (isLogin) {
                                        if (selectedRole == "Client") {
                                            val resp = apiService.loginClient(LoginRequest(emailOrIdentifier, password))
                                            if (resp.isSuccessful && resp.body()?.user != null) {
                                                resp.body()!!.user!!
                                            } else {
                                                val errorText = resp.errorBody()?.string()
                                                val parsed = try { Gson().fromJson(errorText, AuthResponse::class.java) } catch (e: Exception) { null }
                                                throw Exception(parsed?.error ?: "Invalid credentials.")
                                            }
                                        } else {
                                            val resp = apiService.loginLawyer(LawyerLoginRequest(emailOrIdentifier, password))
                                            if (resp.isSuccessful && resp.body()?.user != null) {
                                                resp.body()!!.user!!
                                            } else {
                                                val errorText = resp.errorBody()?.string()
                                                val parsed = try { Gson().fromJson(errorText, AuthResponse::class.java) } catch (e: Exception) { null }
                                                throw Exception(parsed?.error ?: "Invalid credentials.")
                                            }
                                        }
                                    } else {
                                        if (selectedRole == "Client") {
                                            val resp = apiService.registerClient(
                                                RegisterClientRequest(fullName, emailOrIdentifier, phone.ifBlank { null }, password)
                                            )
                                            if (resp.isSuccessful && resp.body()?.user != null) {
                                                resp.body()!!.user!!
                                            } else {
                                                val errorText = resp.errorBody()?.string()
                                                val parsed = try { Gson().fromJson(errorText, AuthResponse::class.java) } catch (e: Exception) { null }
                                                throw Exception(parsed?.error ?: "Registration failed.")
                                            }
                                        } else {
                                            val resp = apiService.registerLawyer(
                                                RegisterLawyerRequest(fullName, lskNumber, emailOrIdentifier, phone.ifBlank { null }, password)
                                            )
                                            if (resp.isSuccessful && resp.body()?.user != null) {
                                                resp.body()!!.user!!
                                            } else {
                                                val errorText = resp.errorBody()?.string()
                                                val parsed = try { Gson().fromJson(errorText, AuthResponse::class.java) } catch (e: Exception) { null }
                                                throw Exception(parsed?.error ?: "Registration failed.")
                                            }
                                        }
                                    }
                                }
                                onAuthSuccess(user)
                            } catch (e: Exception) {
                                errorMessage = e.localizedMessage ?: "An error occurred."
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
                        Text(if (isLogin) "Sign In" else "Create Account")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                TextButton(
                    onClick = {
                        isLogin = !isLogin
                        errorMessage = null
                    }
                ) {
                    Text(
                        if (isLogin) "Don't have an account? Sign Up" else "Already have an account? Sign In"
                    )
                }
            }
        }
    }
}
