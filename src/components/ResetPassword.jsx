import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import supabase from "../supabaseClient.js";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pwd);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      setError(
        "Password must be at least 8 characters, include 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character."
      );
      return;
    }

    const { error: supabaseError } = await supabase.auth.updateUser({
      password,
    });

    if (supabaseError) {
      setMessage("");
      setError(supabaseError.message);
    } else {
      setError("");
      setMessage("Password updated successfully. You can now log in.");
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundImage: 'url("/images/blue.png")',
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
    },
    form: {
      backgroundColor: "#fff",
      padding: "30px",
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      width: "100%",
      maxWidth: "400px",
      textAlign: "center",
    },
    inputWrapper: {
      position: "relative",
      width: "100%",
      margin: "10px 0",
    },
    input: {
      width: "100%",
      padding: "10px",
      margin: "10px 0",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "16px",
    },
    toggleIcon: {
      position: "absolute",
      right: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      cursor: "pointer",
      color: "#333",
    },
    button: {
      width: "100%",
      padding: "10px",
      backgroundColor: "rgb(3, 101, 134)",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      fontSize: "16px",
      cursor: "pointer",
      marginTop: "10px",
    },
    message: {
      color: "green",
      marginTop: "10px",
    },
    error: {
      color: "red",
      marginTop: "10px",
    },
    navButton: {
      marginTop: "15px",
      backgroundColor: "transparent",
      border: `2px solid rgb(3, 101, 134)`,
      color: "rgb(3, 101, 134)",
      padding: "10px",
      cursor: "pointer",
      borderRadius: "4px",
    },
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleResetPassword}>
        <h2 style={{ color: "rgb(3, 101, 134)" }}>Reset Password</h2>
        <div style={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <span
            style={styles.toggleIcon}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>
        <button type="submit" style={styles.button}>
          Update Password
        </button>
        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.message}>{message}</p>}
        <button
          type="button"
          onClick={() => navigate("/login")}
          style={styles.navButton}
        >
          Go to Login
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
