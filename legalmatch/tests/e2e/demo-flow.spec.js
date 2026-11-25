// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = path.join(__dirname, "../../../docs/screens");

/**
 * Login -> AI Assistant -> case -> Match Results -> Lawyer Profile ->
 * Confirm Selection, screenshotted at 390x844 (brief section 4).
 *
 * The backend is mocked at the network layer (page.route), not run live -
 * there is no Postgres/Express server in this run. Mocked responses use
 * the real shapes every endpoint actually returns (see routes/matches.js,
 * routes/ai.js) and real seed data (database/seed_lawyers.js's
 * "Adv. Brian Ochieng", a Land & Property specialist), so this exercises
 * the real frontend code paths end to end - it just doesn't prove the SQL
 * behind those endpoints is correct. That still needs a live DB run.
 */

const USER = { id: "11111111-1111-1111-1111-111111111111", fullName: "Jane Mwangi", email: "jane@example.com", role: "Client" };
const ISSUE_ID = "22222222-2222-2222-2222-222222222222";
const LAWYER_ID = "33333333-3333-3333-3333-333333333333";

const XAI = {
  matched_area: "Land & Property",
  precedent_count: 18,
  threshold: 0.328,
  top_precedent: {
    title: "Mwangi v County Government of Nairobi (ELC 142 of 2022)",
    court: "Environment and Land Court",
    year: 2022,
    url: "https://new.kenyalaw.org/akn/ke/judgment/kelc/2022/142/eng",
    similarity_pct: 41.2,
  },
  explanation: "Matched because 41.2% semantic similarity was found against past decisions in Land & Property.",
};

const LAWYER_MATCH = {
  match_id: "44444444-4444-4444-4444-444444444444",
  lawyer_id: LAWYER_ID,
  status: "Pending",
  similarity_score: 0.78,
  full_name: "Adv. Brian Ochieng",
  specializations: "Land & Property, Conveyancing, Environmental Law",
  years_of_experience: 10,
  previous_cases_handled: 46,
  match_reason: "Specializes in Land & Property; practices in Nairobi",
  warning: null,
  why: {
    semantic_pct: 74,
    precedent_cases: [{ title: "Mwangi v County Government of Nairobi (ELC 142 of 2022)", similarity_pct: 41.2 }],
    components: { profile_semantic: 0.74, precedent: 0.5, category: 1, jurisdiction: 1, history: 0.4 },
    plain_text: "Adv. Brian Ochieng's profile is a 74% semantic match to your description, and Adv. Brian Ochieng appeared in 1 similar judgment.",
  },
  component_scores: { semantic: 0.74, precedent: 0.5, category: 1, jurisdiction: 1, caseHistory: 0.4 },
};

async function mockBackend(page) {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const method = req.method();

    if (p === "/api/auth/client/login" && method === "POST") {
      return route.fulfill({ json: { user: USER } });
    }
    if (p === `/api/issues/client/${USER.id}` && method === "GET") {
      return route.fulfill({ json: { issues: [] } }); // first-time client -> straight into the wizard
    }
    if (p === "/api/ai/draft-case" && method === "POST") {
      return route.fulfill({
        json: {
          title: "Landlord locked my shop over late rent",
          description:
            "My landlord locked my shop because I was late with rent. This happened around March 2024. " +
            "Regarding notice or severance: No notice was given before the lock-out.",
          jurisdiction: "Nairobi",
          urgency: "medium",
          isAiGenerated: false,
          category: "property",
          categorySource: "ai-engine",
          matchedArea: "Land & Property",
        },
      });
    }
    if (p === "/api/issues" && method === "POST") {
      return route.fulfill({ json: { message: "Legal issue submitted successfully", issue: { issue_id: ISSUE_ID } } });
    }
    if (p === "/api/matches/generate" && method === "POST") {
      return route.fulfill({
        json: {
          message: "Matches generated successfully",
          matches: [LAWYER_MATCH],
          status: "success",
          xai: XAI,
        },
      });
    }
    if (p === `/api/lawyers/${LAWYER_ID}/past-cases` && method === "GET") {
      return route.fulfill({
        json: {
          pastCases: [
            { case_id: "c1", case_type: "Land & Property", jurisdiction: "Nairobi", case_year: 2023, outcome_tag: "won" },
            { case_id: "c2", case_type: "Land & Property", jurisdiction: "Nairobi", case_year: 2022, outcome_tag: "settled" },
          ],
        },
      });
    }
    if (p === "/api/matches/select" && method === "POST") {
      return route.fulfill({ json: { selected_match: { match_id: LAWYER_MATCH.match_id, status: "requested" } } });
    }

    console.warn("Unmocked API call in demo-flow.spec.js:", method, p);
    return route.fulfill({ status: 404, json: { error: "unmocked in test" } });
  });
}

test("login -> AI assistant -> case -> results -> profile -> confirm", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");

  // ── Splash -> Role select ────────────────────────────────────────────
  await expect(page.getByRole("button", { name: /I need a lawyer/i })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENS_DIR, "01-role-select.png") });
  await page.getByRole("button", { name: /I need a lawyer/i }).click();

  // ── Login ────────────────────────────────────────────────────────────
  await page.getByLabel("Email address").fill(USER.email);
  await page.getByRole("textbox", { name: "Password" }).fill("password123");
  await page.screenshot({ path: path.join(SCREENS_DIR, "02-login.png") });
  await page.getByRole("button", { name: "Sign in" }).click();

  // ── AI Assistant intake (step 1) ─────────────────────────────────────
  await expect(page.getByText("AI Assistant")).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENS_DIR, "03-ai-assistant.png") });

  const answers = [
    "My landlord locked my shop because I was late with rent",
    "March 2024",
    "No notice was given",
    "Nairobi",
  ];
  for (const answer of answers) {
    await page.getByPlaceholder("Type your message…").fill(answer);
    await page.getByRole("button", { name: "Send" }).click();
  }

  await expect(page.getByText(/Drafted your case/)).toBeVisible();
  await page.screenshot({ path: path.join(SCREENS_DIR, "04-ai-assistant-draft.png") });
  await page.getByRole("button", { name: /Review & continue/ }).click();

  // ── Step 2: category (pre-filled from the draft) ─────────────────────
  await expect(page.getByText("Post a Case")).toBeVisible();
  await expect(page.getByPlaceholder("Briefly describe your case in one line")).toHaveValue(/Landlord locked my shop/);
  await page.screenshot({ path: path.join(SCREENS_DIR, "05-post-case-category.png") });
  await page.getByRole("button", { name: "Continue →" }).click();

  // ── Step 3: details (pre-filled) ──────────────────────────────────────
  await expect(page.getByText("Case description *")).toBeVisible();
  await page.screenshot({ path: path.join(SCREENS_DIR, "06-post-case-details.png") });
  await page.getByRole("button", { name: "Find matches →" }).click();

  // ── Match Results ────────────────────────────────────────────────────
  await expect(page.getByTestId("xai-card")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Adv. Brian Ochieng" })).toBeVisible();
  await page.screenshot({ path: path.join(SCREENS_DIR, "07-match-results.png") });

  // ── Lawyer Profile ───────────────────────────────────────────────────
  await page.getByRole("button", { name: "Adv. Brian Ochieng" }).click();
  await expect(page.getByText("Lawyer Profile")).toBeVisible();
  await expect(page.getByText("WON")).toBeVisible(); // real case-history outcome tag, not a wireframe placeholder
  await page.screenshot({ path: path.join(SCREENS_DIR, "08-lawyer-profile.png") });

  // ── Confirm selection ────────────────────────────────────────────────
  await page.getByRole("button", { name: "Confirm selection" }).click();
  await expect(page.getByText(/Selection confirmed/)).toBeVisible();
  await page.screenshot({ path: path.join(SCREENS_DIR, "09-confirm-selection.png") });
});
