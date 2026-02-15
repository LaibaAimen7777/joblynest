
import { supabase } from "../supabaseClient.js";

export const handlePending = async (req, res) => {
  try {
    const { task_id } = req.body; 
    console.log(" handlePending received:", { task_id });

    if (!task_id) {
      return res.status(400).json({ error: "task_id (uuid) are required" });
    }

    const { error: deleteRequestsError } = await supabase
      .from("hire_requests")
      .delete()
      .eq("task_id", task_id);

    if (deleteRequestsError) throw deleteRequestsError;
    console.log("Old hire requests deleted for task:", task_id);

    const { error: deleteNotifsError } = await supabase
      .from("notifications")
      .delete()
      .eq("related_id", task_id)
      .like("message", "%hire request%");

    if (deleteNotifsError) throw deleteNotifsError;
    console.log("Old notifications deleted for task:", task_id);


    const { error: taskError } = await supabase
      .from("task")
      .update({ seeker_id: null })
      .eq("task_id", task_id);

    if (taskError) throw taskError;
    console.log("task.seeker_id reset for task:", task_id);

    return res.json({ success: true, message: "Task reset and pending cleared" });
  } catch (err) {
    console.error(" handlePending error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
