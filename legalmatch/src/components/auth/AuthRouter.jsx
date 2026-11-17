import { useState } from "react";
import ClientAuth from "./ClientAuth";
import LawyerAuth from "./LawyerAuth";
import AdminAuth from "./AdminAuth";

/**
 * AuthRouter
 * Top-level component that controls which auth portal is shown.
 * Route this to /auth or / in your React Router setup.
 *
 * Usage:
 *   <AuthRouter />
 *
 * For React Router v6:
 *   <Route path="/auth" element={<AuthRouter />} />
 *   <Route path="/auth/lawyer" element={<AuthRouter defaultPortal="lawyer" />} />
 */
export default function AuthRouter({ defaultPortal = "client", onBack, onAuthSuccess }) {
  const [portal, setPortal] = useState(defaultPortal);

  if (portal === "admin") {
    return (
      <AdminAuth
        onBack={onBack}
        onSwitchToClient={() => setPortal("client")}
        onSwitchToLawyer={() => setPortal("lawyer")}
        onAuthSuccess={onAuthSuccess}
      />
    );
  }

  return portal === "lawyer" ? (
    <LawyerAuth
      onBack={onBack}
      onSwitchToClient={() => setPortal("client")}
      onSwitchToAdmin={() => setPortal("admin")}
      onAuthSuccess={onAuthSuccess}
    />
  ) : (
    <ClientAuth
      onBack={onBack}
      onSwitchToLawyer={() => setPortal("lawyer")}
      onSwitchToAdmin={() => setPortal("admin")}
      onAuthSuccess={onAuthSuccess}
    />
  );
}
