
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import "../styles/RatingReviews.css";
import { FaArrowLeft, FaStar } from "react-icons/fa";

export default function RatingReviews() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    taskId,
    seekerId,
    seekerName,
    posterId,
    posterName,
    returnTo,
    existingRating,
    existingReview,
  } = location.state || {};
  const reviewedUserId = seekerId || posterId;
const reviewedUserName = seekerName || posterName;


const [review, setReview] = useState(existingReview || "");
const [reviewerId, setReviewerId] = useState(null);
const [resolvedUserName, setResolvedUserName] = useState(reviewedUserName || "User");
const [reviewedUserImage, setReviewedUserImage] = useState(null);




  const [rating, setRating] = useState(existingRating || 5);
  const [hoveredRating, setHoveredRating] = useState(null);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);


  const getRatingLabel = (value) => {
    if (!value) return "Select a rating";
    if (value === 1) return "Very Bad";
    if (value === 2) return "Poor";
    if (value === 3) return "Average";
    if (value === 4) return "Good";
    if (value === 5) return "Excellent";
    return "";
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setError("You must be logged in to submit a review.");
        return;
      }
      setReviewerId(data.user.id);
    };
    fetchUser();
  }, []);


useEffect(() => {
  const loadReviewedUserData = async () => {
    if (!reviewedUserId) return;

    try {
      if (reviewedUserName) {
        setResolvedUserName(reviewedUserName);
      } else {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", reviewedUserId)
          .single();

        if (!profileError && profile) {
          const fullName = `${profile.first_name || ""} ${
            profile.last_name || ""
          }`.trim();
          setResolvedUserName(fullName || "User");
        }
      }
    } catch (e) {
      console.error("Error fetching reviewed user name:", e);
    }

    try {
      const tableName = seekerId ? "seeker" : "poster";
      const fkColumn = seekerId ? "seeker_id" : "poster_id";

      const { data: row, error: rowError } = await supabase
        .from(tableName)
        .select("profile_picture")
        .eq(fkColumn, reviewedUserId) 
        .single();

      if (!rowError && row?.profile_picture) {
        setReviewedUserImage(row.profile_picture);
      }
    } catch (e) {
      console.error("Error fetching reviewed user image:", e);
    }
  };

  loadReviewedUserData();
}, [reviewedUserId, reviewedUserName, seekerId]);

  if (!taskId || !reviewedUserId) {
    return (
      <div className="rating-page">
        <div className="rating-card">
          <h2>Provide Rating & Review</h2>
          <p>Missing required task information.</p>
        </div>
      </div>
    );
  }


  const doSubmit = async () => {
    if (!reviewerId) {
      setError("Unable to identify current user.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch("http://localhost:5000/api/rating-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          reviewer_id: reviewerId,
          reviewed_user_id: reviewedUserId, 
          rating: Number(rating),
          review,
        }),
      });

      const text = await res.text();
      console.log("rating-reviews response:", res.status, text);

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.error("Non-JSON response from server:", parseErr);
      }

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setSuccess("Review submitted successfully!");

      setTimeout(() => {
        const fallbackPath = seekerId ? "/poster-my-tasks" : "/seeker-dashboard";
        const targetPath = returnTo || fallbackPath;

        console.log("Navigating after review to:", targetPath);
        navigate(targetPath);
      }, 1200);
    } catch (err) {
      console.error("doSubmit error:", err);
      setError(
        "Something went wrong while submitting your review. Please try again."
      );
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    if (!review.trim()) {
      setShowConfirmModal(true);
      return;
    }

    doSubmit();
  };

  const activeRating = hoveredRating || rating;


  const handleBack = () => {
    navigate(-1); 
  };

  return (
    <div className="rating-page">
      <div className="rating-card">
        <div className="rating-header">
          <button className="back-button" onClick={handleBack}>
            <FaArrowLeft /> Back
          </button>
          <h2 className="rating-title">Provide Rating & Review</h2>
        </div>

       <div className="review-info-card">
  <div className="info-icon">
    {reviewedUserImage ? (
      <img
        src={reviewedUserImage}
        alt="Profile"
        className="review-user-image"
      />
    ) : (
      "📝"
    )}
  </div>
  <div className="info-content">
    <p className="info-title">Reviewing:</p>
    <p className="info-user">{resolvedUserName}</p>
  </div>
</div>


        <form onSubmit={handleSubmit} className="rating-form">
          <div className="rating-stars-section">
            <span className="field-label">
              <FaStar className="star-icon" /> Your Rating
            </span>
            <div className="stars-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${
                    activeRating >= star ? "filled" : ""
                  }`}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="rating-label-text">
              <span className="rating-label">{getRatingLabel(activeRating)}</span>
              <span className="rating-value">({activeRating}/5)</span>
            </div>

            <div className="rating-scale">
              <span className="scale-label">1</span>
              <span className="scale-label">2</span>
              <span className="scale-label">3</span>
              <span className="scale-label">4</span>
              <span className="scale-label">5</span>
            </div>
            <div className="rating-helper-text">
              Very Bad        • Poor • Average • Good • Excellent
            </div>
          </div>

      
          <div className="rating-field">
            <label className="field-label" htmlFor="review">
              Review <span className="field-optional">(optional)</span>
            </label>
            <div className="textarea-container">
              <textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={500}
                placeholder="Share your experience... What did you like? What could be improved?"
                disabled={loading}
                className="review-textarea"
              />
              <div className="char-count">{review.length}/500</div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleBack}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>


      {showConfirmModal && (
        <div className="rating-modal-backdrop">
          <div className="rating-modal">
            <div className="modal-icon">⚠️</div>
            <h3>Submit without a written review?</h3>
            <p>
              You've selected a {rating}-star rating but left the review box empty.
              Would you like to submit only the rating?
            </p>
            <div className="rating-modal-actions">
              <button
                type="button"
                className="modal-btn secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Add Review
              </button>
              <button
                type="button"
                className="modal-btn primary"
                onClick={doSubmit}
                disabled={loading}
              >
                Yes, Submit Rating Only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}