import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/AdminLogin.css";
import supabase from "../supabaseClient.js";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    await supabase.auth.signOut();

    try {
      const response = await fetch("http://localhost:5000/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed.");
        setMessageType("error");
      } else {
        setMessage(data.message || "Login successful");
        setMessageType("success");

        localStorage.setItem("is_logged_in", true);
        localStorage.setItem("is_admin", true);
        localStorage.setItem("admin_token", data.token);

        navigate("/admin-dash");
      }
    } catch (error) {
      setMessage("Unable to connect to the server. Please try again.");
      setMessageType("error");
    }
  };

  return (
    <div
      className="admin-page-wrapper"
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
      <div className="admin-outer-container">
        <h2 className="admin-heading">ADMIN LOGIN</h2>
        <div className="admin-form-container register-form-container">
          <form onSubmit={handleLogin} autoComplete="off">
            <div className="register-form-row">
              <div className="register-form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="register-form-row">
              <div className="register-form-group password-group">
                <label>Password</label>
                <div className="admin-password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    className="admin-password-toggle-icon"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
            </div>

            <button type="submit">Login</button>

            {message && (
              <div className={`register-form-message ${messageType}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
