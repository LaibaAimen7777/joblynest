import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "../styles/fallbackProfile.css";
import "../styles/SeekerProfile.css";
import { motion } from "framer-motion";
import {
  FaUser,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaClock,
  FaFileAlt,
  FaPhone,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa";
import supabase from "../supabaseClient.js";

const makeValueFromTitle = (title) =>
  title
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

const SeekerProfile = ({setSelectedView}) => {
  const [profile, setProfile] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryBySlug, setCategoryBySlug] = useState({});
  const [averageRating, setAverageRating] = useState(null);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);


  const [profile_picture, setProfilePic] = useState(
    "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
  );
  const navigate = useNavigate();

  const getCategoryLabel = (value) => {
    if (!value) return "Not specified";
    if (categoryBySlug[value]) return categoryBySlug[value];

    if (value === "other") return "Other";
    return value;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("services").select("title");

      if (error) {
        console.error("Error fetching services:", error);
        return;
      }

      const map = {};
      (data || []).forEach((row) => {
        const slug = makeValueFromTitle(row.title);
        map[slug] = row.title;
      });

      setCategoryBySlug(map);
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User fetch error:", userError?.message);
        setLoading(false);
        return;
      }

      const { data: seekerData } = await supabase
        .from("seeker")
        .select("*")
        .eq("seeker_id", user.id)
        .single();

      const { data: ProfileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single();

      if (!seekerData || !ProfileData) {
        setLoading(false);
        return;
      }

      setProfile(seekerData);
      setUserInfo(ProfileData);

      try {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("rating_reviews")
          .select(
            `
      id,
      rating,
      review,
      created_at,
      reviewer_id,
      reviewer_profile:profiles!rating_reviews_reviewer_id_fkey (
        id,
        first_name,
        last_name,
        user_type
      )
    `
          )
          .eq("reviewed_user_id", seekerData.seeker_id);

        if (ratingsError) {
          console.error("Error fetching ratings:", ratingsError);
        } else if (ratingsData && ratingsData.length > 0) {

          const reviewerIds = [
            ...new Set(ratingsData.map((r) => r.reviewer_id).filter(Boolean)),
          ];

          let seekerPics = [];
          let posterPics = [];

          if (reviewerIds.length > 0) {
            const { data: seekerPicRows, error: seekerPicError } =
              await supabase
                .from("seeker")
                .select("seeker_id, profile_picture")
                .in("seeker_id", reviewerIds);

            if (seekerPicError) {
              console.error("Error fetching seeker pics:", seekerPicError);
            } else {
              seekerPics = seekerPicRows || [];
            }

            const { data: posterPicRows, error: posterPicError } =
              await supabase
                .from("poster")
                .select("poster_id, profile_picture")
                .in("poster_id", reviewerIds);

            if (posterPicError) {
              console.error("Error fetching poster pics:", posterPicError);
            } else {
              posterPics = posterPicRows || [];
            }
          }


          const seekerPicById = Object.fromEntries(
            seekerPics.map((s) => [s.seeker_id, s.profile_picture])
          );
          const posterPicById = Object.fromEntries(
            posterPics.map((p) => [p.poster_id, p.profile_picture])
          );

          const hydratedReviews = ratingsData.map((r) => {
            const uid = r.reviewer_id;
            const profilePicture =
              seekerPicById[uid] || posterPicById[uid] || null;

            return {
              ...r,
              reviewerProfilePicture: profilePicture,
            };
          });

          setReviews(hydratedReviews);
          setRatingsCount(hydratedReviews.length);

          const avg =
            hydratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
            hydratedReviews.length;

          setAverageRating(avg);
        } else {
          setReviews([]);
          setRatingsCount(0);
          setAverageRating(null);
        }
      } catch (e) {
        console.error("Exception while fetching ratings:", e);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);
  useEffect(() => {
  const fetchCompletedBadge = async () => {
    if (!profile?.seeker_id) return;

    const { count, error } = await supabase
      .from("hire_requests")
      .select("id", { count: "exact" })
      .eq("seeker_id", profile.seeker_id)
      .eq("status", "completed");

    if (!error) setCompletedCount(count ?? 0);
  };

  fetchCompletedBadge();
}, [profile?.seeker_id]);


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

  if (loading) {
    return (
      <div className="seeker-loader">
        <div className="loader-spinner"></div>
        <p>Loading your profile...</p>

        <style>{`
      
        .loader-spinner {
          border: 6px solid #e0e0e0;
          border-top: 6px solid #036586;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          margin-left: 500px;
          margin-top: 200px;
          animation: spin 1s linear infinite;
        }
          .seeker-loader p {
          margin-left: 450px;
          }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .seeker-loader {
          height: 100vh;
          width:1000px;
          // display: flex;
          // flex-direction: column;
          // justify-content: center;
          // align-items: center;
          margin-left:0px;
          margin-top:0px;
          // background-color: #dbf0f5;
          font-style: italic;
          font-size: 18px;
          color: #036586;
        }
      `}</style>
      </div>
    );
  }

  if (
    !profile ||
    !userInfo ||
    !profile.geo_location ||
    !profile.main_category ||
    !profile.description
  ) {
    return (
      <div
        className="seeker-bg"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div
          className="big-profile-wrapper fallback-mode"
          style={{ width: "100%" }}
        >
          <section
            className="fallback-full-bleed"
            style={{ width: "100%", backgroundColor: "#ffffffff" }}
          >
            <div className="fallback-content" style={{ textAlign: "center" }}>
              <h2>Your Seeker Profile is Not Set Yet</h2>
              <p>To continue, please complete your profile information.</p>
              <button
                onClick={() =>{
                  console.log("btn clicked")
                  if (typeof setSelectedView === "function") {
                    setSelectedView("editProfile")
                  }
                  }
                }
              >
                Set Profile Now
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const availability = profile.availability || {};
  const availableDates =
    availability && typeof availability === "object"
      ? Object.entries(availability).filter(
          ([, slots]) => slots && Array.isArray(slots) && slots.length > 0
        )
      : [];

  return (
    <>
      <style>
        {`
  /* ---- Wrapper with subtle animated gradient ---- */
  .profile-wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    padding: 20px;
    background: linear-gradient(135deg, #e6f2fb, #f4f8fc, #f9fbfd);
    background-size: 200% 200%;
    animation: gradientShift 18s ease infinite;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* Content box */
  .fiverr-style-profile {
    width: 1000px;
    // max-width: none;
    padding: 20px 28px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    box-shadow: 0 10px 28px rgba(0, 60, 120, 0.15);
    border: 1px solid rgba(220, 230, 245, 0.6);
    font-family: 'Inter', sans-serif;
    color: #1a2a3a;
    animation: fadeIn 1s ease forwards;
    margin-left:10px;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Header */
  .profile-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 32px;
  }

  .profile-avatar {
    width: 130px;
    height: 130px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid rgba(0, 120, 255, 0.35);
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    animation: floaty 5s ease-in-out infinite;
  }

  @keyframes floaty {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  .profile-main-info .profile-name {
    font-size: 28px;
    margin: 0;
    font-weight: 700;
    background: linear-gradient(90deg, #004aad, #0098e6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .profile-category {
    font-size: 16px;
    font-weight: 600;
    color: #006699;
    margin: 6px 0;
  }

  .profile-desc {
    font-size: 15px;
    color: #3d4b5c;
    line-height: 1.6;
    max-width: 640px;
  }

  /* Stacked column for Payrate + CV */
  .new {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 18px;
  }
  .new .info-card { flex: 1; }

  /* Cards Section */
  .profile-info-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 18px;
  }

  .info-card {
    display: flex;
    flex-direction: column;
    align-items:center;
    padding: 20px;
    text-align: center;
    gap: 10px;
    background: linear-gradient(145deg, #ffffff, #f7fafd);
    border: 1px solid rgba(200, 220, 240, 0.7);
    border-radius: 14px;
    box-shadow: 0 4px 12px rgba(0, 40, 80, 0.06);
    transition: all 0.25s ease;
  }

  .info-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 80, 160, 0.12);
  }

  .info-card h3 {
    font-size: 15px;
    font-weight: 600;
    color: #1f3d5c;
    margin-bottom: 6px;
  }

  .info-card span,
  .info-card p,
  .info-card a {
  
    font-size: 14px;
    color: #334a66;
    text-decoration: none;
  }

  .info-card a {
    color: #006bb3;
    font-weight: 500;
  }
  .info-card a:hover {
    color: #0094e0;
    text-decoration: underline;
  }

  /* Availability labels */
  .availability-cardd div strong {
    font-weight: 600;
    color: #004080;
    margin-right: 6px;
  }

  .time-slott span {
    background: #e6f2fb;
    color: #025c91;
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 12px;
    margin: 3px;
    display: inline-block;
    animation: popIn 0.4s ease forwards;
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.85); }
    to { opacity: 1; transform: scale(1); }
  }

  .muted {
    color: #7a8799;
    font-style: italic;
  }

  
  `}
      </style>

      <div className="fiverr-style-profile">
        <div className="profile-header">
          <img
            src={profile?.profile_picture || profile_picture}
            alt="Profile"
            className="profile-avatar"
          />
          <div className="profile-main-info">
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <h1 className="profile-name" style={{ margin: 0 }}>
    {userInfo.first_name} {userInfo.last_name}
  </h1>

{completedCount >= 10 ? (
  <div className="badge">⭐⭐ Elite Level 2</div>
) : completedCount >= 5 ? (
  <>
    <div className="badge">⭐ Elite Level 1</div>
    <div
      className="elite-hint"
      style={{
        fontSize: "13px",
        color: "#020508",
        fontStyle: "italic",
        background: "#f1f5f9",
        padding: "6px 10px",
        borderRadius: "999px",
        border: "1px solid #e2e8f0",
        marginTop: "4px",
      }}
    >
      Complete {10 - completedCount} more task
      {10 - completedCount !== 1 ? "s" : ""} to unlock Elite Level 2
    </div>
  </>
) : (
  <div
    className="elite-hint"
    style={{
      fontSize: "13px",
      color: "#64748b",
      fontStyle: "italic",
      background: "#f1f5f9",
      padding: "6px 10px",
      borderRadius: "999px",
      border: "1px solid #e2e8f0",
    }}
  >
    Complete {5 - completedCount} more task
    {5 - completedCount !== 1 ? "s" : ""} to unlock Elite Level 1
  </div>
)}
</div>
            <div className="profile-rating-row">
              {ratingsCount > 0 ? (
                <>
                  <div className="profile-stars">
                    {renderStars(averageRating)}
                  </div>
                  <span className="rating-number">
                    {averageRating.toFixed(1)} / 5 &nbsp; ({ratingsCount} review
                    {ratingsCount > 1 ? "s" : ""})
                  </span>
                </>
              ) : (
                <span className="rating-number muted">No ratings yet</span>
              )}
            </div>

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
                          const reviewer = rev.reviewer_profile || {}; 
                          const reviewerName =
                            `${reviewer.first_name || ""} ${
                              reviewer.last_name || ""
                            }`.trim() || "Job Poster";

                          const reviewerAvatar =
                            rev.reviewerProfilePicture || 
                            "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg";

                          return (
                            <div key={rev.id || idx} className="single-review">
                              <div className="single-review-header">
                                <div className="reviewer-info">
                                  <img
                                    src={reviewerAvatar}
                                    alt={reviewerName}
                                    className="reviewer-avatar"
                                  />
                                  <span className="reviewer-name">
                                    {reviewerName}
                                  </span>
                                </div>
                                <div className="single-review-stars">
                                  {renderStars(rev.rating)}
                                </div>
                                {rev.created_at && (
                                  <span className="review-date">
                                    {new Date(
                                      rev.created_at
                                    ).toLocaleDateString("en-GB")}
                                  </span>
                                )}
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

            <h3 className="profile-category">
              {getCategoryLabel(profile.main_category)}
            </h3>

            <p className="profile-desc">{profile.description}</p>
          </div>
        </div>

        <div className="profile-info-cards">
          <div className="info-card">
            <FaMapMarkerAlt />
            <span>{profile.geo_location}</span>
          </div>

          <div className="new">
            <div className="info-card">
              <FaMoneyBillWave />
              <span>{profile.pay_rate} PKR / Hr</span>
            </div>
            <div className="info-card">
              <FaMoneyBillWave />
              <span>{profile.payment_type || "Not specified"}</span>
            </div>
            <div className="info-card">
              <FaFileAlt />
              <div>
                {profile.cv_document ? (
                  <a
                    href={profile.cv_document}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View / Download CV
                  </a>
                ) : (
                  <p className="muted">No CV uploaded</p>
                )}
              </div>
            </div>
          </div>

          <div className="info-card availability-cardd">
            <FaClock />
            <div>
              {availableDates.length === 0 ? (
                <p className="muted">No availability set</p>
              ) : (
                availableDates.map(([date, slots]) => (
                  <div key={date} className="day-section">
                    <strong>{date}</strong>
                    <div className="time-slott">
                      {slots.map((slot, i) => (
                        <span key={i}>
                          {slot.start}–{slot.end}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="info-card reviews-card">
            <h3 className="reviews-title">Reviews</h3>
            <div
              className="reviews-box"
              onClick={() => {
                if (reviews.length > 0) {
                  setShowReviewsModal(true);
                }
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
    </>
  );
};

export default SeekerProfile;
