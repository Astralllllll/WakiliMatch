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
      status: response.status,
      error: message,
      data,
    };
  }

  return { ok: true, data };
}

export async function submitIssue(payload) {
  return postJson("/api/issues", payload);
}

export async function generateMatches(payload) {
  return postJson("/api/matches/generate", payload);
}

export async function getClientCases(clientId) {
  const response = await fetch(`${API_BASE_URL}/api/issues/client/${clientId}`);
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to fetch client cases.",
      issues: [],
    };
  }

  return {
    ok: true,
    issues: Array.isArray(data?.issues) ? data.issues : [],
  };
}

export async function getIssueMatches(issueId) {
  const response = await fetch(`${API_BASE_URL}/api/matches/issue/${issueId}`);
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Unable to fetch issue matches.",
      matches: [],
    };
  }

  return {
    ok: true,
    matches: Array.isArray(data?.matches) ? data.matches : [],
  };
}

export async function selectLawyerForIssue(payload) {
  return postJson("/api/matches/select", payload);
}

export async function submitLawyerReview(payload) {
  return postJson("/api/matches/review", payload);
}

export async function getLawyerPastCases(lawyerId) {
  const response = await fetch(`${API_BASE_URL}/api/lawyers/${lawyerId}/past-cases`);
  const data = await readJsonSafely(response);

  if (!response.ok) {
    return { ok: false, error: data?.error || "Unable to fetch lawyer case history.", pastCases: [] };
  }

  return { ok: true, pastCases: Array.isArray(data?.pastCases) ? data.pastCases : [] };
}

export async function getLawyerReview(matchId, clientId) {
  const response = await fetch(`${API_BASE_URL}/api/matches/review/${matchId}/${clientId}`);
  const data = await readJsonSafely(response);

  if (response.status === 404) {
    return {
      ok: false,
      notFound: true,
      review: null,
      error: data?.error || "Review not found.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      notFound: false,
      review: null,
      error: data?.error || "Unable to fetch review.",
    };
  }

  return {
    ok: true,
    notFound: false,
    review: data?.review || null,
  };
}
