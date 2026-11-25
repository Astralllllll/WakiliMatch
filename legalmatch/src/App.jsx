import { useState } from "react";
import AuthRouter from "./components/auth/AuthRouter";
import RoleSelect from "./components/auth/RoleSelect";
import PostCaseWizard from "./components/case/PostCaseWizard";
import MatchResults from "./components/case/MatchResults";
import LawyerOnboarding from "./components/lawyer/LawyerOnboarding";
import LawyerDashboard from "./components/lawyer/LawyerDashboard";
import ClientDashboard from "./components/client/ClientDashboard";
import LawyerReviewPage from "./components/client/LawyerReviewPage";
import AdminDashboard from "./components/admin/AdminDashboard";
import LawyerList from './components/LawyerList';
import SplashScreen from "./components/SplashScreen";
import { getLawyerProfile, setAdminSessionToken } from "./components/auth/authApi";
import { CaseProvider } from "./context/CaseContext";
import { useCaseContext } from "./context/CaseContext";
import { getClientCases, getIssueMatches } from "./components/case/caseApi";

function isLawyerProfileComplete(profile) {
  if (!profile) return false;

  const hasSpecializations = Boolean(profile.specializations?.trim());
  const hasPriceGuidance = Boolean(profile.price_guidance?.trim());
  const hasPreviousCases = profile.previous_cases_handled !== null && profile.previous_cases_handled !== undefined;
  const hasSuccessRate = profile.success_rate !== null && profile.success_rate !== undefined;

  return hasSpecializations && hasPriceGuidance && hasPreviousCases && hasSuccessRate;
}

/**
 * App-level routing (no React Router yet — simple state machine)
 *
 * Pages:
 *   "role-select" → RoleSelect (client / lawyer / admin chooser, shown first)
 *   "auth"     → AuthRouter (client / lawyer login & register)
 *   "wizard"   → PostCaseWizard (3-step case posting form)
 *   "results"  → MatchResults (ranked lawyer cards)
 *   "lawyers"  → LawyerList (list of available lawyers)
 *
 * Replace this with React Router v6 routes when you add more pages.
 */
function AppShell() {
  const { updateCase } = useCaseContext();
  const [page, setPage] = useState("role-select");
  const [authPortal, setAuthPortal] = useState("client");
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  return (
    <>
      {page === "role-select" && (
        <RoleSelect
          onSelect={(role) => {
            setAuthPortal(role);
            setPage("auth");
          }}
        />
      )}
      {page === "auth" && (
        <AuthRouter
          defaultPortal={authPortal}
          onBack={() => setPage("role-select")}
          onAuthSuccess={async (user, meta) => {
            setCurrentUser(user || null);

            if (user?.role?.toLowerCase() === "admin") {
              setAdminSessionToken(meta?.adminSessionToken);
              setPage("admin-dashboard");
              return;
            }

            if (user?.role?.toLowerCase() === "lawyer") {
              if (!meta?.goToLawyerOnboarding) {
                setPage("lawyer-dashboard");
                return;
              }

              const profileResult = await getLawyerProfile(user.id);
              if (profileResult.ok && isLawyerProfileComplete(profileResult.profile)) {
                setPage("lawyer-dashboard");
                return;
              }

              setPage("lawyer-onboarding");
              return;
            }

            const clientCasesResult = await getClientCases(user.id);
            if (clientCasesResult.ok && clientCasesResult.issues.length > 0) {
              setPage("client-dashboard");
              return;
            }

            setPage("wizard");
          }}
        />
      )}
      {page === "client-dashboard" && (
        <ClientDashboard
          currentUser={currentUser}
          onPostNewCase={() => setPage("wizard")}
          onSelectDifferentLawyer={async (issue) => {
            const issueMatchesResult = await getIssueMatches(issue.issue_id);
            if (issueMatchesResult.ok) {
              updateCase({
                legalCategory: issue.legal_category || "",
                title: issue.issue_title || "",
                jurisdiction: issue.jurisdiction || "",
                description: issue.issue_description || "",
                caseId: issue.issue_id,
                matches: issueMatchesResult.matches,
              });
            } else {
              updateCase({
                legalCategory: issue.legal_category || "",
                title: issue.issue_title || "",
                jurisdiction: issue.jurisdiction || "",
                description: issue.issue_description || "",
                caseId: issue.issue_id,
                matches: [],
              });
            }
            setPage("results");
          }}
          onCaseComplete={async (issue) => {
            const issueMatchesResult = await getIssueMatches(issue.issue_id);
            const matches = issueMatchesResult.ok ? issueMatchesResult.matches : [];

            const acceptedMatch = matches.find((m) => {
              const status = String(m?.status || "").toLowerCase();
              return status === "ongoing" || status === "completed";
            });

            if (!acceptedMatch && !issue.match_id) {
              window.alert("No accepted case was found for review yet.");
              return;
            }

            const selectedMatchId = acceptedMatch?.match_id || issue.match_id;

            setReviewTarget({
              issueId: issue.issue_id,
              issueTitle: issue.issue_title,
              lawyerName: issue.lawyer_name || acceptedMatch.full_name || "Selected lawyer",
              matchId: selectedMatchId,
            });
            setPage("client-review");
          }}
          onSignOut={() => {
            setCurrentUser(null);
            setPage("auth");
          }}
        />
      )}
      {page === "client-review" && (
        <LawyerReviewPage
          currentUser={currentUser}
          reviewTarget={reviewTarget}
          onBack={() => setPage("client-dashboard")}
          onSubmitted={() => {
            setReviewTarget(null);
            setPage("client-dashboard");
          }}
        />
      )}
      {page === "lawyer-onboarding" && (
        <LawyerOnboarding currentUser={currentUser} onComplete={() => setPage("lawyer-dashboard")} />
      )}
      {page === "lawyer-dashboard" && (
        <LawyerDashboard
          currentUser={currentUser}
          onEditProfile={() => setPage("lawyer-onboarding")}
          onSignOut={() => {
            setCurrentUser(null);
            setPage("auth");
          }}
        />
      )}
      {page === "admin-dashboard" && (
        <AdminDashboard
          currentUser={currentUser}
          onSignOut={() => {
            setCurrentUser(null);
            setPage("auth");
          }}
        />
      )}
      {page === "wizard" && (
        <PostCaseWizard
          currentUser={currentUser}
          onSubmitSuccess={() => setPage("results")}
          onExit={() => setPage("client-dashboard")}
        />
      )}
      {page === "results" && (
        <MatchResults
          currentUser={currentUser}
          onPostNewCase={() => setPage("wizard")}
          onBackToClientDashboard={() => setPage("client-dashboard")}
        />
      )}
      {page === "lawyers" && (
        <LawyerList />
      )}
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <CaseProvider>
      <AppShell />
    </CaseProvider>
  );
}