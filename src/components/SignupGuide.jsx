import React from "react";
import "../styles/SignupGuide.css";

function SignupGuide({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guide-scroll">
          
          <h2 className="guide-title">How to create an account?</h2>

          <p className="guide-subtitle">
            A complete visual guide for you to register your account on{" "}
            <strong>JoblyNest</strong> today.
          </p>

          <div className="guide-video-wrapper">
            <video className="guide-video" src="/videos/signupvideo.mp4" controls />
          </div>

          <ol className="guide-list">

            <li>
              Enter your <strong>First Name</strong>.
              <div className="guide-step-image">
                <img src="/images/Signup1.jpg" alt="Step 1 - First Name" />
              </div>
            </li>

            <li>
              Enter your <strong>Last Name</strong>.
              <div className="guide-step-image">
                <img src="/images/signup2.jpg" alt="Step 2 - Last Name" />
              </div>
            </li>

            <li>
              Enter your valid <strong>Email account</strong>.
              <div className="guide-step-image">
                <img src="/images/signup3.jpg" alt="Step 3 - Email" />
              </div>
            </li>

            <li>
              Enter your <strong>Password</strong>{" "}
              <span className="guide-note">
                (at least 8 characters, including 1 uppercase letter, 1 lowercase
                letter, 1 number, and 1 special character).
              </span>
              <div className="guide-step-image">
                <img src="/images/signup4.jpg" alt="Step 4 - Password" />
              </div>
            </li>

            <li>
              Write the password again to <strong>confirm</strong> it.
              <div className="guide-step-image">
                <img src="/images/signup5.jpg" alt="Step 5 - Confirm Password" />
              </div>
            </li>

            <li>
              Click on the  <strong> eye icon next to the password</strong> to view it.
             
            </li>

            <li>
              Type your <strong>phone number</strong>.
              <div className="guide-step-image">
                <img src="/images/signup7.jpg" alt="Step 7 - Phone Number" />
              </div>
            </li>

            <li>
              Click on <strong>Sign Up</strong>. You will receive an email shortly.
              <div className="guide-step-image">
                <img src="/images/signup8.jpg" alt="Step 8 - Sign Up" />
              </div>
            </li>

            <li>
              Did not receive an email? No worries ,click on{" "}
              <strong>Get OTP on phone</strong> to receive an SMS.
            </li>

            <li>
              Check your phone and type the <strong>OTP</strong> received.
            </li>

            <li>
              <strong>Signup completed!</strong> Browse through{" "}
              <strong>JoblyNest</strong> to enjoy our services.
            </li>
          </ol>

          <button className="guide-button" onClick={onClose}>
            Got it
          </button>

        </div>
      </div>
    </div>
  );
}

export default SignupGuide;
