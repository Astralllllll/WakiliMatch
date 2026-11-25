-- Migration 003: Secret-code admin sign-in support (additive only)
-- Deliverable 4, bug 3. Never stores the admin code or any password -
-- only the outcome of each attempt, and a random session token.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    attempt_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_attempted VARCHAR(255),
    ip_address      VARCHAR(64),
    success         BOOLEAN NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email ON admin_login_attempts(email_attempted, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON admin_login_attempts(ip_address, created_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
    session_token VARCHAR(128) PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
