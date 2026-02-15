import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import supabase from "../supabaseClient";

const ExtraProtectedRoutes = () => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const session = JSON.parse(localStorage.getItem("supabaseSession"));
      if (!session) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // Fetch user profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setAllowed(false);
      } else if (
        profile &&
        (profile.user_type === null || profile.user_type === "null")
      ) {
        // Allow only if user_type is null
        setAllowed(true);
      } else {
        setAllowed(false);
      }

      setLoading(false);
    };

    checkAccess();
  }, []);

  if (loading) return <div>Loading...</div>;

  // If not logged in
  const session = JSON.parse(localStorage.getItem("supabaseSession"));
  if (!session) return <Navigate to="/login" />;

  // If user_type is NOT null, redirect to dashboard or home
  if (!allowed) return <Navigate to="/" />;

  return <Outlet />;
};

export default ExtraProtectedRoutes;
