
import { supabase } from "../supabaseClient.js";
import { sendEmail } from "../utils/mailer.js"; 
import jwt from "jsonwebtoken";

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));



export const sendSignupOTP = async (req, res) => {
  const { email, firstName } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    
    const otp = generateOtp();

    const subject = "Your JoblyNest Verification Code";
    const message = `
Hello ${firstName || "User"},

Your verification code is: ${otp}

Enter this code in the app to complete your signup and send your request for admin approval.

Thank you,
JoblyNest Team
`;

console.log("otp email before sending:",otp);
    // send email
    await sendEmail(email, subject, message);
    console.log("OTP email sent to:", email,otp);

    return res.status(200).json({ success: true, otp });
    
  } catch (error) {
    console.error("Mailer failed:", err);
    return res.status(500).json({ error: "Failed to send OTP email." });
  }
};

export const updateApproval = async (req, res) => {
  const { id, approval } = req.body;
  const authHeader = req.headers['authorization'];

  // Extract admin ID from token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }

  const token = authHeader.split(" ")[1];
  let adminData;
  try {
    adminData = jwt.verify(token, process.env.JWT_SECRET); 
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const adminId = adminData.adminId;
  const { data: adminRow, error: adminError } = await supabase
    .from("admin")
    .select("id")
    .eq("id", adminId)
    .single();

  if (adminError || !adminRow) {
    return res.status(403).json({ error: "User is not an admin" });
  }


  const { data: userData, error: fetchError } = await supabase
    .from("profiles")
    .select("email, first_name") 
    .eq("id", id)
    .single();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  const userEmail = userData.email;
  const userName = userData.first_name || "User";

  if (approval === "accept") {
    const { data: updateData, error: updateError } = await supabase
      .from("profiles")
      .update({ is_approved: true, admin_id: adminId })
      .eq("id", id);

    if (updateError)
      return res.status(500).json({ error: updateError.message });

    await sendEmail(
      userEmail,
      "Registration Approved",
      `Hello ${userName},\n\nYour registration has been approved! You can now log in to your account.`
    );
  } else if (approval === "reject") {
    const { data: updateData, error: updateError } = await supabase
      .from("profiles")
      .update({ is_rejected: true, admin_id: adminId })
      .eq("id", id);

    if (updateError)
      console.error("Supabase update error:", updateError);
      return res.status(500).json({ error: updateError.message });

    await sendEmail(
      userEmail,
      "Registration Rejected",
      `Hello ${userName},\n\nWe are sorry to inform you that your registration request has been rejected.`
    );
  }

  res.status(200).json({ message: "User approval updated successfully" });
};
