import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/RecommendedSeekers.css";
import PosterLayout from "./PosterLayout";
import Loader from "../components/Loader";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import supabase from "../supabaseClient";

const RecommendedSeekers = () => {
  const { task_id } = useParams();
  const navigate = useNavigate();
  const [seekers, setSeekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [inferredCategory, setInferredCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showAvailableToday, setShowAvailableToday] = useState(false);
  const [filterEliteOnly, setFilterEliteOnly] = useState(false);
  useEffect(() => {
    const fetchSeekers = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/recommend-seekers?task_id=${task_id}`
        );
        const data = await res.json();
        console.log("data in rs in frontend:", data);
        if (!res.ok) throw new Error(data.error || "Failed to fetch");

        const results = data.results || [];
        setInferredCategory(data.inferredCategory || "");

        if (results.length === 0) {
          setSeekers([]);
          return;
        }

        const seekerIds = [
          ...new Set(results.map((s) => s.seeker_id).filter((id) => !!id)),
        ];

        let ratingsStatsBySeekerId = {};

        console.log("seeker ids", seekerIds);

        if (seekerIds.length > 0) {
          const { data, error: ratingsError } = await supabase
            .from("rating_reviews")
            .select("reviewed_user_id, rating");

          const ratingsData = data.filter((r) =>
            seekerIds.includes(r.reviewed_user_id)
          );
          console.log(ratingsData);

          if (ratingsError) {
            console.error("Error fetching ratings for seekers:", ratingsError);
          } else if (ratingsData && ratingsData.length > 0) {
            ratingsData.forEach((r) => {
              const id = r.reviewed_user_id;
              const rating = Number(r.rating);

              if (!Number.isFinite(rating)) return;

              if (!ratingsStatsBySeekerId[id]) {
                ratingsStatsBySeekerId[id] = { sum: 0, count: 0 };
              }

              ratingsStatsBySeekerId[id].sum += rating;
              ratingsStatsBySeekerId[id].count += 1;
            });
          }
        }

        const enrichedResults = results.map((s) => {
          const stats = ratingsStatsBySeekerId[s.seeker_id];
          const average_rating =
            stats && stats.count > 0 && Number.isFinite(stats.sum / stats.count)
              ? stats.sum / stats.count
              : null;

          const ratings_count = Number.isFinite(stats?.count) ? stats.count : 0;

          console.log("ratings:", stats, average_rating, ratings_count);

          return {
            ...s,
            average_rating,
            ratings_count,
          };
        });

        const { data: seekerExtras, error: extrasError } = await supabase
          .from("seeker")
          .select("seeker_id, profile_picture, payment_type")
          .in("seeker_id", seekerIds);

        if (extrasError) {
          console.error("Error fetching seeker extras:", extrasError);
        }

        const extrasMap = {};
        (seekerExtras || []).forEach((row) => {
          extrasMap[row.seeker_id] = row;
        });

        let completedCountMap = {};
        if (seekerIds.length > 0) {
          const { data: completedBySeeker, error: countError } = await supabase
            .from("hire_requests")
            .select("seeker_id")
            .in("seeker_id", seekerIds)
            .eq("status", "completed");

          if (!countError && completedBySeeker) {
            completedBySeeker.forEach((row) => {
              completedCountMap[row.seeker_id] =
                (completedCountMap[row.seeker_id] || 0) + 1;
            });
          } else if (countError) {
            console.error("Error fetching completed counts:", countError);
          }
        }

        const finalSeekers = enrichedResults.map((s) => {
          const completedCount = completedCountMap[s.seeker_id] || 0;
          let eliteLevel = null;
          if (completedCount >= 10) {
            eliteLevel = 2;
          } else if (completedCount >= 5) {
            eliteLevel = 1;
          }

          return {
            ...s,
            profile_picture: extrasMap[s.seeker_id]?.profile_picture || null,
            payment_type: extrasMap[s.seeker_id]?.payment_type || null,
            completedCount,
            eliteLevel,
            availability: s.availability || {},
          };
        });

        setSeekers(finalSeekers);
        console.log("seekerIds:", seekerIds);
        console.log("seekerExtras:", seekerExtras);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSeekers();
  }, [task_id]);

  const filteredByDate = useMemo(() => {
    let dateToFilter = selectedDate;

    if (showAvailableToday && !selectedDate) {
      dateToFilter = new Date().toISOString().split("T")[0];
    }

    if (!dateToFilter) return seekers;

    return seekers.filter((seeker) => {
      if (!seeker.availability) return false;
      const dateKey = dateToFilter;
      const slots = seeker.availability[dateKey];
      return Array.isArray(slots) && slots.length > 0;
    });
  }, [seekers, selectedDate, showAvailableToday]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return filteredByDate;

    return filteredByDate.filter((seeker) => {
      const label = seeker.label?.toLowerCase() || "";
      if (activeTab === "excellent") return label.includes("excellent");
      if (activeTab === "good") return label.includes("good");
      if (activeTab === "possible") return label.includes("possible");
      if (activeTab === "low") return label.includes("low");
      return true;
    });
  }, [filteredByDate, activeTab]);

  const filteredByElite = useMemo(() => {
    if (!filterEliteOnly) return filteredByTab;
    return filteredByTab.filter(
      (seeker) => seeker.eliteLevel && seeker.eliteLevel > 0
    );
  }, [filteredByTab, filterEliteOnly]);

  const sortedSeekers = useMemo(() => {
    const sorted = [...filteredByElite];

    if (sortOrder === "low-high") {
      sorted.sort((a, b) => (a.pay_rate || 0) - (b.pay_rate || 0));
    } else if (sortOrder === "high-low") {
      sorted.sort((a, b) => (b.pay_rate || 0) - (a.pay_rate || 0));
    } else if (sortOrder === "near-far") {
      sorted.sort(
        (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
      );
    } else {
      sorted.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return sorted;
  }, [filteredByElite, sortOrder]);

  if (loading) return <Loader message="Loading seekers..." />;
  if (error) return <p>Error: {error}</p>;

  const getScoreColor = (score) => {
    if (score > 0.85) return "#4caf50";
    if (score > 0.7) return "#2196f3";
    if (score > 0.5) return "#ff9800";
    return "#f44336";
  };

  const getDistanceColor = (dist) => {
    if (dist <= 10) return "#4caf50";
    if (dist <= 50) return "#ff9800";
    return "#f44336";
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
    <PosterLayout>
      <div
        className="recommended-seekers-container"
        style={{
          background: `url("/images/recommendedbg.jpg") center center / cover no-repeat`,
        }}
      >
        <h2 className="recommended-seekers-title">Recommended Seekers</h2>
        {inferredCategory && (
          <div
            className="inferred-category-badge"
            style={{ backgroundColor: "white" }}
          >
            <span className="label">Inferred Category</span>
            <span className="value">{inferredCategory}</span>
          </div>
        )}

        <div className="recommended-seekers-tabs">
          <button
            className={`recommended-seekers-tab ${
              activeTab === "all" ? "active" : ""
            }`}
            onClick={() => setActiveTab("all")}
          >
            All (
            {
              filteredByDate.filter(
                (s) => !s.label?.toLowerCase().includes("low")
              ).length
            }
            )
          </button>
          <button
            className={`recommended-seekers-tab ${
              activeTab === "excellent" ? "active" : ""
            }`}
            onClick={() => setActiveTab("excellent")}
          >
            Excellent Match (
            {
              filteredByDate.filter((s) =>
                s.label?.toLowerCase().includes("excellent")
              ).length
            }
            )
          </button>
          <button
            className={`recommended-seekers-tab ${
              activeTab === "good" ? "active" : ""
            }`}
            onClick={() => setActiveTab("good")}
          >
            Good Match (
            {
              filteredByDate.filter((s) =>
                s.label?.toLowerCase().includes("good")
              ).length
            }
            )
          </button>
          <button
            className={`recommended-seekers-tab ${
              activeTab === "possible" ? "active" : ""
            }`}
            onClick={() => setActiveTab("possible")}
          >
            Possible Match (
            {
              filteredByDate.filter((s) =>
                s.label?.toLowerCase().includes("possible")
              ).length
            }
            )
          </button>

          <button
            className={`recommended-seekers-tab ${
              activeTab === "low" ? "active" : ""
            }`}
            onClick={() => setActiveTab("low")}
          >
            Low Match (
            {
              filteredByDate.filter((s) =>
                s.label?.toLowerCase().includes("low")
              ).length
            }
            )
          </button>
        </div>

        <div className="recommended-seekers-filters">
          <div className="recommended-seekers-filter-card">
            <label htmlFor="sort">Sort by: </label>
            <select
              id="sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="">-- Default (Match Score) --</option>
              <option value="low-high">Pay Rate: Low to High</option>
              <option value="high-low">Pay Rate: High to Low</option>
              <option value="near-far">Distance: Near to Far</option>
            </select>
          </div>
          <div className="recommended-seekers-filter-card">
            <label htmlFor="elite-filter">
              <input
                id="elite-filter"
                type="checkbox"
                checked={filterEliteOnly}
                onChange={(e) => setFilterEliteOnly(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Elite Level Only
            </label>
          </div>
          <div className="recommended-seekers-filter-card">
            <label htmlFor="available-today">
              <input
                id="available-today"
                type="checkbox"
                checked={showAvailableToday}
                onChange={(e) => {
                  setShowAvailableToday(e.target.checked);
                  if (e.target.checked) {
                    setSelectedDate("");
                  }
                }}
                style={{ marginRight: "8px" }}
              />
              Available Today
            </label>
          </div>
          <div className="recommended-seekers-filter-card">
            <label htmlFor="date-filter">Filter by Date: </label>
            <input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (e.target.value) {
                  setShowAvailableToday(false);
                }
              }}
              min={new Date().toISOString().split("T")[0]}
              disabled={showAvailableToday}
            />
            {selectedDate && (
              <button
                className="clear-date-filter"
                onClick={() => setSelectedDate("")}
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {sortedSeekers.length === 0 ? (
          <p className="recommended-seekers-no-results">
            No suitable seekers found.
          </p>
        ) : (
          <div className="recommended-seekers-grid">
            {sortedSeekers.map((s) => (
              <div
                key={s.seeker_id}
                onClick={() =>
                  navigate(`/seeker-details/${s.seeker_id}/${task_id}`)
                }
                className="recommended-seekers-card"
                style={{
                  borderLeft: `5px solid ${getScoreColor(s.matchScore)}`,
                }}
              >
                <div className="recommended-seekers-header">
                  <img
                    src={
                      s.profile_picture ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                    }
                    alt="Seeker"
                    className="recommended-seekers-avatar"
                  />

                  <div style={{ flex: 1 }}>
                    <h3 className="recommended-seekers-card-title">
                      {s.main_category}
                    </h3>
                    {s.eliteLevel && (
                      <div style={{ marginTop: "6px" }}>
                        {s.eliteLevel === 2 ? (
                          <span
                            style={{
                              backgroundColor: "#ffd700",
                              color: "#333",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              display: "inline-block",
                            }}
                          >
                            ⭐⭐ Elite Level 2
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: "#FFB84D",
                              color: "#333",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              display: "inline-block",
                            }}
                          >
                            ⭐ Elite Level 1
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {typeof s.average_rating === "number" &&
                  s.ratings_count > 0 && (
                    <div className="recommended-seekers-rating-row">
                      <span className="recommended-seekers-stars">
                        {renderStars(s.average_rating)}
                      </span>
                      <span className="recommended-seekers-rating-text">
                        {s.average_rating.toFixed(1)} / 5 ({s.ratings_count}{" "}
                        review
                        {s.ratings_count > 1 ? "s" : ""})
                      </span>
                    </div>
                  )}

                <p className="recommended-seekers-card-pay">
                  {s.pay_rate ? `${s.pay_rate} PKR/hr` : "Not specified"}
                  <span
                    style={{
                      marginLeft: "10px",
                      fontSize: "14px",
                      opacity: 0.85,
                    }}
                  >
                    • {s.payment_type || "Payment not specified"}
                  </span>
                </p>
                {s.description && (
                  <p className="recommended-seekers-card-description">
                    {s.description}
                  </p>
                )}
                {s.geo_location && (
                  <p className="recommended-seekers-card-location">
                    📍{" "}
                    <span style={{ color: getDistanceColor(s.distance) }}>
                      {s.geo_location}
                    </span>
                  </p>
                )}
                {s.subcategories?.length > 0 && (
                  <p className="recommended-seekers-card-subcategories">
                    Subcategories: {s.subcategories.join(", ")}
                  </p>
                )}
                <div className="recommended-seekers-card-scorebar">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${(s.matchScore * 100).toFixed(1)}%`,
                      backgroundColor: getScoreColor(s.matchScore),
                    }}
                  ></div>
                  <span className="score-bar-text">
                    {s.label} ({(s.matchScore * 100).toFixed(1)}%)
                  </span>
                </div>
                <p className="recommended-seekers-card-distance">
                  Distance:{" "}
                  {s.distance != null
                    ? `${Number(s.distance).toFixed(1)} km`
                    : "N/A"}
                </p>

                {((selectedDate && s.availability?.[selectedDate]) ||
                  (showAvailableToday &&
                    s.availability?.[
                      new Date().toISOString().split("T")[0]
                    ])) && (
                  <p className="recommended-seekers-card-availability">
                    ✓ Available on{" "}
                    {selectedDate
                      ? new Date(selectedDate).toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PosterLayout>
  );
};

export default RecommendedSeekers;
