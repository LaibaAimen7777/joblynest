

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Loader from "../components/Loader"; // adjust path if needed

import supabase from "../supabaseClient";

const UserProtectedRoutes = ({ children, allowedUserType }) => {
  const [isAuthorized, setIsAuthorized] = useState(null); // null = loading, true/false = decided
  const [redirectPath, setRedirectPath] = useState("/");

  useEffect(() => {
    const checkAccess = async () => {
      // Check session first
      const session = JSON.parse(localStorage.getItem("supabaseSession"));
      console.log("localstorage",localStorage);

      if (!session) {
        console.log("No session found");
        // No session = not logged in
        setRedirectPath("/");
        setIsAuthorized(false);
        return;
      }

      // Get profile from Supabase (you can cache user_type in localStorage later)
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        console.error("Error fetching profile:", error);
        setRedirectPath("/");
        setIsAuthorized(false);
        return;
      }

      // If user_type is missing (null), send to user type selection page
      if (!profile.user_type) {
        console.log("User type is null");
        setRedirectPath("/select-user-type");
        setIsAuthorized(false);
        return;
      }

      // Check if user_type matches the allowed type
      if (allowedUserType && profile.user_type !== allowedUserType) {
        console.log(`User type ${profile.user_type} not allowed here`);
        setRedirectPath("/"); // redirect to LandingPage
        setIsAuthorized(false);
        return;
      }

      // All good 
      setIsAuthorized(true);
    };

    checkAccess();
  }, [allowedUserType]);

  // While checking
 if (isAuthorized === null) return <Loader />;

  // If not authorized
  if (!isAuthorized) {
    console.log("Redirecting to:", redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  // Authorized: render children
  return children;
};

export default UserProtectedRoutes;
