# WakiliMatch

A legal client-lawyer matching platform for Kenya. Clients describe a legal
issue; the system ranks registered, LSK-verified advocates against it using
a semantic retrieval engine trained on Kenya Law judgments, with an
explainable-AI (XAI) card showing *why* each match was made.

Three parts make up the full system:

| Part | Stack | Location |
|---|---|---|
| Web app | React 19 + Vite + Tailwind v4, Express, PostgreSQL | this folder |
| AI matching service | Python, FastAPI, SentenceTransformers | `../ai-service` |
| Android client | Kotlin, Jetpack Compose | `../app` |

## Quick start (Windows + PowerShell)

You need all three running for the full experience; the web app degrades
to a TF-IDF fallback if the AI service is unreachable.

```powershell
# 1. Database (PostgreSQL must already be installed and running)
psql -U postgres -c "CREATE DATABASE wakilimatch;"
psql -U postgres -d wakilimatch -f database/database.sql
# then apply any files under database/migrations/ in order, e.g.:
psql -U postgres -d wakilimatch -f database/migrations/001_case_ai_summary_and_case_outcome_tag.sql

# 2. AI service (see ../ai-service/README.md for the full setup)
cd ../ai-service
./.venv/Scripts/Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 3. Express backend (new terminal)
cd legalmatch
npm install
node server.js          # http://localhost:5000

# 4. Frontend (new terminal)
npm run dev              # http://localhost:5173, proxies /api to :5000
```

Optional: `node database/seed_lawyers.js` populates 15 fictional
LSK-verified advocates across practice areas for a realistic demo.

### Environment variables (`.env`)

```env
MATCHING_ENGINE=ai          # "ai" (default) or "tfidf" to force the legacy engine
AI_SERVICE_URL=http://localhost:8000
INTERNAL_API_KEY=...        # must match ai-service/.env's INTERNAL_API_KEY
AI_FALLBACK=true            # fall back to TF-IDF if the AI service errors
LLM_PROVIDER=mock           # AI Assistant / case-summary provider (section B6) - only "mock" exists
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=wakilimatch
DB_PASSWORD=...
DB_PORT=5432
```

## Architecture

- **Matching**: `services/aiMatchingClient.js` calls the AI service's
  `/match` endpoint (semantic retrieval + XAI explanation), combines it
  with structured signals (category/jurisdiction/case-history match) into
  a composite score, and falls back to `services/matchingEngine.js`'s
  from-scratch TF-IDF engine if the AI service is unavailable.
- **XAI**: every `/api/matches/generate` response includes an `xai` block
  (matched practice area, top precedent with a real Kenya Law link,
  semantic similarity - never called a "probability") and a per-lawyer
  `why` object (`services/xai.js`).
- **Privacy gating**: a lawyer only sees a case's category and AI summary
  until the client confirms that specific lawyer; full details
  (description, jurisdiction, budget, client identity) are withheld
  server-side until then (`routes/matches.js`, `details_confirmed` flag).
- **AI Assistant / Scan Document**: `services/aiAssist.js` is a small
  provider interface (`LLM_PROVIDER=mock|<real>`) behind the chat intake
  and case-summary features. Only a mock (templated, not generated)
  implementation exists today; mock output is always labelled "Draft",
  never shown with an AI badge (`GET /api/ai/status` tells the frontend
  which is live).

See `docs/UI_AUDIT.md` for the full screen-by-screen/endpoint mapping and
known data gaps, and `docs/DEMO.md` for a guided walkthrough.

## Testing

```powershell
npm run lint              # ESLint
npm run test               # vitest - component tests (XAI card, each Match Results state)
npm run build               # production build
npx playwright install chromium   # once
npm run test:e2e            # Playwright - login -> assistant -> case -> results -> profile -> confirm
```

The Playwright spec (`tests/e2e/demo-flow.spec.js`) mocks the backend at
the network layer, so it only needs the Vite dev server - it proves the
frontend code paths work end to end, not that the SQL behind each
endpoint is correct. It also writes screenshots to `docs/screens/` at
390x844. For a real database-backed run, start the full stack above and
drive it manually (or point a Playwright config at live routes instead of
mocking them).

The AI service has its own test suite - see `../ai-service/README.md`.

## Known gaps

- No authentication/session layer exists anywhere in this app (see
  `docs/AUDIT.md` from the original build). Every route trusts its
  caller's claimed IDs. Out of scope for this pass; flagged, not fixed.
- `LawyerList.jsx` and `LawyerProfileCreation.jsx` are pre-existing,
  unreachable/ambiguous components from before this work - left as-is.
