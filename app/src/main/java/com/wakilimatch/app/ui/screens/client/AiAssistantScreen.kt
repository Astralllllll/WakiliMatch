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
import com.wakilimatch.app.data.DraftCaseRequest
import com.wakilimatch.app.data.DraftCaseResponse
import com.wakilimatch.app.ui.components.*
import com.wakilimatch.app.ui.theme.ErrorRed
import com.wakilimatch.app.ui.theme.Navy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class Question(val key: String, val prompt: String)

private val QUESTIONS = listOf(
    Question("whatHappened", "Hi! Tell me what happened and I'll help structure your case."),
    Question("when", "When did this happen?"),
    Question("noticeOrSeverance", "Was any notice or severance given, if relevant to your situation?"),
    Question("location", "Which county is this in?"),
)

private data class ChatMessage(val text: String, val role: ChatRole)

/**
 * Chat intake (brief sections B3/B6). Mock provider only asks these four
 * fixed questions and templates the answers back - never gives legal
 * advice or predicts outcomes (services/aiAssist.js's guardrail, mirrored
 * here by construction: there is no free-form generation at all).
 */
@Composable
fun AiAssistantScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onSwitchToScan: () -> Unit,
    onSkipManual: () -> Unit,
    onContinue: (DraftCaseResponse) -> Unit,
) {
    var step by remember { mutableIntStateOf(0) }
    val answers = remember { mutableStateMapOf<String, String>() }
    var input by remember { mutableStateOf("") }
    var drafting by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf<DraftCaseResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    // Deliverable 4, bug 2: re-ask once if the location answer doesn't
    // resolve to a real county, never a third time (the case form's own
    // county picker is the fallback after that).
    var clarifyQuestion by remember { mutableStateOf<String?>(null) }
    var clarifyAnswer by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val messages = remember(step, answers.toMap(), clarifyQuestion, clarifyAnswer) {
        val list = mutableListOf<ChatMessage>()
        for (i in 0..step) {
            list.add(ChatMessage(QUESTIONS[i].prompt, ChatRole.AI))
            answers[QUESTIONS[i].key]?.let { list.add(ChatMessage(it, ChatRole.ME)) }
        }
        clarifyQuestion?.let { q ->
            list.add(ChatMessage(q, ChatRole.AI))
            clarifyAnswer?.let { list.add(ChatMessage(it, ChatRole.ME)) }
        }
        list
    }

    fun submitDraft(theAnswers: Map<String, String>, allowClarify: Boolean) {
        drafting = true
        error = null
        scope.launch {
            try {
                val resp = withContext(Dispatchers.IO) { apiService.draftCase(DraftCaseRequest(theAnswers)) }
                val body = resp.body()
                if (!resp.isSuccessful || body == null) {
                    error = "Could not draft your case automatically — you can still continue manually."
                    return@launch
                }
                if (allowClarify && body.jurisdictionNeedsClarification) {
                    clarifyQuestion = if (body.jurisdictionCandidates.size > 1) {
                        "Did this happen in ${body.jurisdictionCandidates.joinToString(" or ")}?"
                    } else {
                        "Which town or county is that in? For example Nairobi, Mombasa or Kiambu."
                    }
                    return@launch
                }
                draft = body
            } catch (e: Exception) {
                error = "Could not draft your case automatically — you can still continue manually."
            } finally {
                drafting = false
            }
        }
    }

    fun send() {
        if (input.isBlank() || drafting) return

        if (clarifyQuestion != null && clarifyAnswer == null) {
            answers["location"] = input.trim()
            clarifyAnswer = input.trim()
            input = ""
            submitDraft(answers.toMap(), allowClarify = false)
            return
        }

        val key = QUESTIONS[step].key
        answers[key] = input.trim()
        input = ""

        if (step + 1 < QUESTIONS.size) {
            step += 1
            return
        }

        submitDraft(answers.toMap(), allowClarify = true)
    }

    AppScreen {
        TitleBar(title = "AI Assistant", onBack = onBack, actionLabel = "Scan", onAction = onSwitchToScan)
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(messages) { m -> ChatBubble(text = m.text, role = m.role) }
                if (drafting) item { ChatBubble(text = "Drafting your case…", role = ChatRole.AI) }
                draft?.let { d ->
                    item {
                        val parts = listOfNotNull(
                            d.matchedArea?.let { "$it, " },
                            d.jurisdiction?.let { "$it, " },
                            d.urgency?.let { "$it urgency" } ?: "ready for review",
                        ).joinToString("")
                        ChatBubble(text = "Drafted your case as $parts. Review before continuing?", role = ChatRole.DRAFT)
                    }
                }
            }

            if (error != null) {
                Text(error!!, color = ErrorRed, fontSize = 12.sp, modifier = Modifier.padding(vertical = 6.dp))
            }

            if (draft == null) {
                Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    AppTextField(
                        value = input,
                        onValueChange = { input = it },
                        placeholder = "Type your message…",
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { send() }, enabled = !drafting && input.isNotBlank()) {
                        Text("Send", color = Navy)
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
