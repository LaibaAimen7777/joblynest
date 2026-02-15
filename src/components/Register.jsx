import { useState, useRef } from "react";
import "../styles/Register.css";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { motion } from "framer-motion";
import { Player } from "@lottiefiles/react-lottie-player";
import "../styles/MinimalModal.css";
import { useNavigate } from "react-router-dom";
import SignupGuide from "./SignupGuide";

import "../styles/SignupGuide.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    userType: null,
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const playerRef = useRef(null);
  const [showGuide, setShowGuide] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [resendVisible, setResendVisible] = useState(false);

  const MAX_FILE_SIZE_MB = 2;
  const MIN_COMPRESSION_MB = 0.3;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    if (value.length <= 10) {
      setFormData({ ...formData, phone: value });
    }

    validateField("phone", "+92" + value);
  };

  const isPasswordValid = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  };

  const isEmailValid = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return regex.test(email);
  };

  const isPhoneValid = (phone) => {
    const cleaned = phone.replace(/[\s-]/g, "");

    const pakistanMobileRegex = /^(?:\+92|0)3[0-9]{9}$/;

    return pakistanMobileRegex.test(cleaned);
  };

  const handleResend = async () => {
    const response = await fetch(
      "http://localhost:5000/api/resend-confirmation",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Failed to resend.");
      setMessageType("error");
      setShowModal(true);

      return;
    }

    setMessage("Confirmation email resent. Check your inbox again.");
    setMessageType("success");
    setShowModal(true);
  };

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };

    if (name === "phone") {
      if (!value || value === "+92") {
        errors.phone = "Phone number is required.";
      } else if (!isPhoneValid(value)) {
        errors.phone = "Enter a valid 10-digit phone number after +92.";
      } else {
        delete errors.phone;
      }
    }

    setFieldErrors(errors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("");
    setFieldErrors({});
    const errors = {};

    const { firstName, lastName, email, phone, password, userType } = formData;

    if (!firstName) errors.firstName = "First name is required.";
    if (!lastName) errors.lastName = "Last name is required.";
    if (!email) errors.email = "Email is required.";
    else if (!isEmailValid(email)) errors.email = "Invalid email format.";

    if (!phone) {
      errors.phone = "Phone number is required.";
    } else if (phone.length !== 10 || !phone.startsWith("3")) {
      errors.phone = "Enter a valid 10-digit number starting with 3.";
    }

    if (!password) errors.password = "Password is required.";
    else if (!isPasswordValid(password)) {
      errors.password = "Min 8 chars, 1 upper, 1 lower, 1 number, 1 special.";
    }

    if (!confirmPassword) errors.confirmPassword = "Please confirm password.";
    else if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("Please fix the errors.");
      setMessageType("error");
      setShowModal(true);

      setLoading(false);
      return;
    }

    try {
      const body = {
        firstName,
        lastName,
        email,
        phone: "+92" + phone,
        password,
        userType,
      };

      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      console.log("Registration successful:", result);
      localStorage.setItem("signupEmail", email);
      localStorage.setItem("signupFirstName", firstName);
      localStorage.setItem("signupPhone", "+92"+phone);
      navigate("/signup-success");
    } catch (err) {
      setMessage(err.message);
      setMessageType("error");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="register-page-wrapper"
        style={{
          backgroundImage: `url("/images/blue.png")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          height: "100vh",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 60px",
        }}
      >
        <div className="register-left-text">
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginTop: "-50px",
              color: "rgb(3, 101, 134)",
              textShadow: "2px 2px 4px white",
            }}
          >
            JoblyNest
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              fontSize: "20px",
              fontStyle: "italic",
              marginTop: "8px",
              color: "rgb(3, 101, 134)",
              textShadow: "2px 2px 4px grey",
            }}
          >
            Create your account today and unlock a world of opportunities!
            <br />
            <br />
            Sign up now and take the first step towards a brighter future.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.2 }}
            style={{
              marginTop: "60px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Player
              ref={playerRef}
              src="/animations/signuplottie.json"
              speed={0.5}
              loop={false}
              autoplay={true}
              keepLastFrame={true}
              style={{ width: "280px", height: "280px" }}
              onEvent={(event) => {
                if (event === "complete") {
                  setPlayCount((prev) => {
                    const next = prev + 1;
                    if (next < 3) {
                      setTimeout(() => {
                        playerRef.current?.play();
                      }, 100);
                    }
                    return next;
                  });
                }
              }}
              rendererSettings={{
                preserveAspectRatio: "xMidYMid meet",
              }}
            />
          </motion.div>
        </div>

        <div className="register-right-wrapper">
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
              marginLeft: "30px",
            }}
          >
            <button
              type="button"
              className="register-guide-button"
              onClick={() => setShowGuide(true)}
            >
              How to create an account?
            </button>
          </div>

          <div className="register-form-container">
            <form
              onSubmit={handleSubmit}
              encType="multipart/form-data"
              autoComplete="off"
            >
              <div className="register-form-row">
                <div className="register-form-group">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    onChange={handleInputChange}
                  />
                  {fieldErrors.firstName && (
                    <div className="register-field-error">
                      {fieldErrors.firstName}
                    </div>
                  )}
                </div>
                <div className="register-form-group">
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    onChange={handleInputChange}
                  />
                  {fieldErrors.lastName && (
                    <div className="register-field-error">
                      {fieldErrors.lastName}
                    </div>
                  )}
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleInputChange}
                  />
                  {fieldErrors.email && (
                    <div className="register-field-error">
                      {fieldErrors.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      onChange={handleInputChange}
                    />
                    <span
                      className="password-toggle-icon"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  </div>
                  {fieldErrors.password && (
                    <div className="register-field-error">
                      {fieldErrors.password}
                    </div>
                  )}
                </div>

                <div className="register-form-group">
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <span
                      className="password-toggle-icon"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <div className="register-field-error">
                      {fieldErrors.confirmPassword}
                    </div>
                  )}
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <div className="phone-input-container">
                    <input
                      type="tel"
                      name="phone"
                      placeholder="3XXXXXXXXX"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="input"
                      style={{ paddingLeft: "50px" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#666",
                        fontWeight: "500",
                        pointerEvents: "none",
                      }}
                    >
                      +92
                    </span>
                  </div>
                  {fieldErrors.phone && (
                    <div className="register-field-error">
                      {fieldErrors.phone}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="register-submit-button"
                >
                  {loading ? "Signing Up..." : "Sign Up"}
                </button>
              </div>
            </form>

            {resendVisible && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "20px",
                }}
              >
                <button
                  onClick={handleResend}
                  className="register-resend-button"
                >
                  Resend Confirmation Email
                </button>
              </div>
            )}

            {message && (
              <div className={`register-form-message ${messageType}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className={`modal-content modal-split ${
              messageType === "error" ? "error-modal" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-left">
              <h3>{messageType === "success" ? "Success" : "Error"}</h3>
            </div>
            <div className="modal-right">
              <p>{message}</p>
              <div className="modal-buttons">
                <button
                  className="allow-btn"
                  onClick={() => setShowModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <SignupGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}

export default Register;
