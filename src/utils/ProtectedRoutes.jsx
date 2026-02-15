import { Navigate, Outlet } from "react-router-dom";
import supabase from "../supabaseClient.js";
import { useEffect, useState } from "react";

const ProtectedRoutes = () => {
  const [authState, setAuthState] = useState({ loading: true, isAdmin: false });

  useEffect(() => {
    const checkAuth = async (event, session) => {
      if (!session) {
        const fallback = localStorage.getItem("is_admin") === "true";
        setAuthState({ loading: false, isAdmin: fallback });
        return;
      }
  
      const userId = session.user.id;

      // console.log("userId:",userId);

  
      const { data, error } = await supabase
        .from("admin")
        .select("id")
        .eq("id", userId)
        .single();
  
      setAuthState({
        loading: false,
        isAdmin: !error && !!data,
      });
    };
  
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(null, session);
    });
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      checkAuth(event, session);
    });
  
    return () => subscription.unsubscribe();
  }, []);
  
  

  if (authState.loading) return <div>Loading...</div>;
  return authState.isAdmin ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoutes;