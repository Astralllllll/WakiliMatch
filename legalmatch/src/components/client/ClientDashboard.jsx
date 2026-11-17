import { useEffect, useMemo, useState } from "react";
import { getClientCases } from "../case/caseApi";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "#EFF6FF", color: "#1D4ED8" },
  accepted: { label: "Accepted", bg: "#E1F5EE", color: "#0F6E56" },
  completed: { label: "Completed", bg: "#F8FAFC", color: "#475569" },
  rejected: { label: "Rejected", bg: "#FEF2F2", color: "#B91C1C" },
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function ClientDashboard({ currentUser, onPostNewCase, onSelectDifferentLawyer, onCaseComplete, onSignOut }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load({ silent = false } = {}) {
      if (!currentUser?.id) {
        if (mounted) {
          setLoading(false);
          setError("Unable to determine current user.");
        }
        return;
      }

      if (!silent && mounted) {
        setLoading(true);
      }

      const result = await getClientCases(currentUser.id);
      if (!mounted) return;

      if (result.ok) {
        setError("");
        setIssues(result.issues);
      } else if (!silent) {
        setError(result.error || "Unable to load your case details.");
        setIssues([]);
      }

      if (!silent) {
        setLoading(false);
      }
    }

    load();

    const intervalId = setInterval(() => {
      load({ silent: true });
    }, 15000);

    const onFocus = () => load({ silent: true });
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUser?.id]);

  const hasExistingCases = useMemo(() => issues.length > 0, [issues]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "28px 16px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
              Client profile
            </p>
            <h1 style={{ margin: "4px 0 0", fontSize: "24px", color: "#0F2744" }}>
              Your case details and status
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onPostNewCase}
              style={{
                padding: "9px 14px",
                borderRadius: "8px",
                border: "none",
                background: "#1D9E75",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Post new case
            </button>
            <button
              onClick={onSignOut}
              style={{
                padding: "9px 14px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "white",
                color: "#0F2744",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px", color: "#64748B" }}>
            Loading your cases...
          </div>
        ) : error ? (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "16px", color: "#B91C1C", fontSize: "13px" }}>
            {error}
          </div>
        ) : !hasExistingCases ? (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px" }}>
            <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
              You have not posted any case details yet.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {issues.map((issue) => (
              <div
                key={issue.issue_id}
                style={{
                  background: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "16px", color: "#0F2744", fontWeight: 700 }}>{issue.issue_title || "Untitled case"}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B" }}>
                      Submitted {formatDate(issue.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={issue.match_status} />
                </div>

                <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
                  {issue.issue_description || "No case description available."}
                </p>

                <div style={{ marginTop: "10px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>Category: {issue.legal_category || "—"}</span>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>Jurisdiction: {issue.jurisdiction || "—"}</span>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>Lawyer: {issue.lawyer_name || "Not assigned"}</span>
                  {issue.match_status === "completed" && issue.review_created_at && (
                    <span style={{ fontSize: "12px", color: "#64748B" }}>
                      Reviewed on: {formatDate(issue.review_created_at)}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {issue.match_status === "accepted" ? (
                    <button
                      onClick={() => onCaseComplete(issue)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#1D9E75",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Case complete
                    </button>
                  ) : issue.match_status === "completed" ? (
                    <button
                      onClick={() => onCaseComplete(issue)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #CBD5E1",
                        background: "white",
                        color: "#0F2744",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View/Edit review
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectDifferentLawyer(issue)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #CBD5E1",
                        background: "white",
                        color: "#0F2744",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Select different lawyer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
