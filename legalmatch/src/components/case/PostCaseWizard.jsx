import { useState } from "react";
import { useCaseContext, LEGAL_CATEGORIES, KENYAN_COUNTIES, URGENCY_LEVELS } from "../../context/CaseContext";
import { submitIssue, generateMatches } from "./caseApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button, Field, Pill, Select, TextArea, TextInput } from "../ui/Controls";
import { StepDots } from "../ui/Tiles";

// ─── Step 2: category, title, jurisdiction (brief section B3) ─────────────

function CategoryStep({ onNext }) {
  const { caseData, updateCase } = useCaseContext();
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!caseData.legalCategory) errs.legalCategory = "Select a legal category.";
    if (!caseData.title.trim()) errs.title = "Case title is required.";
    else if (caseData.title.trim().length < 10) errs.title = "Title should be at least 10 characters.";
    if (!caseData.jurisdiction) errs.jurisdiction = "Select a county.";
    return errs;
  };

  const handleNext = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext();
  };

  return (
    <div className="flex flex-col gap-5">
      <Field label="Legal category *" error={errors.legalCategory}>
        <div className="grid grid-cols-3 gap-1.5">
          {LEGAL_CATEGORIES.map((c) => (
            <Pill
              key={c.value}
              label={c.label.replace(" Law", "")}
              active={caseData.legalCategory === c.value}
              onClick={() => updateCase({ legalCategory: c.value })}
            />
          ))}
        </div>
      </Field>

      <Field
        label="Case title *"
        hint="A short summary of your legal issue (e.g. 'Unfair dismissal from employment')."
        error={errors.title}
      >
        <TextInput
          value={caseData.title}
          onChange={(e) => updateCase({ title: e.target.value })}
          placeholder="Briefly describe your case in one line"
          hasError={!!errors.title}
        />
      </Field>

      <Field label="Jurisdiction (county) *" error={errors.jurisdiction}>
        <Select
          value={caseData.jurisdiction}
          onChange={(e) => updateCase({ jurisdiction: e.target.value })}
          hasError={!!errors.jurisdiction}
        >
          <option value="">Select a county…</option>
          {KENYAN_COUNTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </Field>

      <Button onClick={handleNext} className="mt-2">Continue →</Button>
    </div>
  );
}

// ─── Step 3: description, urgency, budget, privacy note (brief B3) ────────

function DetailsStep({ onNext, onBack }) {
  const { caseData, updateCase } = useCaseContext();
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!caseData.description.trim()) errs.description = "Please describe your case.";
    else if (caseData.description.trim().length < 50)
      errs.description = "Please provide more detail — at least 50 characters.";
    if (!caseData.urgencyLevel) errs.urgencyLevel = "Select an urgency level.";
    if (caseData.budgetMin && caseData.budgetMax && Number(caseData.budgetMin) >= Number(caseData.budgetMax))
      errs.budgetMax = "Maximum budget must be greater than minimum.";
    return errs;
  };

  const handleNext = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext();
  };

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Case description *"
        hint="Include relevant background, what outcome you need, and any key dates. More detail improves your matches."
        error={errors.description}
      >
        <TextArea
          value={caseData.description}
          onChange={(e) => updateCase({ description: e.target.value })}
          placeholder="Explain your legal situation in as much detail as you can…"
          rows={5}
          hasError={!!errors.description}
        />
        <p className="text-[11px] text-slate text-right">{caseData.description.length} characters</p>
      </Field>

      <Field label="Urgency level *" error={errors.urgencyLevel}>
        <div className="flex flex-col gap-2">
          {URGENCY_LEVELS.map((u) => {
            const selected = caseData.urgencyLevel === u.value;
            return (
              <button
                key={u.value}
                type="button"
                onClick={() => updateCase({ urgencyLevel: u.value })}
                aria-pressed={selected}
                className={[
                  "min-h-11 rounded-sm border px-3 py-2.5 flex items-center justify-between gap-3 text-left transition-colors",
                  selected ? "bg-ice border-navy" : "bg-white border-border-strong",
                ].join(" ")}
              >
                <div>
                  <p className={`text-[13px] font-semibold m-0 ${selected ? "text-navy" : "text-body"}`}>{u.label}</p>
                  <p className="text-[11px] text-slate m-0">{u.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected ? "bg-navy border-navy" : "border-border-strong"}`} />
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Budget range (KES)" hint="Optional. Helps lawyers assess whether they can assist within your means." error={errors.budgetMax}>
        <div className="flex gap-2 items-center">
          <TextInput type="number" value={caseData.budgetMin} onChange={(e) => updateCase({ budgetMin: e.target.value })} placeholder="Min" />
          <span className="text-slate text-[13px] shrink-0">to</span>
          <TextInput type="number" value={caseData.budgetMax} onChange={(e) => updateCase({ budgetMax: e.target.value })} placeholder="Max" hasError={!!errors.budgetMax} />
        </div>
      </Field>

      <div className="text-[10.5px] text-slate border border-dashed border-border-strong rounded-sm px-2.5 py-2 leading-relaxed">
        Details hidden from lawyers until you select one.
      </div>

      <div className="flex gap-2 mt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">← Back</Button>
        <Button onClick={handleNext} className="flex-[2]">Find matches →</Button>
      </div>
    </div>
  );
}

// ─── Wizard shell ───────────────────────────────────────────────────────────

export default function PostCaseWizard({ onSubmitSuccess, currentUser }) {
  const [step, setStep] = useState(2); // step 1 (intake) is implicitly done: manual entry via "New Case"
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { caseData, updateCase } = useCaseContext();

  const handleSubmit = async () => {
    setSubmitError("");

    if (!currentUser?.id) {
      setSubmitError("Please sign in again before posting your case.");
      return;
    }

    setSubmitting(true);
    try {
      const budgetRange = (caseData.budgetMin || caseData.budgetMax)
        ? `KES ${Number(caseData.budgetMin || 0).toLocaleString()} - ${Number(caseData.budgetMax || 0).toLocaleString()}`
        : null;

      const issueResult = await submitIssue({
        client_id: currentUser.id,
        issue_title: caseData.title.trim(),
        issue_description: caseData.description.trim(),
        legal_category: caseData.legalCategory || null,
        jurisdiction: caseData.jurisdiction || null,
        urgency_level: caseData.urgencyLevel || null,
        budget_range: budgetRange,
        budget_min: caseData.budgetMin || null,
        budget_max: caseData.budgetMax || null,
      });

      if (!issueResult.ok) {
        setSubmitError(issueResult.error);
        return;
      }

      const issueId = issueResult.data?.issue?.issue_id;
      if (!issueId) {
        setSubmitError("Issue was created, but no issue ID was returned.");
        return;
      }

      const matchResult = await generateMatches({
        client_id: currentUser.id,
        issue_id: issueId,
        issue_text: `${caseData.title}. ${caseData.description}`,
      });

      if (!matchResult.ok) {
        if (matchResult.status === 404) {
          updateCase({ caseId: issueId, matches: [] });
          onSubmitSuccess(issueId);
          return;
        }
        setSubmitError(matchResult.error);
        return;
      }

      updateCase({
        caseId: issueId,
        matches: matchResult.data?.matches || [],
        status: matchResult.data?.status || null,
        message: matchResult.data?.message || null,
        exampleQueries: matchResult.data?.example_queries || [],
        xai: matchResult.data?.xai || null,
      });
      onSubmitSuccess(issueId);
    } catch (err) {
      console.error("Case submission failed:", err);
      setSubmitError("Failed to submit your case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TitleBar title="Post a Case" />
      <div className="p-4 flex-1 flex flex-col">
        <StepDots current={step} />
        {step === 2 && <CategoryStep onNext={() => setStep(3)} />}
        {step === 3 && (
          <DetailsStep
            onNext={submitting ? () => {} : handleSubmit}
            onBack={() => setStep(2)}
          />
        )}
        {submitting && <p className="text-xs text-slate mt-3 text-center">Finding matches…</p>}
        {submitError && <p className="text-xs text-red-600 mt-3">{submitError}</p>}
        <p className="text-center text-[10.5px] text-slate mt-6">
          Your information is protected under the Kenya Data Protection Act (2019).
        </p>
      </div>
    </Screen>
  );
}
