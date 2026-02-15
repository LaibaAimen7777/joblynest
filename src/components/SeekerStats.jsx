import React, { useEffect, useState } from "react";
import { Calendar } from "react-calendar";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
} from "date-fns";
import { FaPlayCircle } from "react-icons/fa";
import { createClient } from "@supabase/supabase-js";
import supabase from "../supabaseClient.js";

const styles = {
  dashboardContainer: {
    width: "95%",
    maxWidth: "1400px",
    margin: "2rem auto",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    fontFamily: "'Inter', sans-serif",
    padding: "0 1rem",
  },
  welcomeCard: {
    background: "#036586",
    color: "#fff",
    padding: "1.5rem 2rem",
    borderRadius: "20px",
    textAlign: "left",
    boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
    position: "relative",
    "@media (max-width: 768px)": {
      padding: "1.5rem",
    },
  },
  welcomeTitle: {
    margin: 0,
    fontSize: "2.2rem",
    fontWeight: 700,
    lineHeight: 1.2,
    "@media (max-width: 768px)": {
      fontSize: "1.8rem",
    },
    "@media (max-width: 480px)": {
      fontSize: "1.5rem",
    },
  },
  welcomeSubtitle: {
    marginTop: "0.5rem",
    fontSize: "1.1rem",
    opacity: 0.9,
    fontWeight: 400,
    "@media (max-width: 768px)": {
      fontSize: "1rem",
    },
    "@media (max-width: 500px)": {
      fontSize: "0.9rem",
    },
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  statCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #f1f5f9",
    transition: "all 0.3s ease",
  },
  statValue: {
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#1f2937",
    margin: "0.5rem 0",
    "@media (max-width: 768px)": {
      fontSize: "2rem",
    },
    "@media (max-width: 500px)": {
      fontSize: "1.8rem",
    },
  },
  statLabel: {
    fontSize: "0.9rem",
    color: "#6b7280",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statSubtext: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginTop: "0.5rem",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  },
  dashboardCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #f1f5f9",
  },
  sectionTitle: {
    marginBottom: "1.5rem",
    fontSize: "1.3rem",
    fontWeight: 600,
    color: "#1f2937",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  activityList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    maxHeight: "730px",
    overflowY: "auto",
    "@media (max-width: 768px)": {
      maxHeight: "400px",
    },
  },
  activityItem: {
    marginBottom: "1rem",
    padding: "1rem",
    background: "#f8fafc",
    borderRadius: "12px",
    borderLeft: "4px solid #667eea",
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  activityItemHover: {
    background: "#f0f4ff",
    transform: "translateX(3px)",
  },
  activityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.5rem",
  },
  activityClient: {
    fontWeight: 600,
    color: "#1f2937",
    fontSize: "1rem",
  },
  activityDate: {
    fontSize: "0.8rem",
    color: "#6b7280",
    background: "#f1f5f9",
    padding: "0.2rem 0.5rem",
    borderRadius: "6px",
  },
  activityDescription: {
    color: "#4b5563",
    fontSize: "0.9rem",
    lineHeight: 1.4,
    marginBottom: "0.5rem",
  },
  activityCategory: {
    display: "inline-block",
    background: "#e0f2fe",
    color: "#0369a1",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
  },
  statusBadge: {
    display: "inline-block",
    fontSize: "0.7rem",
    fontWeight: 600,
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    marginLeft: "0.5rem",
  },
  calendarWrapper: {
    background: "#fff",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #f1f5f9",
  },
  taskDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#10b981",
    margin: "2px auto 0",
  },
  noData: {
    textAlign: "center",
    color: "#9ca3af",
    fontStyle: "italic",
    padding: "2rem",
  },
  chartContainer: {
    height: "300px",
    marginTop: "1rem",
    "@media (max-width: 768px)": {
      height: "250px",
    },
    "@media (max-width: 500px)": {
      height: "200px",
    },
  },
  loadingText: {
    textAlign: "center",
    color: "#6b7280",
    padding: "2rem",
  },
  "@media (max-width: 350px)": {
    statsGrid: {
      gridTemplateColumns: "1fr",
    },
    welcomeCard: {
      padding: "1rem",
    },
    welcomeTitle: {
      fontSize: "1.3rem",
    },
    statValue: {
      fontSize: "1.5rem",
    },
  },
  helpButton: {
    background: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "12px",
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "all 0.2s ease",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
    fontWeight: 500,
    "@media (max-width: 768px)": {
      padding: "0.4rem 0.8rem",
      fontSize: "0.85rem",
    },
  },

  helpButtonHover: {
    background: "rgba(255, 255, 255, 0.25)",
    transform: "translateY(-1px)",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
  },

  helpIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    background: "rgba(255, 255, 255, 0.3)",
    borderRadius: "50%",
    fontWeight: "bold",
    fontSize: "0.85rem",
  },

  helpText: {
    "@media (max-width: 500px)": {
      display: "none",
    },
  },
};

const SeekerStats = ({ profile, requests, setHighlightRequestId }) => {
  console.log("profile in stats", profile);
  console.log("req in stats", requests);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuideVideo, setShowGuideVideo] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!profile?.id) return;

      try {
        const { data: allRequests, error } = await supabase
          .from("hire_requests")
          .select(
            `
            *,
            task:task_id (
              main_category,
              description
            ),
            poster:poster_id (
              first_name,
              last_name
            )
          `
          )
          .eq("seeker_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const totalRequests = allRequests?.length || 0;
        const completedRequests =
          allRequests?.filter((r) => r.status === "completed").length || 0;
        const pendingRequests =
          allRequests?.filter((r) => r.status === "pending").length || 0;
        const acceptedRequests =
          allRequests?.filter((r) => r.status === "accepted").length || 0;

        const totalEarnings =
          allRequests
            ?.filter((r) => r.status === "completed")
            .reduce((sum, r) => sum + (r.pay_rate || 0), 0) || 0;

        const sixMonthsAgo = subMonths(new Date(), 5);
        const monthlyEarnings = {};

        allRequests
          ?.filter(
            (r) =>
              r.status === "completed" && new Date(r.created_at) >= sixMonthsAgo
          )
          .forEach((request) => {
            const monthKey = format(new Date(request.created_at), "MMM yyyy");
            monthlyEarnings[monthKey] =
              (monthlyEarnings[monthKey] || 0) + (request.pay_rate || 0);
          });

        const months = eachMonthOfInterval({
          start: startOfMonth(sixMonthsAgo),
          end: endOfMonth(new Date()),
        });

        const earningsData = months.map((month) => ({
          month: format(month, "MMM yyyy"),
          earnings: monthlyEarnings[format(month, "MMM yyyy")] || 0,
        }));

        const statusData = [
          { name: "Completed", value: completedRequests, color: "#10b981" },
          { name: "Pending", value: pendingRequests, color: "#f59e0b" },
          { name: "Accepted", value: acceptedRequests, color: "#3b82f6" },
          {
            name: "Other",
            value:
              totalRequests -
              completedRequests -
              pendingRequests -
              acceptedRequests,
            color: "#6b7280",
          },
        ].filter((item) => item.value > 0);

        const oneWeekAgo = subMonths(new Date(), 1 / 4);
        const recentActivity =
          allRequests
            ?.filter((r) => new Date(r.created_at) > oneWeekAgo)
            .slice(0, 5) || [];

        setAnalyticsData({
          totalRequests,
          completedRequests,
          pendingRequests,
          acceptedRequests,
          totalEarnings,
          earningsData,
          statusData,
          recentActivity,
          allRequests: allRequests || [],
        });
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [profile?.id]);

  const getStatusColor = (status) => {
    const colors = {
      completed: "#10b981",
      pending: "#f59e0b",
      accepted: "#3b82f6",
      rejected: "#ef4444",
      cancelled: "#6b7280",
      "timed out": "#6b7280",
    };
    return colors[status] || "#6b7280";
  };

  if (loading) {
    return (
      <div className="seeker-loader">
        <div className="loader-spinner"></div>
        <p>Loading your dashboard...</p>

        <style>{`
      
        .loader-spinner {
          border: 6px solid #e0e0e0;
          border-top: 6px solid #036586;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          margin-left: 500px;
          margin-top: 200px;
          animation: spin 1s linear infinite;
        }
          .seeker-loader p {
          margin-left: 450px;
          }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .seeker-loader {
          height: 100vh;
          width:1000px;
          // display: flex;
          // flex-direction: column;
          // justify-content: center;
          // align-items: center;
          margin-left:0px;
          margin-top:0px;
          // background-color: #dbf0f5;
          font-style: italic;
          font-size: 18px;
          color: #036586;
        }
      `}</style>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div style={styles.dashboardContainer}>
        <div style={styles.noData}>No data available for your dashboard</div>
      </div>
    );
  }

  const {
    totalRequests,
    completedRequests,
    pendingRequests,
    acceptedRequests,
    totalEarnings,
    earningsData,
    statusData,
    recentActivity,
    allRequests,
  } = analyticsData;
  return (
    <div
      style={styles.dashboardContainer}
      className="seeker-dashboard-responsive"
    >
      <style>{`
      @media (max-width: 768px) {
        .seeker-dashboard-responsive .stats-grid-item {
          min-width: 150px;
        }
        
        .seeker-dashboard-responsive .dashboard-card {
          padding: 1rem;
        }
        
        .seeker-dashboard-responsive .section-title {
          font-size: 1.1rem;
        }
      }
      
      @media (max-width: 500px) {
        .seeker-dashboard-responsive .calendar-legend {
          flex-wrap: wrap;
        }
        
        .seeker-dashboard-responsive .activity-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .seeker-dashboard-responsive .activity-date {
          align-self: flex-start;
        }
      }
    `}</style>
<div style={styles.welcomeCard}>
  <div style={{ 
    position: "absolute", 
    top: "1.5rem", 
    right: "2rem", 
    display: "flex", 
    gap: "1rem",
    "@media (max-width: 768px)": {
      top: "1rem",
      right: "1rem",
    },
    "@media (max-width: 480px)": {
      position: "relative",
      top: "auto",
      right: "auto",
      alignSelf: "flex-end",
      marginBottom: "1rem",
      justifyContent: "flex-end",
    }
  }}>
    <button
      style={styles.helpButton}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background =
          styles.helpButtonHover.background)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = styles.helpButton.background)
      }
      onClick={() => setShowGuideVideo(true)}
    >
      <span style={styles.helpIcon}>
        <FaPlayCircle size={10} />
      </span>
      <span style={styles.helpText}>Guide Video</span>
    </button>
    
    <button
      style={styles.helpButton}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background =
          styles.helpButtonHover.background)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = styles.helpButton.background)
      }
      onClick={() => navigate("/faq")}
    >
      <span style={styles.helpIcon}>?</span>
      <span style={styles.helpText}>Help Center</span>
    </button>
  </div>

        <h1 style={styles.welcomeTitle}>
          Welcome back, {profile?.first_name || "Professional"}!
        </h1>
        <p style={styles.welcomeSubtitle}>
          Your next opportunity starts here — manage your job search with ease.
        </p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Jobs</div>
          <div style={styles.statValue}>{totalRequests}</div>
          <div style={styles.statSubtext}>
            {completedRequests > 0
              ? `${Math.round(
                  (completedRequests / totalRequests) * 100
                )}% completion rate`
              : "Start accepting jobs!"}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Completed</div>
          <div style={styles.statValue}>{completedRequests}</div>
          <div style={styles.statSubtext}>Successfully delivered</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active</div>
          <div style={styles.statValue}>
            {pendingRequests + acceptedRequests}
          </div>
          <div style={styles.statSubtext}>
            {pendingRequests} pending, {acceptedRequests} accepted
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Earnings</div>
          <div style={styles.statValue}>
            Rs {totalEarnings.toLocaleString()}
          </div>
          <div style={styles.statSubtext}>
            From {completedRequests} completed jobs
          </div>
        </div>
      </div>

      <div style={styles.dashboardGrid}>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div style={styles.dashboardCard}>
            <h3 style={styles.sectionTitle}> Monthly Earnings</h3>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    formatter={(value) => [
                      `Rs ${value.toLocaleString()}`,
                      "Earnings",
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar
                    dataKey="earnings"
                    fill="#667eea"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.dashboardCard}>
            <h3 style={styles.sectionTitle}> Job Status Overview</h3>
            <div style={styles.chartContainer}>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.noData}>No job data available</div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.dashboardCard}>
          <h3 style={styles.sectionTitle}> Recent Activity</h3>
          <ul style={styles.activityList}>
            {recentActivity.map((request) => (
              <li
                key={request.id}
                style={styles.activityItem}
                onClick={() => setHighlightRequestId?.(request.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f4ff";
                  e.currentTarget.style.transform = "translateX(3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={styles.activityHeader}>
                  <span style={styles.activityClient}>
                    {request.poster?.first_name} {request.poster?.last_name}
                  </span>
                  <span style={styles.activityDate}>
                    {format(new Date(request.date), "MMM dd")}
                  </span>
                </div>
                <div style={styles.activityDescription}>
                  {request.task?.description || "New job request"}
                </div>
                <div>
                  <span style={styles.activityCategory}>
                    {request.task?.main_category || "General"}
                  </span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: getStatusColor(request.status),
                      color: "white",
                    }}
                  >
                    {request.status}
                  </span>
                </div>
              </li>
            ))}
            {recentActivity.length === 0 && (
              <li style={styles.noData}>No recent activity</li>
            )}
          </ul>
        </div>
      </div>

      <div style={styles.calendarWrapper}>
        <h3 style={styles.sectionTitle}> Upcoming Schedule</h3>
        <div
          style={{
            fontSize: "0.8rem",
            color: "#6b7280",
            marginBottom: "1rem",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#10b981",
              }}
            ></div>
            <span>Accepted</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            ></div>
            <span>Pending</span>
          </div>
        </div>
        <Calendar
          value={new Date()}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;

            const dateStr = format(date, "yyyy-MM-dd");
            const tasksOnDate = allRequests.filter(
              (request) =>
                request.date === dateStr &&
                ["accepted", "pending"].includes(request.status)
            );

            if (tasksOnDate.length === 0) return null;

            const acceptedCount = tasksOnDate.filter(
              (r) => r.status === "accepted"
            ).length;
            const pendingCount = tasksOnDate.filter(
              (r) => r.status === "pending"
            ).length;

            return (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "2px",
                  marginTop: "2px",
                }}
              >
                {acceptedCount > 0 && (
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#10b981",
                      position: "relative",
                    }}
                    title={`${acceptedCount} accepted job(s)`}
                  />
                )}
                {pendingCount > 0 && (
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#f59e0b",
                      position: "relative",
                    }}
                    title={`${pendingCount} pending job(s)`}
                  />
                )}
              </div>
            );
          }}
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";
            const dateStr = format(date, "yyyy-MM-dd");
            const hasTasks = allRequests.some(
              (request) =>
                request.date === dateStr &&
                ["accepted", "pending"].includes(request.status)
            );
            return hasTasks ? "has-tasks" : "";
          }}
          nextLabel="›"
          prevLabel="‹"
        />
      </div>
      <style>{`
.react-calendar {
  width: 600px;
  border: none;
  font-family: 'Inter', sans-serif;
  max-width: 100%;
}

@media (max-width: 768px) {
  .react-calendar {
    font-size: 0.85rem;
  }
  
  .react-calendar__tile {
    padding: 0.3em;
    height: 60px;
  }
}

@media (max-width: 500px) {
  .react-calendar {
    max-width: 100%;
    width: 100%;
    padding: 0px;
    margin-left:0px;
  }
  
  .react-calendar__tile {
    height: 50px;
  }
  
  .react-calendar__navigation button {
    font-size: 1rem;
    padding: 0.3rem;
  }
}
        
        .react-calendar__tile:hover {
          background: #f0f4ff;
        }
        
        .react-calendar__tile.has-tasks {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        
        .react-calendar__tile--active {
          background: #667eea !important;
          color: white;
        }
        
        .react-calendar__tile--now {
          background: #fef3c7;
          border: 1px solid #f59e0b;
        }
        
        .react-calendar__navigation button {
          background: none;
          border: none;
          font-size: 1.2rem;
          font-weight: 600;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .react-calendar__navigation button:hover {
          background: #f1f5f9;
        }
        
        .react-calendar__navigation button:disabled {
          background: #f9fafb;
          color: #d1d5db;
        }
          .guide-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.guide-modal {
  background: #fff;
  width: 90%;
  max-width: 720px;
  border-radius: 14px;
  padding: 16px;
}

.guide-modal-title {
  margin-bottom: 10px;
  font-weight: 600;
}

.guide-modal-body {
  height: 400px;
}

.guide-video-wrap {
  height: 100%;
}

.guide-close-btn {
  margin-top: 12px;
  padding: 6px 14px;
  background: #036586;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

          
      `}</style>
      {showGuideVideo && (
        <div
          className="guide-modal-overlay"
          onClick={() => setShowGuideVideo(false)}
        >
          <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="guide-modal-title">How to Use JoblyNest</h3>

            <div className="guide-modal-body">
              <div className="guide-video-wrap">
                <video
                  controls
                  autoPlay
                  style={{ width: "100%", height: "85%", display: "block" }}
                >
                  <source src="/videos/SeekerGuide.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            <button
              className="guide-close-btn"
              onClick={() => setShowGuideVideo(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeekerStats;
