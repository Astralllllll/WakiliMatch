/**
 * services/lawyerProfileValidation.js
 *
 * Server-side validation for POST /api/profiles/lawyer (Deliverable 4,
 * bug 1). Mirrors the bounds LawyerOnboarding.jsx already enforces
 * client-side (biography length, specializations non-empty) so legitimate
 * web submissions are unaffected, and adds the same checks for the new
 * Android onboarding screen, which had no client-side validation at all.
 *
 * Deliberately permissive on `specializations`: the web app's existing
 * onboarding sends generic categories ("Family Law", "Employment Law", …)
 * while the new Android onboarding sends the AI engine's own area labels
 * ("Employment & Labour", …). Enforcing one fixed set here would break
 * whichever client doesn't use it, so this only requires a non-empty value,
 * not membership in a specific list.
 *
 * `county` and `languages` are required by the Android onboarding screen's
 * own client-side validation, but NOT enforced here: the existing web
 * onboarding (`LawyerOnboarding.jsx`) never collects a county at all and
 * never requires languages, so making either required server-side would
 * reject real, already-working web submissions. When a county IS given, it
 * goes through the same resolveCounty() validator as everywhere else
 * (Deliverable 4, bug 2) rather than being stored as free text.
 */
import { resolveCounty } from './countyValidator.js';

const BIOGRAPHY_MIN = 50;
const BIOGRAPHY_MAX = 1000;
const MAX_YEARS_EXPERIENCE = 60;
const MAX_FREE_TEXT = 255;

/** @returns {{errors: object, resolvedCounty: string|null}} */
export function validateLawyerProfilePayload(payload) {
  const errors = {};
  const p = payload || {};

  const biography = (p.biography || '').trim();
  if (!biography) {
    errors.biography = 'Biography is required.';
  } else if (biography.length < BIOGRAPHY_MIN || biography.length > BIOGRAPHY_MAX) {
    errors.biography = `Biography must be between ${BIOGRAPHY_MIN} and ${BIOGRAPHY_MAX} characters.`;
  }

  if (!(p.specializations || '').trim()) {
    errors.specializations = 'Select at least one practice area.';
  }

  let resolvedCounty = null;
  if (p.county !== undefined && p.county !== null && String(p.county).trim() !== '') {
    if (String(p.county).length > MAX_FREE_TEXT) {
      errors.county = `County must be ${MAX_FREE_TEXT} characters or fewer.`;
    } else {
      const resolution = resolveCounty(p.county);
      if (resolution.status !== 'resolved') {
        errors.county = 'County must be a recognized Kenyan county.';
      } else {
        resolvedCounty = resolution.county;
      }
    }
  }

  if (p.languages !== undefined && p.languages !== null && String(p.languages).length > MAX_FREE_TEXT) {
    errors.languages = `Languages must be ${MAX_FREE_TEXT} characters or fewer.`;
  }

  if (p.years_of_experience === undefined || p.years_of_experience === null || p.years_of_experience === '') {
    errors.years_of_experience = 'Years of experience is required.';
  } else {
    const years = Number(p.years_of_experience);
    if (!Number.isInteger(years) || years < 0 || years > MAX_YEARS_EXPERIENCE) {
      errors.years_of_experience = `Years of experience must be a whole number between 0 and ${MAX_YEARS_EXPERIENCE}.`;
    }
  }

  return { errors, resolvedCounty };
}

export function isLawyerProfileComplete(profile) {
  if (!profile) return false;
  return Boolean((profile.biography || '').trim()) && Boolean((profile.specializations || '').trim());
}
