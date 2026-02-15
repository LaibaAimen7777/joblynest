// controllers/deactivateAccount.js
import { supabase } from "../supabaseClient.js";

export const deactivateAccount = async (req, res) => {
  const { user_id } = req.body;

  try {

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", user_id);

    if (updateError) throw updateError;

    const { error: banError } = await supabase.auth.admin.updateUserById(
      user_id,
      { banned_until: "9999-12-31T00:00:00Z" }
    );

    if (banError) throw banError;

    const { error: taskError } = await supabase
      .from("task")
      .update({ seeker_id: null })
      .or(`seeker_id.eq.${user_id},poster_id.eq.${user_id}`);
    if (taskError) throw taskError;


    res.status(200).json({
      success: true,
      message: "Account deactivated successfully.",
    });
  } catch (err) {
    console.error(" Deactivation error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to deactivate account.",
    });
  }
};
