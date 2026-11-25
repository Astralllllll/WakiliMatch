# WakiliMatch — Deliverable 3 Audit (Phase 1)

Date: 2026-11-25
Scope: static audit only, per the working method in the brief. No code changes
in this phase.

1. **RESOLVED mid-audit: the wireframe file exists, but wasn't where the brief
   says and wasn't present when I started.** I searched the full working tree
   for it early in this phase (recursive, case-insensitive, outside
   `node_modules`/`.venv`/`.git`) and found nothing. Partway through writing
   this audit, `app/LegalMatchingPlatform Wireframe Flow.html` appeared in the
   working tree (most likely a OneDrive sync delivering a file you added from
   elsewhere) — it is an interactive clickable prototype whose colour
   variables, screen IDs, and component class names (`tile`, `pill`,
   `step-dot`, `tag.top`/`tag.limited`, `ai-badge`, `bubble.ai/me/draft`,
   `case-card`, `inquiry-card`, etc.) match §B2/§B3 exactly — this is
   unambiguously the file the brief means. I've read it in full, moved it to
   the path the brief names (`git mv` → `docs/wireframes/wireframe-flow.html`),
   and it is now committed there. **This conflict is resolved** — Part B can
   proceed without needing you to supply anything further.
   One side note: it got included in my first audit commit (`efe2572`)
   unintentionally — I had only staged `docs/UI_AUDIT.md`, but the file was
   already present and staged in the working tree by the time `git commit`
   ran. Flagging this so you're aware a file you didn't explicitly ask me to
   commit ended up in history; nothing in it looks sensitive (it's the
   wireframe prototype itself), so I left it rather than rewriting history.
   The wireframe also confirms the §B4 anti-fabrication warning is real and
   specific: its mock data (`94%` match score, `127 CASES`, `4.8★ RATING`,
   `7 similar cases, 5 won`, badge counts `2`/`3`/`3` on dashboard tiles) is
   exactly the kind of placeholder the brief says must never appear unless
   backed by real data — none of it exists in the schema today (see §3/§4),
   so all of it must be omitted from the real build, not approximated.

2. **`docs/AI_AUDIT.md` is a byte-identical copy of `docs/AUDIT.md`** (both
   dated 2026-11-17, both titled "Phase 1 Audit", both covering the
   *pre*-ai-service web app only). It contains nothing about the AI service,
   `ai-service/README.md`'s architecture, or A1-A6's current state — it predates
   all of that work. I read it as instructed; it has no bearing on this
   brief. This document (`docs/UI_AUDIT.md`) is the one that actually audits
   A1-A6 and the wireframe mapping; treating `AI_AUDIT.md` as stale going
   forward.

3. **`ai-service/eval/COMPARISON.md` does not exist yet.** The brief says "if
   they exist" for this one, so not a blocker — noting only because A2's
   threshold sweep goes in `RESULTS.md` as instructed, not here.

4. **§B5 lists "likely gaps: case urgency, budget range" — these are not
   gaps.** `ClientIssues` already has `urgency_level` and
   `budget_range`/`budget_min`/`budget_max` (`database/database.sql:100-105`),
   and the frontend already collects/sends them (`CaseContext.jsx`,
   `PostCaseWizard.jsx`). The real data gaps are narrower than the brief
   assumes — see §3 below. Flagging so Phase 3's migration proposal doesn't
   needlessly re-add these columns.

None of the above blocks finishing this audit. (1) needs a decision before
Phase 3. (2)-(4) are FYI.

## 1. Part A — AI service: what the previous run produced vs. A1-A6

The previous Claude Code run (commits `e605cf2`, `cd4bbc4`) built the
retrieval core and the Express↔AI-service wiring, but **none of A1-A5's new
behavior exists yet.** Verified by reading every file in `ai-service/engine/`,
`main.py`, `schemas.py`, and `legalmatch/services/aiMatchingClient.js`.

| Item | Brief asks for | What exists today | Gap |
|---|---|---|---|
| A1 input validation | `validate_query()` used by every query endpoint, 6 statuses incl. `empty_query`/`invalid_input`/`low_confidence`/`no_lawyers_found`, friendly `message` + `example_queries`, 2000-char max | Nothing. `MatchRequest.query` only enforces `min_length=1, max_length=4000` (`schemas.py:8`) — no gibberish/length/non-letter/repeated-char checks anywhere. `detect_language()` exists and IS wired into `/match` (returns `unsupported_language: true`, `main.py:109-114`), so that one status is half-done (needs the `message`/`example_queries` fields added to its branch). `no_good_match` exists (→ brief's `low_confidence`, just needs renaming/aliasing) but has no `example_queries`. No `no_lawyers_found` distinction from `no_good_match` — today "precedents found but no advocate" and "no precedents at all" return the same shape. | Net-new: `validate_query()` + wiring into `/match` and the new `/api/match-lawyers`; extend `MatchResponse`/the brief's shape with `example_queries`. |
| A2 threshold | Read only from `engine_meta.json`; sweep 0.30-0.40 in `RESULTS.md` | `engine_meta.json` has `threshold: 0.3283587694168091` and `threshold_auc: 0.9428571428571428` — matches the notebook's claimed 0.328/AUC 0.943. `main.py`/`retrieval.py` already read `index.threshold` from the loaded meta, never hardcode 0.35. So the "read from engine_meta.json only" rule is **already satisfied**. | Just the sweep table + recommendation in `RESULTS.md` — no code change needed for A2 itself. |
| A3 XAI block | Every match response carries `xai {matched_area, precedent_count, threshold, top_precedent, explanation}` and per-lawyer `why {semantic_pct, precedent_cases, components, plain_text}` | Express (`aiMatchingClient.js:160-177`) builds a *different* shape: top-level `componentScores {semantic, precedent, category, jurisdiction, caseHistory}` (semantic hardcoded to `0.5`, see next row) and a `matchReason` string, not `why.plain_text`. No `xai` block at all — nothing surfaces matched area, top precedent, or an explanation sentence today. | Net-new on both sides: ai-service needs to emit `xai` (it already has everything needed — `top_similarity`, `cases[0]`, `index.config`/area — just not assembled into this shape); Express needs to rename/restructure `componentScores`→`why.components` and add `why.semantic_pct`/`why.plain_text`/`why.precedent_cases`. |
| — profile semantic score | Real cosine between lawyer profile and query | **Hardcoded to `0.5` for every lawyer**, with a comment "can be enhanced via lawyer_embeddings cosine if available" (`aiMatchingClient.js:137`) | This is the single biggest hidden gap: `why.semantic_pct` and the `profile_semantic` component are fabricated today. A3/B4's "never fabricate — every number must come from the engine or database" rule is **currently violated** by the existing code. Needs: a stored lawyer profile embedding (via the already-existing `/embed` endpoint, called once at profile save time) + a real cosine at match time, or this field must be omitted rather than shown as 50%. |
| A4 `/api/match-lawyers` | New ai-service endpoint, brief's exact response shape, thin adapter over `/match` | Does not exist. Only `/health`, `/match`, `/embed` exist in `main.py`. No Express route for `/api/match-lawyers` either. | Net-new endpoint + adapter function. |
| A5 advocate cleanup | Separate `clean_advocates()`: strip trailing fragments, collapse near-duplicate firm names by token-set similarity, fix casing; report coverage/unique-advocate counts before/after in `RESULTS.md` | `extractor.py` has the raw extraction (ported, per its docstring, "verbatim from cell 18") and a `is_surname_only()` helper for the ambiguous flag — but `is_surname_only()` is **never called** anywhere outside its own test file (confirmed via repo-wide grep). `AdvocateResult` in `schemas.py` has no `ambiguous` field, so today's `/match` response can and will surface bare-surname advocates with no warning, directly contradicting the README's claim ("Surname-only... flagged `ambiguous: true` and never auto-linked"). No casing fix, no "Adv For The" stripping, no firm-name dedup exists. | Net-new `clean_advocates()` module/step; wire `ambiguous` into `AdvocateResult` and into `rank_lawyers_for_cases()`; before/after unique-advocate counts for `RESULTS.md`. |
| A6 demo script | `docs/DEMO.md` + `scripts/demo_queries.ps1` | Neither exists. | Net-new, straightforward once A1-A5 land (the demo depends on their output). |

**Net assessment:** A2 is essentially done. A1/A3/A4/A5/A6 are all genuinely
net-new work, not adjustments — and one real correctness bug exists today
(the hardcoded `0.5` semantic score) that the brief's "never fabricate a
number" rule requires fixing as part of this work, not a pre-existing issue
to leave alone.

## 2. Part B — screen inventory & mapping (from brief §B3, since no wireframe file exists)

Mapped against the existing component tree (`legalmatch/src/components/`,
confirmed by reading `App.jsx`'s page switch and each component's top-level
props/API calls).

| Brief screen (§B3) | Existing component | Existing API calls | Status |
|---|---|---|---|
| Client: Login | `ClientAuth.jsx` (via `AuthRouter.jsx`) | `registerClient`, `loginClient` | Exists — restyle only |
| Client: Dashboard (tiles: My Cases, My Lawyers, New Case, Messages, Settings, Log out) | `ClientDashboard.jsx` | `getClientCases` | **Partial.** Today it's a flat case-status list, not a tile grid. "My Lawyers," "Messages," "Settings" have no backing feature at all today — per brief §B3 these become "Coming soon"/greyed tiles, not wired. |
| Client: AI Assistant (chat intake) | none | none | **Missing — wholly new** (B6). No chat UI, no intake flow anywhere in the repo. |
| Client: Scan Document | none | none | **Missing — wholly new** (B6). No camera/upload UI anywhere. |
| Client: Post a Case step 2 (category, title, jurisdiction) | `PostCaseWizard.jsx` step 1 (component's own step numbering starts differently) | local `CaseContext` state only, no API call until submit | Exists, needs restyle + step-dot relabel to match brief's 4-step scheme (intake/category/details/matches) |
| Client: Post a Case step 3 (description, urgency, budget, privacy note) | `PostCaseWizard.jsx` later step | `submitIssue`, then `generateMatches` | Exists — fields already present (`urgencyLevel`, `budgetMin/Max`). The privacy-note copy ("Details hidden from lawyers until you select one") is **not currently true behaviorally** — see §3, privacy gating gap. |
| Client: Match Results (+ XAI) | `MatchResults.jsx` | `GET /api/matches/issue/:issueId`, `selectLawyerForIssue` | Exists for the base list; **XAI card, "Why this lawyer?" expandable, and the per-state empty/error UI (B4) are all missing** — today's component shows the TF-IDF-era `match_reason` string only. |
| Client: Lawyer Profile + Confirm Selection | Not a separate screen today — selection happens inline from `MatchResults.jsx` (`selectLawyerForIssue`) | `POST /api/matches/select` | **Missing as a distinct screen.** No standalone lawyer-profile detail view exists; needs to be built, reusing lawyer fields already returned by `GET /api/matches/issue/:issueId`. |
| Lawyer: Login (LSK or email) | `LawyerAuth.jsx` | `registerLawyer`, `loginLawyer` (`identifier` already accepts email OR LSK number server-side) | Exists — restyle only |
| Lawyer: Dashboard (Inquiries count, Profile, My Cases, Reports, quick stats) | `LawyerDashboard.jsx` | `getLawyerCases`, `getLawyerCaseDetail`, `getLawyerProfile`, `updateLawyerCaseDecision` | **Partial**, same shape issue as Client Dashboard — flat list today, not a tile grid with counts. "Reports" has no backing feature — becomes "Coming soon." |
| Lawyer: Inquiries with AI summaries | `LawyerDashboard.jsx`'s case list stands in for this today (every `Matches` row *is* an inquiry) | same as above | **Partial.** The list exists; the "AI summary" per card (B6) is wholly new and needs a stored summary field (see §3) plus privacy gating so the lawyer only sees category+summary pre-confirmation. |
| (Admin: not in brief's §B3 list) | `AdminDashboard.jsx` | `getAdminOverview` + deletes/verify | Out of scope per brief — not mentioned in §B3, leaving untouched. |

Not mapped above because the brief doesn't ask for them: `LawyerOnboarding.jsx`,
`LawyerProfileCreation.jsx` (the pre-existing orphaned-vs-active ambiguity
flagged in the earlier `AUDIT.md` §6 is unchanged — still worth a decision
before Phase 4 touches the lawyer side, but not this brief's concern unless
you want it folded in).

## 3. Data gaps (B5), corrected against the actual schema

Reading `database/database.sql` end to end (182 lines, quoted in full where
relevant):

| Brief's assumed gap | Actual state |
|---|---|
| Case urgency | **Not a gap.** `ClientIssues.urgency_level` exists (line 100), CHECK'd to `low/medium/high/critical`, already in `CaseContext.jsx`'s `URGENCY_LEVELS`. |
| Budget range | **Not a gap.** `budget_range`/`budget_min`/`budget_max` exist (lines 103-105), already collected by the wizard. |
| A client-selects-lawyer inquiry record (case_id, lawyer_id, status, created_at) | **Partially a gap.** `Matches` (lines 111-122) already *is* this record — it has `issue_id`, `lawyer_id`, `status` (`Pending/requested/ongoing/completed/declined`), `created_at`/`updated_at`. What's missing is the *privacy-gating columns* on it (next row) — the table itself doesn't need to be duplicated, just extended additively. |
| Privacy gating (lawyer sees only AI summary + category until client confirms) | **Real gap.** No column anywhere encodes "has the client confirmed this lawyer." `POST /api/matches/select` already marks exactly one match `requested` and declines siblings (`routes/matches.js:84-99`) — that status transition *could* be the gating signal (`requested`/`ongoing`/`completed` = confirmed, `pending`/`declined` = not) without a new column, but no route currently withholds `issue_description` from a lawyer on an unconfirmed match. `GET /api/matches/lawyer/:lawyerId` (`routes/matches.js:447-555`) returns full `ci.issue_description` regardless of status today — this is the specific query that needs the gating logic added. |
| Stored AI summary on a case | **Real gap.** No column exists. Needs an additive migration, e.g. `ClientIssues.ai_summary TEXT` (or a new small table if you'd rather keep it versioned) — proposing the former unless you object. |
| Lawyer verification badge | **Not a gap.** `LawyerProfiles.is_verified` already exists (line 64) and already gates whether a lawyer can be matched at all (`routes/matches.js:614`). Just needs to be *surfaced in the UI* as a badge — no schema change. |
| Outcome tags on lawyer case history (WON/SETTLED/ONGOING) | **Real gap.** `PastCases.outcome_note` (line 80) is free-text only — no structured enum. Needs an additive column, e.g. `PastCases.outcome_tag VARCHAR(20) CHECK (outcome_tag IN ('won','settled','ongoing','lost','withdrawn'))`, nullable so existing rows stay valid. Per B4's "omit if not in the database" rule, until lawyers actually fill this in, result cards simply won't show a `ResultTag` for old history — correct behavior, not a bug to fix. |

**Proposed additive migration (for your approval before Phase 3, per brief
§B5):**
```sql
ALTER TABLE ClientIssues ADD COLUMN ai_summary TEXT;
ALTER TABLE PastCases ADD COLUMN outcome_tag VARCHAR(20)
    CHECK (outcome_tag IN ('won','settled','ongoing','lost','withdrawn'));
-- Matches already carries what's needed for privacy gating via its existing
-- status column; no new column proposed there unless you'd prefer an explicit
-- boolean (e.g. details_confirmed) over deriving it from status. Flagging the
-- choice rather than deciding it myself.
```
I have not run this — waiting for your go-ahead as instructed.

## 4. AI features behind a provider interface (B6) — current state

Confirmed by repo-wide search: no chat/assistant UI, no document-scan UI, no
`services/aiAssist` module, no `LLM_PROVIDER` env var anywhere in the repo.
This is **entirely net-new**, consistent with the brief treating it as new
work. No conflict here — just confirming there's nothing to reuse or collide
with.

## 5. Other observations worth flagging

- `legalmatch/services/aiMatchingClient.js`'s AI-engine path silently falls
  back to the TF-IDF engine on any AI-service error when `AI_FALLBACK=true`
  (default) — correct per the existing design, but worth remembering for A3:
  the XAI block literally cannot be populated on a TF-IDF-fallback response
  (no embeddings, no precedents). The fallback path needs its own minimal
  `xai`/`why` shape (e.g. `matched_area: null`, `top_precedent: null`,
  `explanation: "Matched using keyword similarity (AI service unavailable)."`)
  so the UI's XAI card doesn't crash or show fabricated numbers when the
  fallback fires. Not called out explicitly in the brief — flagging for your
  decision before Phase 3's XAI-card work.
- No Tailwind `@theme` block exists yet (confirmed — `index.css` is still the
  unmodified `@import "tailwindcss";`), so B2's token system is a clean
  net-new addition, not a migration away from existing tokens.

## 6. What's next

This audit is complete. The only code-tree change made was relocating the
wireframe file to its expected path (§0.1) — no application code was
touched. Waiting on:
1. Approval of the two additive migrations proposed in §3.
2. Your call on the TF-IDF-fallback XAI shape (§5).

Once those are settled I'll start Phase 2 (engine additions A1-A6).
