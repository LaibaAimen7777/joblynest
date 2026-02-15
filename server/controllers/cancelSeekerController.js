import { supabase } from "../supabaseClient.js";

export const cancelSeeker = async (req, res) => {
  const { task_id } = req.body;

  try {
    if (!task_id) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const { data: hireRequestData, error: hireRequestError } = await supabase
      .from("hire_requests")
      .select("id, task_id, seeker_id")
      .eq("task_id", task_id)
      .single();

    if (hireRequestError) {
      console.error("Error fetching hire request:", hireRequestError.message);
      return res.status(400).json({ error: "Hire request not found for this task" });
    }

    if (!hireRequestData) {
      return res.status(400).json({ error: "No hire request found for this task" });
    }

    const { error: deleteError } = await supabase
      .from("hire_requests")
      .delete()
      .eq("id", hireRequestData.id);

    if (deleteError) {
      console.error("Error deleting hire request:", deleteError.message);
      return res.status(500).json({ error: "Failed to delete hire request" });
    }

    const { error: updateTaskError } = await supabase
      .from("task")
      .update({ seeker_id: null })
      .eq("task_id", task_id);

    const { error: notifError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: hireRequestData.seeker_id, 
          message: "The poster has cancelled the task.",
          status: "pending",
          read: false,
          related_id: task_id,
        },
      ]);

    if (notifError) {
      console.error("Notification insert error:", notifError.message);
    }


    if (updateTaskError) {
      console.error("Error updating task:", updateTaskError.message);
      return res.status(500).json({ error: "Failed to update task" });
    }

    res.json({
      message: "Seeker cancelled successfully for this task",
      task_id: task_id,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};
