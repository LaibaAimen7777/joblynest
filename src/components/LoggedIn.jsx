import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import supabase from "../supabaseClient.js";

const LoggedInScreen = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleProfileSelection = async (profileType) => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.error("No active session found:", error);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/handleProfileType", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ` Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ profileType }),
      });

      const result = await res.json();

      if (res.ok) {
        if (profileType === "job_poster") {
          navigate("/poster-dashboard");
        } else if (profileType === "job_seeker") {
          navigate("/seeker-dashboard");
        } else {
          console.error("Unknown profile type selected.");
        }
      } else {
        console.error("Error setting profile type:", result.error);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.setItem("is_logged_in", false);
    navigate("/login");
  };

  return (
    <>
      <style>{`
      .logged-in-container {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: url("/images/loggedinBg.jpg") no-repeat center center;
        background-size: cover;
        font-family: Arial, sans-serif;
        position: relative;
        overflow: hidden;
      }

  .card {
  width: 100%;
  height: 600;
  max-width: 400px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 1;
  background-color: transparent; 
   border: 1px solid black;
  display: flex;
  flex-direction: column;
}

.top-section {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 30px 25px;
  text-align: center;
  margin: 0; 
}


      .top-section h2 {
        font-size: 28px;
        color: black;
        font-style:italic;
        font-weight: 700;
        margin-bottom: 10px;
      }

      .top-section .email-text {
        font-weight: 400;
        color:black;
        font-size: 14px;
      }

 .bottom-section {
  background: #ffffff;
  padding: 30px 25px;
  text-align: center;
  margin: 0;
  min-height: 250px; /* ← Increase this as needed */
}


      .prompt {
        font-size: 18px;
        margin-bottom: 40px;
        textstyle: italic;
        font-weight: 600;
        color: #333;
      }

      .button-group {
        display: flex;
        flex-direction: column;
        gap: 25px;
      }

    .select-button {
  padding: 14px;
  border: none;
  border-radius: 30px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;

  width: 70%;        
  align-self: center;
}

      .seeker,
      .poster {
        background-color: #234e52;
      }

      .seeker:hover,
      .poster:hover {
        background-color: #2c7a7b;
      }
    `}</style>

      <div className="logged-in-container">
        <div className="card">
          <div className="top-section">
            <h2>Welcome</h2>
            <p className="email-text">{user?.email}</p>
          </div>
          <div className="bottom-section">
            <p className="prompt">Please select your profile type </p>
            <div className="button-group">
              <button
                className="select-button seeker"
                onClick={() => handleProfileSelection("job_seeker")}
              >
                Job Seeker
              </button>
              <button
                className="select-button poster"
                onClick={() => handleProfileSelection("job_poster")}
              >
                Job Poster
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoggedInScreen;
