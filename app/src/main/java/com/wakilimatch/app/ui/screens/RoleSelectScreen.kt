package com.wakilimatch.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.ui.components.AppScreen
import com.wakilimatch.app.ui.components.PrimaryButton
import com.wakilimatch.app.ui.theme.Navy
import com.wakilimatch.app.ui.theme.Slate

@Composable
fun RoleSelectScreen(onClient: () -> Unit, onLawyer: () -> Unit) {
    AppScreen {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("WakiliMatch", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Navy)
            Text(
                "How can we help you today?",
                fontSize = 13.sp,
                color = Slate,
                modifier = Modifier.padding(top = 6.dp, bottom = 28.dp),
            )
            PrimaryButton(text = "I need a lawyer", onClick = onClient)
            Spacer(modifier = Modifier.height(10.dp))
            PrimaryButton(text = "I am a lawyer", onClick = onLawyer)
        }
    }
}
