import { useState } from "react";
import { Button } from "../ui/Controls";

export function FormField({ label, id, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-navy">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputBase =
  "w-full min-h-11 rounded-sm border px-3.5 py-2.5 text-sm bg-white text-body outline-none transition-colors " +
  "border-border-strong focus:border-navy focus:ring-2 focus:ring-ice";

export function TextInput({ id, type = "text", placeholder, value, onChange, hasError }) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`${inputBase} ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
    />
  );
}

export function PasswordInput({ id, placeholder, value, onChange, hasError, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minLength={minLength}
        className={`${inputBase} pr-10 ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-navy transition-colors"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {visible ? (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export function SubmitButton({ children, loading }) {
  return (
    <Button type="submit" disabled={loading}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Please wait…
        </span>
      ) : children}
    </Button>
  );
}

export function TabSwitch({ tabs, active, onChange }) {
  return (
    <div className="flex p-1 rounded-sm bg-ice mb-6" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={[
              "flex-1 text-sm font-semibold py-2 rounded-sm transition-colors min-h-11",
              isActive ? "bg-white text-navy shadow-sm" : "text-slate cursor-pointer",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-slate">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}
