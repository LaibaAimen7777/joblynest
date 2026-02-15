import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/VerificationFlow.css";

const statusCopy = {
  pending: {
    title: "Request In Review",
    highlight: "Pending",
    helper:
      "Our team is reviewing your information. You will receive an email as soon as the review is complete.",
  },
  rejected: {
    title: "Action Required",
    highlight: "Rejected",
    helper:
      "Your previous submission did not meet our verification requirements. Please review your documents and try again.",
  },
  missing_cnic: {
    title: "Upload Required",
    highlight: "Missing CNIC",
    helper:
      "We still need your CNIC to continue with the review. You can upload it now.",
  },
  approved: {
    title: "Approved",
    highlight: "Approved",
    helper: "Your account is ready. Please continue to the dashboard.",
  },
};

const ShowStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const status = location.state?.status || "pending";
  const message =
    location.state?.message ||
    "We are reviewing your submission. You will be notified shortly.";

  const copy = statusCopy[status] || statusCopy.pending;

  return (
    <div className="verification-page">
      <div className="verification-card status-card">
        <div className={`status-chip ${status}`}>
          {copy.highlight}
        </div>

        <h1 className="verification-title">{copy.title}</h1>
        <p className="status-message">{message}</p>
        <p className="status-helper">{copy.helper}</p>

        <div className="status-actions">
          {status === "rejected" && (
            <button
              onClick={() => navigate("/set_cnic", { state: { fromStatus: status } })}
              className="verification-primary-btn"
            >
              Update CNIC Details
            </button>
          )}
          <button
            onClick={() => navigate("/login")}
            className="verification-secondary-btn"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShowStatus;

