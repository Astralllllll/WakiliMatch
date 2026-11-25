package com.wakilimatch.app.data

/**
 * Mirrors legalmatch/src/context/CaseContext.jsx's LEGAL_CATEGORIES /
 * KENYAN_COUNTIES / URGENCY_LEVELS exactly - same value strings, since
 * these are the literal values ClientIssues' CHECK constraints accept.
 *
 * Fixes a real bug in the pre-existing SubmitIssueScreen: it sent display
 * labels like "Family Law" as legal_category, which don't match the DB's
 * lowercase enum (criminal|family|property|employment|corporate|
 * immigration) at all.
 */
data class LegalCategoryOption(val value: String, val label: String)

val LEGAL_CATEGORIES = listOf(
    LegalCategoryOption("criminal", "Criminal Law"),
    LegalCategoryOption("family", "Family Law"),
    LegalCategoryOption("property", "Property & Real Estate"),
    LegalCategoryOption("employment", "Employment Law"),
    LegalCategoryOption("corporate", "Corporate & Commercial"),
    LegalCategoryOption("immigration", "Immigration"),
)

val KENYAN_COUNTIES = listOf(
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret",
    "Nyeri", "Meru", "Thika", "Machakos", "Kisii",
    "Garissa", "Kakamega", "Kilifi", "Lamu", "Marsabit",
)

// LawyerProfiles.specializations is free TEXT (no CHECK constraint), so
// these are just the AI engine's own practice-area labels (engine/labelling.py)
// for the Android lawyer onboarding screen's multi-select - matching these
// to the engine's categories (not the client-side case-posting LEGAL_CATEGORIES
// above) lets a lawyer's specializations line up with how cases get classified.
val LAWYER_SPECIALIZATIONS = listOf(
    "Employment & Labour", "Land & Property", "Family & Succession",
    "Criminal", "Commercial & Contract", "Constitutional & Administrative", "Tax",
)

data class UrgencyOption(val value: String, val label: String, val description: String)

val URGENCY_LEVELS = listOf(
    UrgencyOption("low", "Not urgent", "Within the next few months"),
    UrgencyOption("medium", "Moderately urgent", "Within the next few weeks"),
    UrgencyOption("high", "Urgent", "Within the next few days"),
    UrgencyOption("critical", "Critical", "Immediate assistance needed"),
)
