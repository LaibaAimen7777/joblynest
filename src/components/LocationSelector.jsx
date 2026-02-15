import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LocationSelector = ({
  onLocationConfirmed,
  initialCoords = { lat: null, lon: null },
  initialGeoLocation = "",
  showLocationModal: externalShowModal = true,
  onModalClose,
  readOnly = false,
  hasExistingLocation = false,
  isLoading = true,
}) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [manualAddressMode, setManualAddressMode] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [coords, setCoords] = useState(initialCoords);
  const [geoLocation, setGeoLocation] = useState(initialGeoLocation);
  const [error, setError] = useState("");
  const [confirmedLocation, setConfirmedLocation] = useState(false);

  useEffect(() => {
    console.log("📍 LocationSelector - Syncing with props:", {
      initialCoords,
      initialGeoLocation,
      hasExistingLocation,
      isLoading,
    });

    if (initialCoords.lat && initialCoords.lon) {
      setCoords(initialCoords);
    }
    if (initialGeoLocation) {
      setGeoLocation(initialGeoLocation);
    }
    if (hasExistingLocation && initialGeoLocation) {
      setConfirmedLocation(true);
    }
  }, [initialCoords, initialGeoLocation, hasExistingLocation, isLoading]);

  useEffect(() => {
    if (!isLoading && !hasExistingLocation && !readOnly && externalShowModal) {
      setShowLocationModal(true);
    }
  }, [isLoading, hasExistingLocation, readOnly, externalShowModal]);

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        if (readOnly) return;
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
      if (map && coords.lat !== null && coords.lon !== null) {
        map.invalidateSize();
        map.setView([coords.lat, coords.lon], 16);
      }
    }, [coords, map]);

    return coords.lat !== null && coords.lon !== null ? (
      <Marker
        position={[coords.lat, coords.lon]}
        draggable={!readOnly}
        eventHandlers={
          !readOnly
            ? {
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
              }
            : {}
        }
      />
    ) : null;
  }

  useEffect(() => {
    if (
      locationAllowed &&
      !manualAddressMode &&
      navigator.geolocation &&
      !readOnly
    ) {
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
            setError("Unable to retrieve location.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 90000,
          maximumAge: 0,
        }
      );
    }
  }, [locationAllowed, manualAddressMode, readOnly]);

  const handleManualAddressSubmit = async () => {
    if (readOnly) return;

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
        setError("Address not found. Try using a more complete address.");
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

  const handleLocationConfirm = () => {
    if (readOnly) return;

    setConfirmedLocation(true);
    if (onLocationConfirmed) {
      onLocationConfirmed({
        coords,
        geoLocation,
        manualAddress,
        confirmed: true,
      });
    }
  };

  const handleAllowLocation = () => {
    setShowLocationModal(false);
    setLocationAllowed(true);
    if (onModalClose) onModalClose(true);
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    setManualAddressMode(true);
    setError("Location denied. Enter address manually.");
    if (onModalClose) onModalClose(false);
  };

  return (
    <div className="location-selector">
      {isLoading && (
        <div
          style={{
            width: "96%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginBottom: "8px",
            backgroundColor: "#f0f0f0",
            color: "#666",
            textAlign: "center",
          }}
        >
          Loading location...
        </div>
      )}
      {showLocationModal && (
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
                <button className="allow-btn" onClick={handleAllowLocation}>
                  Allow
                </button>
                <button className="deny-btn" onClick={handleDenyLocation}>
                  Deny
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {coords.lat !== null &&
        coords.lon !== null &&
        !confirmedLocation &&
        !readOnly && (
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
              <div
                className="ctf-confirm-modal-buttons"
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  marginTop: "15px",
                }}
              >
                <button
                  className="allow-btn-map"
                  onClick={handleLocationConfirm}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#11561b",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "'Playfair Display', serif",
                  }}
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
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#a9060e",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="location-input-section">
        {hasExistingLocation && !readOnly && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowLocationModal(true);
                setLocationAllowed(false);
                setManualAddressMode(false);
                setConfirmedLocation(false);
                setCoords({ lat: null, lon: null });
                setGeoLocation("");
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                color: "#113b72",
                border: "1px solid #113b72",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                width: "595px",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#113b72";
                e.target.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#113b72";
              }}
            >
              Change Location
            </button>
          </div>
        )}
        
        {readOnly ? (
          <input
            type="text"
            className="ctf-input"
            value={geoLocation}
            readOnly
            style={{
              width: "96%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginBottom: "8px",
              backgroundColor: "#ffffff",
              color: "#000000",
            }}
          />
        ) : manualAddressMode && !confirmedLocation ? (
          <>
            <input
              type="text"
              className="ctf-input"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Enter your full address"
              style={{
                width: "96%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                marginBottom: "8px",
                backgroundColor: "#ffffff",
                color: "#000000",
              }}
            />
            <button
              type="button"
              className="ctf-submit-btn"
              onClick={handleManualAddressSubmit}
            >
              Locate on Map
            </button>
          </>
        ) : (
          <input
            type="text"
            className="ctf-input"
            value={geoLocation}
            readOnly
            style={{
              width: "96%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginBottom: "8px",
              backgroundColor: "#ffffff",
              color: "#000000",
            }}
          />
        )}
        {error && <p style={{ color: "red", marginTop: "5px" }}>{error}</p>}
      </div>
    </div>
  );
};

export default LocationSelector;
