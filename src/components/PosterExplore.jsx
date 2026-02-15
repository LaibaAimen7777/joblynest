import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PosterExplore.css";
import PosterLayout from "./PosterLayout";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Loader from "../components/Loader";
import { createClient } from "@supabase/supabase-js";
import supabase from "../supabaseClient.js";

const PosterExplore = () => {
  const [seekerList, setSeekerList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [preferredCategory, setPreferredCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("none");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [filterByLocation, setFilterByLocation] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoryLabelMap, setCategoryLabelMap] = useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
const fetchSeekers = async () => {
  setLoading(true);

  try {
    const res = await fetch("http://localhost:5000/api/fetchSeekers");
    const seekers = await res.json();
    if (!res.ok) throw new Error("Failed to fetch seekers");

    const seekerIds = [...new Set(seekers.map((s) => s.seeker_id).filter(Boolean))];

    let ratingsStatsById = {};

    if (seekerIds.length > 0) {
      const { data, error: ratingsError } = await supabase
        .from("rating_reviews")
        .select("reviewed_user_id, rating");

      if (ratingsError) {
        console.error("Error fetching ratings:", ratingsError);
      } else {
        const ratingsData = (data || []).filter((r) =>
          seekerIds.includes(r.reviewed_user_id)
        );

        ratingsData.forEach((r) => {
          const id = r.reviewed_user_id;
          const rating = Number(r.rating);
          if (!Number.isFinite(rating)) return;

          if (!ratingsStatsById[id]) ratingsStatsById[id] = { sum: 0, count: 0 };
          ratingsStatsById[id].sum += rating;
          ratingsStatsById[id].count += 1;
        });
      }
    }

    const enrichedSeekers = seekers.map((s) => {
      const stats = ratingsStatsById[s.seeker_id];
      const count = stats?.count || 0;
      const avg = count > 0 ? stats.sum / count : null;

      return {
        ...s,
        average_rating: avg,
        ratings_count: count,
      };
    });

    setSeekerList(enrichedSeekers);
    setFilteredList(enrichedSeekers);
  } catch (err) {
    console.error("Error fetching seekers:", err);
    setSeekerList([]);
    setFilteredList([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredList(seekerList);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = seekerList.filter((seeker) => {
      const inDescription = seeker.description?.toLowerCase().includes(term);
      const inCategory = categoryLabelMap[seeker.main_category]
        ?.toLowerCase()
        .includes(term);
      return inDescription || inCategory;
    });

    setFilteredList(results);
  }, [searchTerm, seekerList]);

  useEffect(() => {
    fetchSeekers();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, title")
          .order("title", { ascending: true });

        if (servicesError) throw servicesError;

        const { data: subcatData, error: subcatError } = await supabase
          .from("service_subcategory_fk")
          .select("service_id, name")
          .order("name", { ascending: true });

        if (subcatError) {
          console.error("Error fetching subcategories:", subcatError);
        }

        const subcatMap = {};
        (subcatData || []).forEach((subcat) => {
          if (!subcatMap[subcat.service_id]) {
            subcatMap[subcat.service_id] = [];
          }
          subcatMap[subcat.service_id].push(subcat.name);
        });

        const categories = (servicesData || []).map((service) => ({
          value: service.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, ""),
          label: service.title,
          subcategories: (subcatMap[service.id] || []).map((sub) => ({
            value: sub
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, ""),
            label: sub.trim(),
          })),
        }));

        setCategoryOptions(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const newLabelMap = {};
    categoryOptions.forEach((cat) => {
      newLabelMap[cat.value] = cat.label;
      cat.subcategories.forEach((sub) => {
        newLabelMap[sub.value] = sub.label;
      });
    });
    setCategoryLabelMap(newLabelMap);
  }, [categoryOptions]);

    const applyFilters = () => {
      let list = [...seekerList];

  if (preferredCategory) {
    list = list.filter((seeker) => {
      if (!seeker.main_category) return false;

      const seekerCategory = normalizeCategory(seeker.main_category);
      const preferredCat = normalizeCategory(preferredCategory);

      console.log("seeker c:", seekerCategory);
      console.log("p c:", preferredCat);

      return seekerCategory.includes(preferredCat);
    });
  }
    if (sortOrder === "high") {
      list.sort((a, b) => b.pay_rate - a.pay_rate);
    } else if (sortOrder === "low") {
      list.sort((a, b) => a.pay_rate - b.pay_rate);
    }

    if (filterByLocation && userCoords) {
      list.sort((a, b) => {
        const distA = haversine(
          userCoords.lat,
          userCoords.lon,
          a.latitude,
          a.longitude
        );
        const distB = haversine(
          userCoords.lat,
          userCoords.lon,
          b.latitude,
          b.longitude
        );
        return distA - distB;
      });
    }

    setFilteredList(list);
  };

  const normalizeCategory = (str) =>
  str
    ?.toString()
    .toLowerCase()
    .replace(/_/g, " ")   
    .trim();


  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const removeFilters = () => {
    setPreferredCategory("");
    setSortOrder("none");
    setFilteredList(seekerList);
    setFilterByLocation(false);
    setSearchTerm("");
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
      <div className="explore-screen">
        <div className="poster-explore">
          {showFilterModal && (
            <div
              className="filter-modal-overlay"
              onClick={() => setShowFilterModal(false)}
            >
              <div
                className="filter-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Filter Options</h3>
                <p
                  className="single-filter-note"
                  style={{
                    fontSize: "0.875rem",
                    color: "#b91c1c",
                    backgroundColor: "#fef2f2",
                    padding: "4px 8px",
                    borderLeft: "3px solid #f87171",
                    borderRadius: "3px",
                    marginBottom: "8px",
                    display: "inline-block",
                  }}
                >
                  ⚠️ You can apply only one filter at a time.
                </p>

                <label>Preferred Category</label>
                <select
                  value={preferredCategory}
                  onChange={(e) => {
                    setPreferredCategory(e.target.value);
                    setSortOrder("none");
                    setFilterByLocation(false);
                  }}
                >
                  <option value="">Any Category</option>
                  {categoryOptions.map((cat, index) => (
                    <option key={index} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                <label>Sort by Pay Rate</label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setPreferredCategory("");
                    setFilterByLocation(false);
                  }}
                >
                  <option value="none">No Sorting</option>
                  <option value="high">High to Low</option>
                  <option value="low">Low to High</option>
                </select>
                <label>Sort by Distance</label>
                <button
                  className={`location-btn ${filterByLocation ? "active" : ""}`}
                  onClick={() => {
                    if (!filterByLocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setUserCoords({
                            lat: pos.coords.latitude,
                            lon: pos.coords.longitude,
                          });
                          setFilterByLocation(true);

                          setPreferredCategory("");
                          setSortOrder("none");
                        },
                        (err) => {
                          console.error("Location error:", err);
                          alert(
                            "Location access is required to sort by distance."
                          );
                        }
                      );
                    } else {
                      setFilterByLocation(false);
                    }
                  }}
                >
                  {filterByLocation
                    ? "📍 Location Filter Active"
                    : "Enable Location Filter"}
                </button>

                <div className="filter-actions">
                  <button
                    onClick={() => {
                      applyFilters();
                      setShowFilterModal(false);
                    }}
                  >
                    Apply Filter
                  </button>
                  <button onClick={() => setShowFilterModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="explore-navbar">
            <input
              type="text"
              placeholder="Search by category or description..."
              className="search-bar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="filters">
              <button onClick={() => setShowFilterModal(true)}>
                Filters & Sort
              </button>
              <button onClick={removeFilters} className="remove-filters">
                Clear All
              </button>
            </div>
          </div>

          <div className="seeker-list">
            {loading ? (
              <Loader message="Loading Explore Screen..." />
            ) : filteredList.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#6b7280",
                  fontSize: "1.1rem",
                }}
              >
                No seekers found matching your criteria
              </div>
            ) : (
              filteredList.map((seeker, index) => (
                <div
                  key={index}
                  onClick={() =>
                    navigate(`/explore-seeker-details/${seeker.seeker_id}`)
                  }
                  className="seeker-card"
                >
                  <img
                    src={
                      seeker.profile_picture ||
                      "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
                    }
                    alt="Profile"
                    className="profile-pic"
                  />

                  <div className="seeker-info">
                    <h3 className="seeker-name">
                      {seeker.profile?.first_name} {seeker.profile?.last_name}
                    </h3>

                    {seeker.average_rating != null &&
                    seeker.ratings_count > 0 ? (
                      <div className="seeker-rating-row">
                        <span className="seeker-stars">
                          {renderStars(seeker.average_rating)}
                        </span>
                        <span className="seeker-rating-text">
                          {Number(seeker.average_rating).toFixed(1)} / 5 (
                          {seeker.ratings_count} review
                          {seeker.ratings_count !== 1 ? "s" : ""})
                        </span>
                      </div>
                    ) : (
                      <div className="seeker-rating-row">
                        <span
                          className="seeker-rating-text"
                          style={{ color: "#9ca3af", fontStyle: "italic" }}
                        >
                          No ratings yet
                        </span>
                      </div>
                    )}

                    <p className="seeker-category">
                      {categoryLabelMap[seeker.main_category] ||
                        seeker.main_category}
                    </p>

                    <p className="location">{seeker.geo_location}</p>
<p className="pay-rate">
  Rs {seeker.pay_rate}/hour
  <span style={{ marginLeft: "10px", fontSize: "14px", opacity: 0.85 }}>
    • {seeker.payment_type || "Payment not specified"}
  </span>
</p>
                  </div>
                  <button className="show-more">HIRE NOW</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PosterLayout>
  );
};

export default PosterExplore;
