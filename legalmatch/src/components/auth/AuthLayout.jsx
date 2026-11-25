import { Screen, TitleBar } from "../ui/Screen";

const PORTALS = [
  { key: "client", label: "Client" },
  { key: "lawyer", label: "Lawyer" },
  { key: "admin", label: "Admin" },
];

function PortalNav({ activePortal, onSwitchToClient, onSwitchToLawyer, onSwitchToAdmin }) {
  const handlers = { client: onSwitchToClient, lawyer: onSwitchToLawyer, admin: onSwitchToAdmin };

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-sm bg-ice mb-5" role="tablist">
      {PORTALS.map((p) => {
        const isActive = p.key === activePortal;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={handlers[p.key]}
            disabled={isActive}
            className={[
              "flex-1 text-[11.5px] font-semibold py-2 rounded-sm transition-colors",
              isActive ? "bg-white text-navy shadow-sm" : "text-slate cursor-pointer",
            ].join(" ")}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Mobile-first auth shell (brief section B1/B3), replacing the old
 * desktop two-pane layout. Shared by client/lawyer/admin portals - the
 * portal switch itself is existing functionality, just restyled.
 */
export default function AuthLayout({ role, activePortal, onBack, onSwitchToClient, onSwitchToLawyer, onSwitchToAdmin, children }) {
  const title = role === "lawyer" ? "Advocate Portal" : role === "admin" ? "Admin Portal" : "Client Portal";

  return (
    <Screen>
      <TitleBar title={title} onBack={onBack} />
      <div className="p-5 flex-1 flex flex-col">
        <div className="w-15 h-15 rounded-full bg-navy flex items-center justify-center mx-auto mb-4" style={{ width: 60, height: 60 }}>
          <svg width="26" height="26" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L3 6v4c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V6L9 2z" fill="white" fillOpacity=".9" />
          </svg>
        </div>
        <p className="text-center text-[16px] font-bold text-navy mb-5">WakiliMatch</p>

        <PortalNav
          activePortal={activePortal}
          onSwitchToClient={onSwitchToClient}
          onSwitchToLawyer={onSwitchToLawyer}
          onSwitchToAdmin={onSwitchToAdmin}
        />

        {children}
      </div>
    </Screen>
  );
}
