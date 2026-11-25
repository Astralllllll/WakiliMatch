import { describe, expect, it } from "vitest";
import { isLawyerProfileComplete, validateLawyerProfilePayload } from "./lawyerProfileValidation.js";

const VALID_PAYLOAD = {
  biography: "A".repeat(60),
  specializations: "Employment & Labour",
  county: "Nairobi",
  languages: "English, Kiswahili",
  years_of_experience: 5,
};

describe("validateLawyerProfilePayload", () => {
  it("accepts a fully valid payload", () => {
    expect(validateLawyerProfilePayload(VALID_PAYLOAD)).toEqual({});
  });

  it("rejects a missing biography", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, biography: "" });
    expect(errors.biography).toBeTruthy();
  });

  it("rejects a biography under 50 characters", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, biography: "Too short." });
    expect(errors.biography).toMatch(/50 and 1000/);
  });

  it("rejects a biography over 1000 characters", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, biography: "A".repeat(1001) });
    expect(errors.biography).toMatch(/50 and 1000/);
  });

  it("rejects empty specializations", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, specializations: "" });
    expect(errors.specializations).toBeTruthy();
  });

  it("accepts the web app's generic category labels for specializations", () => {
    // Regression guard: the shared validator must not restrict
    // specializations to the AI engine's 7 labels, or the existing web
    // onboarding flow (which sends labels like "Family Law") would break.
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, specializations: "Family Law, Property Law" });
    expect(errors.specializations).toBeUndefined();
  });

  it("does not require county or languages (web's existing onboarding never sends county)", () => {
    const payloadWithoutCountyOrLanguages = { ...VALID_PAYLOAD };
    delete payloadWithoutCountyOrLanguages.county;
    delete payloadWithoutCountyOrLanguages.languages;
    const errors = validateLawyerProfilePayload(payloadWithoutCountyOrLanguages);
    expect(errors.county).toBeUndefined();
    expect(errors.languages).toBeUndefined();
  });

  it("rejects a negative years_of_experience", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, years_of_experience: -1 });
    expect(errors.years_of_experience).toBeTruthy();
  });

  it("rejects years_of_experience over 60", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, years_of_experience: 61 });
    expect(errors.years_of_experience).toBeTruthy();
  });

  it("accepts years_of_experience of exactly 0 (web's default when blank)", () => {
    const errors = validateLawyerProfilePayload({ ...VALID_PAYLOAD, years_of_experience: 0 });
    expect(errors.years_of_experience).toBeUndefined();
  });

  it("rejects a missing years_of_experience", () => {
    const payloadWithoutYears = { ...VALID_PAYLOAD };
    delete payloadWithoutYears.years_of_experience;
    const errors = validateLawyerProfilePayload(payloadWithoutYears);
    expect(errors.years_of_experience).toBeTruthy();
  });
});

describe("isLawyerProfileComplete", () => {
  it("is false for null", () => {
    expect(isLawyerProfileComplete(null)).toBe(false);
  });

  it("is false when biography is missing", () => {
    expect(isLawyerProfileComplete({ biography: "", specializations: "Employment & Labour" })).toBe(false);
  });

  it("is false when specializations is missing", () => {
    expect(isLawyerProfileComplete({ biography: "A".repeat(60), specializations: "" })).toBe(false);
  });

  it("is true when both biography and specializations are present", () => {
    expect(isLawyerProfileComplete({ biography: "A".repeat(60), specializations: "Criminal" })).toBe(true);
  });
});
