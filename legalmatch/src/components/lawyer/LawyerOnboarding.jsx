import React, { useEffect, useRef, useState } from "react";
import {
  addPastCase,
  deletePastCase,
  getLawyerProfile,
  getPastCases,
  saveLawyerProfile,
  updatePastCase,
} from "../auth/authApi";

// ─── Design tokens ───────────────────────────────────────────────────────────
const NAVY = "#0F2744";
const GREEN = "#1D9E75";
const GREEN_LIGHT = "#5DCAA5";
const BORDER = "#E2E8F0";
const BORDER_INPUT = "#CBD5E1";
const TEXT_MUTED = "#64748B";
const TEXT_HINT = "#94A3B8";
const ERROR = "#E24B4A";
const BG = "#F8FAFC";

// ─── Shared input style ───────────────────────────────────────────────────────
const baseInputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: `1px solid ${BORDER_INPUT}`,
  borderRadius: "8px",
  background: "white",
  color: NAVY,
  fontSize: "14px",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

// ─── Reusable primitives ──────────────────────────────────────────────────────
function Field({ label, hint, error, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "13px", fontWeight: 600, color: NAVY }}>
        {label}
        {required && <span style={{ color: ERROR, marginLeft: "3px" }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ margin: 0, fontSize: "11px", color: TEXT_HINT }}>{hint}</p>
      )}
      {error && (
        <p style={{ margin: 0, fontSize: "11px", color: ERROR }}>{error}</p>
      )}
    </div>
  );
}

function useInputHandlers(hasError, setErrors, field) {
  return {
    onFocus(e) {
      e.target.style.borderColor = GREEN;
      e.target.style.boxShadow = "0 0 0 3px #E1F5EE";
    },
    onBlur(e) {
      e.target.style.borderColor = hasError ? ERROR : BORDER_INPUT;
      e.target.style.boxShadow = "none";
      if (field && setErrors) {
        // clear error on blur if now valid
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
  };
}

function StyledInput({ value, onChange, placeholder, type = "text", hasError, min, max }) {
  const handlers = useInputHandlers(hasError);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      style={{ ...baseInputStyle, borderColor: hasError ? ERROR : BORDER_INPUT }}
      {...handlers}
    />
  );
}

function StyledTextarea({ value, onChange, placeholder, rows = 3, hasError }) {
  const handlers = useInputHandlers(hasError);
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        ...baseInputStyle,
        resize: "vertical",
        lineHeight: "1.5",
        borderColor: hasError ? ERROR : BORDER_INPUT,
      }}
      {...handlers}
    />
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        justifyContent: "center",
        marginBottom: "24px",
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              width: i < current ? "28px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: i < current ? GREEN : i === current - 1 ? GREEN : BORDER_INPUT,
              transition: "all .2s",
            }}
          />
        </React.Fragment>
      ))}
      <span style={{ fontSize: "12px", color: TEXT_MUTED, marginLeft: "4px" }}>
        Step {current} of {total}
      </span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <p
      style={{
        margin: "4px 0 0",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: ".07em",
        color: TEXT_MUTED,
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "4px 0" }} />;
}

// ─── Logo mark ───────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginBottom: "18px",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "6px",
          background: NAVY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2L3 6v4c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V6L9 2z"
            fill="white"
            fillOpacity=".9"
          />
        </svg>
      </div>
      <span style={{ fontWeight: 600, fontSize: "15px", color: NAVY }}>WakiliMatch</span>
    </div>
  );
}

// ─── Primary / secondary buttons ──────────────────────────────────────────────
function PrimaryButton({ children, onClick, type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "11px",
        borderRadius: "8px",
        background: disabled ? GREEN_LIGHT : GREEN,
        color: "white",
        border: "none",
        fontSize: "14px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background .15s",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "11px",
        borderRadius: "8px",
        background: "white",
        color: NAVY,
        border: `1px solid ${BORDER_INPUT}`,
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEGAL_CATEGORIES = [
  "Family Law",
  "Property Law",
  "Criminal Law",
  "Employment Law",
  "Commercial Law",
  "Immigration Law",
  "Constitutional Law",
  "Tax Law",
  "Environmental Law",
  "Intellectual Property",
  "Banking & Finance",
  "Litigation",
];

const CURRENT_YEAR = new Date().getFullYear();

// ─── Validation helpers ───────────────────────────────────────────────────────
function validateStep(step, form) {
  const e = {};

  if (step === 1) {
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.biography.trim()) e.biography = "A brief biography is required.";
    if (form.biography.trim().length < 50)
      e.biography = "Biography should be at least 50 characters.";
  }

  if (step === 2) {
    if (!form.specializations.length)
      e.specializations = "Select at least one area of specialisation.";
    if (!form.yearsOfExperience && form.yearsOfExperience !== 0)
      e.yearsOfExperience = "Years of experience is required.";
    else if (Number(form.yearsOfExperience) < 0)
      e.yearsOfExperience = "Cannot be negative.";
    else if (Number(form.yearsOfExperience) > 60)
      e.yearsOfExperience = "Enter a realistic number.";
  }

  if (step === 3) {
    if (!form.previousCasesHandled && form.previousCasesHandled !== 0)
      e.previousCasesHandled = "Required.";
    else if (Number(form.previousCasesHandled) < 0)
      e.previousCasesHandled = "Cannot be negative.";

    if (!form.successRate && form.successRate !== 0)
      e.successRate = "Required.";
    else if (Number(form.successRate) < 0 || Number(form.successRate) > 100)
      e.successRate = "Must be 0–100.";

    if (!form.priceGuidance.trim())
      e.priceGuidance = "Provide your fee guidance.";

    const validCaseTypes = new Set();
    form.pastCases.forEach((entry, i) => {
      const hasAny = entry.caseType || entry.jurisdiction.trim() || entry.caseYear || entry.outcomeNote.trim();
      if (!hasAny) return; // fully empty row — fine, it's just skipped on submit

      if (!entry.caseType || !entry.jurisdiction.trim() || !entry.caseYear || entry.outcomeNote.trim().length < 5) {
        e[`pastCase_${i}`] =
          "Fill in case type, jurisdiction, year, and at least a 5-character description — or clear the row entirely.";
        return;
      }

      const year = Number(entry.caseYear);
      if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR) {
        e[`pastCase_${i}`] = `Year must be between 1950 and ${CURRENT_YEAR}.`;
        return;
      }

      validCaseTypes.add(entry.caseType);
    });

    // Require at least one valid case per selected specialisation — a
    // specialisation with zero supporting cases gives clients no way to
    // judge real experience in that area.
    const missingSpecs = form.specializations.filter((spec) => !validCaseTypes.has(spec));
    if (missingSpecs.length) {
      e.pastCasesCoverage = `Add at least one case for each specialisation you selected — missing: ${missingSpecs.join(", ")}.`;
    }
  }

  return e;
}

// Joins the lawyer's individual case entries into one summary string —
// used both for the searchable profileText blob and as the legacy
// case_type_descriptions column (PastCases holds the structured version).
function buildCaseSummaries(pastCases) {
  return (pastCases || [])
    .filter((c) => c.outcomeNote && c.outcomeNote.trim().length >= 5 && c.caseType)
    .map((c) => `${c.caseType} (${c.jurisdiction || "n/a"}, ${c.caseYear || "n/a"}): ${c.outcomeNote.trim()}`)
    .join(" | ");
}

// ─── Profile-text builder (mirrors proposal's profileText concept) ────────────
function buildProfileText(form) {
  const caseSummaries = buildCaseSummaries(form.pastCases);
  const parts = [
    form.fullName && `Name: ${form.fullName}`,
    form.biography && `Bio: ${form.biography}`,
    form.specializations.length && `Specialisations: ${form.specializations.join(", ")}`,
    form.academicQualifications && `Qualifications: ${form.academicQualifications}`,
    form.institutions && `Institutions: ${form.institutions}`,
    form.graduationYear && `Graduated: ${form.graduationYear}`,
    form.yearsOfExperience !== "" && `Years of experience: ${form.yearsOfExperience}`,
    caseSummaries && `Case history: ${caseSummaries}`,
    form.previousCasesHandled !== "" && `Cases handled: ${form.previousCasesHandled}`,
    form.successRate !== "" && `Success rate: ${form.successRate}%`,
    form.priceGuidance && `Pricing: ${form.priceGuidance}`,
    form.barAdmissionYear && `Bar admission: ${form.barAdmissionYear}`,
    form.courts && `Courts: ${form.courts}`,
    form.languages && `Languages: ${form.languages}`,
  ].filter(Boolean);
  return parts.join(" | ");
}

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function Step1Personal({ form, setForm, errors }) {
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionHeading>Personal information</SectionHeading>

      <Field label="Full name" error={errors.fullName} required>
        <StyledInput
          value={form.fullName}
          onChange={set("fullName")}
          placeholder="Amina Odhiambo"
          hasError={!!errors.fullName}
        />
      </Field>

      <Field
        label="Biography"
        hint="Describe your background, philosophy, and what makes you effective for clients."
        error={errors.biography}
        required
      >
        <StyledTextarea
          value={form.biography}
          onChange={set("biography")}
          placeholder="I am an advocate with over 10 years of experience in family and property law, passionate about providing equitable access to justice…"
          rows={5}
          hasError={!!errors.biography}
        />
        <p style={{ margin: 0, fontSize: "11px", color: TEXT_HINT, textAlign: "right" }}>
          {form.biography.length} chars
        </p>
      </Field>

      <Divider />
      <SectionHeading>Education</SectionHeading>

      <Field
        label="Academic qualifications"
        hint="e.g. LLB (Hons), LLM, Diploma in Arbitration"
      >
        <StyledInput
          value={form.academicQualifications}
          onChange={set("academicQualifications")}
          placeholder="LLB (Hons), LLM"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Institution(s)" hint="University or college name(s)">
          <StyledInput
            value={form.institutions}
            onChange={set("institutions")}
            placeholder="University of Nairobi"
          />
        </Field>

        <Field label="Graduation year">
          <StyledInput
            type="number"
            value={form.graduationYear}
            onChange={set("graduationYear")}
            placeholder={String(CURRENT_YEAR - 5)}
            min="1970"
            max={String(CURRENT_YEAR)}
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Bar admission year">
          <StyledInput
            type="number"
            value={form.barAdmissionYear}
            onChange={set("barAdmissionYear")}
            placeholder={String(CURRENT_YEAR - 3)}
            min="1970"
            max={String(CURRENT_YEAR)}
          />
        </Field>

        <Field label="Courts of appearance" hint="e.g. High Court, Court of Appeal">
          <StyledInput
            value={form.courts}
            onChange={set("courts")}
            placeholder="High Court, ELC"
          />
        </Field>
      </div>

      <Field label="Languages spoken" hint="Comma-separated">
        <StyledInput
          value={form.languages}
          onChange={set("languages")}
          placeholder="English, Kiswahili, Luo"
        />
      </Field>
    </div>
  );
}

function Step2Practice({ form, setForm, errors }) {
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleSpec = (spec) => {
    setForm((f) => {
      const already = f.specializations.includes(spec);
      return {
        ...f,
        specializations: already
          ? f.specializations.filter((s) => s !== spec)
          : [...f.specializations, spec],
      };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionHeading>Areas of specialisation</SectionHeading>

      <Field
        label="Select specialisations"
        hint="Choose all areas that apply to your practice."
        error={errors.specializations}
        required
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: "12px",
            border: `1px solid ${errors.specializations ? ERROR : BORDER_INPUT}`,
            borderRadius: "8px",
            background: "white",
          }}
        >
          {LEGAL_CATEGORIES.map((cat) => {
            const selected = form.specializations.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleSpec(cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: selected ? `1.5px solid ${GREEN}` : `1px solid ${BORDER_INPUT}`,
                  background: selected ? "#E6F7F1" : "white",
                  color: selected ? GREEN : TEXT_MUTED,
                  transition: "all .15s",
                }}
              >
                {selected && "✓ "}{cat}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Additional specialisations"
        hint="Any area not listed above — comma-separated."
      >
        <StyledInput
          value={form.extraSpecializations}
          onChange={set("extraSpecializations")}
          placeholder="Maritime Law, Sports Law"
        />
      </Field>

      <Divider />
      <SectionHeading>Experience</SectionHeading>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Years of experience" error={errors.yearsOfExperience} required>
          <StyledInput
            type="number"
            value={form.yearsOfExperience}
            onChange={set("yearsOfExperience")}
            placeholder="8"
            min="0"
            max="60"
            hasError={!!errors.yearsOfExperience}
          />
        </Field>

        <Field label="Current firm / organisation" hint="Leave blank if independent">
          <StyledInput
            value={form.firmName}
            onChange={set("firmName")}
            placeholder="Kariuki & Associates"
          />
        </Field>
      </div>
    </div>
  );
}

function PastCaseRow({ index, entry, onChange, onRemove, canRemove, specializationOptions, error }) {
  const set = (field) => (e) => onChange(index, field, e.target.value);

  return (
    <div
      style={{
        border: `1px solid ${error ? ERROR : BORDER}`,
        borderRadius: "10px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "#FBFCFE",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: NAVY }}>Case {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            style={{ border: "none", background: "none", color: ERROR, fontSize: "12px", cursor: "pointer", padding: 0 }}
          >
            Remove
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Case type" hint="From the specialisations you selected">
          <select value={entry.caseType} onChange={set("caseType")} style={baseInputStyle}>
            <option value="">Select…</option>
            {specializationOptions.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
            {entry.caseType && !specializationOptions.includes(entry.caseType) && (
              <option value={entry.caseType}>{entry.caseType} (no longer selected)</option>
            )}
          </select>
        </Field>

        <Field label="Jurisdiction / county">
          <StyledInput value={entry.jurisdiction} onChange={set("jurisdiction")} placeholder="Nairobi" />
        </Field>
      </div>

      <Field label="Year">
        <StyledInput
          type="number"
          value={entry.caseYear}
          onChange={set("caseYear")}
          placeholder={String(CURRENT_YEAR - 1)}
          min="1950"
          max={String(CURRENT_YEAR)}
        />
      </Field>

      <Field label="Case description / outcome" hint="What was the matter, and how did it resolve?">
        <StyledTextarea
          value={entry.outcomeNote}
          onChange={set("outcomeNote")}
          rows={3}
          placeholder="Represented the respondent in a contested custody matter; case settled via mediation with joint custody granted."
        />
      </Field>

      {error && <p style={{ margin: 0, fontSize: "11px", color: ERROR }}>{error}</p>}
    </div>
  );
}

function Step3CaseHistory({ form, setForm, errors }) {
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const updateCase = (index, field, value) => {
    setForm((f) => ({
      ...f,
      pastCases: f.pastCases.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const addCase = () => {
    setForm((f) => ({
      ...f,
      pastCases: [...f.pastCases, { id: null, caseType: "", jurisdiction: "", caseYear: "", outcomeNote: "" }],
    }));
  };

  const removeCase = (index) => {
    setForm((f) => ({ ...f, pastCases: f.pastCases.filter((_, i) => i !== index) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionHeading>Case history</SectionHeading>
      <p style={{ margin: 0, fontSize: "12px", color: TEXT_MUTED }}>
        Add each past case separately — specific, structured case history improves match accuracy far
        more than a general summary. You need at least one case for each specialisation you selected
        ({form.specializations.join(", ") || "none selected yet"}).
      </p>

      {form.pastCases.map((entry, index) => (
        <PastCaseRow
          key={index}
          index={index}
          entry={entry}
          onChange={updateCase}
          onRemove={removeCase}
          canRemove={form.pastCases.length > 1}
          specializationOptions={form.specializations}
          error={errors[`pastCase_${index}`]}
        />
      ))}

      <SecondaryButton onClick={addCase}>+ Add another case</SecondaryButton>

      {errors.pastCasesCoverage && (
        <p style={{ margin: 0, fontSize: "12px", color: ERROR }}>{errors.pastCasesCoverage}</p>
      )}

      <Divider />
      <SectionHeading>Experience summary</SectionHeading>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Cases handled" error={errors.previousCasesHandled} required>
          <StyledInput
            type="number"
            value={form.previousCasesHandled}
            onChange={set("previousCasesHandled")}
            placeholder="42"
            min="0"
            hasError={!!errors.previousCasesHandled}
          />
        </Field>

        <Field label="Success rate (%)" error={errors.successRate} required>
          <StyledInput
            type="number"
            value={form.successRate}
            onChange={set("successRate")}
            placeholder="78"
            min="0"
            max="100"
            hasError={!!errors.successRate}
          />
        </Field>
      </div>

      <Divider />
      <SectionHeading>Fees</SectionHeading>

      <Field
        label="Price / fee guidance"
        hint="Give clients a realistic range so expectations are set early."
        error={errors.priceGuidance}
        required
      >
        <StyledInput
          value={form.priceGuidance}
          onChange={set("priceGuidance")}
          placeholder="KES 20,000–80,000 retainer; KES 5,000 consultation"
          hasError={!!errors.priceGuidance}
        />
      </Field>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const INITIAL_FORM = {
  // Step 1 — Personal & Education
  fullName: "",
  biography: "",
  academicQualifications: "",
  institutions: "",
  graduationYear: "",
  barAdmissionYear: "",
  courts: "",
  languages: "",

  // Step 2 — Practice
  specializations: [],         // array of selected categories
  extraSpecializations: "",    // free-text additions
  yearsOfExperience: "",
  firmName: "",

  // Step 3 — Case history & fees
  // `id` is the PastCases.case_id once loaded from the server — used to tell
  // new rows (create) apart from existing ones (update) on submit.
  pastCases: [{ id: null, caseType: "", jurisdiction: "", caseYear: "", outcomeNote: "" }],
  previousCasesHandled: "",
  successRate: "",
  priceGuidance: "",
};

const TOTAL_STEPS = 3;

const STEP_TITLES = [
  "Personal & education",
  "Practice areas",
  "Case history & fees",
];

export default function LawyerOnboarding({ currentUser, onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(currentUser?.id));

  // Case IDs that existed on load — used on submit to tell "removed/cleared"
  // rows apart from rows that were never saved, so we can DELETE the former
  // instead of silently leaving a stale row behind.
  const existingCaseIdsRef = useRef([]);

  // ── Prefill from an existing profile + past cases (edit flow) ──────────────
  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      if (!currentUser?.id) {
        setInitialLoading(false);
        return;
      }

      const [profileResult, pastCasesResult] = await Promise.all([
        getLawyerProfile(currentUser.id),
        getPastCases(currentUser.id),
      ]);
      if (cancelled) return;

      const mappedCases = (pastCasesResult.ok ? pastCasesResult.pastCases : []).map((c) => ({
        id: c.case_id,
        caseType: c.case_type || "",
        jurisdiction: c.jurisdiction || "",
        caseYear: c.case_year != null ? String(c.case_year) : "",
        outcomeNote: c.outcome_note || "",
      }));
      existingCaseIdsRef.current = mappedCases.map((c) => c.id);

      if (profileResult.ok && profileResult.profile) {
        const p = profileResult.profile;
        const savedSpecs = (p.specializations || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        setForm((f) => ({
          ...f,
          fullName: p.full_name || f.fullName,
          biography: p.biography || "",
          academicQualifications:
            p.academic_qualifications === "Not provided" ? "" : p.academic_qualifications || "",
          institutions: p.institutions || "",
          graduationYear: p.graduation_year != null ? String(p.graduation_year) : "",
          barAdmissionYear: p.bar_admission_year != null ? String(p.bar_admission_year) : "",
          courts: p.courts || "",
          languages: p.languages || "",
          specializations: savedSpecs.filter((s) => LEGAL_CATEGORIES.includes(s)),
          extraSpecializations: savedSpecs.filter((s) => !LEGAL_CATEGORIES.includes(s)).join(", "),
          yearsOfExperience: p.years_of_experience != null ? String(p.years_of_experience) : "",
          firmName: p.firm_name || "",
          pastCases: mappedCases.length ? mappedCases : f.pastCases,
          previousCasesHandled: p.previous_cases_handled != null ? String(p.previous_cases_handled) : "",
          successRate: p.success_rate != null ? String(Number(p.success_rate)) : "",
          priceGuidance: p.price_guidance || "",
        }));
      } else if (mappedCases.length) {
        // No profile row yet, but past cases exist — keep them so nothing's lost.
        setForm((f) => ({ ...f, pastCases: mappedCases }));
      }

      setInitialLoading(false);
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    const nextErrors = validateStep(step, form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitError("");

    const nextErrors = validateStep(step, form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    if (!currentUser?.id || !currentUser?.lskNumber) {
      setSubmitError("Missing lawyer account details. Please sign in again.");
      return;
    }

    setErrors({});
    setLoading(true);

    // Merge toggled + free-text specialisations into one comma-separated string
    const allSpecs = [
      ...form.specializations,
      ...form.extraSpecializations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ].join(", ");

    // Build the searchable profileText blob (indexed by TF-IDF engine)
    const profileText = buildProfileText({ ...form, specializations: form.specializations });

    // Only fully-filled rows are persisted — validateStep already rejects
    // partially-filled ones, so this just drops rows the lawyer left blank.
    const filledPastCases = form.pastCases.filter(
      (c) => c.caseType && c.jurisdiction.trim() && c.caseYear && c.outcomeNote.trim().length >= 5
    );
    const caseSummaries = buildCaseSummaries(filledPastCases);

    const payload = {
      user_id: currentUser.id,
      lsk_registration_number: currentUser.lskNumber,

      // Personal
      full_name: form.fullName,
      biography: form.biography,

      // Education
      academic_qualifications: form.academicQualifications || "Not provided",
      institutions: form.institutions || null,
      graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
      bar_admission_year: form.barAdmissionYear ? Number(form.barAdmissionYear) : null,
      courts: form.courts || null,
      languages: form.languages || null,

      // Practice
      specializations: allSpecs,
      years_of_experience: Number(form.yearsOfExperience || 0),
      firm_name: form.firmName || null,

      // Case history
      case_type_descriptions: caseSummaries || null,
      previous_cases_handled: Number(form.previousCasesHandled),
      success_rate: Number(form.successRate),

      // Fees
      price_guidance: form.priceGuidance,

      // Searchable blob for TF-IDF matching
      profile_text: profileText,
    };

    const result = await saveLawyerProfile(payload);

    if (!result.ok) {
      setLoading(false);
      setSubmitError(result.error || "Something went wrong. Please try again.");
      return;
    }

    const toApiCase = (c) => ({
      case_type: c.caseType,
      jurisdiction: c.jurisdiction.trim(),
      case_year: Number(c.caseYear),
      outcome_note: c.outcomeNote.trim(),
    });

    const newCases = filledPastCases.filter((c) => !c.id);
    const casesToUpdate = filledPastCases.filter((c) => c.id);

    // Rows that existed on load but are no longer present (removed via the
    // button) or were left in place but cleared out entirely both mean the
    // same thing: delete them, rather than leaving a stale row in the DB.
    const isRowBlank = (c) => !c.caseType && !c.jurisdiction.trim() && !c.caseYear && !c.outcomeNote.trim();
    const currentIds = new Set(form.pastCases.filter((c) => c.id).map((c) => c.id));
    const removedIds = [
      ...existingCaseIdsRef.current.filter((id) => !currentIds.has(id)),
      ...form.pastCases.filter((c) => c.id && isRowBlank(c)).map((c) => c.id),
    ];

    if (newCases.length || casesToUpdate.length || removedIds.length) {
      const [createResults, updateResults, deleteResults] = await Promise.all([
        Promise.all(newCases.map((c) => addPastCase(currentUser.id, toApiCase(c)))),
        Promise.all(casesToUpdate.map((c) => updatePastCase(currentUser.id, c.id, toApiCase(c)))),
        Promise.all(removedIds.map((id) => deletePastCase(currentUser.id, id))),
      ]);

      const failedCount = [...createResults, ...updateResults, ...deleteResults].filter((r) => !r.ok).length;
      if (failedCount) {
        setSubmitError(
          `Profile saved, but ${failedCount} case change${failedCount > 1 ? "s" : ""} couldn't be applied. You can retry from your dashboard.`
        );
      }
    }

    setLoading(false);
    setSuccess(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: TEXT_MUTED, fontSize: "14px" }}>Loading your profile…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "580px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <Logo />
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: NAVY, margin: "0 0 6px" }}>
            Complete your lawyer profile
          </h1>
          <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: 0 }}>
            Detailed profiles improve match quality — clients find you based on
            your specialisations and case experience.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* Card */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            border: `1px solid ${BORDER}`,
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          {/* Step title */}
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "15px",
              fontWeight: 700,
              color: NAVY,
            }}
          >
            {STEP_TITLES[step - 1]}
          </p>

          {/* Step content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {step === 1 && (
              <Step1Personal form={form} setForm={setForm} errors={errors} />
            )}
            {step === 2 && (
              <Step2Practice form={form} setForm={setForm} errors={errors} />
            )}
            {step === 3 && (
              <Step3CaseHistory form={form} setForm={setForm} errors={errors} />
            )}
          </div>

          {/* Error banner */}
          {submitError && (
            <p style={{ margin: "16px 0 0", fontSize: "12px", color: ERROR }}>
              {submitError}
            </p>
          )}

          {/* Navigation buttons */}
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {!success ? (
              <>
                {step < TOTAL_STEPS ? (
                  <PrimaryButton onClick={goNext}>Continue</PrimaryButton>
                ) : (
                  <PrimaryButton onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving profile…" : "Save profile"}
                  </PrimaryButton>
                )}
                {step > 1 && (
                  <SecondaryButton onClick={goBack}>Back</SecondaryButton>
                )}
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#0F6E56" }}>
                  ✓ Profile saved successfully.
                </p>
                <PrimaryButton
                  onClick={onComplete}
                  style={{ background: NAVY }}
                >
                  Go to dashboard
                </PrimaryButton>
              </>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: "11px", color: TEXT_HINT, marginTop: "16px" }}>
          Fields marked <span style={{ color: ERROR }}>*</span> are required. All other fields improve your match ranking.
        </p>
      </div>
    </div>
  );
}
