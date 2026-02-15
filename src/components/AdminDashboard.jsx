import React, { useState } from "react";
import AdminRegistration from "./AdminRegistration";
import AdminApproved from "./AdminApproved";
import "../styles/Admin.css";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, CheckCircle, LogOut, AlertTriangle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import AdminComplaints from "./AdminComplaints";
import supabase from "../supabaseClient.js";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = location.state?.activeTab || "unapproved";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleSignout = async (e) => {
    const { error } = await supabase.auth.signOut();

    localStorage.setItem("is_logged_in", false);
    localStorage.setItem("is_admin", false);

    if (error) throw error;
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-content">
          <div className="profile-section">
            <img
              className="profile-pic"
              src="/images/3.jpg"
              alt="Admin Profile"
            />
            <h2>Admin</h2>
          </div>

          <h2>Admin Panel</h2>
          <button
            className={activeTab === "unapproved" ? "active" : ""}
            onClick={() => setActiveTab("unapproved")}
          >
            <Clock size={18} style={{ marginRight: "8px" }} />
            Unapproved Users
          </button>
          <button
            className={activeTab === "approved" ? "active" : ""}
            onClick={() => setActiveTab("approved")}
          >
            <CheckCircle size={18} style={{ marginRight: "8px" }} />
            Approved Users
          </button>
          <button
  className={activeTab === "complaints" ? "active" : ""}
  onClick={() => setActiveTab("complaints")}
>
  <AlertTriangle size={18} style={{ marginRight: "8px" }} />
  New Complaints
</button>
<button
  className={activeTab === "resolvedComplaints" ? "active" : ""}
  onClick={() => setActiveTab("resolvedComplaints")}
>
  <AlertTriangle size={18} style={{ marginRight: "8px" }} />
  Resolved Complaints
</button>

        </div>

        <button onClick={handleSignout} className="logout-button">
          <LogOut size={16} style={{ marginRight: "8px" }} /> Sign Out
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div className="dashboard-header">
            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  marginBottom: "8px",
                }}
              >
                Welcome Back, Admin!
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  opacity: "0.85",
                  lineHeight: "1.5",
                  marginTop: "5px",
                  maxWidth: "360px",
                }}
              >
                This dashboard helps you review sign-ups, validate profiles, and
                maintain platform integrity efficiently.
              </p>
            </div>

            <img
              src="/images/5.png"
              alt="Admin Illustration"
              className="admin-profile-pic"
              style={{ width: "260px", height: "150px" }}
            />
          </div>
        </div>

     {activeTab === "unapproved" && <AdminRegistration />}
{activeTab === "approved" && <AdminApproved />}

{activeTab === "complaints" && (
  <AdminComplaints statusFilter="pending" />  
)}

{activeTab === "resolvedComplaints" && (
  <AdminComplaints statusFilter="resolved" />
)}

      </main>
    </div>
  );
};

export default AdminDashboard;
