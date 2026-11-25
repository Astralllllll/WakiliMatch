-- ============================================================
-- WakiliMatch — Database Schema
-- PostgreSQL schema for the WakiliMatch platform: client/lawyer/admin
-- accounts, lawyer profiles, client issues, TF-IDF-based matches,
-- and post-engagement reviews.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()
-- NOTE: pgvector ("vector" extension) intentionally omitted.
-- Matching is TF-IDF + cosine similarity computed in application code
-- (lib/tfidf.js, services/matchingEngine.js), which doesn't need it.

-- ------------------------------------------------------------
-- 1. CORE ANCHOR TABLE
-- ------------------------------------------------------------
CREATE TABLE Users (
    user_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(50)  NOT NULL CHECK (role IN ('Client', 'Lawyer', 'Admin')),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. SPECIALIZED PROFILE TABLES
-- ------------------------------------------------------------
CREATE TABLE Admins (
    admin_id   UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID      NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    department VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LawyerProfiles (
    profile_id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID          NOT NULL UNIQUE REFERENCES Users(user_id) ON DELETE CASCADE,

    lsk_registration_number  VARCHAR(100)  UNIQUE NOT NULL,
    full_name                VARCHAR(255)  NOT NULL,
    biography                TEXT,

    academic_qualifications  TEXT,
    institutions             TEXT,
    graduation_year          SMALLINT,
    bar_admission_year       SMALLINT,
    courts                   TEXT,
    languages                TEXT,

    specializations          TEXT,
    years_of_experience      INT           DEFAULT 0 CHECK (years_of_experience >= 0),
    firm_name                VARCHAR(255),
    county                   VARCHAR(100), -- lawyer's own practice county (Android onboarding, Deliverable 4 bug 1)

    -- Self-reported summary fields collected once at onboarding. Distinct
    -- from PastCases below, which holds the structured, per-case records
    -- the matching engine actually scores against.
    case_type_descriptions   TEXT,
    previous_cases_handled   INT           CHECK (previous_cases_handled >= 0),
    success_rate             NUMERIC(5,2)  CHECK (success_rate >= 0 AND success_rate <= 100),
    price_guidance           VARCHAR(100),

    profile_text             TEXT,

    is_verified              BOOLEAN       NOT NULL DEFAULT false, -- manual LSK verification, toggled by an admin
    average_rating           NUMERIC(3,2)  DEFAULT 0.00,
    total_reviews            INT           DEFAULT 0,

    created_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Structured past-case history per lawyer — feeds the matching engine's
-- relevance scoring and "why this lawyer" reasoning (services/matchingEngine.js).
CREATE TABLE PastCases (
    case_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id    UUID         NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    case_type    VARCHAR(100) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    case_year    INT          NOT NULL,
    outcome_note TEXT,
    -- Structured result tag for the ResultTag UI chip (WON/SETTLED/ONGOING/...).
    -- Nullable: existing rows and any lawyer who hasn't tagged a case stay valid;
    -- the UI simply omits the tag until one is set (Deliverable 3 B5/B4).
    outcome_tag  VARCHAR(20)  CHECK (outcome_tag IN ('won', 'settled', 'ongoing', 'lost', 'withdrawn')),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 3. TRANSACTIONAL TABLES
-- ------------------------------------------------------------

-- legal_category / urgency_level values must match the lowercase value
-- strings in CaseContext.jsx (LEGAL_CATEGORIES / URGENCY_LEVELS) — the
-- frontend sends those values, not the display labels.
CREATE TABLE ClientIssues (
    issue_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         UUID          NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    issue_title       VARCHAR(255)  NOT NULL,
    issue_description TEXT          NOT NULL,
    legal_category    VARCHAR(50)   CHECK (
        legal_category IN ('criminal', 'family', 'property', 'employment', 'corporate', 'immigration')
    ),
    jurisdiction      VARCHAR(100),
    urgency_level     VARCHAR(20)   CHECK (
        urgency_level IN ('low', 'medium', 'high', 'critical')
    ),
    budget_range      VARCHAR(100),
    budget_min        NUMERIC(12,2),
    budget_max        NUMERIC(12,2),
    status            VARCHAR(50)   NOT NULL DEFAULT 'Open'
                          CHECK (status IN ('Open', 'Matched', 'Closed')),
    ai_summary        TEXT,         -- AI-drafted case summary shown to lawyers pre-confirmation (Deliverable 3 B5/B6)
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Matches (
    match_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         UUID          NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    lawyer_id         UUID          NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    issue_id          UUID          NOT NULL REFERENCES ClientIssues(issue_id) ON DELETE CASCADE,
    similarity_score  FLOAT,
    match_reason      TEXT,
    status            VARCHAR(50)   NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('Pending','requested','ongoing','completed','declined')),
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Reviews (
    review_id   UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID      NOT NULL REFERENCES Users(user_id)    ON DELETE CASCADE,
    lawyer_id   UUID      NOT NULL REFERENCES Users(user_id)    ON DELETE CASCADE,
    match_id    UUID      NOT NULL REFERENCES Matches(match_id) ON DELETE CASCADE,
    rating      INT       NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AnalyticsReports (
    report_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID         NOT NULL REFERENCES Admins(admin_id) ON DELETE CASCADE,
    report_title VARCHAR(255) NOT NULL,
    report_data  JSONB,
    generated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_lawyerprofiles_user_id   ON LawyerProfiles(user_id);
CREATE INDEX idx_pastcases_lawyer_id      ON PastCases(lawyer_id);
CREATE INDEX idx_clientissues_client_id   ON ClientIssues(client_id);
CREATE INDEX idx_clientissues_category    ON ClientIssues(legal_category);
CREATE INDEX idx_matches_client_id        ON Matches(client_id);
CREATE INDEX idx_matches_lawyer_id        ON Matches(lawyer_id);
CREATE INDEX idx_matches_issue_id         ON Matches(issue_id);
CREATE INDEX idx_matches_lawyer_status    ON Matches(lawyer_id, status);
CREATE INDEX idx_matches_updated_at       ON Matches(updated_at DESC);
CREATE INDEX idx_reviews_lawyer_id        ON Reviews(lawyer_id);
CREATE INDEX idx_reviews_client_id        ON Reviews(client_id);
CREATE INDEX idx_reviews_match_id         ON Reviews(match_id);

CREATE INDEX idx_lawyerprofiles_profile_text
    ON LawyerProfiles USING GIN (to_tsvector('english', COALESCE(profile_text, '')));

-- ------------------------------------------------------------
-- 5. TRIGGERS
-- ------------------------------------------------------------
-- routes/profiles.js's upsert never sets updated_at itself, so keep it
-- accurate via trigger instead. Matches.updated_at is already set
-- explicitly by every UPDATE in routes/matches.js, so no trigger needed there.
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lawyerprofiles_updated_at
    BEFORE UPDATE ON LawyerProfiles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------
-- 6. ADMIN SECRET-CODE SIGN-IN (Deliverable 4, bug 3)
-- ------------------------------------------------------------
-- Never stores the admin code or any password - only the outcome of each
-- attempt, and a random session token.
CREATE TABLE admin_login_attempts (
    attempt_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_attempted VARCHAR(255),
    ip_address      VARCHAR(64),
    success         BOOLEAN NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_login_attempts_email ON admin_login_attempts(email_attempted, created_at);
CREATE INDEX idx_admin_login_attempts_ip ON admin_login_attempts(ip_address, created_at);

CREATE TABLE admin_sessions (
    session_token VARCHAR(128) PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP NOT NULL
);

CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ============================================================
-- END OF FILE
-- ============================================================
