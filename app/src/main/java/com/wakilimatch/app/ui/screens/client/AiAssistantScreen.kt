package com.wakilimatch.app.ui.screens.client

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakilimatch.app.data.ApiService
import com.wakilimatch.app.data.AssistantState
import com.wakilimatch.app.data.AssistantTurnRequest
import com.wakilimatch.app.data.DraftCaseResponse
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.Error
import com.wakilimatch.app.ui.theme.PrimaryLight
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val GREETING = "Hi! Tell me what happened and I'll help structure your case."

private data class ChatMessage(val text: String, val role: ChatRole)

/**
 * Adaptive chat intake (Deliverable 4, section 5) - replaces the old fixed
 * four-question script. Every turn is one call to
 * POST /api/ai/assistant-turn; the server picks the next question (or
 * decides it's ready to draft) based on the practice area and whatever
 * case_facts slots are still missing - see services/assistantEngine.js.
 * The mock provider never gives legal advice or predicts outcomes
 * (declines "will I win?"-style questions but keeps gathering facts).
 */
@Composable
fun AiAssistantScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onSwitchToScan: () -> Unit,
    onSkipManual: () -> Unit,
    onContinue: (DraftCaseResponse) -> Unit,
) {
    val messages = remember { mutableStateListOf(ChatMessage(GREETING, ChatRole.AI)) }
    var conversationState by remember { mutableStateOf(AssistantState()) }
    var input by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf<DraftCaseResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun send() {
        if (input.isBlank() || sending) return
        val userMessage = input.trim()
        messages.add(ChatMessage(userMessage, ChatRole.ME))
        input = ""
        sending = true
        error = null

        scope.launch {
            try {
                val resp = withContext(Dispatchers.IO) {
                    apiService.assistantTurn(AssistantTurnRequest(conversationState, userMessage))
                }
                val body = resp.body()
                if (!resp.isSuccessful || body == null) {
                    error = "Could not reach the assistant — you can still continue manually."
                    return@launch
                }
                conversationState = body.state ?: conversationState
                body.reply?.let { messages.add(ChatMessage(it, if (body.readyToDraft) ChatRole.DRAFT else ChatRole.AI)) }
                if (body.readyToDraft) draft = body.draft
            } catch (e: Exception) {
                error = "Could not reach the assistant — you can still continue manually."
            } finally {
                sending = false
            }
        }
    }

    AppScreen {
        TitleBar(title = "AI Assistant", onBack = onBack, actionLabel = "Scan", onAction = onSwitchToScan)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(messages) { m -> ChatBubble(text = m.text, role = m.role) }
                if (sending) item { ChatBubble(text = "Thinking…", role = ChatRole.AI) }
                if (draft != null) item { Text("Review before continuing?", fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp)) }
            }

            if (error != null) {
                Text(error!!, color = Error, fontSize = 12.sp, modifier = Modifier.padding(vertical = 6.dp))
            }

            if (draft == null) {
                Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    AppTextField(
                        value = input,
                        onValueChange = { input = it },
                        placeholder = "Type your message…",
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { send() }, enabled = !sending && input.isNotBlank()) {
                        Text("Send", color = PrimaryLight)
                    }
                }
                TextButton(onClick = onSkipManual, modifier = Modifier.fillMaxWidth()) {
                    Text("Prefer to enter details manually instead?", fontSize = 11.sp)
                }
            } else {
                Spacer(modifier = Modifier.height(8.dp))
                PrimaryButton(text = "Review & continue →", onClick = { onContinue(draft!!) })
            }
        }
    }
}
