import React, { useState, useEffect } from "react";
import { LEGAL_CATEGORIES, KENYAN_COUNTIES } from "../../context/CaseContext";

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%",
  padding: "9px 13px",
  border: "1px solid #CBD5E1",
  borderRadius: "8px",
  background: "white",
  color: "#0F172A",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color .15s, box-shadow .15s",
  boxSizing: "border-box",
};

const focusHandlers = (hasError) => ({
  onFocus: (e) => {
    e.target.style.borderColor = "#1D9E75";
    e.target.style.boxShadow = "0 0 0 3px #E1F5EE";
  },
  onBlur: (e) => {
    e.target.style.borderColor = hasError ? "#E24B4A" : "#CBD5E1";
    e.target.style.boxShadow = "none";
  },
});

function Field({ label, hint, error, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "13px", fontWeight: 500, color: "#0F2744" }}>
        {label}{required && <span style={{ color: "#E24B4A", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0 }}>{hint}</p>}
      {error && <p style={{ fontSize: "11px", color: "#E24B4A", margin: 0 }}>{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", hasError }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ ...inputStyle, borderColor: hasError ? "#E24B4A" : "#CBD5E1" }}
      {...focusHandlers(hasError)}
    />
  );
}

function Select({ value, onChange, children, hasError }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, borderColor: hasError ? "#E24B4A" : "#CBD5E1", cursor: "pointer" }}
      {...focusHandlers(hasError)}
    >
      {children}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, hasError }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        ...inputStyle,
        resize: "vertical",
        lineHeight: 1.6,
        borderColor: hasError ? "#E24B4A" : "#CBD5E1",
      }}
      {...focusHandlers(hasError)}
    />
  );
}

function SectionHeader({ number, title, subtitle }) {
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "20px" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: "#0F2744", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: 600, flexShrink: 0, marginTop: "2px",
      }}>
        {number}
      </div>
      <div>
        <p style={{ fontSize: "15px", fontWeight: 600, color: "#0F2744", margin: "0 0 2px" }}>{title}</p>
        {subtitle && <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Past case entry ───────────────────────────────────────────────────────────

const EMPTY_CASE = { caseType: "", jurisdiction: "", year: "", outcome: "" };

function PastCaseRow({ index, caseItem, onChange, onRemove, error }) {
  const set = (field) => (e) => onChange(index, { ...caseItem, [field]: e.target.value });
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <div style={{
      border: "1px solid #E2E8F0", borderRadius: "10px",
      padding: "16px", background: "#FAFBFC", position: "relative",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "12px",
      }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", margin: 0 }}>
          Case {index + 1}
        </p>
        {index > 0 && (
          <button
            onClick={() => onRemove(index)}
            style={{
              border: "none", background: "none", cursor: "pointer",
              color: "#94A3B8", fontSize: "12px", padding: "2px 6px",
            }}
            onMouseEnter={(e) => e.target.style.color = "#E24B4A"}
            onMouseLeave={(e) => e.target.style.color = "#94A3B8"}
          >
            Remove
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <Field label="Case type" error={error?.caseType}>
          <Select value={caseItem.caseType} onChange={set("caseType")} hasError={!!error?.caseType}>
            <option value="">Select type…</option>
            {LEGAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Jurisdiction" error={error?.jurisdiction}>
          <Select value={caseItem.jurisdiction} onChange={set("jurisdiction")} hasError={!!error?.jurisdiction}>
            <option value="">Select county…</option>
            {KENYAN_COUNTIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px" }}>
        <Field label="Year" error={error?.year}>
          <Select value={caseItem.year} onChange={set("year")} hasError={!!error?.year}>
            <option value="">Year…</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </Field>

        <Field label="Outcome note" hint="Brief result (e.g. 'Settled in client's favour')" error={error?.outcome}>
          <Input
            value={caseItem.outcome}
            onChange={set("outcome")}
            placeholder="e.g. Successfully defended against wrongful dismissal claim"
            hasError={!!error?.outcome}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Profile text preview ──────────────────────────────────────────────────────

function buildProfileText(form) {
  const parts = [];
  if (form.bio) parts.push(form.bio);
  if (form.specializations.length)
    parts.push("Specializations: " + form.specializations.map(s =>
      LEGAL_CATEGORIES.find(c => c.value === s)?.label || s
    ).join(", "));
  if (form.yearsOfExperience) parts.push(`Years of experience: ${form.yearsOfExperience}`);
  if (form.education) parts.push(`Education: ${form.education}`);
  if (form.county) parts.push(`County: ${form.county}`);
  const validCases = form.pastCases.filter(c => c.caseType && c.outcome);
  if (validCases.length) {
    const caseText = validCases.map(c => {
      const lbl = LEGAL_CATEGORIES.find(cat => cat.value === c.caseType)?.label || c.caseType;
      return `${lbl} case in ${c.jurisdiction || "Kenya"} (${c.year || ""}): ${c.outcome}`;
    }).join(". ");
    parts.push("Past cases: " + caseText);
  }
  return parts.join(". ");
}

// ── Main component ────────────────────────────────────────────────────────────

const EDUCATION_OPTIONS = [
  "LLB — University of Nairobi",
  "LLB — Strathmore University",
  "LLB — Moi University",
  "LLB — Kenyatta University",
  "LLB — Mount Kenya University",
  "LLM — University of Nairobi",
  "LLM — University of London",
  "Other",
];

export default function LawyerProfileCreation({ onSaveSuccess }) {
  const [form, setForm] = useState({
    fullName: "",
    lskNumber: "",
    county: "",
    bio: "",
    specializations: [],
    yearsOfExperience: "",
    education: "",
    pastCases: [{ ...EMPTY_CASE }],
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [profileText, setProfileText] = useState("");

  const set = (field) => (val) =>
    setForm((f) => ({ ...f, [field]: typeof val === "function" ? val(f[field]) : val }));

  const setField = (field) => (e) => set(field)(e.target.value);

  useEffect(() => {
    setProfileText(buildProfileText(form));
  }, [form]);

  const toggleSpec = (value) => {
    set("specializations")((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const updateCase = (index, updated) => {
    set("pastCases")((prev) => prev.map((c, i) => (i === index ? updated : c)));
  };
  const addCase = () => set("pastCases")((prev) => [...prev, { ...EMPTY_CASE }]);
  const removeCase = (index) => set("pastCases")((prev) => prev.filter((_, i) => i !== index));

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!form.lskNumber.trim()) errs.lskNumber = "LSK number is required.";
    if (!form.county) errs.county = "County is required.";
    if (!form.bio.trim()) errs.bio = "Bio is required.";
    else if (form.bio.trim().length < 50) errs.bio = "Bio should be at least 50 characters.";
    if (!form.specializations.length) errs.specializations = "Select at least one specialization.";
    if (!form.yearsOfExperience) errs.yearsOfExperience = "Years of experience is required.";
    if (!form.education) errs.education = "Education is required.";
    const caseErrs = form.pastCases.map((c) => {
      const ce = {};
      if (!c.caseType) ce.caseType = "Required";
      if (!c.jurisdiction) ce.jurisdiction = "Required";
      if (!c.year) ce.year = "Required";
      if (!c.outcome.trim()) ce.outcome = "Required";
      return Object.keys(ce).length ? ce : null;
    });
    if (caseErrs.some(Boolean)) errs.pastCases = caseErrs;
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    // TODO: POST /lawyers/profile
    await new Promise((r) => setTimeout(r, 1400));
    setSaving(false);
    onSaveSuccess?.();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "40px 16px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "6px", background: "#0F2744",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L3 6v4c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V6L9 2z"
                  fill="white" fillOpacity=".9" />
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: "15px", color: "#0F2744" }}>LegalMatch</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#0F2744", margin: "0 0 6px" }}>
            Build your profile
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            Your profile is what the matching engine reads. The more detail you add, the better your matches.
          </p>
        </div>

        {/* Section 1: Basic info */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1px solid #E2E8F0", padding: "28px", marginBottom: "16px",
        }}>
          <SectionHeader number="1" title="Basic information" />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Full name" required error={errors.fullName}>
                <Input value={form.fullName} onChange={setField("fullName")}
                  placeholder="Advocate Jane Kamau" hasError={!!errors.fullName} />
              </Field>
              <Field label="LSK number" required error={errors.lskNumber} hint="Pre-filled from registration">
                <Input value={form.lskNumber} onChange={setField("lskNumber")}
                  placeholder="LSK/A/12345" hasError={!!errors.lskNumber} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Primary county" required error={errors.county}>
                <Select value={form.county} onChange={setField("county")} hasError={!!errors.county}>
                  <option value="">Select county…</option>
                  {KENYAN_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Years of experience" required error={errors.yearsOfExperience}>
                <Select value={form.yearsOfExperience} onChange={setField("yearsOfExperience")}
                  hasError={!!errors.yearsOfExperience}>
                  <option value="">Select…</option>
                  {["Less than 1", "1–2", "3–5", "6–10", "11–15", "16–20", "20+"].map((o) => (
                    <option key={o} value={o}>{o} years</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Education" required error={errors.education}>
              <Select value={form.education} onChange={setField("education")} hasError={!!errors.education}>
                <option value="">Select qualification…</option>
                {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Professional bio" required
              hint="Describe your background, approach, and what clients can expect."
              error={errors.bio}>
              <Textarea value={form.bio} onChange={setField("bio")}
                placeholder="e.g. I am an advocate with 8 years of experience specialising in employment and labour law…"
                rows={4} hasError={!!errors.bio} />
              <p style={{ fontSize: "11px", color: "#94A3B8", margin: "2px 0 0", textAlign: "right" }}>
                {form.bio.length} characters
              </p>
            </Field>
          </div>
        </div>

        {/* Section 2: Specializations */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: `1px solid ${errors.specializations ? "#E24B4A" : "#E2E8F0"}`,
          padding: "28px", marginBottom: "16px",
        }}>
          <SectionHeader number="2" title="Areas of specialisation"
            subtitle="Select all that apply. These are used directly in matching." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {LEGAL_CATEGORIES.map((cat) => {
              const selected = form.specializations.includes(cat.value);
              return (
                <div key={cat.value} onClick={() => toggleSpec(cat.value)} style={{
                  padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                  border: `1px solid ${selected ? "#1D9E75" : "#CBD5E1"}`,
                  background: selected ? "#E1F5EE" : "white",
                  display: "flex", alignItems: "center", gap: "10px", transition: "all .15s",
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                    border: `2px solid ${selected ? "#1D9E75" : "#CBD5E1"}`,
                    background: selected ? "#1D9E75" : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selected && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: selected ? "#0F6E56" : "#0F2744" }}>
                    {cat.label}
                  </span>
                </div>
              );
            })}
          </div>
          {errors.specializations && (
            <p style={{ fontSize: "11px", color: "#E24B4A", margin: "10px 0 0" }}>{errors.specializations}</p>
          )}
        </div>

        {/* Section 3: Past cases */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1px solid #E2E8F0", padding: "28px", marginBottom: "16px",
        }}>
          <SectionHeader number="3" title="Past cases"
            subtitle="Add cases you have handled. This is the most important section for matching accuracy." />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {form.pastCases.map((caseItem, i) => (
              <PastCaseRow key={i} index={i} caseItem={caseItem}
                onChange={updateCase} onRemove={removeCase} error={errors.pastCases?.[i]} />
            ))}
          </div>
          <button onClick={addCase} style={{
            marginTop: "14px", width: "100%", padding: "10px",
            borderRadius: "8px", border: "1px dashed #CBD5E1",
            background: "white", color: "#475569", fontSize: "13px",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "6px",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1D9E75"; e.currentTarget.style.color = "#1D9E75"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#475569"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add another case
          </button>
        </div>

        {/* Section 4: Profile text preview */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1px solid #E2E8F0", padding: "28px", marginBottom: "24px",
        }}>
          <SectionHeader number="4" title="Matching engine preview"
            subtitle="This is the text the TF-IDF engine will index. It updates automatically as you fill in your profile." />
          <div style={{
            padding: "14px", background: "#F8FAFC", borderRadius: "8px",
            border: "1px solid #E2E8F0", fontSize: "12px", color: "#475569",
            lineHeight: 1.7, minHeight: "80px", fontFamily: "monospace",
          }}>
            {profileText || (
              <span style={{ color: "#CBD5E1" }}>
                Start filling in your profile above to see the indexed text…
              </span>
            )}
          </div>
          <p style={{ fontSize: "11px", color: "#94A3B8", margin: "8px 0 0" }}>
            {profileText.length} characters · More detail = better matches
          </p>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", padding: "13px", borderRadius: "10px",
          background: saving ? "#5DCAA5" : "#1D9E75",
          color: "white", border: "none", fontSize: "14px",
          fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          marginBottom: "12px",
        }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#0F6E56"; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#1D9E75"; }}
        >
          {saving ? (
            <>
              <svg style={{ animation: "spin 1s linear infinite" }} width="15" height="15"
                viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity=".3" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Saving profile…
            </>
          ) : "Save profile"}
        </button>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#94A3B8", marginBottom: "40px" }}>
          Your profile will be reviewed by an admin before appearing in match results.
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
