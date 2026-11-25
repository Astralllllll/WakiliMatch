const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readResponseData(response) {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return null;
  }
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readResponseData(response);

  if (!response.ok) {
    const fallback = response.status >= 500
      ? "Server is unavailable. Start the backend with 'npm run server' and try again."
      : "Request failed. Please try again.";
    const message =
      (typeof data === "object" && data?.error) ||
      (typeof data === "object" && data?.message) ||
      (typeof data === "string" && data.trim()) ||
      fallback;

    return {
      ok: false,
      field: typeof data === "object" ? data?.field : undefined,
      error: message,
    };
  }

  return { ok: true, user: data?.user };
}

export async function registerClient(payload) {
  return postJson("/api/auth/client/register", payload);
}

export async function loginClient(payload) {
  return postJson("/api/auth/client/login", payload);
}

export async function registerLawyer(payload) {
  return postJson("/api/auth/lawyer/register", payload);
}

export async function loginLawyer(payload) {
  return postJson("/api/auth/lawyer/login", payload);
}

export async function loginAdmin(payload) {
  // Not postJson(): the admin route also returns adminSessionToken /
  // adminSessionExpiresAt on success, which the shared helper discards.
  const response = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readResponseData(response);

  if (!response.ok) {
    const message = (typeof data === "object" && data?.error) || "Invalid credentials.";
    return { ok: false, error: message };
  }

  return {
    ok: true,
    user: data?.user,
    adminSessionToken: data?.adminSessionToken,
    adminSessionExpiresAt: data?.adminSessionExpiresAt,
  };
}

export async function saveLawyerProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/api/profiles/lawyer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to save profile.",
    };
  }

  return {
    ok: true,
    profile: data?.profile || null,
  };
}

export async function getLawyerProfile(userId) {
  const response = await fetch(`${API_BASE_URL}/api/lawyers/${userId}`);
  const data = await readJsonSafely(response);

  if (response.status === 404) {
    return {
      ok: false,
      notFound: true,
      error: data?.error || "Lawyer profile not found.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      notFound: false,
      error: data?.error || "Unable to fetch lawyer profile.",
    };
  }

  return {
    ok: true,
    profile: data || null,
  };
}

export async function getLawyerCases(userId) {
  const response = await fetch(`${API_BASE_URL}/api/matches/lawyer/${userId}`);
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to fetch lawyer cases.",
    };
  }

  return {
    ok: true,
    cases: Array.isArray(data?.cases) ? data.cases : [],
  };
}

export async function updateLawyerCaseDecision(payload) {
  const response = await fetch(`${API_BASE_URL}/api/matches/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to update case decision.",
    };
  }

  return {
    ok: true,
    match: data?.match || null,
    message: data?.message || "Decision updated successfully.",
  };
}

export async function getLawyerCaseDetail(matchId) {
  const response = await fetch(`${API_BASE_URL}/api/matches/case/${matchId}`);
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to fetch case details.",
    };
  }

  return {
    ok: true,
    case: data?.case || null,
  };
}

// The admin session token is the only auth required by /api/admin/* routes
// (Deliverable 4, bug 3) - stashed in sessionStorage on login so it survives
// a page reload within the tab but not past closing it, matching the
// "shorter lifetime" the brief asks for.
const ADMIN_SESSION_STORAGE_KEY = "wakilimatch_admin_session_token";

export function setAdminSessionToken(token) {
  try {
    if (token) sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  } catch {
    // sessionStorage unavailable (e.g. private mode) - admin calls will 403
    // and the user can sign in again; not fatal.
  }
}

function adminSessionHeaders() {
  try {
    const token = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    return token ? { "X-Admin-Session": token } : {};
  } catch {
    return {};
  }
}

export async function getAdminOverview() {
  const response = await fetch(`${API_BASE_URL}/api/admin/overview`, { headers: adminSessionHeaders() });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to fetch admin overview.",
      clients: [],
      lawyers: [],
      cases: [],
    };
  }

  return {
    ok: true,
    clients: Array.isArray(data?.clients) ? data.clients : [],
    lawyers: Array.isArray(data?.lawyers) ? data.lawyers : [],
    cases: Array.isArray(data?.cases) ? data.cases : [],
  };
}

export async function adminDeleteCase(issueId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${issueId}`, {
    method: "DELETE",
    headers: adminSessionHeaders(),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to delete case.",
    };
  }

  return { ok: true };
}

export async function adminDeleteClient(clientId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/clients/${clientId}`, {
    method: "DELETE",
    headers: adminSessionHeaders(),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to delete client.",
    };
  }

  return { ok: true };
}

export async function adminDeleteLawyer(lawyerId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/lawyers/${lawyerId}`, {
    method: "DELETE",
    headers: adminSessionHeaders(),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to delete lawyer.",
    };
  }

  return { ok: true };
}

export async function addPastCase(lawyerId, pastCase) {
  const response = await fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/past-cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pastCase),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to save past case.",
    };
  }

  return { ok: true, pastCase: data?.pastCase };
}

export async function getPastCases(lawyerId) {
  const response = await fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/past-cases`);
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to fetch past cases.",
      pastCases: [],
    };
  }

  return {
    ok: true,
    pastCases: Array.isArray(data?.pastCases) ? data.pastCases : [],
  };
}

export async function updatePastCase(lawyerId, caseId, pastCase) {
  const response = await fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/past-cases/${caseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pastCase),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to update past case.",
    };
  }

  return { ok: true, pastCase: data?.pastCase };
}

export async function deletePastCase(lawyerId, caseId) {
  const response = await fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/past-cases/${caseId}`, {
    method: "DELETE",
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to delete past case.",
    };
  }

  return { ok: true };
}

export async function adminSetLawyerVerified(lawyerId, isVerified) {
  const response = await fetch(`${API_BASE_URL}/api/admin/lawyers/${lawyerId}/verify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminSessionHeaders() },
    body: JSON.stringify({ is_verified: isVerified }),
  });
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to update lawyer verification.",
    };
  }

  return { ok: true, lawyer: data?.lawyer };
}