/** Dashboard tile with an optional count badge (brief section B2). Tiles
 * the brief calls "not wired in this demo" are passed dim=true: shown as
 * "Coming soon", never a dead link that pretends to work. */
export function Tile({ label, badgeCount, dark, dim, onClick }) {
  return (
    <button
      type="button"
      onClick={dim ? undefined : onClick}
      disabled={dim}
      title={dim ? "Coming soon" : undefined}
      className={[
        "relative rounded-md border text-[11.5px] font-bold text-center px-2 py-4 min-h-16 transition-colors",
        dark
          ? "bg-navy text-white border-navy"
          : dim
          ? "bg-white text-slate border-border-strong opacity-60 cursor-default"
          : "bg-white text-navy border-border-strong hover:border-navy hover:bg-ice cursor-pointer",
      ].join(" ")}
    >
      {label}
      {dim && <div className="text-[8.5px] font-normal mt-0.5 text-slate">Coming soon</div>}
      {badgeCount ? (
        <span className="absolute -top-1.5 -right-1.5 bg-navy text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {badgeCount}
        </span>
      ) : null}
    </button>
  );
}

const STEP_COUNT = 4;

/** 4-step progress dots: 1 intake, 2 category, 3 details, 4 matches (brief
 * section B3). */
export function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-4" aria-label={`Step ${current} of ${STEP_COUNT}`}>
      {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center">
          <div
            className={[
              "w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[9.5px] font-bold",
              n < current
                ? "bg-navy border-navy text-white"
                : n === current
                ? "border-gold text-gold-text"
                : "border-border-strong text-slate",
            ].join(" ")}
          >
            {n < current ? "✓" : n}
          </div>
          {n < STEP_COUNT && <div className="w-4 h-px bg-border-strong" />}
        </div>
      ))}
    </div>
  );
}
