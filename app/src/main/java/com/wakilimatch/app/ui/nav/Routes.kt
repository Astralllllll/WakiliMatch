package com.wakilimatch.app.ui.nav

/** Route names for the nav graph (brief section B3's screen list). Kept as
 * plain string constants - no args encoded in the route itself, since all
 * cross-screen data flows through AppState/CaseState instead. */
object Routes {
    const val ROLE_SELECT = "role_select"

    const val CLIENT_LOGIN = "client_login"
    const val CLIENT_DASHBOARD = "client_dashboard"
    const val CLIENT_MY_CASES = "client_my_cases"
    const val AI_ASSISTANT = "ai_assistant"
    const val SCAN_DOCUMENT = "scan_document"
    const val POST_CASE_CATEGORY = "post_case_category"
    const val POST_CASE_DETAILS = "post_case_details"
    const val MATCH_RESULTS = "match_results"
    const val LAWYER_PROFILE_VIEW = "lawyer_profile_view"

    const val LAWYER_LOGIN = "lawyer_login"
    const val LAWYER_ONBOARDING = "lawyer_onboarding"
    const val LAWYER_DASHBOARD = "lawyer_dashboard"
    const val LAWYER_INQUIRIES = "lawyer_inquiries"
    const val LAWYER_MY_CASES = "lawyer_my_cases"
    const val LAWYER_CASE_DETAIL = "lawyer_case_detail"
    const val LAWYER_OWN_PROFILE = "lawyer_own_profile"
}
