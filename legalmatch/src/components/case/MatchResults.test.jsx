import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CaseProvider } from "../../context/CaseContext";
import MatchResults from "./MatchResults";

function renderWithCase(initialState, props = {}) {
  return render(
    <CaseProvider initialState={initialState}>
      <MatchResults onPostNewCase={vi.fn()} onBackToClientDashboard={undefined} {...props} />
    </CaseProvider>
  );
}

const XAI = {
  matched_area: "Land & Property",
  precedent_count: 20,
  threshold: 0.328,
  top_precedent: {
    title: "Doe v Roe",
    court: "Environment & Land Court",
    year: 2021,
    url: "https://new.kenyalaw.org/akn/ke/judgment/kelc/2021/1/eng",
    similarity_pct: 36.5,
  },
  explanation: "Matched because 36.5% semantic similarity was found against past decisions in Land & Property.",
};

const LAWYER_MATCH = {
  lawyer_id: "lawyer-1",
  full_name: "Mary Kamau",
  specializations: "Land & Property",
  years_of_experience: 12,
  similarity_score: 0.82,
  match_reason: "Specializes in property",
  why: {
    semantic_pct: 82,
    precedent_cases: [{ title: "Doe v Roe", similarity_pct: 36.5 }],
    components: { profile_semantic: 0.82, precedent: 0.4, category: 1, jurisdiction: 1, history: 0.2 },
    plain_text: "Mary Kamau's profile is a 82% semantic match to your description.",
  },
  component_scores: { semantic: 0.82, precedent: 0.4, category: 1, jurisdiction: 1, caseHistory: 0.2 },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("XAI card", () => {
  it("renders the matched area, top precedent link, and explanation with real numbers", () => {
    renderWithCase({ caseId: "case-1", status: "success", xai: XAI, matches: [LAWYER_MATCH], title: "Boundary dispute", jurisdiction: "Nairobi" });

    const card = screen.getByTestId("xai-card");
    expect(card).toHaveTextContent("Land & Property");
    expect(card).toHaveTextContent(/36\.5% semantic similarity/);
    expect(card).toHaveTextContent(/20 precedents considered/);
    expect(screen.getByRole("link", { name: "Doe v Roe" })).toHaveAttribute("href", XAI.top_precedent.url);
    // Brief section A3: never call it a probability
    expect(card.textContent.toLowerCase()).not.toContain("probability");
  });

  it("is omitted entirely when there is no xai block (e.g. a reopened case fetched via GET)", () => {
    renderWithCase({ caseId: "case-1", status: "success", xai: null, matches: [LAWYER_MATCH], title: "x", jurisdiction: "Nairobi" });
    expect(screen.queryByTestId("xai-card")).not.toBeInTheDocument();
  });
});

describe("Lawyer result card", () => {
  it("shows the match score, a 'Why this lawyer?' expandable, and the real plain_text reason", () => {
    renderWithCase({ caseId: "case-1", status: "success", xai: XAI, matches: [LAWYER_MATCH], title: "x", jurisdiction: "Nairobi" });

    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText(/Mary Kamau's profile is a 82% semantic match/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Why this lawyer?"));
    expect(screen.getByText("LINKED PRECEDENTS")).toBeInTheDocument();
    expect(screen.getByText("MATCH BREAKDOWN")).toBeInTheDocument();
  });
});

describe("Non-success states (brief section B4)", () => {
  it.each([
    ["empty_query", "Tell us what happened"],
    ["invalid_input", "We couldn't read that"],
    ["unsupported_language", "English only for now"],
    ["low_confidence", "No strong match found"],
  ])("renders the %s state with its message, examples, and a Rephrase button", (status, title) => {
    renderWithCase({
      caseId: "case-1",
      status,
      message: "A friendly explanation.",
      exampleQueries: ["Example one", "Example two"],
      xai: null,
      matches: [],
      title: "x",
      jurisdiction: "Nairobi",
    });

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText("A friendly explanation.")).toBeInTheDocument();
    expect(screen.getByText('"Example one"')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rephrase my case" })).toBeInTheDocument();
  });

  it("no_lawyers_found still shows the XAI card and precedents, with zero lawyer cards", () => {
    renderWithCase({
      caseId: "case-1",
      status: "no_lawyers_found",
      message: "We found similar past cases, but no registered lawyer is linked to them.",
      xai: XAI,
      matches: [],
      title: "x",
      jurisdiction: "Nairobi",
    });

    expect(screen.getByTestId("xai-card")).toBeInTheDocument();
    expect(screen.getByText(/no registered lawyer is linked/)).toBeInTheDocument();
    expect(screen.queryByText("Mary Kamau")).not.toBeInTheDocument();
  });
});

describe("Loading and offline states", () => {
  it("shows a loading skeleton while re-fetching an existing case with no fresh data", async () => {
    let resolveFetch;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })));

    renderWithCase({ caseId: "case-1", status: null, xai: null, matches: [], title: "x", jurisdiction: "Nairobi" });

    expect(screen.getByTestId("match-skeleton")).toBeInTheDocument();

    resolveFetch({ ok: true, json: async () => ({ matches: [] }) });
    await waitFor(() => expect(screen.queryByTestId("match-skeleton")).not.toBeInTheDocument());
  });

  it("shows an offline/error state with a working Retry button", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => "application/json" }, json: async () => ({ error: "Server error." }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "application/json" }, json: async () => ({ matches: [LAWYER_MATCH] }) });
    vi.stubGlobal("fetch", fetchMock);

    renderWithCase({ caseId: "case-1", status: null, xai: null, matches: [], title: "x", jurisdiction: "Nairobi" });

    await waitFor(() => expect(screen.getByTestId("match-fetch-error")).toBeInTheDocument());
    expect(screen.getByText("Couldn't load your matches")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("Mary Kamau")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
