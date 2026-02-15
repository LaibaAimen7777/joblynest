
import { supabase } from "../supabaseClient.js";

export const checkHireRequest = async (req, res) => {
  try {
    const { task_id } = req.params;
    console.log("task_id in checkHireReq",task_id);

    const { data, error } = await supabase
      .from("task")
      .select("seeker_id")
      .eq("task_id", task_id) 
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (data.seeker_id) {

      return res.json({ exists: true });
    } else {

      return res.json({ exists: false });
    }
  } catch (err) {
    console.error("Error in checkHireRequest:", err.message);
    res.status(500).json({ error: "Server error while checking hire request" });
  }
};
