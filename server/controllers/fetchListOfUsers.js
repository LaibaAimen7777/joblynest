import { supabase } from "../supabaseClient.js";

export const fetchList = async (req, res) => {
  try {
  
  const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_approved", false)
      .eq("is_rejected", false)
      .eq("is_admin", false)
      .or("is_email_confirm.eq.true,is_phone_confirm.eq.true"); 

    if (profilesError)
      return res.status(500).json({ error: profilesError.message });


res.json(profiles);
  } catch (error) {
    console.error("Fetch List error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
