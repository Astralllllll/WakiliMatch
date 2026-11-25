package com.wakilimatch.app.ui.screens.lawyer

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.R
import com.wakilimatch.app.data.*
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.Error
import com.wakilimatch.app.ui.theme.TextPrimary
import com.wakilimatch.app.ui.theme.TextSecondary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LawyerLoginScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onAuthSuccess: (User) -> Unit,
) {
    var isLogin by remember { mutableStateOf(true) }

    var fullName by remember { mutableStateOf("") }
    var lskNumber by remember { mutableStateOf("") }
    var identifier by remember { mutableStateOf("") }
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
                        val resp = apiService.loginLawyer(LawyerLoginRequest(identifier.trim(), password))
                        if (resp.isSuccessful && resp.body()?.user != null) resp.body()!!.user!!
                        else throw Exception("No lawyer account found with this email or LSK number.")
                    } else {
                        val resp = apiService.registerLawyer(
                            RegisterLawyerRequest(fullName.trim(), lskNumber.trim(), identifier.trim(), phone.trim().ifBlank { null }, password)
                        )
                        if (resp.isSuccessful && resp.body()?.user != null) resp.body()!!.user!!
                        else throw Exception("Unable to register - check your LSK number and email.")
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
        TitleBar(title = "Advocate Portal", onBack = onBack)
        Column(
            modifier = Modifier.fillMaxSize().padding(20.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.logo_wakilimatch),
                contentDescription = "WakiliMatch",
                modifier = Modifier.width(140.dp).align(Alignment.CenterHorizontally).padding(bottom = 4.dp),
            )
            Text(
                if (isLogin) "Sign in to your practice" else "Register your practice",
                fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary,
            )
            Text(
                if (isLogin) "Use your email address or LSK registration number." else "Your LSK number will be verified before your profile goes live.",
                fontSize = 13.sp, color = TextSecondary,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlineButton(text = "Sign in", onClick = { isLogin = true; error = null }, modifier = Modifier.weight(1f))
                OutlineButton(text = "Register", onClick = { isLogin = false; error = null }, modifier = Modifier.weight(1f))
            }

            if (!isLogin) {
                Field(label = "Full name") { AppTextField(value = fullName, onValueChange = { fullName = it }) }
                Field(label = "LSK registration number", hint = "Found on your LSK practicing certificate.") {
                    AppTextField(value = lskNumber, onValueChange = { lskNumber = it }, placeholder = "LSK/A/12345")
                }
            }
            Field(label = if (isLogin) "Email or LSK number" else "Email address") {
                AppTextField(value = identifier, onValueChange = { identifier = it })
            }
            if (!isLogin) {
                Field(label = "Phone number (optional)") { AppTextField(value = phone, onValueChange = { phone = it }) }
            }
            Field(label = "Password") {
                AppTextField(value = password, onValueChange = { password = it }, visualTransformation = PasswordVisualTransformation())
            }
            if (!isLogin) {
                Field(label = "Confirm password") {
                    AppTextField(value = confirmPassword, onValueChange = { confirmPassword = it }, visualTransformation = PasswordVisualTransformation())
                }
            }

            if (error != null) Text(error!!, color = Error, fontSize = 12.sp)

            PrimaryButton(text = if (isLogin) "Sign in" else "Register practice", onClick = ::submit, loading = loading)
        }
    }
}
