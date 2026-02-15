import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import supabase from "../supabaseClient.js";

function SeekerAccount({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserProfile = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User fetch error:", userError?.message || "No user");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single();

      if (error) {
        console.error("Profile fetch error:", error.message);
      }
      setProfile(data || null);
      setLoading(false);
    };

    fetchUserProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeactivate = async () => {
    setConfirmModal(false);

    try {
      const response = await fetch("http://localhost:5000/api/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusModal({
          show: true,
          message: "Account deactivated successfully. Logging you out...",
          type: "success",
        });

        setTimeout(async () => {
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.href = "/login";
        }, 2500);
      } else {
        setStatusModal({
          show: true,
          message: result.message || "Failed to deactivate account.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Deactivation error:", err);
      setStatusModal({
        show: true,
        message: "Something went wrong. Please try again later.",
        type: "error",
      });
    }
  };
  return (
    <div className="modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="modal-content-acc"
      >
        <button onClick={onClose} className="close-btn">
          ✕
        </button>

        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading your profile...</p>
          </div>
        ) : !profile ? (
          <div className="info-box text-center">
            <p>No profile found.</p>
          </div>
        ) : (
          <div className="main-container">
            <div className="top-row">
              <div className="info-box">
                <h3>Full Name</h3>
                <p>{profile.first_name + " " + profile.last_name}</p>
              </div>

              <div className="info-box">
                <h3>Email</h3>
                <p>{profile.email}</p>
              </div>
            </div>

            <div className="top-row">
              <div className="info-box">
                <h3>Phone Number</h3>
                <p>{profile.phone || "Not provided"}</p>
              </div>

              <div className="info-box">
                <h3>Gender</h3>
                <p>{profile.gender || "Not specified"}</p>
              </div>
            </div>

            <div className="bottom-row info-box">
              <h3>CNIC Verification</h3>
              {profile.cnic_url ? (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={profile.cnic_url}
                    alt="CNIC Document"
                    className="cnic-img"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(profile.cnic_url, "_blank")}
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "8px",
                      fontStyle: "italic",
                    }}
                  >
                    Click image to view full size
                  </p>
                </div>
              ) : (
                <p style={{ color: "#999", fontStyle: "italic" }}>
                  No CNIC uploaded
                </p>
              )}
            </div>

            <button
              className="deactivate-btn"
              onClick={() => setConfirmModal(true)}
            >
              Deactivate Account
            </button>
          </div>
        )}

        {confirmModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="status-modal"
          >
            <div className="status-box confirm">
              <p>
                Are you sure you want to deactivate your account? <br />
                You won’t be able to log in again until reactivated.
              </p>
              <div className="btn-group">
                <button onClick={handleDeactivate}>Yes, Deactivate</button>
                <button
                  onClick={() => setConfirmModal(false)}
                  style={{ background: "#6c757d" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {statusModal.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="status-modal"
          >
            <div
              className={`status-box ${
                statusModal.type === "success" ? "success" : "error"
              }`}
            >
              <p>{statusModal.message}</p>
              <button
                onClick={() =>
                  setStatusModal({ show: false, message: "", type: "" })
                }
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <style>{`
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(90, 85, 85, 0.05);
  backdrop-filter: blur(5px);
  z-index: 9999;
  overflow: hidden; /*  hide any overflow to avoid scrollbars on page */
}


.close-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 18px; /* 1.5rem */
  color: #036586;
  cursor: pointer;
  background: rgba(255,255,255,0.75);
  border: none;
  padding: 6px 11px; /* 0.4rem 0.7rem */
  border-radius: 50%;
  transition: all 0.2s;
  margin-bottom:10px;
}
.close-btn:hover {
  background: rgba(107, 96, 171, 0.25);
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px; /* 2rem */
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top: 4px solid #181bb7ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px; /* 1rem */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.info-box {
  padding: 15px; /* 1.2rem */
  background: rgba(255, 255, 255, 1);
  border: 1px solid rgba(26, 23, 23, 0.25);
  border-radius: 16px; /* 1rem */
  box-shadow: 0 2px 10px rgba(141, 122, 122, 0.15);
}
.info-box h3 {
  font-size: 18px; /* 1.1rem */
  font-weight: 600;
  margin-bottom: 5px; /* 0.5rem */
  margin-top:0;
  color: #036586;
}

.info-box p{
  font-size: 15px;
  text-align: left;

}

.main-container {
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 10px;
  width: 100%;
  margin-top: 22px;
}

.top-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px; /* 1.5rem */
}

/* Update CNIC image styling */
.cnic-img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  transition: transform 0.2s;
  cursor: pointer;
}
.cnic-img:hover {
  transform: scale(1.02);
}

.bottom-row {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 1rem */
}

.cnic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px; /* 1.5rem */
}

.cnic-img {
  width: 100%;
  border-radius: 12px; /* 0.75rem */
  box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  transition: transform 0.2s;
}
.cnic-img:hover {
  transform: scale(1.02);
}

/*  Deactivate Button */
.deactivate-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(220,53,69,0.3);
  transition: all 0.2s ease-in-out;
  width: 100%;
}
.deactivate-btn:hover {
  background: #c82333;
  transform: scale(1.02);
}




/*  Common Modal Overlay (confirmation + status modals) */
.status-modal {
  position: fixed;
  inset: 0;
  //background: rgba(0, 0, 0, 0.4); /* darker overlay for focus */
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000; /* stays above everything */
}

/*  Status Box and Animation */
.status-box {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  padding: 20px 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  text-align: center;
  width: 80%;
  max-width: 400px;
  animation: pop 0.3s ease;
  position: relative;
  z-index: 10001;
}
.status-box p {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}
.status-box button {
  background: #036586;
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.status-box button:hover {
  background: #02485f;
}

.status-box.success {
  border-top: 4px solid #28a745;
}
.status-box.error {
  border-top: 4px solid #dc3545;
}
.status-box.confirm {
  border-top: 4px solid #036586;
}

.btn-group {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
}

@keyframes pop {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/*  Fix grey background issue */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(90, 85, 85, 0.05);
  backdrop-filter: blur(5px);
  z-index: 999; /* lowered from 9999 to stay behind modals */
  overflow: hidden;
}

/* Account Modal (base content) */
.modal-content-acc {
  position: relative;
  z-index: 1000; /* below confirmation/status modals */
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px) saturate(180%);
  border-radius: 19px;
  padding: 28px;
  width: 90%;
  max-width: 650px;
  box-shadow: 0 8px 32px rgba(110, 98, 98, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #036586;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  overflow: visible;
  height:500px;
}

      `}</style>
    </div>
  );
}

export default SeekerAccount;
