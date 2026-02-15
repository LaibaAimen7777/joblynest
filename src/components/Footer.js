import React from "react";
import {
  MdEmail,
  MdPhone,
  MdDashboard,
  MdHome,
  MdLogin,
  MdPersonAdd,
  MdInfo,
} from "react-icons/md";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>
            <MdPhone /> Contact Us
          </h3>
          <p>
            <MdEmail /> joblynest@gmail.com
          </p>
         
        </div>

        <div className="footer-section">
          <h3>
            <MdDashboard /> Quick Links
          </h3>
          <ul>
            <li>
              <Link to="/">
                <MdHome /> Home
              </Link>
            </li>
            <li>
              <Link to="/login">
                <MdLogin /> Login
              </Link>
            </li>
            <li>
              <Link to="/register">
                <MdPersonAdd /> Signup
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>
            <MdInfo /> About JoblyNest
          </h3>
          <p>
            We connect you with trusted taskers for your daily service needs — safe,
            fast, and reliable!
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        © 2025 JoblyNest. All rights reserved.
      </div>
    </footer>
  );
}
