import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import supabase from "../supabaseClient";
import "react-calendar/dist/Calendar.css";
import "../styles/SeekerDetails.css";
import "../styles/ExploreSeekerDetail.css";
import Loader from "../components/Loader";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";


function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const makeValueFromTitle = (title) =>
  title
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

function expandWeeklyPattern(weeklyPattern) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const nextMonthAvailability = {};
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = toLocalDateKey(new Date(d));
    const weekday = days[d.getDay()];
    nextMonthAvailability[dateStr] = weeklyPattern[weekday]
      ? [...weeklyPattern[weekday]]
      : [];
  }

  return nextMonthAvailability;
}

function expandSlots(slots) {
  const hours = [];
  slots.forEach(({ start, end }) => {
    const [startH] = start.split(":").map(Number);
    const [endH] = end.split(":").map(Number);
    for (let h = startH; h < endH; h++) {
      const from = `${h.toString().padStart(2, "0")}:00`;
      const to = `${(h + 1).toString().padStart(2, "0")}:00`;
      hours.push({ start: from, end: to });
    }
  });
  return hours;
}

const areSlotsConsecutive = (slotsForDate) => {
  if (slotsForDate.length <= 1) return true;
  const sorted = [...slotsForDate].sort((a, b) => a.slot.localeCompare(b.slot));
  for (let i = 0; i < sorted.length - 1; i++) {
    const [currStart, currEnd] = sorted[i].slot.split("-");
    const [nextStart] = sorted[i + 1].slot.split("-");
    if (currEnd !== nextStart) return false;
  }
  return true;
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

const Modal = ({ open, type, message, onClose }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className={`modal-content ${type}`}>
        <p>{message}</p>
        <button className="modal-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

const SeekerDetailCommon = ({
  seeker_id,
  task_id = null,
  mode = "explore",
  onHireSuccess = null,
}) => {
  const navigate = useNavigate();

  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [posterId, setPosterId] = useState(null);
  const [totalPayInfo, setTotalPayInfo] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [isHireDone, setIsHireDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState("info");
  const [categoryBySlug, setCategoryBySlug] = useState({});
  const [averageRating, setAverageRating] = useState(null);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [bookedSlotsMap, setBookedSlotsMap] = useState({});

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("services").select("title");

      if (error) {
        console.error("Error fetching services:", error);
        return;
      }

      const bySlug = {};

      (data || []).forEach((row) => {
        const slug = makeValueFromTitle(row.title);
        bySlug[slug] = row.title;
      });

      setCategoryBySlug(bySlug);
    };

    fetchCategories();
  }, []);

  const mapCategory = (mainCategorySlug) => {
    if (mainCategorySlug && categoryBySlug[mainCategorySlug]) {
      return categoryBySlug[mainCategorySlug];
    }

    return mainCategorySlug || "Other";
  };

  const showModal = (msg, type = "info") => {
    setModalMsg(msg);
    setModalType(type);
    setModalOpen(true);
  };

  useEffect(() => {
    (async () => {
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) console.error("Error getting session:", error);
      if (sessionData?.session?.user) {
        setPosterId(sessionData.session.user.id);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!seeker?.seeker_id) return;

      const { data, error } = await supabase
        .from("hire_requests")
        .select("date, slots")
        .eq("seeker_id", seeker.seeker_id)
        .eq("status", "accepted");

      console.log("slots data", data);

      if (error) {
        console.error("Error fetching booked slots:", error);
        return;
      }

      const map = {};

      data.forEach((row) => {
        const dateKey = row.date;

        if (!map[dateKey]) {
          map[dateKey] = new Set();
        }

        (row.slots || []).forEach((slot) => {
          map[dateKey].add(slot);
        });
      });

      // convert Set → Array
      const normalized = {};
      Object.keys(map).forEach((d) => {
        normalized[d] = Array.from(map[d]);
      });

      console.log("normalized", normalized);
      setBookedSlotsMap(normalized);
    };

    fetchBookedSlots();
  }, [seeker?.seeker_id]);

  useEffect(() => {
    const fetchSeekerAndRecommendations = async () => {
      setLoading(true);
      setSeeker(null);
      setError("");
      setSelectedDate(null);
      setSelectedSlots([]);
      setIsHireDone(false);

      try {
        const res = await fetch(
          `http://localhost:5000/api/fetchSeekerById/${seeker_id}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch seeker");

        const expandedAvailability = data.availability
          ? expandWeeklyPattern(data.availability)
          : {};
        const seekerObj = { ...data, availability: expandedAvailability };
        setSeeker(seekerObj);

        if (seekerObj.seeker_id) {
          const recRes = await fetch(
            `http://localhost:5000/api/recommendations/${seekerObj.seeker_id}`
          );
          const recData = await recRes.json();
          setRecommendations(
            recRes.ok && Array.isArray(recData.recommendations)
              ? recData.recommendations
              : []
          );
        } else {
          setRecommendations([]);
        }
      } catch (err) {
        setError(err.message);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeekerAndRecommendations();
  }, [seeker_id]);

  useEffect(() => {
    const fetchCompletedBadge = async () => {
      if (!seeker?.seeker_id) return;
      const { data, count, error } = await supabase
        .from("hire_requests")
        .select("id", { count: "exact" })
        .eq("seeker_id", seeker.seeker_id)
        .eq("status", "completed");

      if (!error) {
        setCompletedCount(count ?? (data?.length || 0));
      }
    };
    fetchCompletedBadge();
  }, [seeker?.seeker_id]);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!seeker?.seeker_id) return;

      try {

        const { data, error } = await supabase
          .from("rating_reviews")
          .select("id, rating, review, created_at, reviewer_id")
          .eq("reviewed_user_id", seeker.seeker_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching seeker ratings:", error);
          setAverageRating(null);
          setRatingsCount(0);
          setReviews([]);
          return;
        }

        if (!data || data.length === 0) {
          setReviews([]);
          setRatingsCount(0);
          setAverageRating(null);
          return;
        }

        const reviewerIds = [
          ...new Set(data.map((r) => r.reviewer_id).filter((id) => !!id)),
        ];

        let profilesById = {};
        let postersById = {};

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

        
          const { data: postersData, error: postersError } = await supabase
            .from("poster")
            .select("poster_id, profile_picture")
            .in("poster_id", reviewerIds);

          if (!postersError && postersData) {
            postersById = postersData.reduce((acc, p) => {
              acc[p.poster_id] = p;
              return acc;
            }, {});
          } else if (postersError) {
            console.error("Error fetching poster avatars:", postersError);
          }
        }

        const enrichedReviews = data.map((r) => ({
          ...r,
          reviewerProfile: profilesById[r.reviewer_id] || null,
          reviewerPoster: postersById[r.reviewer_id] || null,
        }));

        setReviews(enrichedReviews);
        setRatingsCount(enrichedReviews.length);

        const avg =
          enrichedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          enrichedReviews.length;

        setAverageRating(avg);
      } catch (e) {
        console.error("Exception while fetching seeker ratings:", e);
        setReviews([]);
        setRatingsCount(0);
        setAverageRating(null);
      }
    };

    fetchRatings();
  }, [seeker?.seeker_id]);

  useEffect(() => {
    if (seeker?.pay_rate && selectedSlots.length > 0) {
      const hours = selectedSlots.length;
      const totalPay = seeker.pay_rate * hours;
      setTotalPayInfo(
        `You will pay Rs. ${totalPay} for ${hours} hour${
          hours > 1 ? "s" : ""
        } at Rs. ${seeker.pay_rate}/hr`
      );
    } else {
      setTotalPayInfo("");
    }
  }, [selectedSlots, seeker?.pay_rate]);

  const handleHire = async () => {
    if (selectedSlots.length === 0) {
      showModal("Please select at least one slot.", "error");
      return;
    }

    const grouped = selectedSlots.reduce((acc, s) => {
      acc[s.date] = acc[s.date] ? [...acc[s.date], s] : [s];
      return acc;
    }, {});

    for (const dateKey in grouped) {
      if (!areSlotsConsecutive(grouped[dateKey])) {
        showModal(`Please select consecutive slots for ${dateKey}.`, "error");
        return;
      }
    }

    if (!posterId) {
      showModal(
        "Poster account not ready yet. Please wait or refresh the page.",
        "error"
      );
      return;
    }
    if (!seeker?.seeker_id) {
      showModal("Seeker UUID not found. Cannot create request.", "error");
      return;
    }

    if (mode === "recommendation") {
      try {
        const checkRes = await fetch(
          `http://localhost:5000/api/check-hire-request/${task_id}`
        );
        const checkData = await checkRes.json();
        if (checkData.exists) {
          showModal("A seeker is already selected for this task.", "error");
          return;
        }
      } catch (err) {
        console.error("Error checking hire request:", err);
        showModal("Server error while checking hire request.", "error");
        return;
      }
    }

    const earliestDate = selectedSlots
      .map((s) => s.date)
      .sort((a, b) => a.localeCompare(b))[0];

    if (mode === "explore") {
      navigate("/explore-create-task", {
        state: {
          seeker: seeker,
          selectedSlots: selectedSlots,
          earliestDate: earliestDate,
        },
      });
    } else {
      try {
        const res = await fetch("http://localhost:5000/api/hire-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seeker_id: seeker.seeker_id,
            poster_id: posterId,
            slots: selectedSlots,
            task_id: task_id,
          }),
        });

        const result = await res.json();
        if (result.error) {
          showModal(`${result.error}`, "error");
        } else {
          showModal("Hire request sent successfully!", "success");
          setIsHireDone(true);
          if (onHireSuccess) onHireSuccess();
          navigate("/poster-my-tasks");
          setSelectedSlots([]);
        }
      } catch (err) {
        showModal("Failed to send hire request.", "error");
      }
    }
  };

  if (loading) return <Loader message="Loading seeker..." />;
  if (error) return <p className="seeker-detail-error">{error}</p>;
  if (!seeker) return <p className="seeker-detail-no-data">No seeker found.</p>;

  const getNavigationPath = (rec) => {
    return mode === "explore"
      ? `/explore-seeker-details/${rec.seeker_id}`
      : `/seeker-details/${rec.seeker_id}/${task_id}`;
  };

  const hasTextReviews = reviews.some(
    (r) => r.review && r.review.trim().length > 0
  );

  return (
    <div
      style={{
        backgroundColor: "#deedfaff",
        minHeight: "100vh",
        padding: "2rem 0",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="seeker-detail-container">
        <div className="seeker-detail-card">
          <div className="seeker-detail-header">
            <div className="dp-column">
              <img
                src={
                  seeker.profile_picture ||
                  "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
                }
                alt="Seeker"
                className="seeker-detail-avatar"
              />
              {seeker.cv_document && (
                <a
                  href={seeker.cv_document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="seeker-cv-button"
                >
                  📄 View CV
                </a>
              )}

              {ratingsCount > 0 && (
                <button
                  type="button"
                  className="seeker-cv-button"
                  style={{ marginTop: "8px", cursor: "pointer" }}
                  onClick={() => setShowReviewsModal(true)}
                >
                  ⭐ View Reviews ({ratingsCount})
                </button>
              )}
            </div>

            <div className="seeker-detail-info">
              <div className="seeker-detail-name-cat">
                <div className="seeker-name-rating">
                  <h2>
                    {seeker.profile?.first_name} {seeker.profile?.last_name}
                  </h2>

                  {ratingsCount > 0 && (
                    <div className="seeker-rating-row">
                      {renderStars(averageRating)}
                      <span className="seeker-rating-text">
                        {averageRating.toFixed(1)} / 5 ({ratingsCount} review
                        {ratingsCount > 1 ? "s" : ""})
                      </span>
                    </div>
                  )}
                </div>

             {completedCount >= 10 ? (
  <div className="badge">⭐⭐ Elite Level 2</div>
) : completedCount >= 5 ? (
  <div className="badge">⭐ Elite Level 1</div>
) : null}


                <p className="seeker-detail-category">
                  {mapCategory(seeker.main_category)}
                </p>
              </div>

              <p className="seeker-detail-pay">
                {seeker.pay_rate
                  ? `${seeker.pay_rate} PKR/hr`
                  : "Rate not specified"}
                <span
                  style={{
                    marginLeft: "10px",
                    fontSize: "14px",
                    opacity: 0.85,
                  }}
                >
                  • {seeker.payment_type || "Payment not specified"}
                </span>
              </p>
            </div>
          </div>

          {seeker.description && (
            <p className="seeker-detail-description">{seeker.description}</p>
          )}

          <div className="profile-info-section">
            <h3>Profile Information</h3>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="profile-detail-label">Full Name</span>
                <span className="profile-detail-value">
                  {seeker.profile?.first_name} {seeker.profile?.last_name}
                  {seeker.profile?.date_of_birth && (
                    <span className="age-badge">
                      {calculateAge(seeker.profile.date_of_birth)} years old
                    </span>
                  )}
                </span>
              </div>

              <div className="profile-detail-item">
                <span className="profile-detail-label">Gender</span>
                <span className="profile-detail-value">
                  {seeker.profile?.gender || "Not specified"}
                </span>
              </div>

              {seeker.profile?.date_of_birth && (
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Date of Birth</span>
                  <span className="profile-detail-value">
                    {new Date(
                      seeker.profile.date_of_birth
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}

              {seeker.geo_location && (
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Location</span>
                  <div className="profile-location">
                    <span>📍</span>
                    <span className="profile-detail-value">
                      {seeker.geo_location}
                    </span>
                  </div>
                </div>
              )}

              {seeker.profile?.phone && (
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Contact Number</span>
                  <div className="contact-info">
                    <span className="phone-number">{seeker.profile.phone}</span>
                  </div>
                </div>
              )}

              {seeker.profile?.cnic_url && (
                <div className="profile-detail-item">
                  <span className="profile-detail-label">
                    Identity Verification
                  </span>
                  <div>
                    <a
                      href={seeker.profile.cnic_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="seeker-cv-button"
                      style={{
                        display: "inline-block",
                        marginBottom: "8px",
                        marginTop: "8px",
                        padding: "18px",
                      }}
                    >
                      📄 View CNIC Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {seeker.availability && (
            <div className="seeker-detail-availability">
              <h2 style={{ color: "#2176c1" }}>Availability Calendar</h2>
              <Calendar
                minDate={new Date()}
                tileDisabled={({ date }) =>
                  date < new Date().setHours(0, 0, 0, 0)
                }
                tileClassName={({ date }) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return "react-calendar__tile--past";
                  const dateKey = toLocalDateKey(date);
                  const slots = seeker.availability?.[dateKey];
                  return Array.isArray(slots) && slots.length > 0
                    ? "seeker-available-date"
                    : "seeker-unavailable-date";
                }}
                onClickDay={(date) => setSelectedDate(date)}
              />

              {selectedDate && (
                <div className="seeker-detail-slots">
                  <h4>Available Hours for {selectedDate.toDateString()}</h4>
                  {(() => {
                    const dateKey = toLocalDateKey(selectedDate);
                    const slots = seeker.availability?.[dateKey] || [];
                    return slots.length > 0 ? (
                      <ul>
                        {expandSlots(slots).map((slot, idx) => {
                          const value = `${slot.start}-${slot.end}`;
                          const isChecked = selectedSlots.some(
                            (s) => s.date === dateKey && s.slot === value
                          );
                          const isBooked =
                            bookedSlotsMap?.[dateKey]?.includes(value) || false;

                          const isToday =
                            dateKey === new Date().toISOString().split("T")[0];
                          let slotDisabled = false;

                          if (isToday) {
                            const now = new Date();
                            const [startHour, startMinute] = slot.start
                              .split(":")
                              .map(Number);
                            const [endHour, endMinute] = slot.end
                              .split(":")
                              .map(Number);
                            const slotStart = new Date();
                            slotStart.setHours(startHour, startMinute, 0, 0);
                            const slotEnd = new Date();
                            slotEnd.setHours(endHour, endMinute, 0, 0);
                            if (slotStart <= now || slotEnd <= now) {
                              slotDisabled = true;
                            }
                          }

                          return (
                            <li key={idx}>
                              <label className={isBooked ? "slot-booked" : ""}>
                                <input
                                  type="checkbox"
                                  value={value}
                                  checked={isChecked}
                                  disabled={slotDisabled || isBooked}
                                  onChange={(e) => {
                                    setSelectedSlots((prev) => {
                                      const dateSelected = dateKey;
                                      if (prev.length === 0) {
                                        return e.target.checked
                                          ? [
                                              ...prev,
                                              {
                                                date: dateSelected,
                                                slot: value,
                                              },
                                            ]
                                          : prev;
                                      }
                                      const existingDate = prev[0].date;
                                      if (existingDate !== dateSelected) {
                                        showModal(
                                          "You can only select slots from one date.",
                                          "error"
                                        );
                                        return prev;
                                      }
                                      return e.target.checked
                                        ? [
                                            ...prev,
                                            { date: dateSelected, slot: value },
                                          ]
                                        : prev.filter(
                                            (s) =>
                                              !(
                                                s.date === dateSelected &&
                                                s.slot === value
                                              )
                                          );
                                    });
                                  }}
                                />
                                {slot.start} – {slot.end}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p>No slots available for this date.</p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {totalPayInfo && <div className="pay-info">💰 {totalPayInfo}</div>}

          {selectedSlots.length > 0 && (
            <button
              className="hire-hour-btn"
              onClick={handleHire}
              disabled={
                mode === "recommendation" &&
                (isHireDone || selectedSlots.length === 0)
              }
            >
              {mode === "recommendation" && isHireDone
                ? "Already Hired"
                : `Hire ${selectedSlots.length} Slot(s)`}
            </button>
          )}
        </div>

        <h3 style={{ color: "#2176c1", marginTop: "2rem" }}>
          Recommended Job Seekers
        </h3>
        <div className="recommendations">
          {recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <div
                key={rec.seeker_id}
                className="rec-card"
                onClick={() => navigate(getNavigationPath(rec))}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={
                    rec.profile_picture ||
                    "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
                  }
                  alt="profile"
                />
                <p>
                  {rec.first_name} {rec.last_name}
                </p>
                <p>Category: {mapCategory(rec.main_category)}</p>
                <p>
                  Payrate:{" "}
                  {rec.payrate ? `${rec.payrate} PKR/hr` : "Not specified"}
                </p>
                <small>Match Score: {(rec.score * 100).toFixed(1)}%</small>
              </div>
            ))
          ) : (
            <p>No recommendations found.</p>
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
                  {reviews.map((rev, idx) => {
                    const profile = rev.reviewerProfile;
                    const poster = rev.reviewerPoster;

                    const reviewerName = profile
                      ? `${profile.first_name || ""} ${
                          profile.last_name || ""
                        }`.trim()
                      : "Job Poster";

                    const reviewerAvatar =
                      poster?.profile_picture ||
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
                                  {new Date(rev.created_at).toLocaleDateString(
                                    "en-GB"
                                  )}
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
                  })}
                </>
              )}

              <button
                className="close-modal-btn"
                onClick={() => setShowReviewsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <Modal
          open={modalOpen}
          type={modalType}
          message={modalMsg}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default SeekerDetailCommon;
