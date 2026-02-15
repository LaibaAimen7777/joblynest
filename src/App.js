import { useEffect, useState } from "react";
// import socket from "./socket.js"
import supabase from "./supabaseClient";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useRealtimeMessages from "./useRealtimeMessages";
import useNotifications from "./useNotifications";
import ReportComplaint from "./components/ReportComplaint";
import ResolveComplaint from "./components/ResolveComplaint";
import FAQ from "./components/FAQ"
import RatingReviews from "./components/RatingReviews";




import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Register from "./components/Register";
import AdminRegistration from "./components/AdminRegistration";
import AdminApproved from "./components/AdminApproved";
import ForgotPassword from "./components/ForgotPassword";
import AuthOptions from "./components/AuthOptions";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import ProtectedRoutes from "./utils/ProtectedRoutes";
// import UserProtectedRoutes from './utils/UserProtectedRoutes';
import UserProtectedRoutes from "./utils/UserProtectedRoutes";
import LandingPage from "./components/LandingPage";
import ServiceDetail from "./components/ServiceDetail";
import ResetPassword from "./components/ResetPassword";
import LoggedInScreen from "./components/LoggedIn";
import AdminLogin from "./components/AdminLogin";
import PosterDashboard from "./components/PosterDashboard";
import SeekerDashboard from "./components/SeekerDashboard";
import SeekerProfileForm from "./components/SeekerProfileForm";
import AvailabilityForm from "./components/AvailabilityForm";
import SeekerAccount from "./components/SeekerAccount";
import SeekerProfile from "./components/SeekerProfile";
import PosterExplore from "./components/PosterExplore";
import CreateTask from "./components/CreateTaskForm";
import RecommendedSeekers from "./components/RecommendedSeekers";
import AboutUs from "./components/AboutUs";
import ExploreSeekerDetail from "./components/ExploreSeekerDetail";
import SeekerDetail from "./components/SeekerDetails";
import PosterMyTasks from "./components/PosterMyTasks";
import ExploreCreateTask from "./components/ExploreCreateTask";
import PosterRequests from "./components/PosterRequests";
import MessageScreen from "./components/MessageScreen";
import ExtraProtectedRoute from "./utils/ExtraProtectedRoute";
import SignupSuccess from "./components/SignupSuccess";
import ShowStatus from "./components/ShowStatus";
import SetCnic from "./components/SetCnic";
// import PhoneNumberScreen from "./components/PhoneNumberScreen";
// import PhoneOTPScreen from "./components/PhoneOTPScreen";
import SignupPhoneOtp from "./components/SignupPhoneOtp";
import MyTasks from "./components/MyTasks";

function App() {
  const [userId, setUserId] = useState(null);

  // ✅ Fetch current user on app load
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        console.log("✅ Logged in user:", user.id);
      }
    };
    fetchUser();
  }, []);

  // ✅ Enable realtime message listener
  useRealtimeMessages(userId);
  // useNotifications(userId);
  //   const { notificationCount, setNotificationCount } = useNotifications(userId);

  // useEffect(() => {
  //   window.updateNotificationCount = setNotificationCount;
  //   window.notificationCount = notificationCount;
  // }, [notificationCount, setNotificationCount]);

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/service/:serviceName" element={<ServiceDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/show_status" element={<ShowStatus />} />
          <Route path="/set_cnic" element={<SetCnic />} />
          
          <Route path="/register" element={<Register />} />
          <Route path="/auth-option" element={<AuthOptions />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/faq" element={<FAQ />} />
          {/* <Route path="/phone-number-screen" element={<PhoneNumberScreen />} />
          <Route path="/phone-otp" element={<PhoneOTPScreen />} /> */}
          
          <Route path="/signup-success" element={<SignupSuccess />} />
          <Route path="/signup-phone-otp" element={<SignupPhoneOtp />} />
         

          {/* User Protected Routes */}
          {/* <Route element={<ExtraProtectedRoute />}> */}
            <Route path="/loggedIn" element={<LoggedInScreen />} />{" "}
          {/* </Route> */}

          <Route
            path="/seeker-dashboard"
            element={
              <UserProtectedRoutes allowedUserType="job_seeker">
                <SeekerDashboard />{" "}
              </UserProtectedRoutes>
            }
          />
          

          <Route
            path="/seeker-profile-form"
            element={
              <UserProtectedRoutes allowedUserType="job_seeker">
                <SeekerProfileForm />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/availability-form"
            element={
              <UserProtectedRoutes allowedUserType="job_seeker">
                <AvailabilityForm />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/seeker-account"
            element={
              <UserProtectedRoutes allowedUserType="job_seeker">
                <SeekerAccount />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/seeker-profile"
            element={
              <UserProtectedRoutes allowedUserType="job_seeker">
                <SeekerProfile />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <UserProtectedRoutes allowedUserType="job_seeker">
                <MyTasks />
              </UserProtectedRoutes>
            }
          />

          <Route path="/messages/:id" element={<MessageScreen />} />

          <Route
            path="/poster-dashboard"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <PosterDashboard />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/explore"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <PosterExplore />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/create-task"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <CreateTask />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/recommendations/:task_id"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <RecommendedSeekers />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/seeker-details/:seeker_id/:task_id"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <SeekerDetail />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/explore-seeker-details/:seeker_id"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <ExploreSeekerDetail />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/poster-my-tasks"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <PosterMyTasks />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/poster-seeker-requests"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <PosterRequests />
              </UserProtectedRoutes>
            }
          />
          <Route
            path="/explore-create-task"
            element={
              <UserProtectedRoutes allowedUserType="job_poster">
                <ExploreCreateTask />
              </UserProtectedRoutes>
            }
          />
          <Route path="/provide-rating" element={<RatingReviews />} />


          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoutes />}>
            <Route path="/admin-dash" element={<AdminDashboard />} />
            <Route path="/registration" element={<AdminRegistration />} />
            <Route path="/approved" element={<AdminApproved />} />
          </Route>
          <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/report-complaint" element={<ReportComplaint />} />

          <Route
  path="/admin/complaints/:id/resolve"
  element={<ResolveComplaint />}
/>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
