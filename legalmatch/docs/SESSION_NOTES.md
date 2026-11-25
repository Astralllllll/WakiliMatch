# WakiliMatch - Project Overview & Session Notes

## What the project is

WakiliMatch is a legal client-lawyer matching platform for Kenya. Clients
describe a legal issue; the system ranks registered, LSK-verified advocates
against it using a semantic retrieval engine trained on Kenya Law judgments,
with an explainable-AI (XAI) card showing *why* each match was made.

Three parts make up the full system:

| Part | Stack | Location |
|---|---|---|
| Web app | React 19 + Vite + Tailwind v4, Express, PostgreSQL | `legalmatch/` |
| AI matching service | Python, FastAPI, SentenceTransformers | `ai-service/` |
| Android client | Kotlin, Jetpack Compose | `app/` |

Key architecture pieces (see `legalmatch/README.md` for the full picture):

- **Matching**: `services/aiMatchingClient.js` calls the AI service's
  `/match` endpoint, falling back to a from-scratch TF-IDF engine
  (`services/matchingEngine.js`) if the AI service is unreachable.
- **XAI**: every match response includes an explanation block (matched
  practice area, a real Kenya Law precedent link, semantic similarity).
- **Privacy gating**: a lawyer only sees a case's category/summary until
  the client confirms them; full details are withheld until then.
- **AI Assistant**: an adaptive, one-question-at-a-time chat intake
  (`services/assistantEngine.js`) that infers practice area and asks only
  for the highest-priority missing, area-specific fact (max 5 questions).
- **County/jurisdiction validation**: `services/countyValidator.js` is the
  single source of truth for Kenya's 47 counties plus alias/fuzzy matching.
- **Admin secret-code sign-in**: email + password + a secret access code,
  rate-limited, session-token gated - the one part of the app with real auth.
- **Scan Document / case summaries**: a mock LLM provider
  (`services/aiAssist.js`), always labelled "Draft".

Recent work on the `main` branch before this session (from git log):
adaptive chat intake brought to Android to match the web app, README
updates for Deliverable 4, and a real 47-county list with a re-ask step
for unresolved location answers.

## This session

This session did not change any project code. It was a build/run/verify
and documentation session. What happened, in order:

### 1. "run it on my phone"

The user asked to run the Android app on their physical device.

- Found the Android project root one level up from `legalmatch/` (at
  `WakiliMatch/`), since `legalmatch/` is the web app.
- Confirmed a phone was already connected over wireless `adb`
  (`SM-S928B`, Samsung Galaxy S928B).
- Discovered the repo has no checked-in `gradlew`/`gradlew.bat` wrapper
  script, only `gradle/wrapper/gradle-wrapper.properties` pointing at
  Gradle 8.9. Worked around this by invoking the already-cached Gradle
  8.9 distribution directly from `~/.gradle/wrapper/dists/`.
- Hit a Java-version mismatch: the default `JAVA_HOME` candidate
  (Android Studio's bundled JBR, Java 25) is too new for Gradle 8.9.
  Found a compatible JDK already on disk - `jbr-21.0.11` under
  `~/.jdks/` (registered in Android Studio's `jdk.table.xml`) - and used
  that as `JAVA_HOME` instead.
- Ran `gradle installDebug`, which built and installed the debug APK
  onto the connected phone successfully (`BUILD SUCCESSFUL`).
- Launched the app on-device via `adb shell monkey -p com.wakilimatch.app
  -c android.intent.category.LAUNCHER 1`.
- Per standing guidance (manual phone testing preferred), stopped there
  rather than driving the UI via `adb`/`uiautomator`, and asked the user
  to try the app on their phone and report back.

### 2. "create a file and save it in the project folder describing the
whole project and the changes that have been made during this session.
Include the prompts"

This request - writing this file, `docs/SESSION_NOTES.md`.

## Prompts given in this session (verbatim)

1. `run it on my phone`
2. `create a file and save it in the project folder describing the whole
   project and the changes that have been made during this session.
   Include the prompts`

## Useful facts uncovered this session (for next time)

- Android project root: `WakiliMatch/` (parent of `legalmatch/`).
- No `gradlew`/`gradlew.bat` is checked into the repo. To build from the
  command line, invoke the cached wrapper distribution directly, e.g.:
  ```powershell
  $env:JAVA_HOME = "$env:USERPROFILE\.jdks\jbr-21.0.11"
  & "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.9-bin\<hash>\gradle-8.9\bin\gradle.bat" installDebug
  ```
- Android Studio's bundled JBR (`...\Android Studio\jbr`) is Java 25,
  which is too new for this project's Gradle 8.9 - use `jbr-21.0.11`
  under `%USERPROFILE%\.jdks\` instead.
- `adb` lives at `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` (not
  on `PATH`). The phone connects over wireless adb.
- App's `applicationId` is `com.wakilimatch.app`.
