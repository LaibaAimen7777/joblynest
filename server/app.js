import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { registerUser } from './controllers/authController.js';
import { fetchList } from './controllers/fetchListOfUsers.js';
import { updateApproval } from './controllers/updateApproval.js';
import { resendConfirmation } from './controllers/resendConfirmation.js';
import {getApprovedUsers} from './controllers/getApprovedUsers.js';
// import {handleLogin} from './controllers/handleCheckStatus.js';
// import { forgotPassword } from './controllers/forgotPassword.js;';
import { forgotPassword } from './controllers/forgotPassword.js';
import { handleAdminLogin } from './controllers/handleAdminLogin.js';
import { handleProfileType } from './controllers/handleProfileType.js';
import { handleCheckStatus } from './controllers/handleCheckStatus.js';
import { getAvailability, saveAvailability } from './controllers/availabilityController.js';

import { fetchSeekers } from './controllers/fetchSeekers.js';
import { fetchSeekerById } from './controllers/fetchSeekers.js';
import { createTask } from './controllers/handleTask.js';
import { getTasksByPoster } from './controllers/handleTask.js';
import { getHireRequestByTask } from './controllers/handleTask.js';
import { recommendSeekers } from "./controllers/recommendSeekers.js";
import { updateSeekerEmbedding } from "./controllers/updateSeekerEmbedding.js";
import { handleRequests } from "./controllers/handleRequests.js";
import {respondToHireRequest} from "./controllers/handleRequests.js";
import { getRecommendations } from "./controllers/recommendationController.js";
import { checkHireRequest } from './controllers/checkHireRequestController.js';
import { handlePending } from './controllers/handlePending.js';
import { deactivateAccount } from './controllers/deactivateAccount.js';
import { reactivateAccount } from "./controllers/reactivateAccount.js";
import { cancelSeeker } from "./controllers/cancelSeekerController.js";
import bodyParser from "body-parser";
import { createCheckoutSession, completePaymentRoute, getPaymentDetails } from "./controllers/paymentController.js";
import { sendSignupOTP } from "./controllers/updateApproval.js";
import { confirmEmail } from "./controllers/confirmEmail.js"; // adjust path if needed
import { sendPhoneOtp, verifyPhoneOtp } from "./controllers/phoneOtpController.js";
import { cleanText } from "./controllers/spellCheck.js";
// import { spellCheck } from "./controllers/spellcheck.js";
// import { checkAdmin } from './controllers/checkAdmin.js';
import formidable from 'formidable';
import geminiTestRoute from "./controllers/geminiTest.js";
import { generateDescription } from "./controllers/generateDescription.js";
import { correctTaskDescription } from "./controllers/correctTaskDescription.js";
import complaintsRoutes from "./controllers/complaints.js";
import { resolveComplaint } from "./controllers/resolveComplaints.js";
import {
  createRatingReview,
  getRatingsByReviewer,
} from "./controllers/ratingReviewsController.js";



dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());


// const server = createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000", // React frontend
//     methods: ["GET", "POST"],
//     credentials: true,
//   }
// });
// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// // app.use(express.urlencoded({ extended: true }));
// // const upload=multer({storage:multer.memoryStorage()});

// // Store connected users in memory
// let connectedUsers = {}; // { userId: [socketId1, socketId2, ...] }
// app.set("io", io);
// app.set("onlineUsers", connectedUsers);

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   // ===== Chat Events =====
//   // User joins a task-based room
//   socket.on("join_room", (taskId) => {
//     socket.join(taskId);
//     console.log(`✅ User ${socket.id} joined room ${taskId}`);
//   });


//   // Handle sending messages
//   socket.on("send_message", async (msgData) => {
//     const { task_id, sender_id, receiver_id, message } = msgData;

//     // 1️⃣ Save to Supabase
//     const { data, error } = await supabase
//       .from("messages")
//       .insert([
//         {
//           task_id,
//           sender_id,
//           receiver_id,
//           message,
//         },
//       ])
//       .select();

//     if (error) {
//       console.error("❌ DB insert error:", error.message);
//       return;
//     }

//   const savedMessage = data[0];

//   // 2️⃣ Save notification for receiver
//   const { error: notifError } = await supabase
//     .from("notifications")
//     .insert([
//       {
//         user_id: receiver_id,
//         // type: "message",
//         message: "You received a new message",
//         read: false,
//         status: "message",
//         // related_id: savedMessage.id, 
//       },
//     ]);

//   if (notifError) {
//     console.error("❌ Notification insert error:", notifError.message);
//   }

//   // 3️⃣ Broadcast new message to the room
//   io.to(task_id).emit("receive_message", savedMessage);

//   // 4️⃣ Emit notification in real-time only to the receiver (if online)
//   if (connectedUsers[receiver_id]) {
//     connectedUsers[receiver_id].forEach((socketId) => {
//       io.to(socketId).emit("newNotification", {
//         type: "message",
//         message: "You received a new message",
//         task_id,
//         message_id: savedMessage.id,
//       });
//     });
//   }
// });

//   // ===== Notification Events =====
//   socket.on("register", (userId) => {
//     if (!connectedUsers[userId]) {
//       connectedUsers[userId] = [];
//     }

//     // prevent duplicates (just in case)
//     if (!connectedUsers[userId].includes(socket.id)) {
//       connectedUsers[userId].push(socket.id);
//     }

//     console.log(`User ${userId} registered on socket ${socket.id}`);
//     console.log("All connected users:", connectedUsers);
//   });

// socket.on("sendNotification", async ({ toUserId, message }) => {
//   console.log("Notification request received for:", toUserId, message);

//   await supabase.from("notifications").insert([
//     { user_id: toUserId, message: message, read: false }
//   ]);

//   if (connectedUsers[toUserId]) {
//     console.log("User is online, emitting socket event to:", connectedUsers[toUserId]);

//     connectedUsers[toUserId].forEach((socketId) => {
//       io.to(socketId).emit("newNotification", { message });
//     });
//   } else {
//     console.log("User is offline, saved to DB only");
//   }
// });


// socket.on("disconnect", () => {
//   console.log("❌ Socket disconnected:", socket.id);

//   for (const userId in connectedUsers) {
//     if (connectedUsers[userId].includes(socket.id)) {
//       console.log(`User ${userId} disconnected from socket ${socket.id}`);
//     }

//     connectedUsers[userId] = connectedUsers[userId].filter(
//       (id) => id !== socket.id
//     );

//     if (connectedUsers[userId].length === 0) {
//       delete connectedUsers[userId];
//       console.log(`User ${userId} completely disconnected.`);
//     }
//   }

//     console.log("All connected users:", connectedUsers);
//   });
// });





// app.post('/api/register', registerUser);
app.post('/api/register', async (req, res) => {
    // const form = formidable({
    //   multiples: true, // allow multiple file uploads
    //   keepExtensions: true,
    // });
  
    // form.parse(req, async (err, fields, files) => {
    //   if (err) {
    //     console.error('Upload error:', err);
    //     return res.status(500).json({ error: 'File processing failed' });
    //   }
  
      try {
        const fields = req.body;
        await registerUser(fields, null, res);
        // await registerUser(fields, files, res); // pass full files object
      } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
      }
    });

  app.get("/api/notifications/:userId", async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/send_message", async (req, res) => {
  const { task_id, sender_id, receiver_id, message } = req.body;

  const { data, error } = await supabase
    .from("messages")
    .insert([{ task_id, sender_id, receiver_id, message }])
    .select();

  if (error) return res.status(500).json({ error: error.message });

  const savedMessage = data[0];

  // Insert notification
  await supabase.from("notifications").insert([
    {
      user_id: receiver_id,
      message: "You received a new message",
      read: false,
      status: "message",
    },
  ]);

  res.json(savedMessage);
});


  
app.get('/api/listOfUsers',fetchList);

app.put('/api/updateApproval',updateApproval);
app.get('/api/approved-users', getApprovedUsers);
// app.post('/api/login', handleLogin);
app.get('/api/check-status', handleCheckStatus);
app.post('/api/admin-login',handleAdminLogin);

app.post('/api/resend-confirmation',resendConfirmation);
app.post('/api/forgot-password', forgotPassword);
app.post('/api/handleProfileType', handleProfileType);

app.get('/api/availability/:userId', getAvailability);
app.post('/api/availability', saveAvailability);
app.get('/api/fetchSeekers', fetchSeekers);
app.get('/api/fetchSeekerById/:id', fetchSeekerById);
app.get("/api/recommendations/:seekerId", getRecommendations);


app.post("/api/createTask", createTask);
app.get("/api/my-tasks/:poster_id", getTasksByPoster);
app.get("/api/hire-request-by-task/:task_id", getHireRequestByTask);
app.get("/api/recommend-seekers", recommendSeekers);
app.post("/api/seeker/update-embedding", updateSeekerEmbedding);
app.post("/api/hire-request",handleRequests);
app.get("/api/check-hire-request/:task_id",checkHireRequest);
app.post("/api/respond",respondToHireRequest);
app.post("/api/handlePending",handlePending);
app.post("/api/deactivate", deactivateAccount);
app.post("/api/reactivate-account", reactivateAccount);
app.post("/api/cancel-seeker", cancelSeeker);
app.use("/api", complaintsRoutes);
app.post("/api/admin/complaints/resolve", resolveComplaint);


app.get("/api/payment-by-task/:task_id", async (req, res) => {
  try {
    const { task_id } = req.params;
    const { data, error } = await supabase
      .from("payment")
      .select("*")
      .eq("task_id", task_id)
      .single();

    if (error) throw error;
    res.json({ payment: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Payment routes
app.post("/api/create-checkout-session", createCheckoutSession);
app.get("/api/payment-details/:task_id", getPaymentDetails);

// Complete payment (called by frontend after Stripe redirect)
app.post("/api/complete-payment/:task_id", completePaymentRoute);

app.post("/api/send-signup-otp", sendSignupOTP);
app.post("/api/confirm-email", confirmEmail);
app.post("/api/send-phone-otp", sendPhoneOtp);
app.post("/api/verify-phone-otp", verifyPhoneOtp);
app.post("/api/spellcheck", (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const corrected = cleanText(text);

    if (!corrected) return res.status(400).json({ error: "Invalid input" });

    res.json({ corrected });
  } catch (err) {
    console.error("SpellCheck Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/api/gemini-fixed", geminiTestRoute);
app.post("/api/generate-description", generateDescription);
app.post("/api/correct-task-description", correctTaskDescription);
app.post("/api/rating-reviews", createRatingReview);
app.get("/api/rating-reviews/by-reviewer/:reviewerId", getRatingsByReviewer);



// app.get('/api/checkAmin',checkAdmin);


app.listen(5000, () => console.log('Server running on port 5000'));
