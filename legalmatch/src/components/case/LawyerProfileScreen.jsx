import { useEffect, useState } from "react";
import { getLawyerPastCases } from "./caseApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button } from "../ui/Controls";
import { Tag } from "../ui/Badges";
import { HistoryItem, StatTriplet, SummaryBox } from "../ui/Cards";

function getInitials(name) {
  if (!name) return "LM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Full-screen lawyer profile + confirm selection (brief section B3/B4),
 * replacing the old modal. Stats and case history are only shown when the
 * database actually has them (no "127 CASES" / "4.8★" wireframe mock data
 * - section B4's rule) - the past-case list comes from the existing
 * GET /api/lawyers/:lawyerId/past-cases route, not a new endpoint.
 */
export default function LawyerProfileScreen({ lawyer, onBack, onConfirm, confirming, error }) {
  const [pastCases, setPastCases] = useState(null);
  const [pastCasesError, setPastCasesError] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!lawyer?.lawyerId) return;
    getLawyerPastCases(lawyer.lawyerId).then((result) => {
      if (!mounted) return;
      if (result.ok) setPastCases(result.pastCases);
      else setPastCasesError(true);
    });
    return () => { mounted = false; };
  }, [lawyer?.lawyerId]);

  const stats = [
    lawyer.previousCasesHandled !== null && lawyer.previousCasesHandled !== undefined
      ? { value: lawyer.previousCasesHandled, label: "CASES" }
      : null,
    lawyer.yearsOfExperience ? { value: lawyer.yearsOfExperience, label: "YRS EXP" } : null,
    lawyer.averageRating ? { value: `${Number(lawyer.averageRating).toFixed(1)}★`, label: "RATING" } : null,
  ].filter(Boolean);

  return (
    <Screen>
      <TitleBar title="Lawyer Profile" onBack={onBack} />
      <div className="p-4 flex-1 flex flex-col">
        <div className="w-15 h-15 rounded-full border-[1.5px] border-navy flex items-center justify-center mx-auto mt-2 mb-2.5 text-[15px] font-bold text-navy" style={{ width: 60, height: 60 }}>
          {getInitials(lawyer.name)}
        </div>
        <p className="text-center text-[15px] font-bold text-navy m-0">{lawyer.name}</p>
        {lawyer.lskNumber && lawyer.lskNumber !== "N/A" && (
          <p className="text-center text-[12px] text-slate mt-0.5 mb-2">LSK #{lawyer.lskNumber}</p>
        )}

        <div className="flex flex-wrap justify-center gap-1.5 mb-2">
          {lawyer.specializations.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>)}
          {lawyer.county && <Tag>{lawyer.county}</Tag>}
          {lawyer.verified && <Tag variant="top">✓ LSK Verified</Tag>}
        </div>

        <StatTriplet stats={stats} />

        <div>
          <p className="text-[11px] font-bold text-slate mb-1">ABOUT</p>
          <p className="text-[12.5px] text-body leading-relaxed mb-3">{lawyer.bio}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3 text-[12px]">
          <div><p className="font-bold text-slate text-[10.5px] m-0 mb-0.5">QUALIFICATIONS</p><p className="m-0 text-navy">{lawyer.academicQualifications || "—"}</p></div>
          <div><p className="font-bold text-slate text-[10.5px] m-0 mb-0.5">COURTS</p><p className="m-0 text-navy">{lawyer.courts || "—"}</p></div>
          <div><p className="font-bold text-slate text-[10.5px] m-0 mb-0.5">LANGUAGES</p><p className="m-0 text-navy">{lawyer.languages || "—"}</p></div>
          <div><p className="font-bold text-slate text-[10.5px] m-0 mb-0.5">FEE GUIDANCE</p><p className="m-0 text-navy">{lawyer.priceGuidance || "—"}</p></div>
        </div>

        <p className="text-[11px] font-bold text-slate mb-1">CASE HISTORY</p>
        {pastCasesError ? (
          <p className="text-[11px] text-slate mb-3">Case history is unavailable right now.</p>
        ) : pastCases === null ? (
          <p className="text-[11px] text-slate mb-3">Loading case history…</p>
        ) : pastCases.length === 0 ? (
          <p className="text-[11px] text-slate mb-3">No case history recorded yet.</p>
        ) : (
          <div className="mb-3">
            {pastCases.map((c) => (
              <HistoryItem
                key={c.case_id}
                title={`${c.case_type} · ${c.jurisdiction}`}
                detail={c.case_year ? String(c.case_year) : null}
                outcome={c.outcome_tag}
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        <SummaryBox title={`Select ${lawyer.name}`}>
          They will receive your full case details and contact you within 24 hrs.
        </SummaryBox>
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <Button onClick={confirming ? undefined : onConfirm} disabled={confirming}>
          {confirming ? "Confirming…" : "Confirm selection"}
        </Button>
      </div>
    </Screen>
  );
}
