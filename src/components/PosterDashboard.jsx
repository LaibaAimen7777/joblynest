import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import PosterRequests from "./PosterRequests";
import PosterNotifications from "./PosterNotifications";
import PosterMyTasks from "./PosterMyTasks";
import PosterAccount from "./PosterAccount";
import PosterLayout from "./PosterLayout";
import useNotifications from "../useNotifications.js";
import Loader from "../components/Loader";
import Modal from "../components/Modal";


import {
  FiBell,
  FiHome,
  FiUsers,
  FiLogOut,
  FiPlusCircle,
  FiCompass,
  FiClipboard,
} from "react-icons/fi";

import PosterExplore from "./PosterExplore";
import CreateTaskForm from "./CreateTaskForm";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "../styles/PosterDashboard.css";

const paymentPendingModalStyles = `
  .payment-pending-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  }

  .payment-pending-modal {
    background: white;
    border-radius: 20px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
    border: 3px solid #3a699b;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .payment-pending-modal-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .payment-pending-icon {
    font-size: 64px;
    margin-bottom: 12px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .payment-pending-title {
    font-size: 28px;
    font-weight: 700;
    color: #3a699b;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .payment-pending-body {
    margin-bottom: 24px;
  }

  .payment-pending-message {
    font-size: 16px;
    color: #1e293b;
    margin-bottom: 16px;
    line-height: 1.6;
  }

  .payment-pending-message strong {
    color: #dc2626;
    font-size: 18px;
  }

  .payment-pending-task-info {
    background: #fffbeb;
    border: 2px solid #3a699b;
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
  }

  .payment-pending-task-info p {
    margin: 8px 0;
    color: #78350f;
    font-size: 14px;
  }

  .payment-pending-task-info strong {
    color: #92400e;
  }

  .payment-pending-action-text {
    font-size: 15px;
    color: #64748b;
    margin-top: 16px;
    text-align: center;
    font-weight: 500;
  }

  .payment-pending-actions {
    display: flex;
    gap: 12px;
    flex-direction: column;
  }

  .payment-pending-btn-primary {
    background: linear-gradient(135deg,#3a699b 100%);
    color: white;
    border: none;
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(46, 38, 24, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .payment-pending-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(42, 36, 25, 0.5);
    background: linear-gradient(135deg,#3a699b 100%);
  }

  .payment-pending-btn-primary:active {
    transform: translateY(0);
  }

  .payment-pending-btn-secondary {
    background: transparent;
    color: #64748b;
    border: 2px solid #e2e8f0;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .payment-pending-btn-secondary:hover {
    background: #f8f9fa;
    border-color: #cbd5e1;
    color: #475569;
  }

  @media (max-width: 640px) {
    .payment-pending-modal {
      padding: 24px;
      margin: 20px;
    }

    .payment-pending-title {
      font-size: 24px;
    }

    .payment-pending-icon {
      font-size: 48px;
    }
  }
`;

const PosterDashboard = ({
  notifications,
  notificationCount,
  markAsRead,
  markAllRead,
  setNotificationCount,
}) => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState("dashboard");
  const [posterName, setPosterName] = useState("");
  const [showAccount, setShowAccount] = useState(false);

  const [loadingName, setLoadingName] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );
  const [userId, setUserId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    accepted: 0,
    activeSeekers: 0,
    weeklyActivity: [],
  });

  const [modal, setModal] = useState(null);
  const [paymentPendingModal, setPaymentPendingModal] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);


  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);


  useEffect(() => {
  const fetchPosterName = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadingName(false);
        return;
      }

      const { data: posterRow, error: posterError } = await supabase
        .from("poster")
        .select("poster_id")
        .eq("poster_id", user.id)
        .single();

      if (posterError || !posterRow) {
        setLoadingName(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, is_banned, suspended_until")
        .eq("id", posterRow.poster_id)
        .single();

      if (profileError || !profile) {
        setLoadingName(false);
        return;
      }


      if (profile.is_banned) {
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

      if (profile.suspended_until) {
        const now = new Date();
        const suspendedUntil = new Date(profile.suspended_until);

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

      setPosterName(`${profile.first_name} ${profile.last_name}`);

      await checkPaymentPendingTasks(user.id);
    } finally {
      setLoadingName(false);
    }
  };

  fetchPosterName();
}, [navigate]);

  const checkPaymentPendingTasks = async (posterUserId) => {
    try {
      const { data: posterRow, error: posterError } = await supabase
        .from("poster")
        .select("poster_id")
        .eq("poster_id", posterUserId)
        .single();

      if (posterError || !posterRow) return;

      const posterId = posterRow.poster_id;

      const { data: tasks, error: taskError } = await supabase
        .from("task")
        .select("task_id")
        .eq("poster_id", posterId);

      if (taskError || !tasks || tasks.length === 0) return;

      const taskIds = tasks.map((t) => t.task_id);

      const { data: paymentPendingRequests, error: hrError } = await supabase
        .from("hire_requests")
        .select("task_id, task:task_id(description, main_category)")
        .in("task_id", taskIds)
        .eq("task_status", "payment_pending")
        .limit(1); 

      if (hrError || !paymentPendingRequests || paymentPendingRequests.length === 0) {
        return;
      }

      const pendingTask = paymentPendingRequests[0];
      
      setPaymentPendingModal({
        taskId: pendingTask.task_id,
        taskDescription: pendingTask.task?.description || "Task",
        taskCategory: pendingTask.task?.main_category || "",
      });
    } catch (error) {
      console.error("Error checking payment pending tasks:", error);
    }
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.setItem("is_logged_in", false);
    localStorage.removeItem("supabaseSession");
    navigate("/login");
  };

  useEffect(() => {
    if (!userId) return;
    fetchDashboardStats();
  }, [userId]);


useEffect(() => {
  if (!userId) return;

  let isChecking = false;

  const interval = setInterval(async () => {
    if (isChecking) return;
    isChecking = true;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_banned, suspended_until")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        isChecking = false;
        return;
      }

      const now = new Date();

      if (profile.is_banned) {
        setModal({
          title: "Account Banned",
          message:
            "Your account has been banned by the admin. You will be logged out.",
          type: "error",
        });

        await supabase.auth.signOut();
        localStorage.removeItem("is_logged_in");
        localStorage.removeItem("supabaseSession");

        setTimeout(() => {
          setModal(null);
          navigate("/login");
        }, 2000);

        clearInterval(interval);
        return;
      }

      if (profile.suspended_until) {
        const suspendedUntil = new Date(profile.suspended_until);
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

          clearInterval(interval);
          return;
        }
      }
    } finally {
      isChecking = false;
    }
  }, 5000);

  return () => clearInterval(interval);
}, [userId, navigate]);


  const fetchDashboardStats = async () => {
    try {
      if (!userId) return;

      const { data: posterRow, error: posterError } = await supabase
        .from("poster")
        .select("poster_id")
        .eq("poster_id", userId)
        .single();

      if (posterError || !posterRow) return;

      const posterId = posterRow.poster_id;

      const { data: tasks, error: taskError } = await supabase
        .from("task")
        .select("task_id, created_at")
        .eq("poster_id", posterId);

      if (taskError) throw taskError;

      const totalTasks = tasks.length;
      const taskIDs = tasks.map((t) => t.task_id);

      if (taskIDs.length === 0) {
        setStats({
          total: 0,
          completed: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          weeklyActivity: [],
        });
        return;
      }

      const { data: requests, error: reqError } = await supabase
        .from("hire_requests")
        .select("status")
        .in("task_id", taskIDs);

      if (reqError) throw reqError;

      const completed = requests.filter((r) => r.status === "completed").length;
      const pending = requests.filter((r) => r.status === "pending").length;
      const accepted = requests.filter((r) => r.status === "accepted").length;
      const rejected = requests.filter((r) => r.status === "rejected").length;

      const weeklyActivity = [];
      const dateCounts = {};

      tasks.forEach((t) => {
        const date = new Date(t.created_at).toISOString().split("T")[0]; 
        if (!dateCounts[date]) dateCounts[date] = 0;
        dateCounts[date]++;
      });

      for (const date in dateCounts) {
        weeklyActivity.push({ name: date, tasks: dateCounts[date] });
      }

      weeklyActivity.sort((a, b) => new Date(a.name) - new Date(b.name));

      setStats({
        total: totalTasks,
        completed,
        pending,
        accepted,
        rejected,
        weeklyActivity,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  const taskData = stats.weeklyActivity;

  const pieData = [
    { name: "Completed", value: stats.completed },
    { name: "Pending", value: stats.pending },
    { name: "Accepted", value: stats.accepted },
    { name: "Rejected", value: stats.rejected },
  ];

  const COLORS = ["#007ACC", "#4FB0FF", "#A3D8FF"];

  if (loadingName) {
    return <Loader message="Loading dashboard..." />;
  }

  return (
    <>
      <style>{paymentPendingModalStyles}</style>
      <div className="pd-container">
        <PosterLayout
        selectedView={selectedView}
        setSelectedView={setSelectedView}
        notificationCount={notificationCount}
        avatarUrl={avatarUrl}
        posterName={posterName}
        handleSignOut={handleSignOut}
      >
        {selectedView === "dashboard" && (
          <section className="pd-home">
            <div className="pd-hero-bleed">
              <div className="pd-hero">
                <div className="pd-hero-left">
                  <h1>Welcome, {posterName}</h1>
                  <p className="pd-hero-sub">
                    Manage your postings, track seeker progress, and connect
                    easily with talent.
                  </p>
                  <div className="pd-hero-buttons">

                    <button
  className="pd-btn-outline"
  onClick={() => setShowGuideModal(true)}
>
  <FiClipboard className="pd-btn-icon" />Poster Guide
</button>


                    <button
                      className="pd-btn-primary"
                      onClick={() => navigate("/create-task")}
                    >
                      <FiPlusCircle className="pd-btn-icon" /> Create Task
                    </button>

                    <button
                      className="pd-btn-outline"
                      onClick={() => navigate("/explore")}
                    >
                      <FiCompass className="pd-btn-icon" /> Explore
                    </button>
                  </div>
                </div>
                <div className="pd-hero-right">
                  <img
                    src="/images/pd_hero_2.png"
                    alt="Dashboard Illustration"
                    className="pd-hero-img"
                  />
                </div>
              </div>
            </div>

            <div className="pd-stats">
              <div className="pd-card">
                <h3>Total Tasks</h3>
                <p>{stats.total}</p>
              </div>
              <div className="pd-card">
                <h3>Completed</h3>
                <p>{stats.completed}</p>
              </div>
              <div className="pd-card">
                <h3>Pending</h3>
                <p>{stats.pending}</p>
              </div>
              <div className="pd-card">
                <h3>Rejected Requests</h3>
                <p>{stats.rejected}</p>
              </div>
            </div>

            <div className="pd-charts">
              <div className="pd-chart-card">
                <h3>Weekly Task Activity</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={taskData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tasks" fill="#007ACC" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="pd-chart-card">
                <h3>Task Status Overview</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}
        {selectedView === "mytasks" && <PosterMyTasks skipLayout={true} />}
        {selectedView === "requests" && <PosterRequests />}
        {selectedView === "notifications" && <PosterNotifications />}
        {selectedView === "createTask" && <CreateTaskForm />}
        {selectedView === "explore" && <PosterExplore />}
      </PosterLayout>
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
      {showGuideModal && (
  <div
    className="guide-modal-overlay"
    onClick={() => setShowGuideModal(false)}
  >
    <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
      <div className="guide-modal-header">
        <h3 className="guide-modal-title">Job Poster Guide</h3>
        <button
          className="guide-modal-close"
          onClick={() => setShowGuideModal(false)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="guide-modal-body">
        <div className="guide-video-wrap">
          <video
            controls
            autoPlay
            style={{ width: "100%", height: "85%", display: "block" }}
          >
            <source src="/videos/PosterGuide.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <div className="guide-modal-footer">
        <button
          className="guide-btn-secondary"
          onClick={() => setShowGuideModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


      {paymentPendingModal && (
        <div className="payment-pending-modal-overlay">
          <div className="payment-pending-modal">
            <div className="payment-pending-modal-header">
              <div className="payment-pending-icon"></div>
              <h2 className="payment-pending-title">Payment Required</h2>
            </div>
            <div className="payment-pending-body">
              <p className="payment-pending-message">
                <strong>Important:</strong> You have a completed task that requires payment.
              </p>
              <div className="payment-pending-task-info">
                <p>
                  <strong>Task:</strong> {paymentPendingModal.taskDescription}
                </p>
                {paymentPendingModal.taskCategory && (
                  <p>
                    <strong>Category:</strong> {paymentPendingModal.taskCategory}
                  </p>
                )}
              </div>
              <p className="payment-pending-action-text">
                Please proceed to payment to complete the transaction.
              </p>
            </div>
            <div className="payment-pending-actions">
              <button
                className="payment-pending-btn-primary"
                onClick={() => {
                  setPaymentPendingModal(null);
                  setSelectedView("mytasks");
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent("highlightPaymentPendingTask", {
                        detail: { taskId: paymentPendingModal.taskId },
                      })
                    );
                  }, 800);
                }}
              >
                Go to Task & Pay
              </button>
              <button
                className="payment-pending-btn-secondary"
                onClick={() => setPaymentPendingModal(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

     
 
export default PosterDashboard;
