import React, { useEffect, useState } from "react";
import "../styles/Admin.css";
import { useNavigate } from "react-router-dom";

const formatDate = (value) => {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatUserType = (userType) => {
  if (!userType) return "";

  const normalized = userType.toLowerCase();

  if (normalized === "poster" || normalized === "job_poster") {
    return "JOB POSTER";
  }

  if (normalized === "seeker" || normalized === "job_seeker") {
    return "JOB SEEKER";
  }

  
  return userType.replace(/_/g, " ").toUpperCase();
};


const AdminComplaints = ({ statusFilter = "pending" }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const navigate = useNavigate();

const visibleComplaints = complaints.filter(
  (c) => c.status === statusFilter
);

 useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:5000/api/complaints?status=${encodeURIComponent(
          statusFilter
        )}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load complaints");

      setComplaints(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [statusFilter]);

const handleIgnoreComplaint = async (complaint) => {
  try {
    const res = await fetch(
      "http://localhost:5000/api/admin/complaints/resolve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: complaint.id,
          reportedUserId: complaint.reported?.id,
          action: "ignore",
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to ignore complaint");
    }


    setComplaints((prev) => prev.filter((c) => c.id !== complaint.id));
  } catch (err) {
    console.error("Ignore complaint error:", err);
    alert(err.message || "Failed to ignore complaint");
  }
};

  if (loading)
    return (
      <div className="center-loader">
        <div className="spinner"></div>
        <p>Loading complaints...</p>
      </div>
    );

  if (error)
    return (
      <div className="empty-state">
        <p>{error}</p>
      </div>
    );

  if (!complaints.length)
    return (
      <div className="empty-state">
        <p>No complaints found.</p>
      </div>
    );

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
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e293b",
              margin: "0 0 8px 0",
              letterSpacing: "-0.5px",
            }}
          >
            User Complaints
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "16px",
              margin: "0",
            }}
          >
            Review and manage all user-reported issues
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "8px 20px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            }}
          >
{visibleComplaints.length} Complaint
{visibleComplaints.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div
        className="user-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))",
          gap: "24px",
        }}
      >
{visibleComplaints.map((item) => {
          const complainant = item.complainant || {};
          const reported = item.reported || {};

          const complainantAvatar =
            complainant.avatar_url || "/images/default-avatar.png";
          const reportedAvatar =
            reported.avatar_url || "/images/default-avatar.png";

          
          const complainantRole = formatUserType(complainant.user_type);
          const reportedRole = formatUserType(reported.user_type);

          return (
  <div
    className="user-card-unapp"
    key={item.id}
    style={{
      background: "white",
      borderRadius: "20px",
      padding: "0",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)",
      border: "1px solid #f1f5f9",
      overflow: "hidden",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      position: "relative",
    }}
  >
   
    <div
      style={{
        height: "4px",
        background: "linear-gradient(90deg, #8b5cf6, #3b82f6)",
        width: "100%",
      }}
    ></div>

   
    <div
      style={{
        padding: "10px 20px 0 20px",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          color: "#64748b",
        }}
      >
        <input
          type="checkbox"
          checked={item.status === "resolved"}
          readOnly
        />
        <span>Marked as resolved</span>
      </label>
    </div>

   
    <div style={{ padding: "18px 28px 28px 28px" }}>

                
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    marginBottom: "28px",
                    paddingBottom: "28px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                 
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        padding: "20px",
                        background:
                          "linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%)",
                        borderRadius: "16px",
                        border: "1px solid #e0e7ff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "56px",
                            height: "56px",
                          }}
                        >
                          <img
                            src={complainantAvatar}
                            alt="Complainant"
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "3px solid white",
                              boxShadow:
                                "0 4px 12px rgba(99, 102, 241, 0.1)",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: "0",
                              right: "0",
                              width: "16px",
                              height: "16px",
                              backgroundColor: "#10b981",
                              borderRadius: "50%",
                              border: "2px solid white",
                            }}
                          ></div>
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "#6366f1",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              display: "inline-block",
                              padding: "4px 10px",
                              backgroundColor: "rgba(99, 102, 241, 0.1)",
                              borderRadius: "20px",
                              marginBottom: "8px",
                            }}
                          >
                            Complainant
                          </span>
                          <h3
                            style={{
                              fontSize: "16px",
                              fontWeight: "700",
                              color: "#1e293b",
                              margin: "4px 0",
                              lineHeight: "1.3",
                            }}
                          >
                            {complainant.first_name} {complainant.last_name}
                          </h3>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            <span style={{ opacity: 0.7 }}>✉️</span>
                            <span style={{ fontSize: "13px" }}>
                              {complainant.email}
                            </span>
                          </div>

                          {complainantRole && (
                            <div
                              style={{
                                marginTop: "6px",
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                backgroundColor: "rgba(34,197,94,0.08)",
                                color: "#16a34a",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.6px",
                              }}
                            >
                              {complainantRole}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                 
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        padding: "20px",
                        background:
                          "linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)",
                        borderRadius: "16px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "56px",
                            height: "56px",
                          }}
                        >
                          <img
                            src={reportedAvatar}
                            alt="Reported user"
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "3px solid white",
                              boxShadow:
                                "0 4px 12px rgba(245, 158, 11, 0.1)",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: "0",
                              right: "0",
                              width: "16px",
                              height: "16px",
                              backgroundColor: "#ef4444",
                              borderRadius: "50%",
                              border: "2px solid white",
                            }}
                          ></div>
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "#dc2626",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              display: "inline-block",
                              padding: "4px 10px",
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              borderRadius: "20px",
                              marginBottom: "8px",
                            }}
                          >
                            Reported User
                          </span>
                          <h3
                            style={{
                              fontSize: "16px",
                              fontWeight: "700",
                              color: "#1e293b",
                              margin: "4px 0",
                              lineHeight: "1.3",
                            }}
                          >
                            {reported.first_name} {reported.last_name}
                          </h3>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            <span style={{ opacity: 0.7 }}>✉️</span>
                            <span style={{ fontSize: "13px" }}>
                              {reported.email}
                            </span>
                          </div>

                          {reportedRole && (
                            <div
                              style={{
                                marginTop: "6px",
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                backgroundColor: "rgba(248,113,113,0.08)",
                                color: "#dc2626",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.6px",
                              }}
                            >
                              {reportedRole}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

               
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "20px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#e0f2fe",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0ea5e9",
                        fontSize: "18px",
                      }}
                    >
                      📄
                    </div>
                    <h4
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#1e293b",
                        margin: "0",
                      }}
                    >
                      Task Details
                    </h4>
                  </div>

                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <p
                      style={{
                        margin: "0",
                        color: "#475569",
                        lineHeight: "1.6",
                        fontSize: "14px",
                      }}
                    >
                      {item.task?.description || "No task description."}
                    </p>
                  </div>
                </div>

              
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "20px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "12px",
                    border: "1px solid #fecaca",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#fee2e2",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#dc2626",
                        fontSize: "18px",
                      }}
                    >
                      ⚠️
                    </div>
                    <h4
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#1e293b",
                        margin: "0",
                      }}
                    >
                      Complaint Details
                    </h4>
                  </div>

                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <p
                      style={{
                        margin: "0",
                        color: "#475569",
                        lineHeight: "1.6",
                        fontSize: "14px",
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

               
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "20px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    ></div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Report Registered On
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          color: "#475569",
                          fontWeight: "500",
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>🕒</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                    }}
                  >

{item.status === "pending" && (
  <div style={{ display: "flex", gap: "10px" }}>
    <button
      style={{
        padding: "10px 20px",
        backgroundColor: "white",
        color: "#6366f1",
        border: "1px solid #6366f1",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minWidth: "100px",
      }}
      onMouseOver={(e) => {
        e.target.style.backgroundColor = "#6366f1";
        e.target.style.color = "white";
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = "white";
        e.target.style.color = "#6366f1";
      }}
      onClick={() => handleIgnoreComplaint(item)}
    >
      Ignore Complaint
    </button>

    <button
      style={{
        padding: "10px 20px",
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minWidth: "100px",
        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
      }}
      onMouseOver={(e) => {
        e.target.style.backgroundColor = "#0da271";
        e.target.style.transform = "translateY(-1px)";
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = "#10b981";
        e.target.style.transform = "translateY(0)";
      }}
      onClick={() =>
        navigate(`/admin/complaints/${item.id}/resolve`, {
          state: { complaint: item },
        })
      }
    >
      Resolve Complaint
    </button>
  </div>
)}


                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminComplaints;
