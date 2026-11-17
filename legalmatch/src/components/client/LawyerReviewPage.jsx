import { useEffect, useState } from "react";
import { getLawyerReview, submitLawyerReview } from "../case/caseApi";

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "26px",
            lineHeight: 1,
            color: star <= value ? "#F59E0B" : "#CBD5E1",
            padding: 0,
          }}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function LawyerReviewPage({ currentUser, reviewTarget, onBack, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingReview, setLoadingReview] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState("");

  const lawyerName = reviewTarget?.lawyerName || "Selected lawyer";
  const issueTitle = reviewTarget?.issueTitle || "Your case";

  useEffect(() => {
    let mounted = true;

    async function loadExistingReview() {
      if (!currentUser?.id || !reviewTarget?.matchId) {
        if (mounted) setLoadingReview(false);
        return;
      }

      const result = await getLawyerReview(reviewTarget.matchId, currentUser.id);
      if (!mounted) return;

      if (result.ok && result.review) {
        setRating(Number(result.review.rating || 0));
        setComment(result.review.review_text || "");
        setIsEditMode(true);
      } else {
        setIsEditMode(false);
      }

      setLoadingReview(false);
    }

    loadExistingReview();
    return () => {
      mounted = false;
    };
  }, [currentUser?.id, reviewTarget?.matchId]);

  const handleSubmit = async () => {
    if (!currentUser?.id || !reviewTarget?.matchId) {
      setError("Unable to submit review right now.");
      return;
    }

    if (!rating) {
      setError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await submitLawyerReview({
      match_id: reviewTarget.matchId,
      client_id: currentUser.id,
      rating,
      review_text: comment.trim() || null,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || "Unable to submit review.");
      return;
    }

    onSubmitted?.();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "28px 16px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{
            marginBottom: "12px",
            background: "transparent",
            border: "none",
            color: "#0F2744",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Back to cases
        </button>

        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Case complete
          </p>
          <h1 style={{ margin: "6px 0 0", fontSize: "22px", color: "#0F2744" }}>
            Rate your experience
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
            Case: <strong>{issueTitle}</strong>
            <br />
            Lawyer: <strong>{lawyerName}</strong>
          </p>

          {loadingReview ? (
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#64748B" }}>Loading existing review...</p>
          ) : isEditMode ? (
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#0F6E56", fontWeight: 600 }}>
              You already submitted a review for this case. You can update it below.
            </p>
          ) : null}

          <div style={{ marginTop: "18px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#334155", fontWeight: 600 }}>Your rating</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div style={{ marginTop: "18px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#334155", fontWeight: 600 }}>Comment (optional)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={5}
              style={{
                width: "100%",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "10px",
                resize: "vertical",
                fontSize: "13px",
                color: "#0F172A",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#B91C1C" }}>{error}</p>
          )}

          <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingReview}
              style={{
                padding: "9px 14px",
                borderRadius: "8px",
                border: "none",
                background: "#1D9E75",
                color: "white",
                fontSize: "13px",
                fontWeight: 700,
                cursor: submitting || loadingReview ? "not-allowed" : "pointer",
                opacity: submitting || loadingReview ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting..." : isEditMode ? "Update review" : "Submit review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
