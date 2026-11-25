/** Light-blue info box, e.g. "YOUR CASE" summary (brief section B2). */
export function SummaryBox({ title, children, className = "" }) {
  return (
    <div className={`bg-ice rounded-md px-3 py-2.5 mb-3 ${className}`}>
      {title && <div className="text-[11.5px] font-bold text-navy mb-0.5">{title}</div>}
      <div className="text-[10.5px] text-slate leading-relaxed">{children}</div>
    </div>
  );
}

/** Up to 3 stat tiles (e.g. CASES / YRS EXP / RATING). Pass only stats
 * backed by real data - the caller filters, this never pads with zeros. */
export function StatTriplet({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 my-3.5">
      {stats.map((s) => (
        <div key={s.label} className="border border-border rounded-sm text-center py-2 px-0.5">
          <div className="text-[15px] font-bold text-navy">{s.value}</div>
          <div className="text-[9px] text-slate">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

const OUTCOME_LABELS = { won: "WON", settled: "SETTLED", ongoing: "ONGOING", lost: "LOST", withdrawn: "WITHDRAWN" };
const OUTCOME_VARIANTS = {
  won: "bg-navy text-white",
  settled: "bg-ice text-navy border border-border",
  ongoing: "bg-white text-slate border border-dashed border-border-strong",
  lost: "bg-white text-slate border border-border",
  withdrawn: "bg-white text-slate border border-border",
};

/** WON / SETTLED / ONGOING chip. Renders nothing when outcome is null -
 * most PastCases rows have no outcome_tag yet, and the brief's rule is to
 * omit, never guess (section B4). */
export function ResultTag({ outcome }) {
  if (!outcome) return null;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${OUTCOME_VARIANTS[outcome] || OUTCOME_VARIANTS.lost}`}>
      {OUTCOME_LABELS[outcome] || outcome.toUpperCase()}
    </span>
  );
}

/** Inquiry card with an AI (or mock "Draft") summary (brief section B2).
 * Pass onClick only when the lawyer can act on it - an unconfirmed
 * candidate match (brief section B5) is read-only. */
export function InquiryCard({ title, meta, scorePct, summary, isAiGenerated, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full text-left border border-border rounded-md p-3 ${onClick ? "cursor-pointer hover:border-navy" : ""}`}
    >
      <div className="flex justify-between items-center gap-2">
        <span className="text-[12px] font-bold text-navy">{title}</span>
        {scorePct !== null && scorePct !== undefined && (
          <span className="text-gold-text font-bold text-[12px] shrink-0">{scorePct}%</span>
        )}
      </div>
      {meta && <div className="text-[9.5px] text-slate mt-0.5 mb-1.5">{meta}</div>}
      {summary && (
        <div className="bg-ice rounded-sm px-2 py-1.5 text-[10px] text-body leading-relaxed">
          <div className="text-[8.5px] font-bold text-gold-text mb-0.5 tracking-wide">
            {isAiGenerated ? "✦ AI SUMMARY" : "DRAFT SUMMARY"}
          </div>
          {summary}
        </div>
      )}
    </Wrapper>
  );
}

export function HistoryItem({ title, detail, outcome }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border text-[11px] gap-2">
      <div>
        <div className="font-semibold text-navy">{title}</div>
        {detail && <div className="text-[9.5px] text-slate mt-0.5">{detail}</div>}
      </div>
      <ResultTag outcome={outcome} />
    </div>
  );
}
