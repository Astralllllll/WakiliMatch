import { createContext, useContext, useState } from "react";
import { KENYAN_COUNTIES } from "../../services/countyValidator.js";

const CaseContext = createContext(null);

const DEFAULT_CASE_DATA = {
  // Step 1
  legalCategory: "",
  title: "",
  jurisdiction: "",
  // Step 2
  description: "",
  urgencyLevel: "",
  budgetMin: "",
  budgetMax: "",
  // After submission
  caseId: null,
  matches: [],
  // AI matching result metadata (brief sections A1/A3) - null until a
  // live /generate call returns them; re-fetching an existing case's
  // matches via GET does not carry these, so the XAI card is simply
  // omitted on that path rather than faked.
  status: null,
  message: null,
  exampleQueries: [],
  xai: null,
};

// initialState lets tests seed caseData directly (e.g. a pre-built xai
// block) without driving the whole submit flow - optional, defaults to
// the same empty state every real screen starts from.
export function CaseProvider({ children, initialState }) {
  const [caseData, setCaseData] = useState({ ...DEFAULT_CASE_DATA, ...initialState });

  const updateCase = (fields) =>
    setCaseData((prev) => ({ ...prev, ...fields }));

  const resetCase = () => setCaseData(DEFAULT_CASE_DATA);

  return (
    <CaseContext.Provider value={{ caseData, updateCase, resetCase }}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCaseContext() {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCaseContext must be used within a CaseProvider");
  return ctx;
}

// Constants shared across wizard and results
export const LEGAL_CATEGORIES = [
  { value: "criminal", label: "Criminal Law" },
  { value: "family", label: "Family Law" },
  { value: "property", label: "Property & Real Estate" },
  { value: "employment", label: "Employment Law" },
  { value: "corporate", label: "Corporate & Commercial" },
  { value: "immigration", label: "Immigration" },
];

export { KENYAN_COUNTIES };

export const URGENCY_LEVELS = [
  { value: "low", label: "Not urgent", description: "Within the next few months" },
  { value: "medium", label: "Moderately urgent", description: "Within the next few weeks" },
  { value: "high", label: "Urgent", description: "Within the next few days" },
  { value: "critical", label: "Critical", description: "Immediate assistance needed" },
];
