import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import "react-toastify/dist/ReactToastify.css";
import "../styles/PosterNotifications.css";
import { MdNotifications } from "react-icons/md";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Loader from "./Loader";

const PosterNotifications = ({ notifications, onClose, onRead, onMarkAll }) => {
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleNotificationClick = async (notif) => {
    onClose();

    if (!notif.read && onRead) await onRead(notif.id);

    if (notif.status === "message" && notif.related_id) {
      try {
        const { data: hireRequest, error } = await supabase
          .from("hire_requests")
          .select("*")
          .eq("id", notif.related_id)
          .single();

        if (error) throw error;

        navigate(`/messages/${notif.related_id}`, {
          state: { request: hireRequest },
        });
      } catch (err) {
        console.error("Error fetching hire request:", err.message);
      }
    } else if (
      ["accepted", "rejected", "pending"].includes(notif.status) &&
      notif.related_id
    ) {
      navigate("/poster-my-tasks", {
        state: { highlightTaskId: notif.related_id },
      });
    } else {
      console.log(" No navigation path for this notification type");
    }
  };

  return (
    <div className="poster-notifications-container">
      <div className="poster-notifications-header">
        <h2 className="poster-notifications-title">Notifications</h2>
        {notifications.length > 0 && (
          <div className="poster-notifications-count">
            {notifications.filter((n) => !n.read).length} unread
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
          <button onClick={onMarkAll} className="poster-mark-all-btn">
            Mark all read
          </button>

          <button
            className="close-notif-btn"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "white",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="poster-notifications-empty">
          <div className="poster-notifications-empty-icon">
            <MdNotifications />
          </div>
          <h3>No notifications yet</h3>
          <p>
            When you receive notifications about your job posts, they'll appear
            here.
          </p>
        </div>
      ) : (
        <div className="poster-notifications-list">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`poster-notification-item ${
                n.read ? "posternotif-read" : "posternotif-unread"
              }`}
              onClick={() => handleNotificationClick(n)}
              style={{ cursor: "pointer" }}
            >
              <div className="posternotif-icon">
                <MdNotifications />
              </div>
              <div className="posternotif-content">
                <p className="posternotif-message">{n.message}</p>
                <div className="posternotif-meta">
                  <span className="posternotif-time">
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="posternotif-date">
                    {formatDate(n.created_at)}
                  </span>
                </div>
              </div>
              <div className="posternotif-actions">
                {!n.read && <span className="posternotif-badge">New</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PosterNotifications;
