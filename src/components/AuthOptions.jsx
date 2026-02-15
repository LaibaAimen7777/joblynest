import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const AuthOptions = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page-wrapper">
      <div
        className="register-form-container login-form-container"
        style={{
          textAlign: "center",
          borderRadius: "24px",
          padding: "40px 30px",
          maxWidth: "420px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "30px",
            color: "rgb(3, 101, 134)",
            fontWeight: 700,
            fontFamily: "Segoe UI, sans-serif",
          }}
        >
          JoblyNest
        </h1>

        <button
          onClick={() => navigate("/register")}
          type="button"
          className="auth-button signup"
        >
          Sign up
        </button>

        <button
          onClick={() => navigate("/login")}
          type="button"
          className="auth-button login"
        >
          Log in
        </button>

        <p style={{ fontSize: "13px", color: "black", marginTop: "24px" }}>
          By signing up you agree to our Terms of Use and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default AuthOptions;
