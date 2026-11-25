-- Migration 002: Add LawyerProfiles.county (additive only)
-- Supports the Android lawyer onboarding screen's "County / jurisdiction"
-- field (Deliverable 4, bug 1). Nullable so existing rows stay valid; the
-- web app does not collect this field yet, so it is never required
-- server-side (see services/lawyerProfileValidation.js).

ALTER TABLE LawyerProfiles ADD COLUMN IF NOT EXISTS county VARCHAR(100);
