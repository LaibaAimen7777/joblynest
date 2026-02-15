import React, { useEffect, useState } from "react";
import "../styles/Admin.css";
import supabase from "../supabaseClient.js";

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

function AdminRegistration() {
  const [list, setList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCnic, setSelectedCnic] = useState(null);

  const fetchList = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/listOfUsers");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load users");
      }
      const safeData = Array.isArray(data) ? data : [];
      setList(safeData);
    } catch (err) {
      console.error("Fetch list error:", err);
      setError(err.message || "Failed to load users");
      setList([]); 
    }
  };

  const handleApproval = async (id, approval) => {
    try {
      const token = localStorage.getItem("admin_token"); 
      if (!token) {
        setError("Admin not logged in.");
        return;
      }
      const response = await fetch("http://localhost:5000/api/updateApproval", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ id, approval }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update approval");
      }

      fetchList();
    } catch (err) {
      console.error("Approval error:", err);
      setError(err.message || "Failed to update approval");
    }
  };

  useEffect(() => {
    fetchList().finally(() => setLoading(false));
  }, []);

  const pendingList = list.filter(
    (item) =>
      (item?.is_email_confirm === true || item?.is_phone_confirm === true) &&
      item?.is_approved === false &&
      item?.is_rejected === false &&
      item?.cnic_url &&
      item.cnic_url.trim() !== ""
  );

  return (
    <div>
      <h2
        className="section-title"
        style={{ marginBottom: "15px", color: "#111827" }}
      >
        Pending Approvals
      </h2>

      {loading ? (
        <div className="center-loader">
          <div className="spinner"></div>
          <p>Loading pending approvals...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>
        </div>
      ) : pendingList.length === 0 ? (
        <div className="empty-state">
          <p>No pending approvals at this time</p>
        </div>
      ) : (
        <div className="user-grid">
          {pendingList.map((item, index) => (
            <div className="user-card-unapp" key={index}>
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
                        onClick={() => setSelectedCnic(item.cnic_url)} 
                        style={{ cursor: "pointer" }} 
                      />
                    ) : (
                      <span className="user-meta-chip warning">
                        CNIC image missing
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="user-buttons">
                <div className="card-actions">
                  <button onClick={() => handleApproval(item.id, "accept")}>
                    Accept
                  </button>
                  <button
                    className="reject"
                    onClick={() => handleApproval(item.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
         {selectedCnic && (
      <div 
        className="modal-overlay" 
        onClick={() => setSelectedCnic(null)}
      >
        <div 
          className="modal-content" 
          onClick={(e) => e.stopPropagation()}
        >
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
}

export default AdminRegistration;
