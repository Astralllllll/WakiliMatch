package com.wakilimatch.app.data

data class HealthResponse(
    val ok: Boolean,
    val message: String
)

data class User(
    val id: String,
    val fullName: String?,
    val email: String,
    val phone: String? = null,
    val role: String,
    val lskNumber: String? = null
)

data class AuthResponse(
    val user: User? = null,
    val error: String? = null,
    val field: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class LawyerLoginRequest(
    val identifier: String,
    val password: String
)

data class RegisterClientRequest(
    val fullName: String,
    val email: String,
    val phone: String?,
    val password: String
)

data class RegisterLawyerRequest(
    val fullName: String,
    val lskNumber: String,
    val email: String,
    val phone: String?,
    val password: String
)

data class Issue(
    val issue_id: String,
    val issue_title: String,
    val issue_description: String,
    val legal_category: String?,
    val jurisdiction: String?,
    val urgency_level: String?,
    val issue_status: String? = null,
    val match_status: String? = null,
    val lawyer_name: String? = null,
    val lawyer_id: String? = null,
    val match_id: String? = null,
    val review_created_at: String? = null,
    val ai_summary: String? = null,
    val created_at: String? = null
)

data class ClientIssuesResponse(
    val issues: List<Issue>? = null,
    val error: String? = null
)

data class CreateIssueRequest(
    val client_id: String,
    val issue_title: String,
    val issue_description: String,
    val legal_category: String?,
    val jurisdiction: String?,
    val urgency_level: String?,
    val budget_range: String? = null,
    val budget_min: Double? = null,
    val budget_max: Double? = null
)

data class CreateIssueResponse(
    val message: String? = null,
    val issue: Issue? = null,
    val error: String? = null
)

data class Lawyer(
    val profile_id: String? = null,
    val user_id: String,
    val full_name: String? = null,
    val lsk_registration_number: String? = null,
    val biography: String? = null,
    val academic_qualifications: String? = null,
    val institutions: String? = null,
    val courts: String? = null,
    val languages: String? = null,
    val years_of_experience: Int? = null,
    val firm_name: String? = null,
    val county: String? = null,
    val specializations: String? = null,
    val previous_cases_handled: Int? = null,
    val price_guidance: String? = null,
    // NUMERIC columns come back from node-postgres as JSON strings, not
    // numbers (unlike FLOAT) - these are deliberately String, parse with
    // toDoubleOrNull() at the point of use, not Double here.
    val success_rate: String? = null,
    val average_rating: String? = null,
    val total_reviews: Int? = null,
    val is_verified: Boolean? = null
)

// ─── XAI (brief section A3/B4) ──────────────────────────────────────────────

data class TopPrecedent(
    val title: String?,
    val court: String?,
    val year: Int?,
    val url: String?,
    val similarity_pct: Double,
)

data class XaiBlock(
    val matched_area: String?,
    val precedent_count: Int,
    val threshold: Double,
    val top_precedent: TopPrecedent?,
    val explanation: String,
)

data class PrecedentCaseRef(
    val title: String?,
    val court: String? = null,
    val year: Int? = null,
    val url: String? = null,
    val similarity_pct: Double? = null,
)

data class WhyComponents(
    val profile_semantic: Double? = null,
    val precedent: Double? = null,
    val category: Double? = null,
    val jurisdiction: Double? = null,
    val history: Double? = null,
)

data class Why(
    val semantic_pct: Double?,
    val precedent_cases: List<PrecedentCaseRef> = emptyList(),
    val components: WhyComponents? = null,
    val plain_text: String,
)

data class ComponentScores(
    val semantic: Double? = null,
    val precedent: Double? = null,
    val category: Double? = null,
    val jurisdiction: Double? = null,
    val caseHistory: Double? = null,
)

// ─── Matches (brief sections A1-A4, B4) ─────────────────────────────────────

data class MatchResult(
    val match_id: String,
    val issue_id: String? = null,
    val client_id: String? = null,
    val lawyer_id: String,
    val status: String? = null,
    val similarity_score: Double? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
    val full_name: String? = null,
    val lsk_registration_number: String? = null,
    val biography: String? = null,
    val years_of_experience: Int? = null,
    val specializations: String? = null,
    val academic_qualifications: String? = null,
    val courts: String? = null,
    val languages: String? = null,
    val price_guidance: String? = null,
    val average_rating: String? = null, // NUMERIC column - see Lawyer.average_rating comment
    val total_reviews: Int? = null,
    val previous_cases_handled: Int? = null,
    val match_reason: String? = null,
    val warning: String? = null,
    val why: Why? = null,
    val component_scores: ComponentScores? = null,
)

data class GenerateMatchesRequest(
    val client_id: String,
    val issue_id: String,
    val issue_text: String,
)

data class GenerateMatchesResponse(
    val message: String? = null,
    val matches: List<MatchResult> = emptyList(),
    val status: String? = null,
    val example_queries: List<String> = emptyList(),
    val xai: XaiBlock? = null,
    val no_good_match: Boolean? = null,
    val unsupported_language: Boolean? = null,
    val error: String? = null,
)

data class IssueMatchesResponse(
    val matches: List<MatchResult> = emptyList(),
    val error: String? = null,
)

data class SelectLawyerRequest(val issue_id: String, val lawyer_id: String)
data class SelectLawyerResponse(val selected_match: Map<String, Any?>? = null, val error: String? = null)

data class MatchDecisionRequest(val match_id: String, val lawyer_id: String, val decision: String)
data class MatchDecisionResponse(val message: String? = null, val match: Map<String, Any?>? = null, val error: String? = null)

// ─── Lawyer-side case view with privacy gating (brief section B5) ─────────

data class LawyerCaseView(
    val match_id: String,
    val status: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
    val similarity_score: Double? = null,
    val details_confirmed: Boolean = false,
    val issue_title: String? = null,
    val legal_category: String? = null,
    val ai_summary: String? = null,
    val issue_description: String? = null,
    val jurisdiction: String? = null,
    val urgency_level: String? = null,
    val budget_range: String? = null,
    val budget_min: String? = null, // NUMERIC(12,2) - comes back as a string, see Lawyer.average_rating comment
    val budget_max: String? = null,
    val client_id: String? = null,
    val client_email: String? = null,
    val client_display_name: String? = null,
    val rating: String? = null, // AVG(...)::numeric(3,2) - also a string
    val review_count: Int? = null,
    val review_comment: String? = null,
    val review_created_at: String? = null,
)

data class LawyerCasesResponse(val cases: List<LawyerCaseView> = emptyList(), val error: String? = null)
data class LawyerCaseDetailResponse(val case: LawyerCaseView? = null, val error: String? = null)

data class PastCase(
    val case_id: String,
    val lawyer_id: String? = null,
    val case_type: String,
    val jurisdiction: String,
    val case_year: Int,
    val outcome_note: String? = null,
    val outcome_tag: String? = null,
)

data class PastCasesResponse(val pastCases: List<PastCase> = emptyList(), val error: String? = null)

// ─── Lawyer onboarding / profile edit (Deliverable 4, bug 1 - Android) ──────

data class SaveLawyerProfileRequest(
    val user_id: String,
    val lsk_registration_number: String,
    val full_name: String? = null,
    val biography: String,
    val specializations: String,
    val years_of_experience: Int,
    val firm_name: String? = null,
    val county: String? = null,
    val languages: String? = null,
)

data class SaveLawyerProfileResponse(
    val message: String? = null,
    val profile: Lawyer? = null,
    val error: String? = null,
    val fieldErrors: Map<String, String>? = null,
)

data class AddPastCaseRequest(
    val case_type: String,
    val jurisdiction: String,
    val case_year: Int,
    val outcome_note: String,
)

data class AddPastCaseResponse(
    val message: String? = null,
    val pastCase: PastCase? = null,
    val error: String? = null,
)

// ─── AI provider interface (brief section B6) ───────────────────────────────

data class AiStatusResponse(val provider: String)

data class DraftCaseRequest(val answers: Map<String, String>)

data class DraftCaseResponse(
    val title: String? = null,
    val description: String? = null,
    val jurisdiction: String? = null,
    val urgency: String? = null,
    val isAiGenerated: Boolean = false,
    val category: String? = null,
    val categorySource: String? = null,
    val matchedArea: String? = null,
    val error: String? = null,
)
