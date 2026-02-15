import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "../styles/SignupSuccess.css";
import { useNavigate } from "react-router-dom";

export default function SignupSuccess() {
  const [otpInput, setOtpInput] = useState("");
  const [serverOtp, setServerOtp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handlePhoneBackup = () => {
    navigate("/signup-phone-otp");
  };

  const email = localStorage.getItem("signupEmail");
  const firstName = localStorage.getItem("signupFirstName");

  useEffect(() => {
    async function sendOtp() {
      setLoading(false);

      try {
        const res = await fetch("http://localhost:5000/api/send-signup-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to send OTP");
        } else {
          setServerOtp(String(data.otp)); 

        }
      } catch (err) {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    sendOtp();
  }, []);

  const handleVerify = async () => {
    if (otpInput.trim() === String(serverOtp).trim()) {
      try {
        
        await fetch("http://localhost:5000/api/confirm-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        setShowSuccessModal(true);
      } catch (err) {
        setError("Failed to confirm email. Try again.");
      }
    } else {
      setError("Incorrect OTP. Please try again.");
    }
  };

  return (
    <div className="signupsuccess-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        n
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="signupsuccess-card"
      >
        <h2 className="title">Verify Your Email</h2>
        <p className="subtitle">
          A 6-digit verification code has been sent to:
          <span className="email-highlight"> {email}</span>
        </p>

            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="otp-input"
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value);
                setError("");
              }}
            />

            {error && <div className="otp-error">{error}</div>}

            <button className="verify-btn" onClick={handleVerify}>
              Verify
            </button>
            <p>
              Did not receive OTP?{" "}
              <span
                onClick={handlePhoneBackup}
                style={{
                  color: "#007bff",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Get OTP on phone
              </span>
            </p>
        
      </motion.div>

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Success!</h3>
            <p>
              Email verified successfully. Now log into your account to continue.
            </p>
            <button
              className="ok-btn"
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/login"); 
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
