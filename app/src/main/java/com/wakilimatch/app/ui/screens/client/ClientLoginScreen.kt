package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.*
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.ErrorRed
import com.wakilimatch.app.ui.theme.Navy
import com.wakilimatch.app.ui.theme.Slate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ClientLoginScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onAuthSuccess: (User) -> Unit,
) {
    var isLogin by remember { mutableStateOf(true) }

    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    fun submit() {
        error = null
        if (!isLogin && password != confirmPassword) {
            error = "Passwords do not match."
            return
        }
        loading = true
        scope.launch {
            try {
                val user = withContext(Dispatchers.IO) {
                    if (isLogin) {
                        val resp = apiService.loginClient(LoginRequest(email.trim(), password))
                        if (resp.isSuccessful && resp.body()?.user != null) resp.body()!!.user!!
                        else throw Exception("Incorrect email or password.")
                    } else {
                        val resp = apiService.registerClient(
                            RegisterClientRequest(fullName.trim(), email.trim(), phone.trim().ifBlank { null }, password)
                        )
                        if (resp.isSuccessful && resp.body()?.user != null) resp.body()!!.user!!
                        else throw Exception("Unable to create account - that email may already be registered.")
                    }
                }
                onAuthSuccess(user)
            } catch (e: Exception) {
                error = e.localizedMessage ?: "Unable to reach server. Please try again."
            } finally {
                loading = false
            }
        }
    }

    AppScreen {
        TitleBar(title = "Client Portal", onBack = onBack)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                if (isLogin) "Welcome back" else "Create your account",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Navy,
            )
            Text(
                if (isLogin) "Sign in to manage your cases and matches." else "Find qualified advocates for your legal needs.",
                fontSize = 13.sp,
                color = Slate,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlineButton(text = "Sign in", onClick = { isLogin = true; error = null }, modifier = Modifier.weight(1f))
                OutlineButton(text = "Register", onClick = { isLogin = false; error = null }, modifier = Modifier.weight(1f))
            }

            if (!isLogin) {
                Field(label = "Full name") {
                    AppTextField(value = fullName, onValueChange = { fullName = it })
                }
            }
            Field(label = "Email address") {
                AppTextField(value = email, onValueChange = { email = it }, keyboardType = KeyboardType.Email)
            }
            if (!isLogin) {
                Field(label = "Phone number (optional)") {
                    AppTextField(value = phone, onValueChange = { phone = it }, keyboardType = KeyboardType.Phone)
                }
            }
            Field(label = "Password") {
                AppTextField(
                    value = password, onValueChange = { password = it },
                    keyboardType = KeyboardType.Password, visualTransformation = PasswordVisualTransformation(),
                )
            }
            if (!isLogin) {
                Field(label = "Confirm password") {
                    AppTextField(
                        value = confirmPassword, onValueChange = { confirmPassword = it },
                        keyboardType = KeyboardType.Password, visualTransformation = PasswordVisualTransformation(),
                    )
                }
            }

            if (error != null) {
                Text(error!!, color = ErrorRed, fontSize = 12.sp)
            }

            PrimaryButton(text = if (isLogin) "Sign in" else "Create account", onClick = ::submit, loading = loading)
        }
    }
}
