import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles/Admin.css";
import Modal from "../components/Modal"; 



const ResolveComplaint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [modal, setModal] = useState(null);

  const complaint = location.state?.complaint;

  const reported = complaint?.reported || {};
  const complainant = complaint?.complainant || {};
  const task = complaint?.task || {};

  const handleAction = async (actionType) => {
    try {
      await fetch("http://localhost:5000/api/admin/complaints/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: id,
          reportedUserId: reported.id,
          action: actionType, 
        }),
      });

setModal({
  title: "Action Applied",
  message:
    actionType === "ban"
      ? "User permanently banned."
      : actionType === "suspend_week"
      ? "User suspended."
      : "Warning sent.",
  type: "success",
});
    } catch (err) {
      console.error(err);
      alert("Failed to apply action. Please try again.");
    }
  };

  if (!complaint) {
    return (
      <div className="empty-state" style={{ padding: "40px" }}>
        <p>Complaint details not found. Go back and try again.</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: "16px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#6366f1",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 24px",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
      }}
    >

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "32px",
          position: "relative",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            backgroundColor: "white",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            transition: "all 0.2s ease",
            position: "absolute",
            left: "0",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#f1f5f9";
            e.target.style.borderColor = "#94a3b8";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "white";
            e.target.style.borderColor = "#cbd5e1";
          }}
        >
          <span style={{ fontSize: "18px" }}>←</span>
          Go Back
        </button>

        <div
          style={{
            flex: "1",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e293b",
              margin: "0",
              letterSpacing: "-0.5px",
              textAlign: "center",
            }}
          >
            Resolve Complaint
          </h1>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >

        <div>
          <div
            style={{
              padding: "24px",
              backgroundColor: "white",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f1f5f9",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "8px",
              }}
            >
              Choose an action
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "15px",
                marginBottom: "28px",
              }}
            >
              Select the appropriate action to take against the reported user
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  backgroundColor: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                  border: "1px solid #fecaca",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(220, 38, 38, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: "#fee2e2",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#dc2626",
                    fontSize: "20px",
                  }}>
                    🚫
                  </div>
                  <h4
                    style={{
                      margin: "0",
                      fontSize: "17px",
                      fontWeight: "700",
                      color: "#b91c1c",
                    }}
                  >
                    Ban permanently
                  </h4>
                </div>
                <p
                  style={{
                    margin: "0 0 18px 0",
                    fontSize: "14px",
                    color: "#4b5563",
                    lineHeight: 1.6,
                    paddingLeft: "52px",
                  }}
                >
                  User will be permanently banned and will not be able to log in or
                  use the platform again.
                </p>
                <button
                  onClick={() => handleAction("ban")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    width: "100%",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#b91c1c";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#dc2626";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Ban User
                </button>
              </div>

              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                  border: "1px solid #fde68a",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(245, 158, 11, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: "#fef3c7",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#d97706",
                    fontSize: "20px",
                  }}>
                    ⏳
                  </div>
                  <h4
                    style={{
                      margin: "0",
                      fontSize: "17px",
                      fontWeight: "700",
                      color: "#92400e",
                    }}
                  >
                    Suspend for 1 week
                  </h4>
                </div>
                <p
                  style={{
                    margin: "0 0 18px 0",
                    fontSize: "14px",
                    color: "#4b5563",
                    lineHeight: 1.6,
                    paddingLeft: "52px",
                  }}
                >
                  Temporarily disable this account for 7 days. The user will not be
                  able to book or accept tasks during this period.
                </p>
                <button
                  onClick={() => handleAction("suspend_week")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    width: "100%",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#d97706";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#f59e0b";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Suspend for a Week
                </button>
              </div>

              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  border: "1px solid #bfdbfe",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(37, 99, 235, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: "#dbeafe",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    fontSize: "20px",
                  }}>
                    ⚠️
                  </div>
                  <h4
                    style={{
                      margin: "0",
                      fontSize: "17px",
                      fontWeight: "700",
                      color: "#1d4ed8",
                    }}
                  >
                    Send a warning
                  </h4>
                </div>
                <p
                  style={{
                    margin: "0 0 18px 0",
                    fontSize: "14px",
                    color: "#4b5563",
                    lineHeight: 1.6,
                    paddingLeft: "52px",
                  }}
                >
                  Send an official warning email/notification to the user and mark
                  this complaint as resolved with a warning.
                </p>
                <button
                  onClick={() => handleAction("warning")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    width: "100%",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#2563eb";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#3b82f6";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Send Warning
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              padding: "24px",
              backgroundColor: "white",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)",
              border: "1px solid #f1f5f9",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "24px",
              }}
            >
              Complaint Details
            </h2>

            <div
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                border: "1px solid #fecaca",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#b91c1c",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#dc2626",
                  fontSize: "16px",
                }}>
                  👤
                </span>
                Reported User
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>
                    Name
                  </p>
                  <p style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                    {reported.first_name} {reported.last_name}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>
                    Email
                  </p>
                  <p style={{ margin: "0", fontSize: "15px", color: "#4b5563" }}>
                    {reported.email}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "1px solid #bae6fd",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#0369a1",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#e0f2fe",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0ea5e9",
                  fontSize: "16px",
                }}>
                    🙋
                </span>
                Complainant
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>
                    Name
                  </p>
                  <p style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                    {complainant.first_name} {complainant.last_name}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>
                    Email
                  </p>
                  <p style={{ margin: "0", fontSize: "15px", color: "#4b5563" }}>
                    {complainant.email}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1px solid #e2e8f0",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  fontSize: "16px",
                }}>
                  📝
                </span>
                Complaint Description
              </h3>
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
              }}>
                <p
                  style={{
                    margin: "0",
                    color: "#4b5563",
                    fontSize: "15px",
                    lineHeight: 1.6,
                  }}
                >
                  {complaint.description}
                </p>
              </div>
            </div>

              {modal && (
  <Modal
    title={modal.title}
    message={modal.message}
    type={modal.type}
    onClose={() => {
      setModal(null);
      navigate(-1); 
    }}
  />
)}

            </div>
          </div>
        </div>
      </div>
  
  );
};

export default ResolveComplaint;