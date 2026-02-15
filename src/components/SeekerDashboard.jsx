import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { FaUser, FaClock, FaEdit, FaBell, FaTasks, FaTh, FaCheckSquare } from "react-icons/fa";
import Profile from "./SeekerProfile";
import EditProfile from "./SeekerProfileForm";
import SetAvailibility from "./AvailabilityForm";
import SeekerAccount from "./SeekerAccount";
import SeekerNotifications from "./SeekerNotifications";
import SeekerRequests from "./SeekerRequests";
import MyTasks from "./MyTasks";
import useNotifications from "../useNotifications";
import SeekerStats from "./SeekerStats";
import Modal from "../components/Modal";

const SeekerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedView, setSelectedView] = useState("dashboard");
  const [profile_picture, setProfilePic] = useState(
    "https://i.pinimg.com/736x/64/99/f8/6499f89b3bd815780d60f2cbc210b2bd.jpg"
  );
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userId, setUserId] = useState(null);
  const [highlightRequestId, setHighlightRequestId] = useState(null);
  const { notifications, notificationCount, markAsRead, markAllRead } =
    useNotifications(userId);
  const [seekerDetails, setSeekerDetails] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskData, setTaskData] = useState([]);
  const [modal, setModal] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAvailabilityMissing =
    seekerDetails &&
    (!seekerDetails?.availability || seekerDetails.availability.length === 0);

  const isProfileIncomplete =
    seekerDetails &&
    (!seekerDetails?.main_category ||
      !seekerDetails?.geo_location ||
      !seekerDetails?.pay_rate);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      setIsLoading(false);
    };
    fetchUser();
  }, []);


  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("Error fetching user:", error);
        return;
      }

      setUser(user);
      console.log("user:", user);

      const { data: seekerData, error: seekerError } = await supabase
        .from("seeker")
        .select(
          "profile_picture, availability, main_category, pay_rate, geo_location"
        )
        .eq("seeker_id", user.id)
        .single();

      setSeekerDetails(seekerData);
      console.log("Seeker data:", seekerData);

      const { data: nameData, error: nameError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single();

      if (seekerError || nameError) {
        console.error("Error fetching seeker data:", seekerError || nameError);
        return;
      }

      if (nameData?.is_banned) {
        setModal({
          title: "Account Banned",
          message:
            "Your account has been permanently banned due to policy violations. You will be logged out.",
          type: "error",
        });

        await supabase.auth.signOut();
        localStorage.removeItem("is_logged_in");
        localStorage.removeItem("supabaseSession");

        setTimeout(() => {
          setModal(null);
          navigate("/login");
        }, 2000);

        return;
      }

      if (nameData?.suspended_until) {
        const now = new Date();
        const suspendedUntil = new Date(nameData.suspended_until);

        if (suspendedUntil > now) {
          setModal({
            title: "Account Suspended",
            message: `Your account is suspended until ${suspendedUntil.toLocaleString()}. You will be logged out.`,
            type: "error",
          });

          await supabase.auth.signOut();
          localStorage.removeItem("is_logged_in");
          localStorage.removeItem("supabaseSession");

          setTimeout(() => {
            setModal(null);
            navigate("/login");
          }, 2000);

          return;
        }
      }

      if (seekerData?.profile_picture) {
        setProfilePic(seekerData.profile_picture);
      }

      if (nameData) {
        setProfile(nameData);
      }

      console.log("Seeker_Profile_pic:", seekerData);
    };

    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("hire_requests")
          .select(
            `
          *,
          task(*)  -- fetch task details like main_category
        `
          )
          .eq("status", "accepted")
          .eq("seeker_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching requests:", error);
          setRequests([]);
          return;
        }

        console.log("Requests with tasks:", data);
        setRequests(data || []);
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchRequests();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("is_logged_in");
    localStorage.removeItem("supabaseSession");

    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
    navigate("/login");
  };

  useEffect(() => {
    if (!user) return;

    const fetchTaskStats = async () => {
      try {
        const { data, error } = await supabase
          .from("hire_requests")
          .select("date")
          .eq("seeker_id", user.id);

        if (error) {
          console.error("Error fetching task stats:", error);
          return;
        }

        const counts = {};
        data.forEach((row) => {
          const d = row.date;
          counts[d] = (counts[d] || 0) + 1;
        });

        const formatted = Object.entries(counts).map(([date, tasks]) => ({
          date,
          tasks,
        }));

        setTaskData(formatted);
        console.log("Task data (real):", formatted);
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchTaskStats();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_banned, suspended_until")
        .eq("email", user.email)
        .single();

      if (error || !data) return;

      if (data.is_banned) {
        setModal({
          title: "Account Banned",
          message:
            "Your account has been banned by admin. You will be logged out.",
          type: "error",
        });

        await supabase.auth.signOut();
        localStorage.clear();

        setTimeout(() => navigate("/login"), 2000);
      }

      if (data.suspended_until) {
        const now = new Date();
        const susp = new Date(data.suspended_until);

        if (susp > now) {
          setModal({
            title: "Account Suspended",
            message: `Your account is suspended until ${susp.toLocaleString()}.`,
            type: "error",
          });

          await supabase.auth.signOut();
          localStorage.clear();

          setTimeout(() => navigate("/login"), 2000);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleNavClick = (view) => {
    setSelectedView(view);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      <style>
        {`
.screen-wrapper {
  height: 100vh;
  // overflow: hidden; 
}

  .hamburger-menu {
    display: none;
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: #004f69ff;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 10px 14px;
    font-size: 24px;
    cursor: pointer;
  }

    .sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }


  @media (max-width: 500px) {
  /* Hamburger menu */
  .hamburger-menu {
    display: block;
  }
  
  /* Sidebar overlay */
  .sidebar-overlay.active {
    display: block;
  }
  
  /* Sidebar styling */
  .dashboard-sidebar {
    position: fixed;
    left: ${isSidebarOpen ? "0" : "-220px"};
    top: 0;
    height: 550px;
    width: 220px;
    z-index: 999;
    transition: left 0.3s ease;
    border-radius: 0;
    padding-top: 80px;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  }
  
  /* Adjust buttons for mobile */
  .nav-btn {
    width: 200px;
    margin-bottom: 8px;
  }
  
  .logout-btn {
    margin-top:0px;
  }

  
  /* Main content adjustments */
  .main-content {
    // padding: 1rem 0.5rem;
    // padding-left:14px;
    width: 100%;
    padding-top: 90px; 
     overflow-x: hidden;
  }
  
  .scroll-div {
    width: 100%;
    padding: 0;
  }
  
  /* Remove the old 480px styles that were conflicting */
  .welcome-card,
  .content-card {
    max-width: 100%;
  }
  
  /* Ensure overlay doesn't appear on larger screens */
  .sidebar-overlay:not(.active) {
    display: none;
  }
}

.dashboard-wrapper {
  display: flex;
  height: 100vh;
  /* padding: 1rem; */
  font-family: 'Segoe UI', sans-serif;
  // background: url('/images/Seekerbg.jpg') no-repeat center center;
  // background-color: #93cdf1;
  background-size: cover;
  box-sizing: border-box;
}

.scroll-div {
  overflow-y: auto;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(214, 222, 234, 0.4) transparent;
  width:100%;
}

@media (max-width: 500px){
.scroll-div{
    width:480px;
}
}

/* Chrome, Edge, Safari */
.scroll-div::-webkit-scrollbar {
  width: 8px;
}

.scroll-div::-webkit-scrollbar-button {
  width: 0;
  height: 0;
  display: block;
  background: transparent;
  content: "";
}
.scroll-div::-webkit-scrollbar-button:single-button {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.scroll-div::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-div::-webkit-scrollbar-thumb {
  background-color: rgba(214, 222, 234, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.15);
}

.scroll-div::-webkit-scrollbar-thumb:hover {
  background-color: rgba(3, 101, 134, 0.5);
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.25);
}

.glass-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  margin: auto;
  padding:0px;
  // border-radius: 20px; 
  overflow: hidden;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 30px rgba(2, 2, 2, 0.1);
  border: 1px solid #D4EBF8;
}

.dashboard-sidebar {
  padding: 24px 0px;
  padding-left:10px;
  padding-right:16px;
  width: 170px;
background-color: rgb(198, 221, 236);


// background: rgba(147, 205, 241, 0.85);
// backdrop-filter: blur(10px);

  border-right: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
   border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.sidebar::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.sidebar h2 {
  font-size: 18px;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #315D65;
  text-shadow: 1px 1px 2px white;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #222;
  cursor: pointer;
  padding: 0.5rem 0rem;
  padding-left: 12px;
  border-radius: 8px;
  transition: background 0.25s ease, transform 0.15s ease;
  // border: 1px solid #D4EBF8;
  width:175px;
  margin-bottom: 10px;
}

.nav-group {
  padding-top: 60px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-icon {
  font-size: 1rem;
  color: #036586;
}

.nav-text {
  color: black;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(2px);
}

.nav-btn.active {
  background: rgba(255, 255, 255, 0.3);
}

.logout-btn {
  display: flex;
  align-items: center;
  border: none;
  font-size: 14px;
  color: #222;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.25s ease, transform 0.15s ease;
  width:175px;
  background: #036586;
  color: white;
  margin-top: auto;
  padding-left:60px;
  margin-bottom:0px;
}

.logout-btn:hover {
  background: #024e66;
}

.main-content {
  flex-grow: 1;
  // padding: 1rem;
  padding-top:16px;
  padding-bottom:16px;  
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width:100%;
}

@media (max-width: 500px){
.main-content{
// padding:0px;
}
}

.welcome-card,
.content-card {
  max-width: 350px;
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  padding: 1.2rem 1.5rem;
  border-radius: 16px;
  text-align: center;
  color: black;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.welcome-card h1,
.content-card h2 {
  font-size: 20px;
  margin-bottom: 6px;
}

.welcome-card p,
.content-card p {
  font-size: 13.5px;
  color: #111;
}

.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 5px;
}

.profile-pic {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 0px;
}

.profile-name {
  font-size: 19px;
  font-weight: bold;
  color: #222;
  margin-bottom: 10px;
}

.welcome-card {
  width:100vw;
}

.notification-badge {
  background: #036586;
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 2px;
  margin-left: 10px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 6px; /* space between pic and name */
  border:1px solid black;
  border-radius: 30px;
  padding-left:10px;
  padding-right:10px;
  padding-top:3px;
  padding-bottom:3px;
}

.profile-pic {
  width: 30px;      /* tiny size */
  height: 30px;
  border-radius: 50%;
  border:1px solid black;
  object-fit: cover;
}

.profile-name {
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 5px;
  margin:0px;
}

  __________________________________
  
        `}
      </style>

      <div className="screen-wrapper">

        <button
          className="hamburger-menu"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          ☰
        </button>

        {isSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="dashboard-wrapper">
          <div className="glass-container">
            <div className="dashboard-sidebar">
              <div className="dashboard-nav-group">
                <div className="profile-section">
            
                  <img
                    src="/images/joblynest-logo4.png" 
                    alt="JoblyNest Logo"
                    style={{
                      height: "80px",
                      width: "auto",
                      padding: "0px",
                      marginBottom: "30px",
                    }}
                  />

               
                  <div
                    className="profile-info"
                    onClick={() => setShowProfile(true)}
                  >
                    <img
                      src={profile_picture}
                      alt="Profile"
                      className="profile-pic"
                    />

                    <p className="profile-name">
                      {profile
                        ? `${profile.first_name || ""} ${
                            profile.last_name || ""
                          }`.trim() || "Anonymous"
                        : "Anonymous"}
                    </p>
                  </div>
                  <p
                    className="profile-hint"
                    style={{
                      fontSize: "13px",
                      color: "#036586",
                      marginTop: "6px",
                      fontWeight: "600",
                      cursor: "pointer",
                      textAlign: "center",

                      padding: "4px 8px",
                      backgroundColor: "#e6f7ff",
                      borderRadius: "6px",
                      border: "1px solid #036586",
                    }}
                    onClick={() => setShowProfile(true)}
                  >
                    Click to view account
                  </p>
                </div>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("dashboard")}
                >
                  <FaTh className="nav-icon" />
                  <span className="nav-text">Dashboard</span>
                </button>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("notifications")}
                >
                  <FaBell className="nav-icon" />
                  <span className="nav-text">Notifications</span>
                  {notificationCount > 0 && (
                    <span className="notification-badge">
                      {notificationCount}
                    </span>
                  )}
                </button>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("profile")}
                >
                  <FaUser className="nav-icon" />
                  <span className="nav-text">Profile</span>
                </button>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("editProfile")}
                >
                  <FaEdit className="nav-icon" />
                  <span className="nav-text">Edit Profile</span>
                </button>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("availability")}
                >
                  <FaClock className="nav-icon" />
                  <span className="nav-text">Set Availability</span>
                </button>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("requests")}
                >
                  <FaTasks className="nav-icon" />
                  <span className="nav-text">Requests</span>
                </button>

                <button
                  className="nav-btn"
                  onClick={() => handleNavClick("myTasks")}
                >
                  <FaCheckSquare className="nav-icon" />
                  <span className="nav-text">My Tasks</span>
                </button>
              </div>

              <button onClick={handleLogout} className="nav-btn logout-btn">
                LOGOUT
              </button>
            </div>

            <div
              className="scroll-div"
              style={{
                maxHeight: "100vh",
                overflowY: "auto",
                padding: "0rem",
              }}
            >
              <div className="main-content">
                <SeekerAccount
                  isOpen={showProfile}
                  onClose={() => setShowProfile(false)}
                />

                {selectedView === "dashboard" && (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginBottom: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {!isLoading && isAvailabilityMissing && (
                        <button
                          className="warning-btn"
                          onClick={() => setSelectedView("availability")}
                          style={{
                            background: "#ff9f43",
                            color: "white",
                            padding: "10px",
                            borderRadius: "8px",
                            width: "500px",
                            fontWeight: "bold",
                          }}
                        >
                          Set Availability
                        </button>
                      )}

                      {!isLoading && isProfileIncomplete && (
                        <button
                          className="warning-btn"
                          onClick={() => setSelectedView("editProfile")}
                          style={{
                            background: "#d63031",
                            color: "white",
                            padding: "10px",
                            borderRadius: "8px",
                            width: "500px",
                            fontWeight: "bold",
                          }}
                        >
                          Complete Profile
                        </button>
                      )}
                    </div>

                    {(isAvailabilityMissing || isProfileIncomplete) && (
                      <p
                        style={{
                          color: "#555",
                          fontSize: "14px",
                          marginBottom: "1rem",
                          marginTop: "0",
                          textAlign: "left",
                          marginLeft: "10px",
                        }}
                      >
                        ⚠️ You will not receive requests until your availability
                        and profile are completed.
                      </p>
                    )}
                    <SeekerStats
                      profile={profile}
                      requests={requests}
                      taskData={taskData}
                      setHighlightRequestId={setHighlightRequestId}
                    />
                  </div>
                )}

                {selectedView === "profile" && <Profile setSelectedView={setSelectedView}/>}

                {selectedView === "editProfile" && (
                  <EditProfile setSelectedView={setSelectedView} />
                )}

                {selectedView === "availability" && (
                  <SetAvailibility
                    setSelectedView={setSelectedView}
                    isProfileIncomplete={isProfileIncomplete}
                  />
                )}

                {selectedView === "account" && <SeekerAccount />}

                {selectedView === "notifications" && (
                  <SeekerNotifications
                    notifications={notifications}
                    notificationCount={notificationCount}
                    markAsRead={markAsRead}
                    markAllRead={markAllRead}
                    onNavigateToRequests={(id) => {
                      setSelectedView("requests");
                      setHighlightRequestId(id);
                    }}
                  />
                )}

                {selectedView === "requests" && (
                  <SeekerRequests highlightRequestId={highlightRequestId} />
                )}

                {selectedView === "myTasks" && <MyTasks />}
              </div>
            </div>
          </div>
          {modal && (
            <Modal
              title={modal.title}
              message={modal.message}
              type={modal.type}
              onClose={() => {
                setModal(null);
                navigate("/login");
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default SeekerDashboard;
