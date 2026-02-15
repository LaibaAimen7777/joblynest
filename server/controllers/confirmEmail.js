import { supabase } from "../supabaseClient.js";

export const confirmEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ is_email_confirm: true })
      .eq("email", email);

    if (error) throw error;

    res.status(200).json({ message: "Email confirmed successfully" });
  } catch (err) {
    console.error("Confirm email error:", err);
    res.status(500).json({ error: "Failed to confirm email" });
  }
};
