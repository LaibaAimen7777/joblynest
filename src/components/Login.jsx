import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/Login.css";
import Modal from "../components/Modal";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [modal, setModal] = useState(null);
  const [showReactivatePopup, setShowReactivatePopup] = useState({
    show: false,
    user_id: null,
    email: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setModal(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const session = data?.session;
    const user = session?.user;

    if (error || !user) {
      setModal({
        title: "Login Failed",
        message: "Invalid email or password.",
        type: "error",
      });
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/check-status?email=${email}`
      );
      const result = await res.json();

      const resolveStatusTitle = (payload) => {
        if (!payload) return "Not Approved";
        if (payload.status === "missing_cnic") return "CNIC Required";
        if (payload.status === "rejected") return "Application Rejected";
        if (payload.status === "pending") return "Approval Pending";
        if (payload.message?.toLowerCase().includes("profile not found")) {
          return "Profile Not Found";
        }
        return "Not Approved";
      };

      if (!res.ok) {
        await supabase.auth.signOut();
        setModal({
          title: resolveStatusTitle(result),
          message: result.message || "Your account is not approved yet.",
          type: "error",
        });
        return;
      }

      if (result.nextStep === "set_cnic") {
        navigate("/set_cnic", {
          state: { message: result.message, status: result.status },
        });
        return;
      }

      if (result.nextStep === "show_status") {
        navigate("/show_status", {
          state: { message: result.message, status: result.status },
        });
        return;
      }

      if (result.nextStep !== "approved") {
        await supabase.auth.signOut();
        setModal({
          title: "Account Status Unknown",
          message:
            result.message ||
            "We could not verify your account status. Please contact support.",
          type: "error",
        });
        return;
      }


      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type, is_active, is_banned, suspended_until")
        .eq("email", email)
        .single();

      if (profileError || !userProfile) {
        setModal({
          title: "Error",
          message: "Could not fetch user profile.",
          type: "error",
        });
        return;
      }

      if (userProfile.is_banned) {
        await supabase.auth.signOut();
        setModal({
          title: "Account Banned",
          message:
            "Your account has been permanently banned due to policy violations. If you think this is a mistake, please contact support.",
          type: "error",
        });
        return;
      }

      if (userProfile.suspended_until) {
        const now = new Date();
        const suspendedUntil = new Date(userProfile.suspended_until);

        if (suspendedUntil > now) {
          await supabase.auth.signOut();
          setModal({
            title: "Account Suspended",
            message: `Your account is suspended until ${suspendedUntil.toLocaleString()}. Please try again later or contact support.`,
            type: "error",
          });
          return;
        }
      }

      if (userProfile.is_active === false && !userProfile.is_banned) {
        await supabase.auth.signOut();

        setShowReactivatePopup({
          show: true,
          user_id: user.id,
          email: email,
        });

        setModal({
          title: "Account Deactivated",
          message: "Your account is deactivated.",
          type: "error",
        });

        return;
      }

      localStorage.setItem("supabaseSession", JSON.stringify(session));
      localStorage.setItem("is_logged_in", true);

      if (
        userProfile.user_type === null ||
        userProfile.user_type === "" ||
        userProfile.user_type === "null"
      ) {
        navigate("/loggedIn");
      } else if (userProfile.user_type === "job_seeker") {
        navigate("/seeker-dashboard");
      } else if (userProfile.user_type === "job_poster") {
        navigate("/poster-dashboard");
      } else {
        setModal({
          title: "Error",
          message: "Unknown profile type.",
          type: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setModal({
        title: "Server Error",
        message: "Something went wrong. Please try again later.",
        type: "error",
      });
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/reactivate-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: showReactivatePopup.user_id }),
      });

      const result = await res.json();

      if (!result.success) {
        setModal({
          title: "Error",
          message: result.message,
          type: "error",
        });
        return;
      }

      setModal({
        title: "Account Reactivated",
        message: "Your account is active again. Please login now.",
        type: "success",
      });

      setShowReactivatePopup({ show: false });
    } catch (err) {
      setModal({
        title: "Server Error",
        message: "Could not reactivate account.",
        type: "error",
      });
    }
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        backgroundImage: `url("/images/blue.png")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
      }}
    >
      <div className="outer-container">
        <h2 className="login-heading">Login Now</h2>
        <div className="register-form-container login-form-container">
          <form onSubmit={handleLogin} autoComplete="off">
            <div className="register-form-row">
              <div className="register-form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="register-form-row">
              <div className="register-form-group password-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    className="password-toggle-icon"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
            </div>

            <button type="submit">Login</button>

            <p style={{ textAlign: "center", marginTop: "8px" }}>
              <a href="/forgot-password">Forgot Password?</a>
            </p>
          </form>
        </div>
      </div>
      {message && (
        <div className={`register-form-message ${messageType}`}>{message}</div>
      )}
      {modal && (
        <Modal
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onClose={() => setModal(null)}
        />
      )}
      {showReactivatePopup.show && (
        <div className="reactivate-popup">
          <div className="reactivate-content">
            <div className="reactivate-left">
              <h3>Reactivate Account</h3>
            </div>

            <div className="reactivate-right">
              <p>Your account is deactivated. Click below to reactivate it.</p>

              <div className="reactivate-buttons">
                <button className="allow-btn" onClick={handleReactivate}>
                  Reactivate
                </button>

                <button
                  className="deny-btn"
                  onClick={() => setShowReactivatePopup({ show: false })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
