import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import supabase from "../supabaseClient";
import "../styles/PosterAccount.css";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

function PosterAccount({ isOpen, onClose, onAvatarChange }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [averageRating, setAverageRating] = useState(null);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [statusModal, setStatusModal] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [confirmModal, setConfirmModal] = useState(false);
  useEffect(() => {
    if (!isOpen) return;

    const fetchUserProfile = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("User fetch error:", userError?.message || "No user");
          setLoading(false);
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .ilike("email", user.email)
          .single();

        const { data: posterPic, error: posterPicError } = await supabase
          .from("poster")
          .select("profile_picture")
          .eq("poster_id", user.id)
          .single();

        console.log("profile data", profileData, posterPic);

        if (error) {
          console.error("Profile fetch error:", error.message);
        }

        const mergedProfile = {
          ...profileData,
          profile_picture: posterPic?.profile_picture || null,
        };

        setProfile(mergedProfile);
        console.log("merged profile:", mergedProfile);

        const { data: ratingsData, error: ratingsError } = await supabase
          .from("rating_reviews")
          .select("id, rating, review, created_at, reviewer_id")
          .eq("reviewed_user_id", user.id);

        if (ratingsError) {
          console.error("Error fetching ratings:", ratingsError);
          setAverageRating(null);
          setRatingsCount(0);
          setReviews([]);
          return;
        }

        if (!ratingsData || ratingsData.length === 0) {
          setReviews([]);
          setRatingsCount(0);
          setAverageRating(null);
          return;
        }

        const reviewerIds = [
          ...new Set(
            ratingsData.map((r) => r.reviewer_id).filter((id) => !!id)
          ),
        ];

        let profilesById = {};
        let seekersById = {};

        if (reviewerIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", reviewerIds);

          if (!profilesError && profilesData) {
            profilesById = profilesData.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {});
          } else if (profilesError) {
            console.error("Error fetching reviewer profiles:", profilesError);
          }

          const { data: seekersData, error: seekersError } = await supabase
            .from("seeker")
            .select("seeker_id, profile_picture")
            .in("seeker_id", reviewerIds);

          if (!seekersError && seekersData) {
            seekersById = seekersData.reduce((acc, s) => {
              acc[s.seeker_id] = s;
              return acc;
            }, {});
          } else if (seekersError) {
            console.error("Error fetching seeker avatars:", seekersError);
          }
        }

        const enrichedReviews = ratingsData.map((r) => ({
          ...r,
          reviewerProfile: profilesById[r.reviewer_id] || null,
          reviewerSeeker: seekersById[r.reviewer_id] || null,
        }));

        console.log("enriched reviews:", enrichedReviews);
        setReviews(enrichedReviews);
        setRatingsCount(enrichedReviews.length);

        const avg =
          enrichedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          enrichedReviews.length;

        setAverageRating(avg);
      } catch (e) {
        console.error("Exception while fetching ratings:", e);
        setReviews([]);
        setRatingsCount(0);
        setAverageRating(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeactivate = async () => {
    setConfirmModal(false);

    try {
      const response = await fetch("http://localhost:5000/api/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusModal({
          show: true,
          message: "Account deactivated successfully. Logging you out...",
          type: "success",
        });

        setTimeout(async () => {
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.href = "/login";
        }, 2500);
      } else {
        setStatusModal({
          show: true,
          message: result.message || "Failed to deactivate account.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Deactivation error:", err);
      setStatusModal({
        show: true,
        message: "Something went wrong. Please try again later.",
        type: "error",
      });
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log(" Selected file:", file);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(" No user in handleUpload:", userError);
      alert("User not found, please re-login.");
      return;
    }

    const fileName = `poster_${user.id}_${Date.now()}`;
    console.log(" Uploading as:", fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("poster-profile-pics")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error(" Upload failed:", uploadError);
      alert("Upload failed, check console.");
      return;
    }

    console.log(" Upload success:", uploadData);

    const { data: publicUrlData, error: urlError } = await supabase.storage
      .from("poster-profile-pics")
      .getPublicUrl(fileName);

    if (urlError) {
      console.error(" getPublicUrl failed:", urlError);
      alert("Could not get public URL.");
      return;
    }

    console.log(" Public URL data:", publicUrlData);

    const url = publicUrlData.publicUrl;
    console.log(" Final URL:", url);

    const { error: updateError } = await supabase
      .from("poster")
      .update({ profile_picture: url })
      .eq("poster_id", user.id);

    if (updateError) {
      console.error(" Failed to update poster.profile_picture:", updateError);
      alert("DB update failed, check console.");
      return;
    }

    console.log(" poster.profile_picture updated in DB");

    setProfile((prev) => ({ ...prev, profile_picture: url }));

    if (onAvatarChange) onAvatarChange(url);
    setShowSuccess(true);
  };

  const renderStars = (value) => {
    const stars = [];
    const rating = Number(value) || 0;

    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<FaStar key={i} className="star-icon" />);
      } else if (rating >= i - 0.5) {
        stars.push(<FaStarHalfAlt key={i} className="star-icon" />);
      } else {
        stars.push(<FaRegStar key={i} className="star-icon" />);
      }
    }

    return stars;
  };

  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="modal-content-pa"
      >
        <button onClick={onClose} className="close-btn">
          ✕
        </button>

        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading your profile...</p>
          </div>
        ) : !profile ? (
          <div className="info-box text-center">
            <p>No profile found.</p>
          </div>
        ) : (
          <div className="main-container">
            <div className="top-row">
              <div className="profile-pic-box">
                <img
                  src={
                    profile?.profile_picture ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                  }
                  alt="Profile"
                  className="profile-avatar"
                />

                <input
                  id="poster-avatar-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUpload}
                />

                <label className="upload-btn" htmlFor="poster-avatar-input">
                  Change Picture
                </label>

                <div className="rating-box">
                  {ratingsCount > 0 ? (
                    <>
                      <div className="star-row">
                        {renderStars(averageRating)}
                      </div>
                      <div className="rating-text">
                        {averageRating.toFixed(1)} / 5 ({ratingsCount} review
                        {ratingsCount > 1 ? "s" : ""})
                      </div>
                    </>
                  ) : (
                    <div className="rating-text muted">No ratings yet</div>
                  )}
                </div>
              </div>

              <div className="info-grid">
                <div className="info-box">
                  <h3>Full Name</h3>
                  <p>{profile.first_name + " " + profile.last_name}</p>
                </div>
                <div className="info-box">
                  <h3>Email</h3>
                  <p>{profile.email}</p>
                </div>
                <div className="info-box">
                  <h3>Phone #</h3>
                  <p>{profile.phone || "Not provided"}</p>
                </div>
                <div className="info-box">
                  <h3>Date of Birth</h3>
                  <p>{profile.date_of_birth}</p>
                </div>
                <div className="info-box">
                  <h3>gender</h3>
                  <p>{profile.gender}</p>
                </div>
                <div className="info-box">
                  <h3>CNIC Image</h3>
                  {profile.cnic_url ? (
                    <img
                      src={profile.cnic_url}
                      alt="CNIC"
                      className="cnic-img"
                    />
                  ) : (
                    <p>No CNIC uploaded</p>
                  )}
                </div>

                <div className="info-box">
                  <h3>Reviews</h3>
                  <div
                    className="reviews-click-area"
                    onClick={() => {
                      setShowReviewsModal(true);
                    }}
                  >
                    {reviews.length === 0 ? (
                      <p className="muted">No reviews yet.</p>
                    ) : (
                      <p>Click to see reviews ({reviews.length})</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              className="deactivate-btn"
              onClick={() => setConfirmModal(true)}
            >
              Deactivate Account
            </button>
          </div>
        )}
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="status-modal"
          >
            <div className="status-box confirm">
              <p>
                Are you sure you want to deactivate your account? <br />
                You won’t be able to log in again until reactivated. All your
                pending or accepted tasks will be Cancelled.
              </p>
              <div className="btn-group">
                <button onClick={handleDeactivate}>Yes, Deactivate</button>
                <button
                  onClick={() => setConfirmModal(false)}
                  style={{ background: "#6c757d" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {statusModal.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="status-modal"
          >
            <div
              className={`status-box ${
                statusModal.type === "success" ? "success" : "error"
              }`}
            >
              <p>{statusModal.message}</p>
              <button
                onClick={() =>
                  setStatusModal({ show: false, message: "", type: "" })
                }
              >
                OK
              </button>
            </div>
          </motion.div>
        )}

        {showReviewsModal && (
          <div className="reviews-modal-overlay">
            <div className="reviews-modal">
              <h3 className="reviews-modal-title">Reviews</h3>

              {reviews.length === 0 ? (
                <p className="muted">No reviews yet.</p>
              ) : (
                <>
                  {(showAllReviews ? reviews : reviews.slice(0, 2)).map(
                    (rev, idx) => {
                      const profile = rev.reviewerProfile;
                      const seeker = rev.reviewerSeeker;

                      const reviewerName = profile
                        ? `${profile.first_name || ""} ${
                            profile.last_name || ""
                          }`.trim()
                        : "Job Seeker";

                      const reviewerAvatar =
                        seeker?.profile_picture ||
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png"; 

                      return (
                        <div key={rev.id || idx} className="single-review">
                          <div className="single-review-header">
                            <div className="reviewer-info">
                              <img
                                src={reviewerAvatar}
                                alt={reviewerName}
                                className="reviewer-avatar"
                              />
                              <div className="reviewer-meta">
                                <div className="reviewer-name">
                                  {reviewerName}
                                </div>
                                {rev.created_at && (
                                  <div className="review-date">
                                    {new Date(
                                      rev.created_at
                                    ).toLocaleDateString("en-GB")}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="single-review-stars">
                              {renderStars(rev.rating)}
                            </div>
                          </div>

                          <p className="single-review-text">
                            {rev.review && rev.review.trim().length > 0
                              ? rev.review
                              : "(Rating only, no written review)"}
                          </p>
                        </div>
                      );
                    }
                  )}

                  {reviews.length > 2 && !showAllReviews && (
                    <button
                      className="see-more-btn"
                      onClick={() => setShowAllReviews(true)}
                    >
                      See more reviews
                    </button>
                  )}
                </>
              )}

              <button
                className="close-modal-btn"
                onClick={() => {
                  setShowReviewsModal(false);
                  setShowAllReviews(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="success-popup-overlay"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="success-popup-box"
            >
              <h3>Profile Updated!</h3>
              <p>Your profile picture has been saved successfully.</p>

              <button
                className="success-btn"
                onClick={() => setShowSuccess(false)}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="success-popup-overlay"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="success-popup-box"
            >
              <h3>Profile Updated!</h3>
              <p>Your profile picture has been saved successfully.</p>

              <button
                className="success-btn"
                onClick={() => setShowSuccess(false)}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}

        {statusModal.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="status-modal"
          >
            <div
              className={`status-box ${
                statusModal.type === "success" ? "success" : "error"
              }`}
            >
              <p>{statusModal.message}</p>
              <button
                onClick={() =>
                  setStatusModal({ show: false, message: "", type: "" })
                }
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <style>{`
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.6); /* Darker, more professional overlay */
  backdrop-filter: blur(8px);
  z-index: 9999;
}

.modal-content-pa {
  background: white; /* Solid white background */
  border-radius: 16px;
  padding: 50px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  border: 1px solid #e5e7eb;
  position: relative;
  display: flex;
  flex-direction: column;
}
  @media (max-height: 600px) {
  .modal-content {
    transform: scale(0.9);
  }
}



.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
  background: #f3f4f6;
  border: none;
  padding: 8px 12px;
  border-radius: 50%;
  transition: all 0.2s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px; /* 2rem */
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top: 4px solid #181bb7ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px; /* 1rem */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Add this new CSS */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  width: 100%;
}

.info-box {
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.info-box h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-box p {
  font-size: 16px;
  color: #1f2937;
  font-weight: 500;
  margin: 0;
}

.main-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-height: 0;
}
.top-row {
  display: grid;
  grid-template-columns: 1fr; /* Single column layout */
  gap: 20px;
  align-items: start;
}

.bottom-row {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 1rem */
}

.cnic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px; /* 1.5rem */
}

.cnic-img {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s;
}

.cnic-img:hover {
  transform: scale(1.02);
}
.deactivate-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 20px;
  margin-bottom:20px;
}

.deactivate-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}



.status-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.status-box {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 90%;
  max-width: 400px;
  border-top: 4px solid #667eea;
}
.status-box p {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}
.status-box button {
  background: #036586;
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.status-box button:hover {
  background: #02485f;
}

.status-box.success {
  border-top: 4px solid #28a745;
}
.status-box.error {
  border-top: 4px solid #dc3545;
}
.status-box.confirm {
  border-top: 4px solid #036586;
}

.btn-group {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
}

@keyframes pop {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

      `}</style>
    </div>
  );
}

export default PosterAccount;
