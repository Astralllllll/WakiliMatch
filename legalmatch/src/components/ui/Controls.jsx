/** Solid/outline button, >=44px touch target (brief section B2). */
export function Button({ children, variant = "solid", onClick, type = "button", disabled, className = "" }) {
  const base = "w-full min-h-11 rounded-sm text-sm font-semibold tracking-wide transition-colors flex items-center justify-center gap-2";
  const variants = {
    solid: "bg-navy text-white hover:bg-navy-deep disabled:opacity-60",
    outline: "bg-white text-navy border border-border-strong hover:bg-ice disabled:opacity-60",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

const fieldInputBase =
  "w-full min-h-11 rounded-sm border px-3 py-2.5 text-sm text-body bg-white outline-none transition-colors " +
  "border-border-strong focus:border-navy focus:ring-2 focus:ring-ice";

export function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[13px] font-semibold text-navy">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-slate">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({ hasError, className = "", ...props }) {
  return (
    <input
      {...props}
      className={`${fieldInputBase} ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""} ${className}`}
    />
  );
}

export function TextArea({ hasError, className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`${fieldInputBase} resize-none leading-relaxed ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""} ${className}`}
    />
  );
}

export function Select({ hasError, className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`${fieldInputBase} cursor-pointer ${hasError ? "border-red-400" : ""} ${className}`}
    >
      {children}
    </select>
  );
}

/** Selectable pill, e.g. legal-category chooser (brief section B2). */
export function Pill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "min-h-11 rounded-sm border text-[11px] font-semibold px-2 py-2.5 text-center transition-colors",
        active ? "bg-navy text-white border-navy" : "bg-white text-navy border-border-strong hover:border-navy",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
