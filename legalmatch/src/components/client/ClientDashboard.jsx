import { useEffect, useState } from "react";
import { getClientCases } from "../case/caseApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button } from "../ui/Controls";
import { Tile } from "../ui/Tiles";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "#EFF6FF", color: "#1D4ED8" },
  accepted: { label: "Accepted", bg: "#E1F5EE", color: "#0F6E56" },
  completed: { label: "Completed", bg: "#F8FAFC", color: "#475569" },
  rejected: { label: "Rejected", bg: "#FEF2F2", color: "#B91C1C" },
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      style={{ background: cfg.bg, color: cfg.color }}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
    >
      {cfg.label}
    </span>
  );
}

// ─── "My Cases" sub-view ────────────────────────────────────────────────────

function MyCases({ onBack, currentUser, onSelectDifferentLawyer, onCaseComplete }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!currentUser?.id) {
        if (mounted) { setLoading(false); setError("Unable to determine current user."); }
        return;
      }
      const result = await getClientCases(currentUser.id);
      if (!mounted) return;
      if (result.ok) { setError(""); setIssues(result.issues); }
      else { setError(result.error || "Unable to load your case details."); setIssues([]); }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [currentUser?.id]);

  return (
    <Screen>
      <TitleBar title="My Cases" onBack={onBack} />
      <div className="p-4 flex-1 flex flex-col gap-3">
        {loading ? (
          <p className="text-[13px] text-slate">Loading your cases…</p>
        ) : error ? (
          <p className="text-[12px] text-red-600">{error}</p>
        ) : issues.length === 0 ? (
          <p className="text-[13px] text-slate">You have not posted any case details yet.</p>
        ) : (
          issues.map((issue) => (
            <div key={issue.issue_id} className="border border-border rounded-md p-3.5">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-navy m-0">{issue.issue_title || "Untitled case"}</p>
                  <p className="text-[11px] text-slate m-0 mt-0.5">Submitted {formatDate(issue.created_at)}</p>
                </div>
                <StatusBadge status={issue.match_status} />
              </div>
              <p className="text-[12px] text-body mt-2 leading-relaxed">{issue.issue_description || "No case description available."}</p>
              <div className="flex gap-3 flex-wrap mt-2 text-[11px] text-slate">
                <span>Category: {issue.legal_category || "—"}</span>
                <span>Lawyer: {issue.lawyer_name || "Not assigned"}</span>
              </div>
              <div className="mt-2.5">
                {issue.match_status === "accepted" || issue.match_status === "completed" ? (
                  <Button variant="outline" onClick={() => onCaseComplete(issue)}>
                    {issue.match_status === "accepted" ? "Case complete" : "View/Edit review"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onSelectDifferentLawyer(issue)}>Select different lawyer</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Screen>
  );
}

// ─── Dashboard tile grid ────────────────────────────────────────────────────

export default function ClientDashboard({ currentUser, onPostNewCase, onSelectDifferentLawyer, onCaseComplete, onSignOut }) {
  const [view, setView] = useState("tiles");

  if (view === "cases") {
    return (
      <MyCases
        onBack={() => setView("tiles")}
        currentUser={currentUser}
        onSelectDifferentLawyer={onSelectDifferentLawyer}
        onCaseComplete={onCaseComplete}
      />
    );
  }

  return (
    <Screen>
      <TitleBar title="Client Dashboard" />
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[12px] text-slate m-0">Good to see you</p>
        <p className="text-[16px] font-bold text-navy mb-4">{currentUser?.fullName || currentUser?.email || "Client"}</p>

        <div className="grid grid-cols-2 gap-2.5">
          <Tile label="MY CASES" onClick={() => setView("cases")} />
          <Tile label="MY LAWYERS" dim />
          <Tile label="NEW CASE" onClick={onPostNewCase} />
          <Tile label="MESSAGES" dim />
        </div>

        <div className="flex-1" />

        <div className="grid grid-cols-2 gap-2.5">
          <Tile label="SETTINGS" dim />
          <Tile label="LOG OUT" dark onClick={onSignOut} />
        </div>
      </div>
    </Screen>
  );
}
