import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/SeekerNotifications.css";
import { MdNotifications } from "react-icons/md";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import useNotifications from "../useNotifications";


const SeekerNotifications = ({   notifications, notificationCount, markAsRead, markAllRead, onNavigateToRequests }) => {
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
  console.log(" Clicked notification:", notif);
  if (!notif.read) {
    await markAsRead(notif.id);
  }

  try {

    if (notif.status === "message" && notif.related_id) {
      const { data: hireRequest, error } = await supabase
        .from("hire_requests")
        .select("*")
        .eq("id", notif.related_id) 
        .single();

      if (error) throw error;

      navigate(`/messages/${notif.related_id}`, {
        state: { request: hireRequest },
      });

 

    } else if (["accepted", "rejected", "pending", "completed"].includes(notif.status) && notif.related_id) {
      if (notif.related_id && onNavigateToRequests) {
        onNavigateToRequests(notif.related_id);
      }
    } else {
      console.log(" No navigation path for this notification type");
    }
  } catch (err) {
    console.error(" Error handling notification click:", err.message);
  }
};

if (!notifications) return <p>Loading notifications...</p>;

  return (
    <div className="seeker-notifications-container">
      <div className="seeker-notifications-header">
        <h2 className="seeker-notifications-title">Notifications</h2>
        {notifications.length > 0 && (
          <div className="seeker-notifications-count">
            {notifications.filter(n => !n.read).length} unread
          </div>
        )}
        <button
          onClick={async () => {
            if (!userId) return;

            await markAllRead();

            
          }}
        >
          Mark all read
        </button>


      </div>
      
      {notifications.length === 0 ? (
        <div className="seeker-notifications-empty">
          <div className="seeker-notifications-empty-icon">🔔</div>
          <h3>No notifications yet</h3>
          <p>When you receive notifications, they'll appear here.</p>
        </div>
      ) : (
        <div className="seeker-notifications-list">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`seeker-notification-item ${n.read ? "seekernotif-read" : "seekernotif-unread"}`}
              onClick={() => handleNotificationClick(n)}
              style={{ cursor: "pointer" }}
            >
              <div className="seekernotif-icon">
                <MdNotifications />
              </div>

              <div className="seekernotif-content">
                <p className="seekernotif-message">{n.message}</p>
                <div className="seekernotif-meta">
                  <span className="seekernotif-time">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="seekernotif-date">
                    {formatDate(n.created_at)}
                  </span>
                </div>
              </div>
              <div className="seekernotif-actions">
                {!n.read && <span className="seekernotif-badge">New</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeekerNotifications;
