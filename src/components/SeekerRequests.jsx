import React, { useRef, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "../styles/SeekerRequests.css";
import { data } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import supabase from "../supabaseClient.js";

const renderStars = (rating) => {
  if (!rating) return null;

  const stars = [];
  const rounded = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded % 1 !== 0;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<FaStar key={i} />);
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(<FaStarHalfAlt key={i} />);
    } else {
      stars.push(<FaRegStar key={i} />);
    }
  }

  return stars;
};

const SeekerRequests = ({ highlightRequestId }) => {
  useEffect(() => {
    console.log("Highlighting request ID:", highlightRequestId);
  }, [highlightRequestId]);

  const [requests, setRequests] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedPosterReviews, setSelectedPosterReviews] = useState([]);
  const [selectedPosterName, setSelectedPosterName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!highlightRequestId || requests.length === 0) return;
    console.log("hid", highlightRequestId);

    const element = document.getElementById(`request-${highlightRequestId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlighted-request");

      const timer = setTimeout(() => {
        element.classList.remove("highlighted-request");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [highlightRequestId, requests]);

  useEffect(() => {
    if (!userId) return;

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("hire_requests")
        .select(
          `
        id,
        status,
        date,
        slots,
        created_at,
        poster_id,
        task_id,
        task:task_id (
          description,
          geo_location,
          services:category_id (
            title
          )
        ),
        profiles:poster_id (
          first_name,
          last_name,
          is_active,
          gender,
          date_of_birth,
          phone,
          cnic_url
        )
      `
        )
        .eq("seeker_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        setLoading(false);
        return;
      }

      const filtered = (data || []).filter((r) => r.profiles?.is_active);

      let myRatingsMap = new Map();
      try {
        const ratingsRes = await fetch(
          `http://localhost:5000/api/rating-reviews/by-reviewer/${userId}`
        );
        if (ratingsRes.ok) {
          const ratingsJson = await ratingsRes.json();
          (ratingsJson.ratings || []).forEach((rr) => {
            myRatingsMap.set(rr.task_id, rr);
          });
        }
      } catch (e) {
        console.error("Failed to fetch ratings for seeker:", e);
      }

      const posterIds = filtered.map((r) => r.poster_id);
      const { data: posters } = await supabase
        .from("poster")
        .select("poster_id, profile_picture")
        .in("poster_id", posterIds);

      const posterMap = {};
      (posters || []).forEach((p) => {
        posterMap[p.poster_id] = p.profile_picture;
      });

      let posterRatingsMap = {};
      let posterReviewsMap = {};
      if (posterIds.length > 0) {
        const { data: posterRatings, error: posterRatingsError } =
          await supabase
            .from("rating_reviews")
            .select(
              "id, reviewed_user_id, rating, review, reviewer_id, created_at"
            )
            .in("reviewed_user_id", posterIds)
            .order("created_at", { ascending: false });

        if (posterRatingsError) {
          console.error("Error fetching poster ratings:", posterRatingsError);
        } else if (posterRatings && posterRatings.length > 0) {
          const reviewerIds = [
            ...new Set(
              posterRatings.map((r) => r.reviewer_id).filter((id) => !!id)
            ),
          ];

          let profilesById = {};
          let seekerPicsById = {};
          let posterPicsById = {};

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

            const { data: seekerPics, error: seekerPicsError } = await supabase
              .from("seeker")
              .select("seeker_id, profile_picture")
              .in("seeker_id", reviewerIds);

            if (!seekerPicsError && seekerPics) {
              seekerPicsById = seekerPics.reduce((acc, s) => {
                acc[s.seeker_id] = s.profile_picture;
                return acc;
              }, {});
            } else if (seekerPicsError) {
              console.error(
                "Error fetching seeker profile pictures:",
                seekerPicsError
              );
            }

            const { data: posterPics, error: posterPicsError } = await supabase
              .from("poster")
              .select("poster_id, profile_picture")
              .in("poster_id", reviewerIds);

            if (!posterPicsError && posterPics) {
              posterPicsById = posterPics.reduce((acc, p) => {
                acc[p.poster_id] = p.profile_picture;
                return acc;
              }, {});
            } else if (posterPicsError) {
              console.error(
                "Error fetching poster profile pictures:",
                posterPicsError
              );
            }
          }

          const enrichedReviews = posterRatings.map((rr) => {
            const reviewerProfile = profilesById[rr.reviewer_id] || null;
            const reviewerName = reviewerProfile
              ? `${reviewerProfile.first_name || ""} ${
                  reviewerProfile.last_name || ""
                }`.trim()
              : "Anonymous user";
            const reviewerProfilePicture =
              seekerPicsById[rr.reviewer_id] ||
              posterPicsById[rr.reviewer_id] ||
              null;

            return {
              ...rr,
              reviewerName,
              reviewerProfilePicture,
            };
          });

          enrichedReviews.forEach((rr) => {
            const uid = rr.reviewed_user_id;
            if (!posterRatingsMap[uid]) {
              posterRatingsMap[uid] = { sum: 0, count: 0 };
              posterReviewsMap[uid] = [];
            }
            posterRatingsMap[uid].sum += rr.rating;
            posterRatingsMap[uid].count += 1;
            posterReviewsMap[uid].push(rr);
          });
        }
      }

      const activeRequests =
        filtered.map((r) => {
          const ratingAgg = posterRatingsMap[r.poster_id];
          let posterRating = null;
          if (ratingAgg && ratingAgg.count > 0) {
            posterRating = {
              average: ratingAgg.sum / ratingAgg.count,
              count: ratingAgg.count,
            };
          }

          return {
            ...r,
            task_description: r.task?.description || "",
            task_category: r.task?.services?.title || "",
            task_location: r.task?.geo_location || "",
            poster_profile_picture: posterMap[r.poster_id] || null,
            ratingReview: myRatingsMap.get(r.task_id) || null,
            posterRating,
            posterReviews: posterReviewsMap[r.poster_id] || [],
          };
        }) || [];

      setRequests(activeRequests);
      setLoading(false);
    };

    fetchRequests();
  }, [userId]);

  const handleResponse = async (requestId, posterId, response) => {
    try {
      const res = await fetch("http://localhost:5000/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hire_request_id: requestId,
          seeker_id: userId,
          poster_id: posterId,
          response,
        }),
      });

      const result = await res.json();

      console.log("result", result);
      if (result.conflict) {
        setModalMessage(result.message);
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: result.hire_request?.[0]?.status || response }
            : r
        )
      );
    } catch (err) {
      console.error("Error updating request:", err);
    }
  };

  if (loading) {
    return (
      <div className="seeker-loader">
        <div className="loader-spinner"></div>
        <p>Loading your requests...</p>

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
          // margin-left: 500px;
          // margin-top: 200px;
          // background-color: #dbf0f5;
          font-style: italic;
          font-size: 18px;
          color: #036586;
        }
      `}</style>
      </div>
    );
  }

  const handleMessage = (req) => {
    navigate(`/messages/${req.id}`, { state: { request: req } });
  };

  const handleProvideRating = (req) => {
    navigate("/provide-rating", {
      state: {
        taskId: req.task_id,
        posterId: req.poster_id,
        posterName:
          `${req.profiles?.first_name || ""} ${
            req.profiles?.last_name || ""
          }`.trim() || "User",
        existingRating: req.ratingReview?.rating || null,
        existingReview: req.ratingReview?.review || "",
        returnTo: "/seeker-dashboard",
      },
    });
  };

  const handleViewPosterReviews = (req) => {
    setSelectedPosterReviews(req.posterReviews || []);
    setSelectedPosterName(
      `${req.profiles?.first_name || ""} ${
        req.profiles?.last_name || ""
      }`.trim() || "Poster"
    );
    setShowReviewsModal(true);
  };

  const handleReportComplaint = (req) => {
    navigate(`/report-complaint`, {
      state: {
        requestId: req.id,
        taskId: req.task_id,
        posterId: req.poster_id,
        posterName: `${req.profiles?.first_name || ""} ${
          req.profiles?.last_name || ""
        }`,
      },
    });
  };

  const Modal = ({ message, type = "info", onClose }) => {
    if (!message) return null;

    return (
      <div className="modal-overlay">
        <div
          className={`modal-content ${type === "error" ? "error-modal" : ""}`}
        >
          <div className="modal-left">
            {type === "error" ? "Error" : "Info"}
          </div>
          <div className="modal-right">
            <p>{message}</p>
            <div className="modal-buttons">
              <button className="allow-btn" onClick={onClose}>
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredRequests =
    filterStatus === "all"
      ? requests
      : requests.filter((r) => r.status === filterStatus);

  return (
    <div className="seeker-requests-container">
      <div className="seeker-requests-header">
        <h2 className="seeker-requests-title">Hire Requests</h2>
        <div className="seeker-requests-count">
          {filteredRequests.length} request
          {filteredRequests.length !== 1 ? "s" : ""}
          {filterStatus !== "all" && ` (${filterStatus})`}
        </div>
      </div>

      <div className="seeker-requests-filters">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${
              filterStatus === "pending" ? "active" : ""
            }`}
            onClick={() => setFilterStatus("pending")}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${
              filterStatus === "accepted" ? "active" : ""
            }`}
            onClick={() => setFilterStatus("accepted")}
          >
            Accepted
          </button>
          <button
            className={`filter-btn ${
              filterStatus === "completed" ? "active" : ""
            }`}
            onClick={() => setFilterStatus("completed")}
          >
            Completed
          </button>

          <button
            className={`filter-btn ${
              filterStatus === "rejected" ? "active" : ""
            }`}
            onClick={() => setFilterStatus("rejected")}
          >
            Rejected
          </button>
          <button
            className={`filter-btn ${
              filterStatus === "cancelled" ? "active" : ""
            }`}
            onClick={() => setFilterStatus("cancelled")}
          >
            Cancelled
          </button>
        </div>
      </div>

      {requests.length === 0 || filteredRequests.length === 0 ? (
        <div className="seeker-requests-empty">
          <div className="seeker-requests-empty-icon"></div>
          <p style={{ color: "black" }}>No requests yet.</p>
          <p style={{ color: "black" }} className="seeker-requests-empty-sub">
            When posters send you hire requests, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="seeker-requests-list">
          {filteredRequests.map((r) => (
            <div
              key={r.id}
              id={`request-${r.task_id}`}
              className={`seeker-request-card ${
                r.task_id === highlightRequestId ? "highlighted-request" : ""
              }`}
            >
              <div className="seeker-request-content">
                <div className="seeker-request-header">
                  <h3 className="seeker-request-poster">
                    Request from {r.profiles?.first_name}{" "}
                    {r.profiles?.last_name}
                  </h3>
                  <span className={`seeker-request-status status-${r.status}`}>
                    {r.status}
                  </span>
                </div>

                <div className="seeker-request-main-content">
                  <div className="task-details">
                    <h4 className="task-section-title">Task Details</h4>
                    <div className="task-details-grid">
                      <div className="task-detail-item">
                        <span className="detail-label">Date</span>
                        <span className="detail-value">{r.date}</span>
                      </div>

                      <div className="task-detail-item slots-item">
                        <span className="detail-label">Time Slots</span>
                        <div className="slots-container">
                          {Array.isArray(r.slots) ? (
                            r.slots.map((slot, idx) => (
                              <span key={idx} className="slot-pill">
                                {slot}
                              </span>
                            ))
                          ) : (
                            <span className="slot-pill">{r.slots}</span>
                          )}
                        </div>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">
                          {r.task_description}
                        </span>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Category</span>
                        <span className="category-badge">
                          {r.task_category}
                        </span>
                      </div>

                      <div className="task-detail-item">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">
                          {r.task_location || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="poster-details">
                    <h4 className="poster-section-title">Poster Information</h4>

                    <div className="poster-profile-header">
                      <img
                        src={
                          r.poster_profile_picture ||
                          "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
                        }
                        alt="Profile"
                        className="poster-profile-pic"
                      />
                      <div className="poster-name">
                        <div className="poster-full-name">
                          {r.profiles?.first_name} {r.profiles?.last_name}
                        </div>
                        <div className="poster-contact">
                          Click CNIC to verify identity
                        </div>
                      </div>
                    </div>

                    <div className="poster-info-grid">
                      <div className="poster-info-item">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value">
                          {r.profiles?.gender || "-"}
                        </span>
                      </div>

                      <div className="poster-info-item">
                        <span className="detail-label">Date of Birth</span>
                        <span className="detail-value">
                          {r.profiles?.date_of_birth || "-"}
                        </span>
                      </div>

                      <div className="poster-info-item">
                        <span className="detail-label">Phone #</span>
                        <span className="detail-value">
                          {r.profiles?.phone || "-"}
                        </span>
                      </div>

                      <div className="poster-info-item">
                        <span className="detail-label">CNIC Verification</span>
                        {r.profiles?.cnic_url ? (
                          <a
                            href={r.profiles.cnic_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cnic-link"
                          >
                            View CNIC
                          </a>
                        ) : (
                          <span className="detail-value">Not uploaded</span>
                        )}
                      </div>

                      <div className="poster-rating-summary">
                        <span className="detail-label">Rating</span>
                        {r.posterRating ? (
                          <>
                            <span className="detail-value">
                              {r.posterRating.average.toFixed(1)} / 5 (
                              {r.posterRating.count} review
                              {r.posterRating.count !== 1 ? "s" : ""})
                            </span>
                            <button
                              type="button"
                              className="poster-reviews-link"
                              onClick={() => handleViewPosterReviews(r)}
                            >
                              View reviews
                            </button>
                          </>
                        ) : (
                          <span className="detail-value">No ratings yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="seeker-request-actions">
                  {r.status === "pending" ? (
                    <div className="seeker-request-buttons">
                      <button
                        onClick={() =>
                          handleResponse(r.id, r.poster_id, "accepted")
                        }
                        className="seeker-request-btn seeker-request-btn-accept"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() =>
                          handleResponse(r.id, r.poster_id, "rejected")
                        }
                        className="seeker-request-btn seeker-request-btn-reject"
                      >
                        Decline
                      </button>
                    </div>
                  ) : r.status === "accepted" ? (
                    <div className="seeker-request-buttons">
                      <button
                        onClick={() => handleMessage(r)}
                        className="seeker-request-btn seeker-request-btn-message"
                      >
                        Message
                      </button>
                    </div>
                  ) : r.status === "completed" ? (
                    <div className="seeker-request-buttons">
                      <p className="seeker-request-feedback-text">
                        This task is marked as completed.
                      </p>

                      <button
                        onClick={() => handleProvideRating(r)}
                        className="seeker-request-btn seeker-request-btn-rating"
                      >
                        {r.ratingReview
                          ? "Edit Rating & Review"
                          : "Provide Rating & Review"}
                      </button>

                      <button
                        onClick={() => handleReportComplaint(r)}
                        className="seeker-request-btn seeker-request-btn-complaint"
                      >
                        Report a complaint
                      </button>
                    </div>
                  ) : r.status === "timed out" ? (
                    <div className="seeker-request-feedback">
                      <p>Time for accepting this task has passed</p>
                    </div>
                  ) : (
                    <div className="seeker-request-feedback">
                      <p>You've {r.status} this request</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {showReviewsModal && (
            <div className="reviews-modal-overlay">
              <div className="reviews-modal-content">
                <h3>Reviews for {selectedPosterName}</h3>

                {selectedPosterReviews.length === 0 ? (
                  <p>No reviews yet.</p>
                ) : (
                  <ul className="reviews-list">
                    {selectedPosterReviews.map((rev) => {
                      const reviewerName = rev.reviewerName || "Anonymous user";
                      const reviewerAvatar =
                        rev.reviewerProfilePicture ||
                        "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg";

                      return (
                        <li key={rev.id} className="review-item">
                          <div className="reviewer-header">
                            <img
                              src={reviewerAvatar}
                              alt={reviewerName}
                              className="reviewer-avatar"
                            />
                            <div className="reviewer-info">
                              <div className="reviewer-name">
                                {reviewerName}
                              </div>
                              <div className="review-rating-stars">
                                {renderStars(rev.rating)}
                                <span className="numeric-rating">
                                  {rev.rating}/5
                                </span>
                              </div>
                            </div>
                          </div>

                          {rev.review && (
                            <p className="review-text">{rev.review}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <button
                  className="close-reviews-btn"
                  onClick={() => setShowReviewsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <Modal
        message={modalMessage}
        type={modalMessage.includes("conflict") ? "error" : "Conflict"}
        onClose={() => setModalMessage("")}
      />
    </div>
  );
};

export default SeekerRequests;
