import logo from "../../assets/logo.png";

const NAVY = "#0F2744";
const GREEN = "#1D9E75";

function ClientIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke={GREEN}
        strokeWidth="1.6"
      />
      <path
        d="M4.5 19.5c1.2-3.4 4-5.2 7.5-5.2s6.3 1.8 7.5 5.2"
        stroke={GREEN}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LawyerIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v18M7 6l-4 7a4 4 0 0 0 8 0l-4-7Zm10 0l-4 7a4 4 0 0 0 8 0l-4-7ZM4 6h16M9 3h6"
        stroke={NAVY}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RoleCard({ icon, title, description, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex-1 text-left rounded-2xl border bg-white p-6 sm:p-7 transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderColor: "#E2E8F0" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${accent}1A` }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-1.5" style={{ color: NAVY }}>
        {title}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      <span
        className="inline-flex items-center gap-1 text-sm font-medium mt-4 group-hover:gap-2 transition-all"
        style={{ color: accent }}
      >
        Continue →
      </span>
    </button>
  );
}

export default function RoleSelect({ onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <img
          src={logo}
          alt="LegalMatch"
          className="w-14 h-14 rounded-2xl object-cover mb-5"
          style={{ boxShadow: "0 8px 20px rgba(15, 39, 68, 0.15)" }}
        />

        <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-2" style={{ color: NAVY }}>
          How can we help you today?
        </h1>
        <p className="text-sm text-gray-500 text-center mb-10">
          Tell us who you are so we can take you to the right place.
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-4">
          <RoleCard
            icon={<ClientIcon />}
            title="I need a lawyer"
            description="Describe your legal issue and get matched with qualified, verified advocates."
            accent={GREEN}
            onClick={() => onSelect("client")}
          />
          <RoleCard
            icon={<LawyerIcon />}
            title="I am a lawyer"
            description="Build your profile and get matched with clients who need your expertise."
            accent={NAVY}
            onClick={() => onSelect("lawyer")}
          />
        </div>

        <button
          type="button"
          onClick={() => onSelect("admin")}
          className="text-xs text-gray-400 hover:text-gray-500 hover:underline mt-10"
        >
          Administrator sign in
        </button>
      </div>
    </div>
  );
}
