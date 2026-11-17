import { useEffect, useMemo, useState } from "react";
import { adminDeleteCase, adminDeleteClient, adminDeleteLawyer, adminSetLawyerVerified, getAdminOverview } from "../auth/authApi";

const BG = "#F8FAFC";
const NAVY = "#0F2744";
const BORDER = "#E2E8F0";
const MUTED = "#64748B";
const DANGER = "#B91C1C";
const SUCCESS = "#15803D";

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(issueStatus, matchStatus) {
  const raw = String(matchStatus || issueStatus || "open").toLowerCase();
  if (raw === "pending") return "requested";
  return raw;
}

function Section({ title, count, children }) {
  return (
    <section style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "14px", color: NAVY }}>{title}</h2>
        <span style={{ fontSize: "12px", color: MUTED }}>{count}</span>
      </div>
      <div style={{ padding: "8px 16px" }}>{children}</div>
    </section>
  );
}

function DangerButton({ onClick, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${DANGER}`,
        color: DANGER,
        background: "white",
        borderRadius: "8px",
        fontSize: "12px",
        padding: "5px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

function VerifyButton({ onClick, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${SUCCESS}`,
        color: SUCCESS,
        background: "white",
        borderRadius: "8px",
        fontSize: "12px",
        padding: "5px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function AdminDashboard({ currentUser, onSignOut }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);

  async function loadOverview() {
    setLoading(true);
    setError("");
    const result = await getAdminOverview();
    if (!result.ok) {
      setError(result.error || "Unable to load admin data.");
      setLoading(false);
      return;
    }

    setClients(result.clients);
    setLawyers(result.lawyers);
    setCases(result.cases);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOverview();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const metrics = useMemo(() => {
    const requested = cases.filter((c) => statusLabel(c.issue_status, c.match_status) === "requested").length;
    const ongoing = cases.filter((c) => statusLabel(c.issue_status, c.match_status) === "ongoing").length;
    return { requested, ongoing };
  }, [cases]);

  async function handleDeleteCase(issueId) {
    if (!window.confirm("Delete this case? This will also remove related matches and reviews.")) return;
    setBusy(`case:${issueId}`);
    const result = await adminDeleteCase(issueId);
    setBusy("");
    if (!result.ok) {
      setError(result.error || "Unable to delete case.");
      return;
    }
    setCases((prev) => prev.filter((item) => item.issue_id !== issueId));
  }

  async function handleDeleteClient(clientId) {
    if (!window.confirm("Delete this client? Their cases and matches will also be deleted.")) return;
    setBusy(`client:${clientId}`);
    const result = await adminDeleteClient(clientId);
    setBusy("");
    if (!result.ok) {
      setError(result.error || "Unable to delete client.");
      return;
    }
    setClients((prev) => prev.filter((item) => item.user_id !== clientId));
    setCases((prev) => prev.filter((item) => item.client_id !== clientId));
  }

  async function handleToggleVerify(lawyerId, nextVerified) {
    setBusy(`verify:${lawyerId}`);
    const result = await adminSetLawyerVerified(lawyerId, nextVerified);
    setBusy("");
    if (!result.ok) {
      setError(result.error || "Unable to update lawyer verification.");
      return;
    }
    setLawyers((prev) =>
      prev.map((item) => (item.user_id === lawyerId ? { ...item, is_verified: nextVerified } : item))
    );
  }

  async function handleDeleteLawyer(lawyerId) {
    if (!window.confirm("Delete this lawyer? Related matches and reviews will also be deleted.")) return;
    setBusy(`lawyer:${lawyerId}`);
    const result = await adminDeleteLawyer(lawyerId);
    setBusy("");
    if (!result.ok) {
      setError(result.error || "Unable to delete lawyer.");
      return;
    }
    setLawyers((prev) => prev.filter((item) => item.user_id !== lawyerId));
    setCases((prev) =>
      prev.map((item) =>
        item.lawyer_id === lawyerId
          ? { ...item, lawyer_id: null, lawyer_name: null, lawyer_email: null, match_status: null }
          : item
      )
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: MUTED }}>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <nav style={{ height: "52px", background: NAVY, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700 }}>LegalMatch Admin</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", opacity: 0.8 }}>{currentUser?.email}</span>
          <button onClick={onSignOut} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.35)", color: "white", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 14px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", color: MUTED }}>Clients</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: NAVY }}>{clients.length}</div>
          </div>
          <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", color: MUTED }}>Lawyers</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: NAVY }}>{lawyers.length}</div>
          </div>
          <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", color: MUTED }}>Cases</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: NAVY }}>{cases.length}</div>
          </div>
          <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", color: MUTED }}>Requested</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: NAVY }}>{metrics.requested}</div>
          </div>
          <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ fontSize: "11px", color: MUTED }}>Ongoing</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: NAVY }}>{metrics.ongoing}</div>
          </div>
        </div>

        {error && <p style={{ margin: 0, color: DANGER, fontSize: "12px" }}>{error}</p>}

        <Section title="Cases" count={cases.length}>
          {cases.length === 0 ? (
            <p style={{ fontSize: "13px", color: MUTED }}>No cases available.</p>
          ) : (
            cases.map((item) => (
              <div key={item.issue_id} style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: "13px" }}>{item.issue_title || "Untitled case"}</p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: MUTED }}>
                    Client: {item.client_email || "-"}
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: MUTED }}>
                    Lawyer: {item.lawyer_name || item.lawyer_email || "Not assigned"}
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: MUTED }}>
                    Status: {statusLabel(item.issue_status, item.match_status)} · Posted {fmtDate(item.created_at)}
                  </p>
                </div>
                <DangerButton
                  onClick={() => handleDeleteCase(item.issue_id)}
                  label="Delete case"
                  disabled={busy === `case:${item.issue_id}`}
                />
              </div>
            ))
          )}
        </Section>

        <Section title="Clients" count={clients.length}>
          {clients.length === 0 ? (
            <p style={{ fontSize: "13px", color: MUTED }}>No clients available.</p>
          ) : (
            clients.map((item) => (
              <div key={item.user_id} style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: "13px" }}>{item.email}</p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: MUTED }}>
                    Cases posted: {item.total_cases || 0} · Joined {fmtDate(item.created_at)}
                  </p>
                </div>
                <DangerButton
                  onClick={() => handleDeleteClient(item.user_id)}
                  label="Delete client"
                  disabled={busy === `client:${item.user_id}`}
                />
              </div>
            ))
          )}
        </Section>

        <Section title="Lawyers" count={lawyers.length}>
          {lawyers.length === 0 ? (
            <p style={{ fontSize: "13px", color: MUTED }}>No lawyers available.</p>
          ) : (
            lawyers.map((item) => (
              <div key={item.user_id} style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: "13px" }}>
                    {item.full_name || item.email}{" "}
                    <span style={{ fontWeight: 400, fontSize: "11px", color: item.is_verified ? SUCCESS : MUTED }}>
                      ({item.is_verified ? "Verified" : "Unverified"})
                    </span>
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: MUTED }}>
                    {item.email} · {item.lsk_registration_number || "No LSK number"}
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: MUTED }}>
                    {item.specializations || "No specialization added"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <VerifyButton
                    onClick={() => handleToggleVerify(item.user_id, !item.is_verified)}
                    label={item.is_verified ? "Unverify" : "Verify"}
                    disabled={busy === `verify:${item.user_id}`}
                  />
                  <DangerButton
                    onClick={() => handleDeleteLawyer(item.user_id)}
                    label="Delete lawyer"
                    disabled={busy === `lawyer:${item.user_id}`}
                  />
                </div>
              </div>
            ))
          )}
        </Section>
      </main>
    </div>
  );
}
