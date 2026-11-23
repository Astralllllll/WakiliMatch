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
    val issue_status: String?,
    val match_status: String?,
    val lawyer_name: String?,
    val created_at: String?
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
    val academic_qualifications: String? = null,
    val years_of_experience: Int? = null,
    val specializations: String? = null,
    val previous_cases_handled: Int? = null,
    val price_guidance: String? = null,
    val success_rate: String? = null
)
