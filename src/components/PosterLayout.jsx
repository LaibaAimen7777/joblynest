import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import supabase from "../supabaseClient";
import PosterAccount from "./PosterAccount";
import PosterNotifications from "./PosterNotifications";
import useNotifications from "../useNotifications";
import {
  FiBell,
  FiHome,
  FiUsers,
  FiLogOut,
  FiPlusCircle,
  FiCompass,
  FiClipboard,
  FiHelpCircle,
} from "react-icons/fi";
import "../styles/PosterDashboard.css";

const PosterLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [layoutLoading, setLayoutLoading] = useState(true);

  const [posterName, setPosterName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );
  const [userId, setUserId] = useState(null);
  const {
    notifications,
    notificationCount,
    markAsRead,
    markAllRead,
    setNotificationCount,
  } = useNotifications(userId);
  const [showAccount, setShowAccount] = useState(false);
  const [user1, setUser1] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
        setUser1(user);
        setUserId(user.id);
        console.log("USer", user);
        if (!user) return;

        const { data: posterRow, error: posterError } = await supabase
          .from("poster")
          .select("poster_id, profile_picture")
          .eq("poster_id", user.id)
          .single();
        console.log("Poster Row", posterRow);

        if (posterRow?.profile_picture) {
          setAvatarUrl(posterRow.profile_picture);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setPosterName(`${profile.first_name} ${profile.last_name}`);
        }
      } catch (e) {
        console.error("PosterLayout init error", e);
      } finally {
        setLayoutLoading(false);
      }
    };

    init();
  }, []);
  if (layoutLoading) {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.setItem("is_logged_in", false);
    localStorage.removeItem("supabaseSession");
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="pd-container">
      <header className="pd-navbar">
        <div
          className="pd-logo"
          style={{ cursor: "pointer" }}
        >
          <img
            src="/images/joblynest-logo4.png" 
            alt="JoblyNest Logo"
            style={{
              height: window.innerWidth <= 500 ? "60px" : "65px",
              width: "auto",
              padding: "0px",
              marginLeft: window.innerWidth <= 500 ? "170px" : "30px",
            }}
          />
        </div>
        <nav className="pd-navlinks">
          <Link
            className={`pd-navlink ${
              isActive("/poster-dashboard") ? "active" : ""
            }`}
            to="/poster-dashboard"
          >
            <FiHome /> Homepage
          </Link>
          <Link
            className={`pd-navlink ${
              isActive("/poster-my-tasks") ? "active" : ""
            }`}
            to="/poster-my-tasks"
          >
            <FiUsers /> My Tasks
          </Link>
          <Link
            className={`pd-navlink ${
              isActive("/poster-seeker-requests") ? "active" : ""
            }`}
            to="/poster-seeker-requests"
          >
            <FiClipboard /> Seeker Requests
          </Link>
          <div
            className="pd-navlink"
            onClick={() => {
              setShowNotifications(true);
            }}
            style={{ cursor: "pointer" }}
          >
            <FiBell /> Notifications
            {notificationCount > 0 && (
              <span className="pd-badge">{notificationCount}</span>
            )}
          </div>
        </nav>

        <div className="pd-right">
          <button
            className="pd-faq-button"
            onClick={() => navigate("/faq")}
            aria-label="FAQ & Help"
            title="FAQ & Help Center"
          >
            <FiHelpCircle />
          </button>
          <div className="pd-user-info" onClick={() => setShowAccount(true)}>
            <img src={avatarUrl} alt="Profile" className="pd-avatar" />

            <div>
              <p className="pd-username">{posterName || "Poster"}</p>
              <p className="pd-click-hint">Tap to view profile</p>
            </div>
          </div>

          <button
            className="pd-logout"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <FiLogOut />
          </button>
        </div>
      </header>

      <main className="pd-main">{children}</main>

      {showAccount && (
        <PosterAccount
          isOpen={showAccount}
          onClose={() => setShowAccount(false)}
          onAvatarChange={setAvatarUrl}
        />
      )}

      {showNotifications && (
        <div className="pd-modal-overlay">
          <PosterNotifications
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
            onRead={markAsRead}
            onMarkAll={markAllRead}
          />
        </div>
      )}
    </div>
  );
};

export default PosterLayout;
