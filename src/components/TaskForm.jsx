import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import supabase from "../supabaseClient.js";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const makeValueFromTitle = (title) =>
  title
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

const loadFontAwesome = () => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
  document.head.appendChild(link);
};

const TaskForm = ({
  mode = "create",
  preselectedSeeker = null,
  preselectedSlots = null,
  preselectedPayRate = null,
  onSuccess = null,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    loadFontAwesome();
  }, []);

  const [showLocationModal, setShowLocationModal] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [manualAddressMode, setManualAddressMode] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [geoLocation, setGeoLocation] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [correctedDescription, setCorrectedDescription] = useState("");
  const [isProcessingDescription, setIsProcessingDescription] = useState(false);
  const [approvedDescription, setApprovedDescription] = useState("");
  const [paymentType, setPaymentType] = useState("");

  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, title_urdu, icon_url")
        .order("title", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      let options =
        data?.map((row) => ({
          id: row.id,
          value: row.title,
          label: row.title,
          urduLabel: row.title_urdu || "",
          iconUrl: row.icon_url || null,
        })) || [];

      const otherIndex = options.findIndex(
        (opt) =>
          opt.value === "other" || opt.label.trim().toLowerCase() === "other"
      );

      if (otherIndex !== -1) {
        const [otherOption] = options.splice(otherIndex, 1);
        options.push(otherOption);
      }

      setCategoryOptions(options);
    };
    fetchCategories();
  }, []);

    useEffect(() => {
      if (mode === "explore" && preselectedSeeker?.payment_type) {
        setPaymentType(preselectedSeeker.payment_type);
      }
    }, [mode, preselectedSeeker]);

  useEffect(() => {
    if (mode === "explore" && preselectedSeeker && categoryOptions.length > 0) {
      const seekerServiceId = preselectedSeeker.service_id;
      if (seekerServiceId) {
        const category = categoryOptions.find((cat) => cat.id === seekerServiceId);
        if (category) {
          setSelectedCategory(category);
        }
      }
    }
  }, [mode, preselectedSeeker, categoryOptions]);

  useEffect(() => {
    if (locationAllowed && !manualAddressMode && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
            );
            const data = await response.json();
            if (data && data.display_name) {
              setGeoLocation(data.display_name);
              setError("");
            } else {
              setError("Could not get a readable address");
            }
          } catch (err) {
            setError("Failed to get address from coordinates.");
          }
        },
        (err) => {
          if (err.code === 1) {
            setManualAddressMode(true);
            setError("Location permission denied. Enter address manually.");
          } else {
            setManualAddressMode(true);
            setError("Couldn't detect your location. Please enter your address manually.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 90000,
          maximumAge: 0,
        }
      );
    }
  }, [locationAllowed, manualAddressMode]);

  const handleManualAddressSubmit = async () => {
    if (!manualAddress.trim()) {
      setError("Please enter a valid address.");
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(
          manualAddress
        )}`
      );
      const data = await res.json();
      if (!data || data.length === 0) {
        setError(
          `Address not found. Please try using a more complete address with street name and area`
        );
        return;
      }

      const result = data[0];
      const { lat, lon, display_name, address } = result;

      if (address.country !== "Pakistan") {
        setError("Please enter a location within Pakistan.");
        return;
      }

      const accuracyLevel = address.road || address.suburb || address.city;
      if (!accuracyLevel) {
        setError("Please enter a more specific address (street/area).");
        return;
      }

      setCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
      setGeoLocation(display_name);
      setError("");
      setConfirmedLocation(false);
    } catch {
      setError("Unable to process the address. Try again.");
    }
  };

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
        setConfirmedLocation(false);
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`
        )
          .then((res) => res.json())
          .then((data) => {
            setGeoLocation(data.display_name || "");
          });
      },
    });

    useEffect(() => {
      if (map) {
        map.invalidateSize();
        map.setView([coords.lat, coords.lon], 16);
      }
    }, [coords, map]);

    return coords.lat !== null && coords.lon !== null ? (
      <Marker
        position={[coords.lat, coords.lon]}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const newLatLng = e.target.getLatLng();
            setCoords({ lat: newLatLng.lat, lon: newLatLng.lng });
            setConfirmedLocation(false);
            fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLatLng.lat}&lon=${newLatLng.lng}`
            )
              .then((res) => res.json())
              .then((data) => {
                setGeoLocation(data.display_name || "");
              });
          },
        }}
      />
    ) : null;
  }

  const getValidationRules = () => {
    if (mode === "explore") {
      return {
        isValid:
          geoLocation !== "" &&
          description.trim().length > 0 &&
          description.trim().length <= 500 &&
          confirmedLocation &&
          approvedDescription.trim().length > 0 &&
          paymentType !== "" &&
          preselectedSeeker?.service_id !== null &&
          preselectedSeeker?.service_id !== undefined,
        descriptionMinLength: 1,
        descriptionMaxLength: 500,
      };
    } else {
      return {
        isValid:
          geoLocation !== "" &&
          description.trim().length > 0 &&
          description.trim().length <= 500 &&
          confirmedLocation &&
          approvedDescription.trim().length > 0 &&
          paymentType !== "" &&
          selectedCategory !== null,
        descriptionMinLength: 1,
        descriptionMaxLength: 500,
      };
    }
  };

  const { isValid, descriptionMinLength, descriptionMaxLength } =
    getValidationRules();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Please log in first");
      setIsLoading(false);
      return;
    }

    const { data: existingPoster, error: existingPosterError } = await supabase
      .from("poster")
      .select("*")
      .eq("poster_id", user.id)
      .single();

    if (existingPosterError || !existingPoster) {
      setError("You are not authorized as a poster");
      setIsLoading(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (mode === "create") {
        const payload = {
          poster_id: existingPoster.poster_id,
          geo_location: geoLocation,
          latitude: coords.lat,
          longitude: coords.lon,
          description: approvedDescription || description,
          payment_type: paymentType,
          category_id: selectedCategory?.id || null,
        };

        const response = await fetch("http://localhost:5000/api/createTask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        navigate(`/recommendations/${result.task_id}`);
      } else if (mode === "explore" && preselectedSeeker) {
        const taskPayload = {
          poster_id: existingPoster.poster_id,
          geo_location: geoLocation,
          latitude: coords.lat,
          longitude: coords.lon,
          main_category: preselectedSeeker.main_category,
          description: approvedDescription || description,
          payment_type: paymentType,
          category_id: preselectedSeeker.service_id || null,
        };

        const taskRes = await fetch("http://localhost:5000/api/createTask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(taskPayload),
        });

        const taskResult = await taskRes.json();
        if (!taskRes.ok) throw new Error(taskResult.error);

        const task_id = taskResult.task_id;

        const hireReqPayload = {
          seeker_id: preselectedSeeker.seeker_id,
          poster_id: existingPoster.poster_id,
          slots: preselectedSlots,
          task_id,
        };

        const hrRes = await fetch("http://localhost:5000/api/hire-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(hireReqPayload),
        });

        const hrResult = await hrRes.json();
        if (!hrRes.ok) throw new Error(hrResult.error);

        setShowSuccessModal(true);
        setIsSubmittedSuccessfully(true);

        if (onSuccess) {
          onSuccess(task_id);
        } else {
          navigate("/poster-my-tasks");
        }
      }
    } catch (err) {
      console.error("Error submitting task", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLocationModal = () =>
    showLocationModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-left">
            <h3>
              Location
              <br />
              Permission
            </h3>
          </div>
          <div className="modal-right">
            <p>
              To personalize your experience, we need access to your location.
            </p>
            <div className="modal-buttons">
              <button
                className="allow-btn"
                onClick={() => {
                  setShowLocationModal(false);
                  setLocationAllowed(true);
                }}
              >
                Allow
              </button>
              <button
                className="deny-btn"
                onClick={() => {
                  setShowLocationModal(false);
                  setManualAddressMode(true);
                  setError("Location denied. Enter address manually.");
                }}
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      </div>
    );

  const renderLocationConfirmation = () =>
    coords.lat !== null &&
    coords.lon !== null &&
    !confirmedLocation && (
      <div className="ctf-confirm-modal-overlay">
        <div className="ctf-confirm-modal-content">
          <h3>Confirm Your Location</h3>
          <p>{geoLocation || "Selected location"}</p>
          <div className="ctf-map-container">
            <MapContainer
              key={`${coords.lat}-${coords.lon}`}
              center={[coords.lat, coords.lon]}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker />
            </MapContainer>
          </div>
          <p>Is this the correct location?</p>
          <div className="ctf-confirm-modal-buttons">
            <button
              className="allow-btn-map"
              onClick={() => setConfirmedLocation(true)}
            >
              Yes
            </button>
            <button
              className="deny-btn-map"
              onClick={() => {
                setManualAddressMode(true);
                setConfirmedLocation(false);
                setCoords({ lat: null, lon: null });
                setGeoLocation("");
              }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    );

  const renderLocationInput = () => (
    <div>
      <label className="form-label">
        <i className="fas fa-map-marker-alt"></i>
        Your Location
      </label>
      {manualAddressMode && !confirmedLocation ? (
        <>
          <div className="location-input-group">
            <input
              type="text"
              className="location-input"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Enter your full address"
            />
            <button
              type="button"
              className="location-button"
              onClick={handleManualAddressSubmit}
            >
              <i className="fas fa-search"></i> Locate
            </button>
          </div>
          <p className="tips">
            <strong>Tips:</strong> For best results, include street, area, and
            city in your address. Avoid abbreviations and ensure correct
            spelling. For hard-to-find locations, use nearby landmarks like
            shopping malls or major buildings.
          </p>
          {formSubmitted && (!coords.lat || !confirmedLocation) && (
            <p className="error-message">
              Please locate on map and confirm your location to proceed.
            </p>
          )}
          {error && <p className="error-message">{error}</p>}
        </>
      ) : (
        <>
          <input
            type="text"
            className="location-input"
            value={geoLocation}
            readOnly
          />
          {formSubmitted && !confirmedLocation && (
            <p className="error-message">
              Please confirm your location on the map to proceed.
            </p>
          )}
          {error && <p className="error-message">{error}</p>}
        </>
      )}
    </div>
  );

  const handleProcessDescription = async () => {
    if (!description.trim()) {
      setError("Please enter a description first.");
      return;
    }

    setIsProcessingDescription(true);
    setError("");

    try {
      const cleanResponse = await fetch(
        "http://localhost:5000/api/spellcheck",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: description }),
        }
      );

      const contentType = cleanResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await cleanResponse.text();
        throw new Error(
          `Server returned non-JSON response: ${text.substring(0, 100)}`
        );
      }

      const cleanData = await cleanResponse.json();
      if (!cleanResponse.ok) {
        throw new Error(cleanData.error || "Failed to clean description");
      }

      if (!cleanData.corrected) {
        throw new Error("No corrected text received from server");
      }

      const correctResponse = await fetch(
        "http://localhost:5000/api/correct-task-description",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description: cleanData.corrected }),
        }
      );

      const correctContentType = correctResponse.headers.get("content-type");
      if (
        !correctContentType ||
        !correctContentType.includes("application/json")
      ) {
        const text = await correctResponse.text();
        throw new Error(
          `Server returned non-JSON response: ${text.substring(0, 100)}`
        );
      }

      const correctData = await correctResponse.json();
      if (!correctResponse.ok) {
        throw new Error(correctData.error || "Failed to correct description");
      }

      if (!correctData.correctedDescription) {
        throw new Error("No corrected description received from server");
      }

      setCorrectedDescription(correctData.correctedDescription);
      setShowDescriptionModal(true);
    } catch (err) {
      console.error("Error processing description:", err);
      setError(
        err.message || "Failed to process description. Please try again."
      );
    } finally {
      setIsProcessingDescription(false);
    }
  };

  const handleAcceptDescription = () => {
    setApprovedDescription(correctedDescription);
    setDescription(correctedDescription);
    setShowDescriptionModal(false);
    setCorrectedDescription("");
  };

  const handleRejectDescription = () => {
    setShowDescriptionModal(false);
    setCorrectedDescription("");
  };

  const renderDescription = () => (
    <div>
      <label className="form-label">
        <i className="fas fa-file-alt"></i>
        Describe Your Task (max 500 characters)
      </label>
      <textarea
        className="form-textarea"
        rows={4}
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          setApprovedDescription("");
        }}
        placeholder="Please describe your task in detail..."
        disabled={isProcessingDescription}
      />
      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <button
          type="button"
          onClick={handleProcessDescription}
          disabled={!description.trim() || isProcessingDescription}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background:
              !description.trim() || isProcessingDescription
                ? "#ccc"
                : "linear-gradient(135deg, #113b72, #1f6bb5)",
            color: "#fff",
            fontSize: "14px",
            cursor:
              !description.trim() || isProcessingDescription
                ? "not-allowed"
                : "pointer",
            fontWeight: "500",
          }}
        >
          {isProcessingDescription ? (
            <>Processing...</>
          ) : (
            <>
              <i className="fas fa-magic" style={{ marginRight: "6px" }}></i>
              Clean & Correct Description
            </>
          )}
        </button>
        {approvedDescription && (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: "#d4edda",
              color: "#155724",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <i className="fas fa-check-circle"></i>
            Description approved
          </span>
        )}
      </div>
      {formSubmitted && description.trim().length === 0 && (
        <p className="error-message">Description cannot be empty.</p>
      )}
      {formSubmitted && description.trim().length > 500 && (
        <p className="error-message">
          Description must be less than 500 characters.
        </p>
      )}
      {formSubmitted && !approvedDescription && description.trim() && (
        <p
          className="error-message"
          style={{ color: "#856404", marginTop: "8px" }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{ marginRight: "6px" }}
          ></i>
          Please click "Clean & Correct Description" and approve the corrected
          version before submitting.
        </p>
      )}
    </div>
  );

  const renderCategoryModal = () =>
    showCategoryModal && mode !== "explore" && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCategoryModal(false);
          }
        }}
      >
        <div
          style={{
            width: "95%",
            maxWidth: "650px",
            maxHeight: "85vh",
            overflowY: "auto",
            background: "#fff",
            borderRadius: "16px",
            padding: "22px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              position: "relative",
              marginBottom: "16px",
              paddingRight: "32px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Select Category
            </h3>
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                fontSize: "30px",
                cursor: "pointer",
                lineHeight: 1,
                color: "#000",
              }}
            >
              ×
            </button>
          </div>

          {categoryOptions.map((cat) => (
            <div
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat);
                setShowCategoryModal(false);
              }}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                padding: "18px 12px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                transition: "0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
              }}
            >
              <div
                style={{
                  minWidth: "55px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {cat.iconUrl && (
                  <img
                    src={cat.iconUrl}
                    alt={cat.label}
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "6px",
                      objectFit: "cover",
                      marginLeft: "10px",
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "17px", fontWeight: "600" }}>
                  {cat.label}
                </div>
              </div>

              <div
                style={{
                  minWidth: "140px",
                  textAlign: "right",
                  fontSize: "17px",
                  color: "#444",
                  direction: "rtl",
                  unicodeBidi: "bidi-override",
                }}
              >
                {cat.urduLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="task-form-container">
      {renderLocationModal()}
      {renderLocationConfirmation()}
      {renderCategoryModal()}

      <form className="task-form" onSubmit={handleSubmit}>
        <div className="task-form-header">
          <h1>Create New Task</h1>
          <p>
            Fill in the details below to create your task and find the perfect
            helper
          </p>
        </div>

        <div className="form-layout">
          <div className="form-section">
            <h2>
              <i className="fas fa-tasks"></i>
              Task Details
            </h2>

            <div className="form-group">
              <label className="form-label">Task Location</label>
              {renderLocationInput()}
            </div>

            {mode !== "explore" && (
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-briefcase"></i>
                  Task Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  style={{
                    width: "100%",
                    border: "1px solid #ccc",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "#e8f3ff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "15px",
                    color: "#000",
                  }}
                >
                  <span
                    style={{
                      color: selectedCategory ? "#000" : "#666",
                    }}
                  >
                    {selectedCategory
                      ? selectedCategory.label
                      : "Tap to select a task category"}
                  </span>
                  <span style={{ fontSize: "18px", opacity: 0.7 }}>▼</span>
                </button>
                {formSubmitted && !selectedCategory && (
                  <p className="error-message">Please select a task category.</p>
                )}
              </div>
            )}

            {mode === "explore" && preselectedSeeker && selectedCategory && (
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-briefcase"></i>
                  Task Category
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedCategory.label}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "16px",
                    backgroundColor: "#e8f3ff",
                    color: "#000",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    outline: "none",
                    cursor: "not-allowed",
                  }}
                />
                <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  Category automatically set from selected seeker
                </p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Task Description</label>
              {renderDescription()}
              <div
                className={`char-count ${
                  description.length > 450 ? "warning" : ""
                }`}
                style={{
                  textAlign: "right",
                  marginTop: "8px",
                  width: "100%",
                  fontSize: "14px",
                  color: description.length > 450 ? "#f39c12" : "#666",
                }}
              >
                {description.length}/500 characters
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-money-bill-wave"></i>
                Payment Option
              </label>
              <select
                value={paymentType}
                disabled={mode === "explore"} 
                onChange={(e) => setPaymentType(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: "16px",
                  backgroundColor: "#e8f3ff",
                  color: "#000",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  outline: "none",
                }}
              >
                <option value="">Select payment option</option>
                <option value="Cash Payment">Cash Payment</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              {formSubmitted && paymentType === "" && (
                <p className="error-message">Please select a payment option.</p>
              )}
            </div>

<p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
  Payment option is fixed and cannot be changed
</p>

            <button
              type="submit"
              className="submit-button"
              disabled={
                isLoading ||
                (mode === "explore" && isSubmittedSuccessfully) ||
                isProcessingDescription
              }
            >
              {isLoading ? <>Creating Task...</> : "Create Task"}
            </button>
          </div>

          <div className="form-section">
            <h2>
              <i className="fas fa-map"></i>
              Location Map
            </h2>
            <div className="map-section">
              {geoLocation && (
                <div className="location-display">
                  <p>
                    <strong>Selected Location:</strong> {geoLocation}
                  </p>
                </div>
              )}

              <div className="map-container">
                {coords.lat !== null && coords.lon !== null ? (
                  <MapContainer
                    key={`${coords.lat}-${coords.lon}`}
                    center={[coords.lat, coords.lon]}
                    zoom={16}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution="© OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker />
                  </MapContainer>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      color: "#6b7280",
                      fontSize: "1.1rem",
                    }}
                  >
                    {manualAddressMode
                      ? "Enter address to view map"
                      : "Loading map..."}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "16px", textAlign: "center", marginBottom: "75px" }}>
                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Click on the map or drag the marker to adjust your precise
                  location
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      {showDescriptionModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleRejectDescription();
            }
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: "700px",
              width: "100%",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "slideIn 0.3s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(-20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
                paddingBottom: "12px",
                borderBottom: "2px solid #f0f0f0",
                paddingTop: "150px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #113b72, #1f6bb5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "24px",
                  }}
                >
                  <i className="fas fa-magic"></i>
                </div>
                <div>
                  <h3
                    className="modal-title"
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#1a1a1a",
                    }}
                  >
                    Description Corrected
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    Review the improved version below
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRejectDescription}
                style={{
                  background: "#f5f5f5",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "8px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  marginLeft: "20px",
                  justifyContent: "center",
                  borderRadius: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#e0e0e0";
                  e.target.style.color = "#333";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#f5f5f5";
                  e.target.style.color = "#666";
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <i
                    className="fas fa-file-alt"
                    style={{ color: "#666", fontSize: "16px" }}
                  ></i>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "600",
                      color: "#333",
                      fontSize: "15px",
                    }}
                  >
                    Original Description
                  </p>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "linear-gradient(135deg, #f8f9fa, #e9ecef)",
                    borderRadius: "12px",
                    fontSize: "15px",
                    color: "#495057",
                    minHeight: "80px",
                    lineHeight: "1.6",
                    border: "1px solid #dee2e6",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                  }}
                >
                  {description}
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#fff",
                    padding: "0 12px",
                    zIndex: 1,
                  }}
                >
                  <i
                    className="fas fa-arrow-down"
                    style={{ color: "#1f6bb5", fontSize: "20px" }}
                  ></i>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <i
                    className="fas fa-check-circle"
                    style={{ color: "#28a745", fontSize: "16px" }}
                  ></i>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "600",
                      color: "#28a745",
                      fontSize: "15px",
                    }}
                  >
                    Corrected Description
                  </p>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
                    borderRadius: "12px",
                    fontSize: "15px",
                    color: "#1b5e20",
                    minHeight: "80px",
                    lineHeight: "1.6",
                    border: "2px solid #81c784",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    boxShadow: "0 2px 8px rgba(40, 167, 69, 0.15)",
                  }}
                >
                  {correctedDescription}
                </div>
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "13px",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  <i
                    className="fas fa-info-circle"
                    style={{ marginRight: "6px" }}
                  ></i>
                  This version has been corrected for spelling, grammar, and
                  clarity
                </p>
              </div>
            </div>

            <div
              className="modal-buttons"
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "2px solid #f0f0f0",
              }}
            >
              <button
                type="button"
                className="modal-button primary"
                onClick={handleAcceptDescription}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  background: "linear-gradient(135deg, #113b72, #1f6bb5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 12px rgba(17, 59, 114, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 16px rgba(17, 59, 114, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(17, 59, 114, 0.3)";
                }}
              >
                <i className="fas fa-check"></i>
                Accept & Use This
              </button>
              <button
                type="button"
                className="modal-button"
                onClick={handleRejectDescription}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  background: "#ffffff",
                  color: "#333",
                  border: "2px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#f8f9fa";
                  e.target.style.borderColor = "#bbb";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#ffffff";
                  e.target.style.borderColor = "#ddd";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                <i className="fas fa-edit"></i>
                Edit & Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">🎉</div>
            <h3 className="modal-title">Task Created Successfully!</h3>
            <p className="modal-message">
              Your task has been created and we're finding the best helpers for
              you.
              {mode === "explore" && " The selected helper has been notified."}
            </p>
            <div className="modal-buttons">
              <button
                className="modal-button primary"
                onClick={() => setShowSuccessModal(false)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TaskForm;
