-- Migration 001: Add lawyer_embeddings and match_results tables (additive only)

CREATE TABLE IF NOT EXISTS lawyer_embeddings (
    lawyer_id UUID PRIMARY KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,
    model VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_results (
    match_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES ClientIssues(issue_id) ON DELETE CASCADE,
    lawyer_id UUID REFERENCES Users(user_id) ON DELETE CASCADE,
    final_score FLOAT NOT NULL,
    component_scores JSONB,
    precedent_cases JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lawyer_embeddings_lawyer ON lawyer_embeddings(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_match_results_issue ON match_results(issue_id);
