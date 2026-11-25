import { AIBadge } from "./Badges";

/** Editable "extracted fields" box for Scan Document (brief section B2).
 * labelText should say "basic extraction (demo)" in mock mode, never
 * claiming real AI/OCR happened - see brief section B6. */
export function ExtractBox({ labelText, isAiGenerated, children }) {
  return (
    <div className="border border-gold rounded-md px-3 py-2.5 mb-3.5 bg-[#FFFDF5]">
      <div className="flex items-center gap-1.5 mb-2 text-[10.5px] font-bold text-navy">
        {isAiGenerated ? <AIBadge soft>✦ AI</AIBadge> : <AIBadge soft>DRAFT</AIBadge>}
        {labelText}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function ExtractRow({ label, children }) {
  return (
    <div className="flex justify-between gap-2 text-[10.5px] text-slate py-0.5">
      <span>{label}</span>
      <span className="text-navy font-semibold text-right">{children}</span>
    </div>
  );
}
