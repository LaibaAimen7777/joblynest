import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "../styles/SignupSuccess.css";
import { useNavigate } from "react-router-dom";

export default function SignupPhoneOtp() {
  const [otpInput, setOtpInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  const email = localStorage.getItem("signupEmail");
  const firstName = localStorage.getItem("signupFirstName");
  const phone = localStorage.getItem("signupPhone");

  const triggerCountdown = () => {
    setCooldown(45);
  };

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendPhoneOtp = async () => {
    if (!email || !phone) {
      setError("Missing signup details. Please register again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/send-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, firstName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }
      triggerCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sendPhoneOtp();
  }, []);

  const handleVerify = async () => {
    if (otpInput.trim().length === 0) {
      setError("Enter the OTP sent to your phone.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/verify-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "OTP verification failed.");
      }

      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResend = () => {
    if (cooldown === 0) {
      sendPhoneOtp();
    }
  };

  return (
    <div className="signupsuccess-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="signupsuccess-card"
      >
        <h2 className="title">Verify Your Phone</h2>
        <p className="subtitle">
          We sent a 6-digit code to
          <span className="email-highlight"> {phone || "your phone"}</span>
        </p>

        {loading ? (
          <p className="loading-text">Sending OTP...</p>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
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

            <button
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              style={{ marginTop: "12px" }}
            >
              {cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : "Resend OTP to phone"}
            </button>
          </>
        )}
      </motion.div>

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>OTP Verified</h3>
            <p>Phone verified successfully. Log in to continue.</p>
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

