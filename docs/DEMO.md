# WakiliMatch — Demo script (brief section A6)

A 3-6 minute walkthrough of the AI matching engine, run live against the real
local stack (PostgreSQL + the Express backend + the Python AI service) -
every number below came out of the actual pipeline, not a mock.

## Setup (once)

```powershell
# Terminal 1 - AI service
cd ai-service
./.venv/Scripts/Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2 - Express backend (needs PostgreSQL running with database/database.sql applied,
# plus database/migrations/001_case_ai_summary_and_case_outcome_tag.sql on an existing DB)
cd legalmatch
node server.js

# Terminal 3 - run the demo
cd ..
./scripts/demo_queries.ps1
```

`scripts/demo_queries.ps1` registers (or logs into) one demo client account,
then runs five of the six steps through the real Express pipeline
(`POST /api/issues` -> `POST /api/matches/generate`) exactly as the web app
does. Step 3 (empty input) calls the AI service's own
`POST /api/match-lawyers` directly instead - see the note under that step.

## The six steps

### 1. Valid, everyday-language query (Employment)
*"I was dismissed from my job without notice and they refused to pay my
terminal dues"*
Expect `status: success`, an `xai` block naming the matched practice area and
a top precedent with a real similarity percentage, and a ranked list of
registered lawyers each carrying a `why.plain_text` explanation.

### 2. A second valid query, different area (Family & Succession)
*"My father died without a will and my uncles are taking his property"*
Same shape as step 1, different `matched_area` and different lawyers ranked
- shows the engine isn't returning the same list regardless of input.

### 3. Empty input
Calling `/api/matches/generate` with a stored issue is not how this is
exercised: the web app's own case-submission form already requires a
non-empty description (`routes/issues.js`), so a genuinely empty query can
never reach the AI service through that route - correct product behaviour,
not a gap. This step instead calls the AI service directly:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/match-lawyers" -Method Post `
  -Headers @{ "X-Internal-Key" = $env:INTERNAL_API_KEY } `
  -Body (@{ user_query = "" } | ConvertTo-Json) -ContentType "application/json"
```
Expect `status: "empty_query"` with a friendly message and 2-3 example
queries. This is exactly the path the AI Assistant chat intake (brief
section B6, not yet built) will hit if a user tries to submit before typing
anything.

### 4. Gibberish
*"asdfgh qwerty zxcvb"* - a non-empty string, so it *does* pass Express's
own form check and reaches the AI service. Expect `status: "invalid_input"`.

### 5. Off-topic
*"How do I cook pilau for ten people"* - a well-formed English sentence, so
it is not gibberish, but it is nowhere near any legal practice area. Expect
`status: "low_confidence"` (the top semantic-similarity score falls below
the calibrated 0.328 threshold - see `ai-service/eval/RESULTS.md`'s
threshold sweep for exactly how often this and the other off-topic queries
clear each candidate threshold).

### 6. Where the XAI card is on screen
Re-run step 1 or 2's query through the web app (once Phase 3's Match Results
screen exists) and point at:
- the XAI card at the top of the results list (`xai.explanation`,
  `xai.top_precedent`, `xai.matched_area`)
- the "Why this lawyer?" expandable on the top-ranked card
  (`why.plain_text`, `why.precedent_cases`, `why.components`)

## Known weaknesses (honest, measured - not the brief's illustrative numbers)

The brief's own A6 text names specific example numbers ("Commercial P@5 =
0.00", "36.5% on the landlord example", "macro-F1 0.632 vs 0.800"). Those
came from whatever run the brief's author had in front of them - **not from
this corpus sample**, so repeating them here would be exactly the kind of
fabricated number the project's own "never fabricate" rule (section B4)
forbids. The real, current numbers from `ai-service/eval/RESULTS.md` are:

- **Commercial & Contract retrieval is the weakest area**: P@5 = 0.00, MRR =
  0.00 in this sample - the index currently has no judgments in this area
  that the 5 Commercial & Contract eval queries actually retrieve near the
  top. Constitutional & Administrative (P@5 = 0.08) and Tax (P@5 = 0.16) are
  also weak; Criminal (P@5 = 0.76) and Land & Property / Family & Succession
  (P@5 = 0.60 each) are the strongest.
- **Extractor coverage is low**: only 131 of 737 documents (17.8%) have at
  least one extracted advocate appearance - most Kenya Law judgment text in
  this sample doesn't carry a clean "Mr X for the Y" appearance line the
  regex extractor can latch onto. This directly limits how often
  `recommendations`/`advocates` comes back non-empty even when the case-law
  match itself is strong (`no_lawyers_found`).
  Advocate-name cleanup collapsed 205 raw extracted keys down to 193 unique
  ones (12 casing/fragment/near-duplicate-firm variants merged) - see
  `eval/RESULTS.md`'s A5 section.
- **The landlord example actually returns 32.8% similarity, in the wrong
  area**: running "My landlord locked my shop because I was late with rent"
  (labelled Land & Property in `eval/queries.py`) returns a top precedent
  from the **Criminal** area at 32.8% semantic similarity - just over the
  0.328 threshold, so it's `status: success`, but it's a retrieval miss, not
  a Land & Property judgment. This is a real, demonstrable example of why
  P@5 for this engine is 0.371, not higher - worth showing in a demo exactly
  because it's typical, not cherry-picked.
- **Grouped cross-validation macro-F1 is 0.655 +/- 0.037**, versus 0.802 if
  you (incorrectly) let passages from the same judgment appear in both the
  train and test fold - a +0.147 leakage inflation. The grouped number is
  the honest one; chance level for 6 areas is ~0.167.
