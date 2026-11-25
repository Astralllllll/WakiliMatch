import { useEffect, useMemo, useState } from "react";
import { useCaseContext, LEGAL_CATEGORIES } from "../../context/CaseContext";
import { selectLawyerForIssue, getIssueMatches } from "./caseApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button } from "../ui/Controls";
import { Tag, AIBadge } from "../ui/Badges";
import { SummaryBox } from "../ui/Cards";
import { Toast } from "../ui/Toast";
import { useToast } from "../ui/useToast";
import LawyerProfileScreen from "./LawyerProfileScreen";

const DISCLAIMER = "WakiliMatch suggests lawyers; it does not give legal advice.";

function getInitials(name) {
  if (!name) return "LM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// ─── XAI card (brief section B4) ───────────────────────────────────────────

function XaiCard({ xai }) {
  if (!xai) return null;
  const { matched_area, precedent_count, top_precedent, explanation } = xai;

  return (
    <div className="border border-gold rounded-md px-3 py-2.5 mb-3 bg-[#FFFDF5]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <AIBadge soft>✦ AI EXPLANATION</AIBadge>
        {matched_area && <span className="text-[10.5px] font-semibold text-navy">{matched_area}</span>}
      </div>
      <p className="text-[11.5px] text-body leading-relaxed mb-1.5">{explanation}</p>
      {top_precedent && (
        <div className="text-[10.5px] text-slate border-t border-border pt-1.5">
          <span className="font-semibold text-navy">Top precedent: </span>
          {top_precedent.url ? (
            <a href={top_precedent.url} target="_blank" rel="noreferrer" className="text-gold-text underline">
              {top_precedent.title}
            </a>
          ) : (
            <span>{top_precedent.title}</span>
          )}
          {top_precedent.court && <span> — {top_precedent.court}</span>}
          {top_precedent.year && <span> ({top_precedent.year})</span>}
          <div>{top_precedent.similarity_pct.toFixed(1)}% semantic similarity · {precedent_count} precedent{precedent_count === 1 ? "" : "s"} considered</div>
        </div>
      )}
    </div>
  );
}

// ─── Component breakdown bars ───────────────────────────────────────────────

const COMPONENT_LABELS = {
  semantic: "Profile match",
  precedent: "Case precedent",
  category: "Category",
  jurisdiction: "Jurisdiction",
  caseHistory: "Case history",
};

function ComponentBar({ label, value }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-[10.5px]">
      <span className="w-24 shrink-0 text-slate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full bg-navy" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-navy font-semibold">{pct}%</span>
    </div>
  );
}

// ─── Lawyer result card ─────────────────────────────────────────────────────

function LawyerResultCard({ match, rank, threshold, onOpenProfile }) {
  const [expanded, setExpanded] = useState(false);
  const scorePct = Math.round((match.similarityScore || 0) * 100);
  const semantic = match.componentScores?.semantic;
  const precedent = match.componentScores?.precedent;

  const isTopMatch = rank === 1 && match.similarityScore >= (threshold ?? 0);
  const isLimitedMatch = (semantic !== null && semantic !== undefined && semantic < (threshold ?? 0.328)) || !precedent;

  const reason = match.why?.plain_text || match.matchReason;
  const precedentCases = match.why?.precedent_cases || [];
  const components = match.why?.components || match.componentScores;

  return (
    <div className="border border-border rounded-md p-3 mb-2.5">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-ice flex items-center justify-center text-[12px] font-bold text-navy shrink-0">
            {getInitials(match.name)}
          </div>
          <button
            type="button"
            onClick={() => onOpenProfile(match)}
            className="text-[13px] font-bold text-navy text-left truncate hover:underline"
          >
            {match.name}
          </button>
        </div>
        <span className="text-gold-text font-bold text-[13px] shrink-0" title="A ranking score, not a probability">
          {scorePct}%
        </span>
      </div>

      <div className="flex flex-wrap gap-1 my-2">
        {isTopMatch && <Tag variant="top">TOP MATCH</Tag>}
        {!isTopMatch && isLimitedMatch && <Tag variant="limited">LIMITED MATCH</Tag>}
        {match.yearsOfExperience > 0 && <Tag>{match.yearsOfExperience} yrs</Tag>}
      </div>

      {reason && <p className="text-[11px] text-slate leading-relaxed mb-1.5">{reason}</p>}

      {match.why && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-[11px] font-semibold text-navy underline mt-1"
        >
          {expanded ? "Hide details" : "Why this lawyer?"}
        </button>
      )}

      {expanded && match.why && (
        <div className="mt-2.5 pt-2.5 border-t border-border flex flex-col gap-2">
          {precedentCases.length > 0 && (
            <div>
              <p className="text-[10.5px] font-bold text-slate mb-1">LINKED PRECEDENTS</p>
              {precedentCases.map((c, i) => (
                <p key={i} className="text-[10.5px] text-body mb-0.5">
                  {c.title}{c.similarity_pct !== undefined && ` — ${c.similarity_pct.toFixed(1)}% similarity`}
                </p>
              ))}
            </div>
          )}
          {components && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10.5px] font-bold text-slate mb-0.5">MATCH BREAKDOWN</p>
              {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
                <ComponentBar key={key} label={label} value={components[key] ?? components[key === "caseHistory" ? "history" : key]} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Non-success state card (brief section B4) ─────────────────────────────

function StatusMessageCard({ status, message, exampleQueries, onRephrase }) {
  const titles = {
    empty_query: "Tell us what happened",
    invalid_input: "We couldn't read that",
    unsupported_language: "English only for now",
    low_confidence: "No strong match found",
    no_lawyers_found: "No lawyers available yet",
  };

  return (
    <div className="border border-border rounded-md p-4 text-center">
      <p className="text-[14px] font-bold text-navy mb-1.5">{titles[status] || "Something went wrong"}</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-3">{message}</p>
      {exampleQueries?.length > 0 && (
        <div className="bg-ice rounded-md p-2.5 mb-3 text-left">
          <p className="text-[10.5px] font-bold text-navy mb-1.5">Try something like:</p>
          {exampleQueries.map((q) => (
            <p key={q} className="text-[11px] text-body mb-1 italic">"{q}"</p>
          ))}
        </div>
      )}
      <Button onClick={onRephrase}>Rephrase my case</Button>
    </div>
  );
}

// ─── Match Results page ─────────────────────────────────────────────────────

export default function MatchResults({ onPostNewCase, onBackToClientDashboard }) {
  const { caseData, updateCase, resetCase } = useCaseContext();
  const [profileMatch, setProfileMatch] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const toast = useToast();

  const category = LEGAL_CATEGORIES.find((c) => c.value === caseData.legalCategory);
  const hasFreshData = Boolean(caseData.status || caseData.xai || (caseData.matches && caseData.matches.length > 0));

  async function loadExistingMatches() {
    if (!caseData.caseId) return;
    setFetching(true);
    setFetchError(false);
    const result = await getIssueMatches(caseData.caseId);
    setFetching(false);
    if (!result.ok) { setFetchError(true); return; }
    updateCase({ matches: result.matches });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-triggered fetch, same pattern as LawyerProfileCreation.jsx
    if (!hasFreshData && caseData.caseId) loadExistingMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.caseId]);

  const matches = useMemo(() => {
    return (caseData.matches || []).map((match) => ({
      lawyerId: match.lawyer_id,
      name: match.full_name || `Advocate ${match.lsk_registration_number || "Lawyer"}`,
      lskNumber: match.lsk_registration_number || "N/A",
      specializations: (match.specializations || "General Practice").split(",").map((s) => s.trim()).filter(Boolean),
      yearsOfExperience: Number(match.years_of_experience || 0),
      averageRating: match.average_rating !== null && match.average_rating !== undefined ? Number(match.average_rating) : null,
      totalReviews: Number(match.total_reviews || 0),
      similarityScore: Number(match.similarity_score || 0),
      matchReason: match.match_reason,
      bio: match.biography || "No biography provided.",
      academicQualifications: match.academic_qualifications || "",
      courts: match.courts || "",
      languages: match.languages || "",
      priceGuidance: match.price_guidance || "",
      previousCasesHandled: match.previous_cases_handled ?? null,
      why: match.why || null,
      componentScores: match.component_scores || null,
      verified: true,
    }));
  }, [caseData.matches]);

  const handleConfirm = async () => {
    if (!caseData.caseId || !profileMatch?.lawyerId) {
      setConfirmError("Unable to select this lawyer right now. Missing case details.");
      return;
    }
    setConfirming(true);
    setConfirmError("");
    const result = await selectLawyerForIssue({ issue_id: caseData.caseId, lawyer_id: profileMatch.lawyerId });
    setConfirming(false);

    if (!result.ok) {
      setConfirmError(result.error || "Unable to complete lawyer selection. Please try again.");
      return;
    }

    const name = profileMatch.name;
    setProfileMatch(null);
    toast.show(`Selection confirmed — ${name} will be in touch within 24 hrs.`);

    if (onBackToClientDashboard) {
      window.setTimeout(onBackToClientDashboard, 900);
    } else {
      window.setTimeout(() => { resetCase(); onPostNewCase(); }, 900);
    }
  };

  if (profileMatch) {
    return (
      <>
        <LawyerProfileScreen
          lawyer={profileMatch}
          onBack={() => setProfileMatch(null)}
          onConfirm={handleConfirm}
          confirming={confirming}
          error={confirmError}
        />
        <Toast {...toast} />
      </>
    );
  }

  const status = caseData.status;
  const isNonSuccessStatus = status && status !== "success" && status !== "no_lawyers_found";

  return (
    <Screen>
      <TitleBar title="Match Results" onBack={onBackToClientDashboard} />
      <div className="p-4 flex-1 flex flex-col">
        <SummaryBox title="YOUR CASE">
          {caseData.title} · {caseData.jurisdiction} · {category?.label || "—"}
          {caseData.urgencyLevel && ` · ${caseData.urgencyLevel}`}
        </SummaryBox>

        {fetching ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-ice rounded-md h-28 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : fetchError ? (
          <div className="border border-border rounded-md p-4 text-center">
            <p className="text-[13px] font-semibold text-navy mb-1">Couldn't load your matches</p>
            <p className="text-[12px] text-slate mb-3">Check your connection and try again.</p>
            <Button onClick={loadExistingMatches}>Retry</Button>
          </div>
        ) : isNonSuccessStatus ? (
          <StatusMessageCard
            status={status}
            message={caseData.message}
            exampleQueries={caseData.exampleQueries}
            onRephrase={onPostNewCase}
          />
        ) : (
          <>
            <p className="text-[11px] text-slate mb-2.5">
              {matches.length} advocate{matches.length === 1 ? "" : "s"} found
              {caseData.xai?.matched_area && (
                <> · ranked by <AIBadge soft>✦ AI</AIBadge></>
              )}
            </p>

            <XaiCard xai={caseData.xai} />

            {status === "no_lawyers_found" && (
              <div className="bg-ice rounded-md px-3 py-2.5 mb-3 text-[11px] text-slate">
                {caseData.message}
              </div>
            )}

            {matches.length === 0 ? (
              status !== "no_lawyers_found" && (
                <div className="border border-border rounded-md p-4 text-center">
                  <p className="text-[13px] font-semibold text-navy mb-1">No matches yet</p>
                  <p className="text-[12px] text-slate mb-3">Try broadening your description or changing the county.</p>
                  <Button onClick={onPostNewCase}>Edit my case</Button>
                </div>
              )
            ) : (
              matches
                .slice()
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .map((match, i) => (
                  <LawyerResultCard
                    key={match.lawyerId}
                    match={match}
                    rank={i + 1}
                    threshold={caseData.xai?.threshold}
                    onOpenProfile={setProfileMatch}
                  />
                ))
            )}
          </>
        )}

        <p className="text-[10px] text-slate text-center mt-4">{DISCLAIMER}</p>
      </div>
      <Toast {...toast} />
    </Screen>
  );
}
