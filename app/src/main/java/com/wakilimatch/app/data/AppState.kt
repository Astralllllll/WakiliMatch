package com.wakilimatch.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * In-progress case data carried across the Post-a-Case screens, mirroring
 * legalmatch/src/context/CaseContext.jsx field-for-field (same purpose:
 * the AI Assistant/Scan Document screens fill this in, the category/
 * details steps edit it, /generate's result - including xai, which a
 * reopened case fetched via GET never has - lives here too).
 */
class CaseState {
    var legalCategory by mutableStateOf("")
    var title by mutableStateOf("")
    var jurisdiction by mutableStateOf("")
    var description by mutableStateOf("")
    var urgencyLevel by mutableStateOf("")
    var budgetMin by mutableStateOf("")
    var budgetMax by mutableStateOf("")

    var caseId: String? by mutableStateOf(null)
    var matches: List<MatchResult> by mutableStateOf(emptyList())
    var status: String? by mutableStateOf(null)
    var message: String? by mutableStateOf(null)
    var exampleQueries: List<String> by mutableStateOf(emptyList())
    var xai: XaiBlock? by mutableStateOf(null)

    fun reset() {
        legalCategory = ""; title = ""; jurisdiction = ""; description = ""
        urgencyLevel = ""; budgetMin = ""; budgetMax = ""
        caseId = null; matches = emptyList(); status = null; message = null
        exampleQueries = emptyList(); xai = null
    }
}

/** Single app-level state holder, created once in MainActivity and passed
 * down through the nav graph - replaces prop-drilling a dozen individual
 * callbacks, same role as React Context played in the web app. */
class AppState {
    var currentUser: User? by mutableStateOf(null)
    var selectedMatch: MatchResult? by mutableStateOf(null)
    var selectedLawyerCase: LawyerCaseView? by mutableStateOf(null)
    val caseState = CaseState()
}
