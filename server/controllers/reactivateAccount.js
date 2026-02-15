
import { supabase } from "../supabaseClient.js";

export const reactivateAccount = async (req, res) => {
  const { user_id } = req.body;

  try {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", user_id);

    if (updateError) throw updateError;

    const { error: unbanError } = await supabase.auth.admin.updateUserById(
      user_id,
      { banned_until: null }
    );

    if (unbanError) throw unbanError;

    res.status(200).json({
      success: true,
      message: "Account reactivated successfully.",
    });
  } catch (err) {
    console.error(" Reactivation error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to reactivate account.",
    });
  }
};
