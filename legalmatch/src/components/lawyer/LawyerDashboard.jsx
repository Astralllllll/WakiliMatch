import { useState, useEffect } from "react";
import { getLawyerCaseDetail, getLawyerCases, getLawyerProfile, updateLawyerCaseDecision } from "../auth/authApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button } from "../ui/Controls";
import { Tile } from "../ui/Tiles";
import { AIBadge } from "../ui/Badges";
import { InquiryCard } from "../ui/Cards";

// ─── Design tokens (brief section B2 - navy/gold, no separate green accent) ───
const NAVY      = "#1B2A4A";
const GREEN     = "#1B2A4A"; // old accent green folded into navy - brand has no green
const GREEN_BG  = "#EDF2FA"; // old pale-green fill folded into ice
const BORDER    = "#E2E8F0";
const BG        = "#F0F4F8";
const TEXT      = "#0F172A";
const MUTED     = "#64748B";
const HINT      = "#94A3B8";
const WARN_BG   = "#FFF7ED";
const WARN      = "#C2620A";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  requested: { label: "Requested", bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  ongoing:   { label: "Ongoing",   bg: "#F0FDF4", color: "#15803D", dot: "#22C55E" },
  completed: { label: "Completed", bg: "#F8FAFC", color: "#475569", dot: "#94A3B8" },
  declined:  { label: "Declined",  bg: WARN_BG,   color: WARN,      dot: "#F97316" },
};

function mapProfile(raw, currentUser) {
  const fallbackName = currentUser?.email
    ? currentUser.email.split("@")[0]
    : "Advocate";

  return {
    fullName: raw?.full_name || fallbackName,
    biography: raw?.biography || "No biography added yet.",
    specializations: raw?.specializations || "General Practice",
    academicQualifications: raw?.academic_qualifications || "—",
    yearsOfExperience: Number(raw?.years_of_experience || 0),
    previousCasesHandled: Number(raw?.previous_cases_handled || 0),
    successRate: Number(raw?.success_rate || 0),
    averageRating: Number(raw?.average_rating || 0),
    totalReviews: Number(raw?.total_reviews || 0),
    priceGuidance: raw?.price_guidance || "—",
    courts: raw?.courts || "—",
    languages: raw?.languages || "—",
    lskNumber: raw?.lsk_registration_number || "—",
    firmName: raw?.firm_name || "",
  };
}

function mapCase(raw) {
  const normalizedStatus = (raw?.status || "requested").toLowerCase();
  const safeStatus = STATUS[normalizedStatus] ? normalizedStatus : "requested";

  const detailsConfirmed = raw?.details_confirmed ?? true;

  return {
    id: raw?.match_id,
    issueId: raw?.issue_id,
    title: raw?.issue_title || "Untitled legal matter",
    description: raw?.issue_description || (detailsConfirmed ? "No case description provided." : null),
    detailsConfirmed,
    aiSummary: raw?.ai_summary || null,
    category: raw?.legal_category || "General",
    jurisdiction: raw?.jurisdiction || "—",
    urgency: raw?.urgency_level || "—",
    budgetRange: raw?.budget_range || "",
    budgetMin: raw?.budget_min,
    budgetMax: raw?.budget_max,
    clientName: raw?.client_display_name || raw?.client_email || "Client",
    clientEmail: raw?.client_email || "—",
    status: safeStatus,
    updatedAt: raw?.updated_at || raw?.created_at,
    completedAt: raw?.updated_at || raw?.created_at,
    rating: raw?.rating ? Number(raw.rating) : null,
    reviewComment: raw?.review_comment || "",
    reviewCreatedAt: raw?.review_created_at || null,
  };
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function formatBudget(min, max, range) {
  if (range && String(range).trim()) return String(range);
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (!hasMin && !hasMax) return "Not specified";
  if (hasMin && hasMax) return `KES ${Number(min).toLocaleString()} - KES ${Number(max).toLocaleString()}`;
  if (hasMin) return `From KES ${Number(min).toLocaleString()}`;
  return `Up to KES ${Number(max).toLocaleString()}`;
}

function Stars({ rating }) {
  return (
    <span style={{ color: "#F59E0B", fontSize: "13px", letterSpacing: "1px" }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.requested;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 9px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function Divider({ style }) {
  return <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: 0, ...style }} />;
}

function SectionLabel({ children }) {
  return (
    <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: ".08em", color: HINT, textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: "64px" }}>
      <span style={{ fontSize: "22px", fontWeight: 700, color: NAVY }}>{value}</span>
      <span style={{ fontSize: "10px", color: MUTED, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

// ─── Profile card ──────────────────────────────────────────────────────────────
function ProfileCard({ profile, onEdit }) {
  const specs = (profile.specializations || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section
      style={{
        background: "white",
        borderRadius: "14px",
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: NAVY,
          padding: "24px 24px 20px",
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: GREEN,
            color: "white",
            fontSize: "22px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "2px solid rgba(255,255,255,.2)",
          }}
        >
          {profile.fullName.charAt(0)}
        </div>

        {/* Name + firm */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "white" }}>{profile.fullName}</p>
          {profile.firmName && (
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255,255,255,.65)" }}>{profile.firmName}</p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "rgba(255,255,255,.5)" }}>{profile.lskNumber}</p>
        </div>

        {/* Edit button — top-right corner */}
        <button
          onClick={onEdit}
          title="Edit profile"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "8px",
            background: "rgba(255,255,255,.1)",
            border: "1px solid rgba(255,255,255,.2)",
            color: "rgba(255,255,255,.85)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 1.5a2.121 2.121 0 013 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Edit profile
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px 24px",
          borderBottom: `1px solid ${BORDER}`,
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Stat value={profile.yearsOfExperience} label="Years exp." />
        <div style={{ width: "1px", background: BORDER, alignSelf: "stretch" }} />
        <Stat value={profile.previousCasesHandled} label="Cases handled" />
        <div style={{ width: "1px", background: BORDER, alignSelf: "stretch" }} />
        <Stat value={`${profile.successRate}%`} label="Success rate" />
        <div style={{ width: "1px", background: BORDER, alignSelf: "stretch" }} />
        <Stat value={`${profile.averageRating}★`} label={`${profile.totalReviews} reviews`} />
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Bio */}
        <div>
          <SectionLabel>About</SectionLabel>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: TEXT, lineHeight: 1.6 }}>
            {profile.biography}
          </p>
        </div>

        <Divider />

        {/* Specialisations */}
        <div>
          <SectionLabel>Specialisations</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {specs.map((s) => (
              <span
                key={s}
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: GREEN_BG,
                  color: GREEN,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <Divider />

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "Qualifications", value: profile.academicQualifications },
            { label: "Courts",         value: profile.courts },
            { label: "Languages",      value: profile.languages },
            { label: "Fee guidance",   value: profile.priceGuidance },
          ].map(({ label, value }) => (
            <div key={label}>
              <SectionLabel>{label}</SectionLabel>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: TEXT }}>{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Active case row ───────────────────────────────────────────────────────────
function ActiveCaseRow({ c, onOpen }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {/* Category stripe */}
      <div
        style={{
          width: "3px",
          alignSelf: "stretch",
          borderRadius: "2px",
          background: c.status === "ongoing" ? GREEN : "#3B82F6",
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>{c.title}</p>
          <StatusBadge status={c.status} />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: MUTED }}>{c.category}</span>
          <span style={{ fontSize: "11px", color: HINT }}>Client: {c.clientName}</span>
          <span style={{ fontSize: "11px", color: HINT }}>Updated {fmt(c.updatedAt)}</span>
        </div>
        <button
          onClick={() => onOpen(c)}
          style={{
            marginTop: "10px",
            border: `1px solid ${BORDER}`,
            background: "white",
            color: NAVY,
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open case
        </button>
      </div>
    </div>
  );
}

function ActiveCaseDetails({ c, onBack, onDecision, decisionLoading }) {
  const isDecisionLocked = c.status === "ongoing" || c.status === "declined" || c.status === "completed" || c.detailsConfirmed === false;

  return (
    <section
      style={{
        background: "white",
        borderRadius: "14px",
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: NAVY,
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Back to active cases
        </button>
        <StatusBadge status={c.status} />
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <SectionLabel>Case title</SectionLabel>
          <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: NAVY }}>{c.title}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <SectionLabel>Category</SectionLabel>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: TEXT }}>{c.category}</p>
          </div>
          <div>
            <SectionLabel>Jurisdiction</SectionLabel>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: TEXT }}>{c.jurisdiction}</p>
          </div>
          <div>
            <SectionLabel>Urgency</SectionLabel>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: TEXT }}>{c.urgency}</p>
          </div>
          <div>
            <SectionLabel>Budget</SectionLabel>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: TEXT }}>{formatBudget(c.budgetMin, c.budgetMax, c.budgetRange)}</p>
          </div>
        </div>

        <div>
          <SectionLabel>Case details</SectionLabel>
          {c.detailsConfirmed === false ? (
            <div style={{ marginTop: "6px", padding: "10px 12px", background: GREEN_BG, borderRadius: "8px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: MUTED, lineHeight: 1.6 }}>
                Full details are hidden until the client confirms you specifically for this case.
              </p>
              {c.aiSummary && (
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: TEXT, lineHeight: 1.6 }}>{c.aiSummary}</p>
              )}
            </div>
          ) : (
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: TEXT, lineHeight: 1.6 }}>{c.description}</p>
          )}
        </div>

        <Divider />

        <div>
          <SectionLabel>Client contact</SectionLabel>
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: TEXT }}>Name: {c.clientName}</p>
            <p style={{ margin: 0, fontSize: "13px", color: TEXT }}>Email: {c.clientEmail}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", paddingTop: "4px" }}>
          <button
            onClick={() => onDecision("accept")}
            disabled={decisionLoading || isDecisionLocked}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: "none",
              background: GREEN,
              color: "white",
              fontSize: "12px",
              fontWeight: 700,
              cursor: decisionLoading || isDecisionLocked ? "not-allowed" : "pointer",
              opacity: decisionLoading || isDecisionLocked ? 0.6 : 1,
            }}
          >
            {c.status === "ongoing" ? "Accepted" : c.status === "declined" ? "Decision locked" : "Accept case"}
          </button>
          <button
            onClick={() => onDecision("reject")}
            disabled={decisionLoading || isDecisionLocked}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: `1px solid ${WARN}`,
              background: "white",
              color: WARN,
              fontSize: "12px",
              fontWeight: 700,
              cursor: decisionLoading || isDecisionLocked ? "not-allowed" : "pointer",
              opacity: decisionLoading || isDecisionLocked ? 0.6 : 1,
            }}
          >
            {c.status === "declined" ? "Rejected" : c.status === "ongoing" ? "Decision locked" : "Reject case"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Completed case row ────────────────────────────────────────────────────────
function CompletedCaseRow({ c }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "12px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          width: "3px",
          alignSelf: "stretch",
          borderRadius: "2px",
          background: BORDER,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: TEXT }}>{c.title}</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: MUTED }}>{c.category}</span>
          <span style={{ fontSize: "11px", color: HINT }}>Client: {c.clientName}</span>
          <Stars rating={c.rating} />
          <span style={{ fontSize: "11px", color: HINT }}>{fmt(c.completedAt)}</span>
          {c.reviewCreatedAt && (
            <span style={{ fontSize: "11px", color: HINT }}>Reviewed on {fmt(c.reviewCreatedAt)}</span>
          )}
        </div>
        {c.reviewComment && (
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
            "{c.reviewComment}"
          </p>
        )}
      </div>
      <StatusBadge status="completed" />
    </div>
  );
}

// ─── Cases section card ────────────────────────────────────────────────────────
function CasesCard({ title, count, emptyMessage, children }) {
  return (
    <section
      style={{
        background: "white",
        borderRadius: "14px",
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: NAVY }}>{title}</h2>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            background: BG,
            color: MUTED,
            padding: "2px 8px",
            borderRadius: "12px",
            border: `1px solid ${BORDER}`,
          }}
        >
          {count}
        </span>
      </div>

      <div style={{ padding: "0 20px" }}>
        {count === 0 ? (
          <p style={{ padding: "24px 0", textAlign: "center", color: HINT, fontSize: "13px", margin: 0 }}>
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function LawyerDashboard({ currentUser, onEditProfile, onSignOut }) {
  const [profile,   setProfile]   = useState(null);
  const [active,    setActive]    = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error, setError] = useState("");
  const [selectedActiveCase, setSelectedActiveCase] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [view, setView] = useState("tiles"); // tiles | inquiries | cases

  useEffect(() => {
    async function loadDashboard() {
      if (!currentUser?.id) {
        setLoading(false);
        setError("Unable to determine current user.");
        return;
      }

      setLoading(true);
      setError("");

      const [profileResult, casesResult] = await Promise.all([
        getLawyerProfile(currentUser.id),
        getLawyerCases(currentUser.id),
      ]);

      if (!profileResult.ok) {
        setError(profileResult.error || "Unable to load profile.");
        setProfile(mapProfile(null, currentUser));
      } else {
        setProfile(mapProfile(profileResult.profile, currentUser));
      }

      if (!casesResult.ok) {
        setError((prev) => prev || casesResult.error || "Unable to load cases.");
        setActive([]);
        setCompleted([]);
        setSelectedActiveCase(null);
      } else {
        const allCases = casesResult.cases.map(mapCase);
        const activeCases = allCases.filter((c) => c.status !== "completed");
        const completedCases = allCases.filter((c) => c.status === "completed");
        setCompleted(completedCases);
        setActive(activeCases);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [currentUser]);

  async function handleCaseDecision(decision) {
    if (!selectedActiveCase?.id || !currentUser?.id) return;

    const confirmationMessage =
      decision === "accept"
        ? "Confirm accepting this case?"
        : "Confirm rejecting this case?";

    if (!window.confirm(confirmationMessage)) return;

    setDecisionLoading(true);
    const result = await updateLawyerCaseDecision({
      match_id: selectedActiveCase.id,
      lawyer_id: currentUser.id,
      decision,
    });
    setDecisionLoading(false);

    if (!result.ok) {
      setError(result.error || "Unable to update case decision.");
      return;
    }

    const nextStatus = decision === "accept" ? "ongoing" : "declined";
    setActive((prev) => prev.map((c) => (c.id === selectedActiveCase.id ? { ...c, status: nextStatus } : c)));
    setSelectedActiveCase((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    setError("");
  }

  async function handleOpenCase(caseSummary) {
    if (!caseSummary?.id) {
      setSelectedActiveCase(caseSummary);
      return;
    }

    setDetailsLoading(true);
    const detailResult = await getLawyerCaseDetail(caseSummary.id);
    setDetailsLoading(false);

    if (!detailResult.ok || !detailResult.case) {
      setError(detailResult.error || "Unable to load full case details.");
      setSelectedActiveCase(caseSummary);
      return;
    }

    setError("");
    setSelectedActiveCase(mapCase(detailResult.case));
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen>
        <TitleBar title="Lawyer Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: `3px solid ${BORDER}`,
                borderTopColor: "#C9A227",
                borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 0.7s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>Loading your dashboard…</p>
          </div>
        </div>
      </Screen>
    );
  }

  // Candidate matches the client hasn't confirmed yet (raw status
  // 'pending') vs ones the client has confirmed and the lawyer must
  // decide on (raw status 'requested') - brief section B5's privacy
  // gating is what tells these apart server-side.
  const unconfirmedCandidates = active.filter((c) => c.detailsConfirmed === false);
  const needsDecision = active.filter((c) => c.detailsConfirmed !== false && c.status === "requested");
  const ongoingCases = active.filter((c) => c.status === "ongoing");
  const inquiriesCount = unconfirmedCandidates.length + needsDecision.length;

  // ── Case detail (reached from Inquiries or My Cases) ───────────────────────
  if (detailsLoading) {
    return (
      <Screen>
        <TitleBar title="Case Detail" onBack={() => setSelectedActiveCase(null)} />
        <div className="p-4"><p className="text-[13px] text-slate">Loading case details…</p></div>
      </Screen>
    );
  }

  if (selectedActiveCase) {
    return (
      <Screen>
        <TitleBar title="Case Detail" onBack={() => setSelectedActiveCase(null)} />
        <div className="p-4 flex-1 flex flex-col gap-3">
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <ActiveCaseDetails
            c={selectedActiveCase}
            onBack={() => setSelectedActiveCase(null)}
            onDecision={handleCaseDecision}
            decisionLoading={decisionLoading}
          />
        </div>
      </Screen>
    );
  }

  // ── Inquiries ────────────────────────────────────────────────────────────
  if (view === "inquiries") {
    return (
      <Screen>
        <TitleBar title={<>Inquiries <AIBadge>AI</AIBadge></>} onBack={() => setView("tiles")} />
        <div className="p-4 flex-1 flex flex-col gap-2.5">
          <p className="text-[11px] text-slate mb-1">
            {inquiriesCount} new inquir{inquiriesCount === 1 ? "y" : "ies"}
            {needsDecision.some((c) => c.aiSummary) && <> · <span className="text-gold-text font-semibold">AI summaries ready</span></>}
          </p>
          {inquiriesCount === 0 ? (
            <p className="text-[12px] text-slate">No new inquiries right now. You'll appear here once a client's case matches your profile.</p>
          ) : (
            <>
              {needsDecision.map((c) => (
                <InquiryCard
                  key={c.id}
                  title={c.title}
                  meta={`${c.jurisdiction} · ${c.category}`}
                  summary={c.aiSummary}
                  isAiGenerated={false}
                  onClick={() => handleOpenCase(c)}
                />
              ))}
              {unconfirmedCandidates.map((c) => (
                <InquiryCard
                  key={c.id}
                  title={c.category}
                  meta="Awaiting the client's final choice of lawyer"
                  summary={c.aiSummary}
                  isAiGenerated={false}
                />
              ))}
            </>
          )}
        </div>
      </Screen>
    );
  }

  // ── Profile ──────────────────────────────────────────────────────────────
  if (view === "profile") {
    return (
      <Screen>
        <TitleBar title="Profile" onBack={() => setView("tiles")} action={onEditProfile} actionLabel="Edit" />
        <div className="p-4 flex-1 flex flex-col">
          {profile && <ProfileCard profile={profile} onEdit={onEditProfile} />}
        </div>
      </Screen>
    );
  }

  // ── My Cases ─────────────────────────────────────────────────────────────
  if (view === "cases") {
    return (
      <Screen>
        <TitleBar title="My Cases" onBack={() => setView("tiles")} />
        <div className="p-4 flex-1 flex flex-col gap-4">
          <CasesCard title="Ongoing" count={ongoingCases.length} emptyMessage="No ongoing cases yet.">
            {ongoingCases.map((c) => <ActiveCaseRow key={c.id} c={c} onOpen={handleOpenCase} />)}
          </CasesCard>
          <CasesCard title="Completed" count={completed.length} emptyMessage="Cases you finish will appear here with client ratings.">
            {completed.map((c) => <CompletedCaseRow key={c.id} c={c} />)}
          </CasesCard>
        </div>
      </Screen>
    );
  }

  // ── Dashboard tile grid ──────────────────────────────────────────────────
  return (
    <Screen>
      <TitleBar title="Lawyer Dashboard" />
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[12px] text-slate m-0">Advocate panel</p>
        <p className="text-[16px] font-bold text-navy mb-4">{profile?.fullName || "Advocate"}</p>

        <div className="grid grid-cols-2 gap-2.5">
          <Tile label="INQUIRIES" badgeCount={inquiriesCount || undefined} onClick={() => setView("inquiries")} />
          <Tile label="PROFILE" onClick={() => setView("profile")} />
          <Tile label="MY CASES" onClick={() => setView("cases")} />
          <Tile label="REPORTS" dim />
        </div>

        <div className="border border-border rounded-md p-3 mt-3">
          <p className="text-[10.5px] font-bold text-slate mb-2">QUICK STATS</p>
          <div className="flex justify-between text-[11px] text-slate py-1">
            <span>New inquiries</span><b className="text-navy">{inquiriesCount}</b>
          </div>
          <div className="flex justify-between text-[11px] text-slate py-1">
            <span>Ongoing cases</span><b className="text-navy">{ongoingCases.length}</b>
          </div>
          <div className="flex justify-between text-[11px] text-slate py-1">
            <span>Completed</span><b className="text-navy">{completed.length}</b>
          </div>
        </div>

        {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}
        <div className="flex-1" />
        <Button variant="outline" onClick={onSignOut}>Log out</Button>
      </div>
    </Screen>
  );
}
