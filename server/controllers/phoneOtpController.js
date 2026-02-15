import axios from "axios";
import { supabase } from "../supabaseClient.js";


const phoneOtpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const sendPhoneOtp = async (req, res) => {
  const { email, phone, firstName } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ error: "Email and phone are required" });
  }

  const otp = generateOtp();
  phoneOtpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
  console.log("phone otp is:",otp)

  if (!process.env.MOCEAN_TOKEN) {
    phoneOtpStore.delete(email);
    return res.status(500).json({ error: "Mocean token not configured" });
  }

  try {
   await axios.post(
  "https://rest.moceanapi.com/rest/2/sms",
  {
    "mocean-to": phone,                  
    "mocean-from": "JoblyNest",            
    "mocean-text": `Your JoblyNest OTP is ${otp}`, 
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.MOCEAN_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
);

    return res.status(200).json({
      message: "OTP sent to phone",
      recipient: phone,
      name: firstName,
    });

  } catch (err) {
    console.error("Mocean API error:", err?.response?.data || err.message);
    phoneOtpStore.delete(email);

    return res.status(500).json({
      error: "Failed to send OTP via SMS",
    });
  }
};

export const verifyPhoneOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const record = phoneOtpStore.get(email);

  if (!record) {
    return res.status(400).json({ error: "OTP expired. Please resend." });
  }

  if (record.expiresAt < Date.now()) {
    phoneOtpStore.delete(email);
    return res.status(400).json({ error: "OTP expired. Please resend." });
  }

  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ error: "Incorrect OTP. Try again." });
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ is_phone_confirm: true })
      .eq("email", email);

    if (error) {
      throw error;
    }

    phoneOtpStore.delete(email);
    res.status(200).json({ message: "Phone verified successfully" });
  } catch (err) {
    console.error("Phone confirmation error:", err);
    res.status(500).json({ error: "Failed to confirm phone." });
  }
};

