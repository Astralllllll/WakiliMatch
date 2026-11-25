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

// All 47 real Kenyan counties (Deliverable 4, bug 2) - kept in sync by hand
// with legalmatch/services/countyValidator.js's KENYAN_COUNTIES, the
// canonical source. The previous 15-entry list wrongly listed Eldoret and
// Thika (towns, not counties) as if they were their own counties.
val KENYAN_COUNTIES = listOf(
    "Nairobi", "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu",
    "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo",
    "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni",
    "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana",
    "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet",
    "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
    "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
    "Homa Bay", "Migori", "Kisii", "Nyamira",
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
