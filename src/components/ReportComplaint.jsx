import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import "../styles/ReportComplaint.css";


export default function ReportComplaint() {
  const location = useLocation();
  const navigate = useNavigate();

const {
  taskId,
  seekerId,
  seekerName,
  posterId,
  posterName,
} = location.state || {};

const reportedUserId = seekerId || posterId || null;
const reportedUserName = seekerName || posterName || "";

  const [userId, setUserId] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setError("You must be logged in to submit a complaint.");
        return;
      }
      setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  if (!taskId) {
    return <p>No task selected for complaint.</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!description.trim()) {
      setError("Please describe your complaint.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("http://localhost:5000/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
  task_id: taskId,
  complainant_id: userId,
  reported_user_id: reportedUserId,   
  description: description.trim(),
}),

      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit complaint");
      }

      setSuccess("Complaint submitted successfully. Our team will review it.");
      setDescription("");

 setTimeout(() => {
  navigate(-1);  
}, 1500);


    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reportComplaint-wrapper">
      <div className="reportComplaint-card">
        <h2>Report Complaint</h2>

        <div className="reportComplaint-info">
          {seekerName && (
            <p>
              <strong>Reported User:</strong> {seekerName}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="reportComplaint-form">
          <label htmlFor="description">
            Complaint Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            rows="5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what went wrong during this task..."
          />

          {error && <p className="reportComplaint-error">{error}</p>}
          {success && <p className="reportComplaint-success">{success}</p>}

          <div className="reportComplaint-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || !description.trim()}
            >
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
