# WakiliMatch (LegalMatch) — Phase 1 Audit

Date: 2026-11-17
Scope: static audit of the repo as it exists today. No behavior changes in this
phase except the branding-rename commit called out at the end of this document.

## 0. CONFLICTS TO RESOLVE BEFORE PHASE 2 (read this first)

These are blockers or scope clarifications the build prompt assumes are resolved
in the repo, but aren't. Per the working method, I'm reporting them rather than
guessing.

1. **`SentenceTransformer_Base.ipynb` does not exist anywhere in this repo.**
   Searched the full working tree (`Get-ChildItem -Recurse -Filter *.ipynb`) —
   zero results. The prompt calls this notebook "the source of truth for the AI
   design" and says Phase 2 should port its logic. I cannot start Phase 2 until
   you either add the notebook to the repo or point me at it. Everything in the
   prompt that depends on its exact contents (CONFIG constants, the 35 labelled
   eval queries + 8 off-topic queries, the exact advocate-extraction regexes,
   the Swahili-detection heuristic, the ROC/Youden's J threshold code) is
   currently undefined for me.

2. **There is no token-based auth today.** The prompt's Phase 6 instructions say
   "Token auth exactly as the backend does today; store the token securely,"
   and section 7 implies session tokens exist. In the actual code:
   - Login endpoints (`/api/auth/client/login`, `/api/auth/lawyer/login`,
     `/api/auth/admin/login`) return `{ user: {...} }` with no token, JWT, or
     session cookie of any kind.
   - The frontend keeps `currentUser` in a plain `useState` in `App.jsx` — it is
     lost on page refresh. There is no DataStore/localStorage persistence.
   - **No route in the backend checks authentication or role at all.** Any
     caller can hit `/api/admin/overview`, `/api/admin/lawyers/:id` (DELETE),
     `/api/matches/decision`, etc. with no credentials. Role separation exists
     only in the frontend's choice of which screen to show.
   This means "role enforcement" to audit is: **none exists server-side.** The
   Android app literally cannot "store the token securely" because none is
   issued. Decide: (a) keep it exactly this insecure for v2 (not recommended,
   but in scope as originally built), or (b) let me add a minimal token issuance
   + middleware layer as part of Phase 3 backend work. I'd recommend (b) given
   section 7 (compliance) and section 8(d) (Android must "log in") implicitly
   assume real auth. Flagging rather than deciding unilaterally.

3. **No Tailwind theme to reuse.** Section 6 says to reuse "colours and names
   from the Tailwind config." There is no `tailwind.config.js` anywhere, and no
   `@theme` block in `src/index.css` (it's just `@import "tailwindcss";` — the
   Tailwind v4 default palette, unmodified). All actual UI colors in the app
   (navy `#0F2744`, etc.) are hardcoded inline `style={{...}}` props scattered
   across components, not Tailwind classes or tokens. I'll pull the Android
   color palette from these inline hex values instead — functionally
   equivalent outcome, just correcting where the prompt said to look.

4. **Tailwind is installed at the wrong package root.** `legalmatch/vite.config.js`
   imports `@tailwindcss/vite`, but that dependency (plus `tailwindcss`,
   `postcss`, `autoprefixer`) is declared in the **root** `package.json`
   (`WakiliMatch/package.json`), not `legalmatch/package.json`. It only works
   today because there's a single root-level `node_modules/` that Node's
   resolution walks up into from `legalmatch/`. This is fragile (breaks if
   `legalmatch/` is ever moved or zipped standalone) but out of scope to fix
   per your "don't refactor things not part of this task" instruction — noting
   it so it doesn't look like an accident I caused later.

5. **`legalmatch/README.md` is the untouched Vite template README** — it has no
   project-specific content to rebrand (no "LegalMatch" string in it at all).
   The real project README will be written fresh in Phase 5 per section 9.

None of the above blocks finishing Phase 1. (1) blocks starting Phase 2.
(2) should be decided before Phase 3. (3)/(4)/(5) are FYI only.

## 1. Folder layout

```
WakiliMatch/                   (git root)
├── Images/logo.png
├── proposal_extracted.txt     (extracted text of the academic project proposal)
├── package.json               (root — ONLY tailwindcss/postcss/autoprefixer devDeps + root node_modules)
├── package-lock.json
├── .idea/                     (untracked, IDE project files — not in git)
└── legalmatch/                 (the actual app; folder name NOT to be renamed per brief)
    ├── database/database.sql   (schema source of truth)
    ├── db.js                   (pg Pool, reads DB_* env vars)
    ├── server.js               (Express app entry; also defines /api/auth/* and
    │                            two /api/lawyers routes inline — see §2)
    ├── lib/tfidf.js             (dependency-free TF-IDF + cosine similarity)
    ├── services/matchingEngine.js  (composite scoring: calls lib/tfidf.js)
    ├── routes/
    │   ├── admin.js
    │   ├── issues.js
    │   ├── lawyers.js           (past-cases CRUD only — NOT the lawyer list/detail
    │   │                        routes, those live in server.js, see Finding 2.1)
    │   ├── matches.js
    │   └── profiles.js
    ├── index.html, vite.config.js, eslint.config.js
    └── src/
        ├── main.jsx, App.jsx, App.css, index.css
        ├── context/CaseContext.jsx   (shared wizard state + category/county/urgency enums)
        ├── assets/ (hero.png, logo.png, react.svg, vite.svg)
        └── components/
            ├── SplashScreen.jsx
            ├── LawyerList.jsx         (orphaned — see Finding 4.1)
            ├── auth/ (AuthRouter, AuthLayout, RoleSelect, ClientAuth, LawyerAuth,
            │          AdminAuth, FormComponents, authApi.js)
            ├── case/ (PostCaseWizard, MatchResults, StepIndicator, caseApi.js)
            ├── client/ (ClientDashboard, LawyerReviewPage)
            ├── lawyer/ (LawyerOnboarding, LawyerDashboard, LawyerProfileCreation)
            └── admin/ (AdminDashboard)
```

No `ai-service/` or `android/` folders exist yet — both are net-new per the brief.

## 2. Express routes

Base URL in dev: Vite proxies `/api/*` to `http://localhost:5000` (see
`vite.config.js`). No route anywhere checks auth or role (see Conflict §0.2) —
"Auth/Role" column below reflects what actually runs, not what should.

### Mounted in `server.js` directly

| Method | Path | Auth/Role | Request body | Response |
|---|---|---|---|---|
| GET | `/api/health` | none | — | `{ ok: true, message }` |
| POST | `/api/auth/client/register` | none | `{fullName, email, phone, password}` | 201 `{user:{id,fullName,email,phone,role}}`; 400 field errors; 409 duplicate email |
| POST | `/api/auth/client/login` | none | `{email, password}` | 200 `{user:{id,fullName,email,role}}`; 400/401 |
| POST | `/api/auth/lawyer/register` | none | `{fullName, lskNumber, email, phone, password}` | 201 `{user:{..., lskNumber}}`; creates both `Users` + a bare `LawyerProfiles` row in one transaction; 409 on dup email or dup LSK number |
| POST | `/api/auth/lawyer/login` | none | `{identifier, password}` (identifier = email OR LSK number) | 200 `{user:{..., lskNumber}}`; 401 |
| POST | `/api/auth/admin/login` | none | `{email, password}` | 200 `{user:{id,email,role}}`; 401 |
| GET | `/api/lawyers` | none | — | raw array of `LawyerProfiles` rows (profile_id, user_id, lsk_registration_number, academic_qualifications, years_of_experience, specializations, previous_cases_handled, price_guidance, success_rate) |
| GET | `/api/lawyers/:id` | none | — | single `LawyerProfiles` row by **user_id** (not profile_id, despite the param name conventions elsewhere); 404 if missing |

Password hashing: scrypt (N=2^14, 64-byte key, random 16-byte salt), not
bcrypt as the academic proposal in `proposal_extracted.txt` describes — that
doc is aspirational/outdated, not a spec to match.

Note: `/api/lawyers` and `/api/lawyers/:id` are defined **inline in
`server.js`**, duplicating the concern of `routes/lawyers.js` (which only
handles `/api/lawyers/:lawyerId/past-cases*`). Both are mounted and both work,
but it's a surprising split — flagging as a report-only inconsistency per the
brief (not fixing in Phase 1).

### `routes/profiles.js` → mounted at `/api/profiles`

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/profiles/lawyer` | `{user_id, lsk_registration_number, full_name, biography, academic_qualifications, institutions, graduation_year, bar_admission_year, courts, languages, specializations, years_of_experience, firm_name, case_type_descriptions, previous_cases_handled, success_rate, price_guidance, profile_text}` | 200 `{message, profile}` — upsert on `lsk_registration_number` conflict |

### `routes/issues.js` → mounted at `/api/issues`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/issues/client/:clientId` | — | `{issues:[...]}` — each issue plus a derived `match_status` ('pending'/'accepted'/'completed'/'rejected') and the single "best" match's lawyer_id/name via a `LATERAL` join |
| POST | `/api/issues/` | `{client_id, issue_title, issue_description, legal_category?, jurisdiction?, urgency_level?, budget_range?, budget_min?, budget_max?}` | 201 `{message, issue}` — inserted row, `status='Open'` |

### `routes/matches.js` → mounted at `/api/matches`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/matches/issue/:issueId` | — | `{matches:[...]}` joined with full lawyer profile fields, status normalized (`pending`→`requested`), sorted by similarity desc |
| POST | `/api/matches/select` | `{issue_id, lawyer_id}` | `{selected_match}` — sets chosen match to `requested`, declines all siblings, sets issue to `Matched` |
| POST | `/api/matches/decision` | `{match_id, lawyer_id, decision: 'accept'|'reject'}` | `{message, match}` — state machine guarding against modifying completed/already-decided matches |
| POST | `/api/matches/review` | `{match_id, client_id, rating 1-5, review_text?}` | `{message, review}` — upserts review, recomputes `LawyerProfiles.average_rating`/`total_reviews` from scratch, marks match `completed` and issue `Closed` |
| GET | `/api/matches/review/:matchId/:clientId` | — | `{review}` or 404 |
| GET | `/api/matches/case/:matchId` | — | `{case}` — single match + issue + client display name (falls back to formatted email local-part if no `full_name`) |
| GET | `/api/matches/lawyer/:lawyerId` | — | `{cases:[...]}` — lawyer's dashboard feed: one row per issue (dedup via `ROW_NUMBER()`), with aggregated review rating/count |
| POST | `/api/matches/generate` | `{client_id, issue_id, issue_text}` | 200 `{message, matches}` — **this is the TF-IDF entry point.** Fetches the issue, fetches all `is_verified=true` lawyers with their `PastCases`, runs `matchLawyersToCase()`, inserts top 5 into `Matches` with `status='Pending'`, returns them enriched with `full_name`/`specializations`/`years_of_experience`/`match_reason`/`warning` |

### `routes/admin.js` → mounted at `/api/admin`

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/admin/overview` | — | `{clients, lawyers, cases}` — three full-table-ish dumps for the dashboard |
| DELETE | `/api/admin/cases/:issueId` | — | `{message}` / 404 |
| DELETE | `/api/admin/clients/:clientId` | — | `{message}` / 404 (role-scoped to `role='Client'` in the WHERE clause) |
| PATCH | `/api/admin/lawyers/:lawyerId/verify` | `{is_verified: boolean}` | `{message, lawyer}` / 404 |
| DELETE | `/api/admin/lawyers/:lawyerId` | — | `{message}` / 404 (role-scoped to `role='Lawyer'`) |

### `routes/lawyers.js` → mounted at `/api/lawyers` (past-cases sub-resource only)

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/lawyers/:lawyerId/past-cases` | `{case_type, jurisdiction, case_year, outcome_note}` | 201 `{message, pastCase}` — validates lawyer exists+role, year range 1950–current, note ≥5 chars |
| PATCH | `/api/lawyers/:lawyerId/past-cases/:caseId` | same fields | `{message, pastCase}` / 404 |
| GET | `/api/lawyers/:lawyerId/past-cases` | — | `{pastCases:[...]}` |
| DELETE | `/api/lawyers/:lawyerId/past-cases/:caseId` | — | `{message, case_id}` / 404 |

## 3. Database schema (from `database/database.sql`, authoritative — no separate migrations folder exists)

- **Users** — `user_id` (UUID PK), `email` (unique), `password_hash`, `full_name`,
  `role` CHECK IN ('Client','Lawyer','Admin'), `created_at`. (`full_name` was
  added later via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in
  `server.js:ensureUsersSchema()`, run on every server boot — it is **not** in
  `database.sql`, a drift between the schema file and runtime reality.)
- **Admins** — `admin_id` PK, `user_id` FK→Users, `department`, `created_at`.
- **LawyerProfiles** — `profile_id` PK, `user_id` FK→Users (unique),
  `lsk_registration_number` (unique, NOT NULL), `full_name`, `biography`,
  `academic_qualifications`, `institutions`, `graduation_year`,
  `bar_admission_year`, `courts`, `languages`, `specializations` (comma-separated
  free text), `years_of_experience`, `firm_name`, `case_type_descriptions`,
  `previous_cases_handled`, `success_rate`, `price_guidance`, `profile_text`
  (built client-side, stored but **not currently used** by the matching engine —
  see Finding 5.1), `is_verified` (bool, admin-toggled — **gatekeeps whether a
  lawyer can ever be matched**, see `/api/matches/generate`), `average_rating`,
  `total_reviews`, `created_at`, `updated_at` (trigger-maintained).
- **PastCases** — `case_id` PK, `lawyer_id` FK→Users, `case_type`, `jurisdiction`,
  `case_year`, `outcome_note`, `created_at`. This is what the matching engine
  actually scores against for case-history relevance — distinct from the
  summary fields on `LawyerProfiles`.
- **ClientIssues** — `issue_id` PK, `client_id` FK→Users, `issue_title`,
  `issue_description`, `legal_category` CHECK IN ('criminal','family',
  'property','employment','corporate','immigration'), `jurisdiction`,
  `urgency_level` CHECK IN ('low','medium','high','critical'), `budget_range`,
  `budget_min`, `budget_max`, `status` CHECK IN ('Open','Matched','Closed').
  The `legal_category`/`urgency_level` enum values are lowercase and must match
  `CaseContext.jsx`'s `LEGAL_CATEGORIES`/`URGENCY_LEVELS` value strings exactly
  (a comment in the SQL calls this out explicitly).
- **Matches** — `match_id` PK, `client_id` FK, `lawyer_id` FK, `issue_id` FK,
  `similarity_score` FLOAT, `match_reason` TEXT, `status` CHECK IN ('Pending',
  'requested','ongoing','completed','declined') — note the mixed-case
  inconsistency (`'Pending'` capitalized, others lowercase) baked into the
  constraint itself; application code uniformly `LOWER()`s before comparing.
- **Reviews** — `review_id` PK, `client_id` FK, `lawyer_id` FK, `match_id` FK,
  `rating` CHECK 1-5, `review_text`, `created_at`.
- **AnalyticsReports** — `report_id` PK, `admin_id` FK→Admins, `report_title`,
  `report_data` JSONB, `generated_at`. **Dead table** — no route reads or
  writes it; `/api/admin/overview` computes everything live instead.
- Indexes on all FK columns plus a GIN full-text index on
  `LawyerProfiles.profile_text` (also currently unused by any query).
- One trigger: `trg_lawyerprofiles_updated_at`.
- `pgvector` is explicitly **not** installed (`database.sql` comment confirms
  this is intentional, matching the TF-IDF-in-application-code design) — this
  matters for Phase 3's embedding storage decision in the brief (§4: "Use
  pgvector only if the audit shows it is already available" → it is not
  available, so plan on array/JSON storage with app-side cosine).

No migrations directory exists — `database.sql` is applied directly, and the one
schema drift (`full_name`) is patched idempotently at server boot. Phase 3's
"additive migrations only" instruction will need to introduce the first actual
migration file(s), since there's no existing migration tooling/convention to
follow.

## 4. Current matching flow (TF-IDF) and response shape

End-to-end flow, triggered by `POST /api/matches/generate`:

1. Frontend (`PostCaseWizard.jsx`) calls `submitIssue()` → `POST /api/issues`,
   then immediately calls `generateMatches({client_id, issue_id, issue_text})`
   → `POST /api/matches/generate`.
2. Server re-fetches the issue row (title/description/category/jurisdiction)
   and all lawyers where `is_verified = true`, each with their `PastCases`
   aggregated via `json_agg`.
3. `services/matchingEngine.js::matchLawyersToCase()`:
   - Builds one query string: `issueTitle + issueDescription + legalCategory`.
   - Builds one candidate string per lawyer: `biography + specializations +
     (pastCases joined as "caseType jurisdiction outcomeNote")`. Note:
     `profile_text` (the pre-built searchable blob the frontend constructs and
     the schema stores) is **not** used here — the engine rebuilds its own text
     blob from raw fields instead. (Finding 5.1 below.)
   - Calls `lib/tfidf.js::scoreCandidates()` — a from-scratch TF-IDF (stopword
     list, term frequency, IDF with +1 smoothing, cosine similarity) returning
     a 0–1 `textScore` per lawyer, corpus-relative to just this one query + this
     one batch of candidates (recomputed every call, nothing cached/indexed).
   - Computes 3 structured signals per lawyer: `categoryMatch` (bool — issue's
     category literally appears in the lawyer's comma-split specialization
     tags), `jurisdictionMatch` (bool — issue jurisdiction matches a past case's
     jurisdiction OR appears in the lawyer's free-text `courts` field),
     `relevantCaseCount` (past cases whose `case_type` substring-contains the
     issue's category).
   - **Composite score** — confirmed exactly as the brief states:
     ```
     compositeScore = textScore          * 0.50   (WEIGHTS.TEXT_SIMILARITY)
                     + categoryMatch(0/1) * 0.25   (WEIGHTS.CATEGORY_MATCH)
                     + jurisdictionMatch(0/1) * 0.15 (WEIGHTS.JURISDICTION_MATCH)
                     + min(relevantCaseCount/5, 1) * 0.10 (WEIGHTS.RELEVANT_CASE_HISTORY)
     ```
     i.e. the "50/25/15/10" the brief refers to is `WEIGHTS` in
     `services/matchingEngine.js:17-22`, confirmed present and unmodified.
   - A human-readable `matchReason` string is generated (case-count sentence,
     specialization sentence, jurisdiction sentence, or a generic fallback) plus
     a `warning` string when `relevantCaseCount === 0` ("no directly relevant
     case history").
   - Results sorted desc by `compositeScore`.
4. Route takes the **top 5** (hardcoded `slice(0, 5)`, not configurable), inserts
   each as a new `Matches` row (`status='Pending'`), and returns them enriched
   with display fields.
5. Frontend (`MatchResults.jsx`) renders the returned matches; `GET
   /api/matches/issue/:issueId` is used to re-fetch the canonical list later
   (e.g. after navigating back from the client dashboard).

This whole pipeline (steps 2-3) is exactly what Phase 3 needs to put behind the
`MATCHING_ENGINE=ai|tfidf` flag, preserving `tfidf` as the fallback path.

## 5. Other findings worth flagging (report-only, not fixed in Phase 1)

5.1 **`profile_text` is dead weight today.** The frontend builds it
(`buildProfileText()` in `LawyerOnboarding.jsx`) and the backend stores it
and even indexes it with a GIN full-text index, but
`matchingEngine.js::buildLawyerProfileText()` ignores it and reconstructs a
similar-but-not-identical blob from raw columns. Decide in Phase 3/4 whether
the new `/embed` call should finally use `profile_text` as-is (simplest) or
keep rebuilding from fields (more control over which fields count).

5.2 `routes/matches.js`'s `/generate` hardcodes "top 5" matches saved/returned;
the brief's new engine wants `top_lawyers` configurable and a ranked list of
*all* registered lawyers with component breakdown — this endpoint's contract
will need to grow (additively, per the "add fields, never remove" instruction)
rather than just swapping the scoring function.

5.3 `LawyerList.jsx` is unreachable dead code — nothing ever sets `page ===
"lawyers"` in `App.jsx`, and it calls `fetch('http://localhost:5000/api/lawyers')`
with a hardcoded absolute URL (bypassing `API_BASE_URL`/the Vite proxy
entirely, and bypassing the "degrade gracefully" pattern every other API call
uses). Leaving as-is per "don't refactor out-of-scope code"; flagging so it
isn't mistaken for a page the Android app needs to replicate.

5.4 No rate limiting or input sanitization beyond basic field presence/length
checks exists on any route today (relevant to brief §7: "rate-limit the match
endpoint" is new work, not something to preserve).

## 6. Web pages and their API calls

| Page (shown via `App.jsx` state machine) | Component | API calls |
|---|---|---|
| Role select | `RoleSelect.jsx` | none (pure UI, picks client/lawyer/admin) |
| Auth (login/register) | `AuthRouter.jsx` → `ClientAuth`/`LawyerAuth`/`AdminAuth.jsx` | `registerClient`, `loginClient`, `registerLawyer`, `loginLawyer`, `loginAdmin` |
| Post-auth routing decision | `App.jsx` (`AppShell`) | `getLawyerProfile` (lawyer: decide onboarding vs dashboard), `getClientCases` (client: decide dashboard vs wizard) |
| Lawyer onboarding (profile wizard) | `LawyerOnboarding.jsx` | `saveLawyerProfile`, plus past-case CRUD (`addPastCase`, `getPastCases`, `updatePastCase`, `deletePastCase`) — imports from `authApi.js` |
| Lawyer dashboard | `LawyerDashboard.jsx` | `getLawyerCases`, `getLawyerCaseDetail`, `getLawyerProfile`, `updateLawyerCaseDecision` |
| Lawyer profile creation (alt entry?) | `LawyerProfileCreation.jsx` | shares the "LegalMatch" header branding; not wired into `App.jsx`'s page switch today — likely superseded by `LawyerOnboarding.jsx` (worth confirming with you before Android parity work) |
| Post a case (3-step wizard) | `PostCaseWizard.jsx` | `submitIssue`, `generateMatches` |
| Match results | `MatchResults.jsx` | `selectLawyerForIssue`; reads `matches` already loaded into `CaseContext` |
| Client dashboard | `ClientDashboard.jsx` | `getClientCases` |
| Client review (post-engagement) | `LawyerReviewPage.jsx` | `getLawyerReview`, `submitLawyerReview` |
| Admin dashboard | `AdminDashboard.jsx` | `getAdminOverview`, `adminDeleteCase`, `adminDeleteClient`, `adminDeleteLawyer`, `adminSetLawyerVerified` |
| (Orphaned) Lawyer list | `LawyerList.jsx` | direct hardcoded `fetch('http://localhost:5000/api/lawyers')` — see Finding 5.3 |

Routing is a hand-rolled state machine in `App.jsx` (`useState("role-select")`
switched by callback props) — no React Router, no URL-based navigation, no
deep-linking. Every "page" is conditionally rendered JSX, not a route.

## 7. Auth mechanism and role enforcement

Covered in detail in Conflict §0.2. Summary: **password-based login exists and
hashes correctly (scrypt), but there is no session/token layer and no
server-side authorization check anywhere.** Role separation today is enforced
only by: (a) which frontend screen the user is shown, and (b) a handful of
`WHERE role = 'X'` clauses on specific admin DELETE queries (so an admin can't
accidentally delete a non-client row via the client-delete endpoint, but
nothing stops an unauthenticated caller from hitting that endpoint directly).

## 8. Secrets check

- No `.env`, `.env.local`, or similar files are present or tracked anywhere in
  the repo (searched recursively).
- `legalmatch/.gitignore` already excludes `.env`.
- No root-level `.gitignore` exists (the root `package.json`/`package-lock.json`
  pair and `node_modules/` are untracked-by-convention only — worth adding one
  in Phase 2+ so a stray root `.env` can't be committed later, but nothing
  committed today).
- `db.js` reads `DB_USER`/`DB_HOST`/`DB_DATABASE`/`DB_PASSWORD`/`DB_PORT` from
  env with no defaults and no fallback secrets hardcoded.
- **No committed secrets found.**

## 9. Branding scan (for the separate rename commit)

Literal "LegalMatch" occurrences to update (user-facing text only — the brief
says not to rename DB tables/columns/API paths/folders):

- `index.html` — `<title>legalmatch</title>`
- `SplashScreen.jsx` — alt text + visible splash wordmark
- `RoleSelect.jsx` — logo alt text
- `AuthLayout.jsx` — two occurrences (both auth portals' side panel)
- `AdminDashboard.jsx`, `LawyerDashboard.jsx`, `LawyerOnboarding.jsx`,
  `LawyerProfileCreation.jsx`, `MatchResults.jsx`, `PostCaseWizard.jsx` — header
  wordmark, one occurrence each
- `legalmatch/package.json` — `"name": "legalmatch"` (npm package name — this
  is a config identifier, not user-facing text in the sense the brief means,
  but low-risk to leave as-is since the brief explicitly says not to rename
  folders/paths; **leaving this field untouched**)
- `database/database.sql` header comment ("LegalMatch — Database Schema") —
  a comment, not user-facing, but harmless and clearly in the spirit of "where
  it appears"; will update since it's pure prose, not an identifier.
- `legalmatch/README.md` — generic Vite template, nothing to rename (see
  Conflict §0.5); will be replaced wholesale in Phase 5 instead.

Not touching: table names, column names, route paths, the `legalmatch/` folder
name, `legalmatch/package.json`'s `name` field, variable/function names
containing "legalmatch"-adjacent words (none were found).

## 10. What's next

Phase 1 is otherwise complete. I'll do the branding-rename as its own commit
right after this audit commit. **Phase 2 (AI service) cannot start until
Conflict §0.1 (missing notebook) is resolved** — please add the notebook to the
repo or share its contents/a link. Conflict §0.2 (no real auth today) needs a
decision before Phase 3 backend work begins.
