/**
 * Mobile-first screen shell (brief section B1). Designed at 390x844, fluid
 * from 320-430px. On desktop, centers a max-width 430px column over the
 * dark navy background - no fake phone bezel/notch.
 */
export function Screen({ children, className = "" }) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-navy-deep">
      <div className={`w-full max-w-[430px] min-h-screen bg-white flex flex-col ${className}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Navy title bar: back chip left, title centre (12px uppercase bold,
 * letter-spaced), action chip right (brief section B2).
 */
export function TitleBar({ title, badge, onBack, action, actionLabel }) {
  return (
    <div className="bg-navy text-white flex items-center justify-between px-1 py-1 shrink-0">
      <div className="w-16 flex justify-start">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] font-semibold opacity-90 hover:opacity-100 hover:underline px-2 py-3"
          >
            ← Back
          </button>
        )}
      </div>
      <div className="flex-1 text-center text-[12px] font-bold uppercase tracking-wide py-3 flex items-center justify-center gap-1.5">
        {title}
        {badge}
      </div>
      <div className="w-16 flex justify-end">
        {action && (
          <button
            type="button"
            onClick={action}
            className="text-[11px] font-semibold opacity-90 hover:opacity-100 hover:underline px-2 py-3"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
