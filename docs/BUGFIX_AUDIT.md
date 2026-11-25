# WakiliMatch — Bugfix Audit (Phase 1)

Scope: diagnose-only, per the working method in the brief. No code changes in
this phase. Both bugs were reproduced live against the running stack
(PostgreSQL + Express on `:5000` + the AI service on `:8000`), not just read
from source.

## Blocker — resolved

**Decision: Bug 1 is Android-only.** Phase 2 builds the missing lawyer
onboarding/edit screens in the Android app; the web app's existing
`LawyerOnboarding.jsx` flow is left untouched since it already works.

**Bug 1 as described does not reproduce on the web app** — it reproduces on
the **Android app**. The brief's own context section (§0) names only the web
stack (React/Vite/Express/Postgres/ai-service) and never mentions Android, so
before I touch anything I need you to confirm scope.

Evidence:

- I registered a lawyer and saved a full onboarding profile (biography,
  specialisations, case history, etc.) through the **real running web
  backend** via direct API calls that mirror exactly what `LawyerOnboarding.jsx`
  sends — `POST /api/auth/lawyer/register` then `POST /api/profiles/lawyer` —
  and it worked end to end; `GET /api/lawyers/:id` returned the saved
  biography back correctly. `App.jsx` already routes a newly-registered lawyer
  with an incomplete profile to `LawyerOnboarding.jsx` (`src/App.jsx:70-84`,
  `isLawyerProfileComplete()` at `src/App.jsx:18-27`), and that component
  already has a full 3-step form (bio with a live character counter,
  specialisations, years of experience, past cases, fee guidance) wired to
  `saveLawyerProfile()`. I could not make it fail.
- The **Android app** (the native rewrite built/tested earlier this session)
  has no such screen. `LawyerOwnProfileScreen.kt` is explicitly read-only —
  its own doc-comment says so: *"Read-only profile view (brief B3's lawyer
  'Profile' tile). Editing a profile isn't in this port's scope yet - a
  known, flagged gap, not an oversight."* Android's lawyer registration
  (same `/api/auth/lawyer/register` endpoint) inserts a bare `LawyerProfiles`
  row with `specializations = null` and no biography (`server.js:199-203`),
  and the nav graph (`AppNavGraph.kt`) has no route to create or edit one —
  a lawyer who registers on Android is stuck with an empty profile forever,
  with no in-app way to add a description. This matches your bug report
  exactly.

**I need you to tell me**: is this brief about the web app, the Android app,
or both? The fix shape differs a lot — web needs no new screens (just
verifying/hardening what exists), Android needs the onboarding/edit screens
built from scratch, mirroring `LawyerOnboarding.jsx`'s fields against the same
`POST /api/profiles/lawyer` contract.

## 1. Bug 1 — lawyer profile creation (root cause)

- **Backend**: `POST /api/profiles/lawyer` (`routes/profiles.js`) is a
  correct upsert (`ON CONFLICT (lsk_registration_number) DO UPDATE`) and
  works as verified above. Not broken.
- **Web frontend**: `LawyerOnboarding.jsx` + the `App.jsx` routing between
  register → onboarding → dashboard is intact and functional.
- **Android frontend**: no onboarding/edit UI exists at all — this is the
  actual bug, confirmed by the code's own comment, not an oversight I'm
  inferring.
- Matching exclusion (brief's "incomplete profile excluded from results,
  banner shown") does **not** exist anywhere yet, for either client — this is
  net-new work regardless of which platform we proceed on.
- Embedding/re-ranking on profile save: there's no `lawyer_embeddings` table
  or flow currently wired to `POST /api/profiles/lawyer` — matching today is
  TF-IDF-based (`services/matchingEngine.js`), with the ai-service's semantic
  engine called separately for case-to-precedent retrieval, not profile-to-
  query similarity. (One earlier migration file is named
  `001_lawyer_embeddings_and_match_results.sql` — I have not yet read what it
  actually creates; flagging so Phase 2 checks it before assuming the column
  needs to be added from scratch.)

## 2. Bug 2 — county mis-detection (root cause, confirmed live)

Root cause: `services/aiAssist.js:42` —
```js
jurisdiction: location || null,
```
stores the assistant's raw free-text answer to the location question with
**zero validation**. Confirmed by calling the live endpoint directly:

```
POST /api/ai/draft-case  { "location": "home" }       → jurisdiction: "home"
POST /api/ai/draft-case  { "location": "Westlands" }  → jurisdiction: "Westlands"
```

Neither is resolved or rejected — the brief's exact complaint, reproduced.

Two more findings that change the shape of the fix:

- **`KENYAN_COUNTIES` is not the 47 counties — it's a 15-item placeholder
  list, and it's wrong even as a placeholder.** Both
  `legalmatch/src/context/CaseContext.jsx:62-66` and
  `app/.../data/CaseOptions.kt:24-28` define the identical 15 entries:
  `Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Nyeri, Meru, Thika, Machakos,
  Kisii, Garissa, Kakamega, Kilifi, Lamu, Marsabit`. **Eldoret and Thika are
  towns, not counties** (Eldoret is in Uasin Gishu, Thika is in Kiambu) — the
  existing list conflates the two, which is exactly the class of error the
  brief's alias map is meant to fix. Building the real 47-county list plus
  the alias map (section 4) is net-new work, not an edit of existing data.
- **A partial, silent safety net already exists on both clients** — web's
  `PostCaseWizard.jsx:172-184` (`applyDraft`) and Android's
  `AppNavGraph.kt` (`applyDraft`) both do a case-insensitive **exact** match
  of the assistant's `jurisdiction` against `KENYAN_COUNTIES` before writing
  it into the actual case-form state, falling back to whatever the field
  already held if there's no exact match. This means "home" typed in the
  chat does **not** currently reach the final `ClientIssues.jurisdiction`
  column on either client (confirmed by code read, not live-tested through
  the full UI) — but a real town name like "Westlands" silently fails to
  resolve too, leaving the field blank with no explanation and no retry,
  which is still broken relative to what the brief wants, and doesn't
  explain the terminal symptom you saw. My best read: the **draft summary
  bubble itself echoes the raw, unvalidated value back to the user**
  (`AiAssistantScreen.jsx`'s draft bubble renders `draft.jurisdiction`
  directly) — seeing "home" appear there, even if it's later dropped before
  being saved, is a real, visible bug and almost certainly what prompted the
  report.
- **`POST /api/issues` (`routes/issues.js:80-145`) performs no server-side
  validation on `jurisdiction` at all** — it is accepted and stored verbatim.
  The client-side safety net above is the *only* thing stopping a bad value
  today, which is fragile (a future client, a direct API call, or an edge
  case in that matching logic has nothing backing it up). The brief's
  "shared validator used by the assistant, the case form, and lawyer
  onboarding" needs to live on the server, not just in each client.

## 3. Auth/role mechanism + admin routes (inspected for bug 3 prep)

- **No session or token mechanism exists anywhere.** Every login route
  (`/api/auth/client/login`, `/api/auth/lawyer/login`,
  `/api/auth/admin/login` — all inline in `server.js`) returns a plain
  `{ user: {...} }` JSON object on success. There is no JWT, no cookie, no
  server-side session store. The frontend keeps the returned user object in
  React/Compose state and trusts it client-side for the rest of the session.
- **Every route in `routes/admin.js` has zero authentication or role
  check today** — `GET /overview`, `DELETE /cases/:id`,
  `DELETE /clients/:id`, `PATCH /lawyers/:id/verify`, `DELETE /lawyers/:id`
  are all callable by anyone who knows the URL, authenticated or not, any
  role or none. This is a real, pre-existing security hole, not something
  bug 3 introduces — section 3's "enforce role on the server for every
  existing admin route" is addressing an actual live gap, not a
  precaution.
- **Password hashing already uses the right primitive**: `hashPassword()` /
  `verifyPassword()` in `server.js:19-42` use `crypto.scryptSync` with a
  random per-password salt and `crypto.timingSafeEqual` for comparison. The
  brief's admin-code hash can reuse this exact pattern (scrypt + constant-time
  compare), satisfying "matching the existing password hashing" directly.
- **Public registration already ignores any client-supplied role** — both
  `/api/auth/client/register` and `/api/auth/lawyer/register` destructure
  only the fields they expect from `req.body` and hardcode `'Client'` /
  `'Lawyer'` in the `INSERT` — a forged `role: "admin"` in the request body
  is already a no-op today, not a gap to close.
- `/api/auth/admin/login` already exists (email + password, no code) and
  queries `Users WHERE role = 'Admin'` — bug 3's job is to add the code
  requirement, rate limiting, and the audit table on top of this existing
  route, not replace it.
- No `scripts/create-admin.js` or `scripts/generate-admin-code` exists yet —
  both are net-new, as the brief expects.
- No `.env.local` or `.gitignore` entry for it exists yet — also net-new.

## Net assessment

- **Bug 2** and **bug 3** are squarely web+backend work, scoped exactly as
  the brief describes, with real confirmed root causes and no platform
  ambiguity.
- **Bug 1** needs your call on Android vs. web vs. both before Phase 2 can
  start, since the actual defect lives somewhere the brief doesn't mention.
- The adaptive-assistant work (section 5) builds on the same
  `services/aiAssist.js` module as bug 2 and is unaffected by the Android
  question.

Nothing above blocks writing the fixes once you answer the scope question —
flagging it now rather than guessing and building the wrong thing.
