import React, { useEffect, useState } from "react";
import "../styles/Admin.css";

const formatDate = (value) => {
  if (!value) {
    return "Not provided";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const AdminApproved = () => {
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCnic, setSelectedCnic] = useState(null);

  const fetchApproved = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/approved-users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load approved users");
      }

      setApprovedUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch approved users error:", err);
      setError(err.message || "Failed to load approved users");
      setApprovedUsers([]);
    }
  };

  useEffect(() => {
    fetchApproved().finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-approved-container">
      <h1 className="section-title">Approved Users</h1>
      {loading ? (
        <p className="loading-text">Loading approved users...</p>
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>
        </div>
      ) : (
        <div className="user-grid">
          {approvedUsers.map((item, index) => (
            <div className="user-card user-card-approved" key={index}>
              <div className="user-info-unapp">
                <div className="user-info-unapp-one">
                  <div>
                    <h3>
                      {item.first_name} {item.last_name}
                    </h3>
                    <p className="user-email">{item.email}</p>
                  </div>

                  <div className="user-meta-grid">
                    <span className="user-meta-chip">
                      <strong>Gender:</strong> {item.gender || "Not provided"}
                    </span>
                    <span className="user-meta-chip">
                      <strong>Phone #:</strong> {item.phone || "Not provided"}
                    </span>
                    <span className="user-meta-chip">
                      <strong>Date of birth:</strong>{" "}
                      {formatDate(item.date_of_birth)}
                    </span>
                    <span className="user-meta-chip">
                      <strong>Email confirmed:</strong>{" "}
                      {item.is_email_confirm ? "Yes" : "No"}
                    </span>
                    <span className="user-meta-chip">
                      <strong>Phone confirmed:</strong>{" "}
                      {item.is_phone_confirm ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="user-info-unapp-two">
                  <p className="cnic-label">CNIC submission</p>
                  <div className="user-cnic-preview">
                    {item.cnic_url ? (
                      <img
                        src={item.cnic_url}
                        alt={`${item.first_name} ${item.last_name} CNIC`}
                        loading="lazy"
                        onClick={() => setSelectedCnic(item.cnic_url)} // Add this
                        style={{ cursor: "pointer" }} // Add this
                      />
                    ) : (
                      <span className="user-meta-chip warning">
                        CNIC image missing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedCnic && (
        <div className="modal-overlay" onClick={() => setSelectedCnic(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setSelectedCnic(null)}
            >
              &times;
            </button>
            <img
              src={selectedCnic}
              alt="CNIC Document"
              className="modal-cnic-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApproved;
