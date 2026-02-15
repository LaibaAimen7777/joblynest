import { supabase } from "../supabaseClient.js";

export const handleRequests = async (req, res) => {
  const { seeker_id, poster_id, slots, task_id } = req.body;
  console.log("task_id in handle_req",task_id);

  try {
    if (!seeker_id || !poster_id || !slots?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const slotsByDate = slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot.slot);
      return acc;
    }, {});

    const { data: seekerData, error: seekerError } = await supabase
      .from("seeker")
      .select("pay_rate")
      .eq("seeker_id", seeker_id)
      .single();

    if (seekerError || !seekerData) {
      console.error(" Error fetching seeker pay rate:", seekerError?.message);
      return res.status(400).json({ error: "Unable to fetch seeker pay rate" });
    }

    const hourlyRate = seekerData.pay_rate || 0;
    const totalSlots = slots.length; 
    const totalPay = hourlyRate * totalSlots;

    const { data: existing, error: existingError } = await supabase
      .from("hire_requests")
      .select("id, status, seeker_id") 
      .eq("poster_id", poster_id)
      .eq("task_id", task_id)
      .not("status", "in.(cancelled,rejected)");

    if (existingError) {
      console.error(" Existing check error:", existingError.message);
      return res
        .status(500)
        .json({ error: "Database error checking existing requests" });
    }

    if (existing && existing.length > 0) {
      const { error: cancelError } = await supabase
        .from("hire_requests")
        .update({ status: "cancelled" })
        .eq("poster_id", poster_id)
        .eq("task_id", task_id)
        .not("status", "in.(cancelled,rejected)");

      if (cancelError) {
        console.error(" Cancel error:", cancelError.message);
      }

      const seekerIds = existing.map(r => r.seeker_id);
      const { error: notifUpdateError } = await supabase
        .from("notifications")
        .update({ status: "cancelled" })
        .in("user_id", seekerIds)
        .like("message", "%hire request%");

      if (notifUpdateError) {
        console.error(" Notification update error:", notifUpdateError.message);
      }
    }

    const hireRequestsData = Object.entries(slotsByDate).map(
      ([date, slotList]) => ({
        seeker_id,
        poster_id,
        date,
        slots: slotList, 
        status: "pending",
        task_id: task_id,
        pay_rate: totalPay,
      })
    );

    const { data, error } = await supabase
      .from("hire_requests")
      .insert(hireRequestsData)
      .select("id, seeker_id, poster_id, date, slots, status, task_id, pay_rate");

    if (error) {
      console.error(" Insert error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const hireRequest = data;
    console.log("Hire_req_data:", data);


    const { error: taskUpdateError } = await supabase
      .from("task")
      .update({ seeker_id })
      .eq("task_id", task_id);

    if (taskUpdateError) {
      console.error(" Task update error:", taskUpdateError.message);
    }

    const { error: notifError, data: notifData } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: seeker_id,
          message: `A poster sent you a hire request`,
          status: "pending",   
          read: false,
          related_id: task_id,
        },
      ])
      .select()
      .single();

    if (notifError) {
      console.error(" Notification insert error:", notifError.message);
    } else {
      console.log(" Notification saved:", notifData);
    }

    res.status(201).json({
      message: " Hire request created successfully",
      hire_request: hireRequest,
    });
  } catch (err) {
    console.error(" Server error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

export const respondToHireRequest = async (req, res) => {
  console.log(" Backend reached: respondToHireRequest");

  const { hire_request_id, seeker_id, poster_id, response } = req.body;
  console.log("hire_request_id:", hire_request_id);
  console.log("poster_id:", poster_id);

  try {
    if (!hire_request_id || !response) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: currentReq } = await supabase
      .from("hire_requests")
      .select("*")
      .eq("id", hire_request_id)
      .single();

    if (!currentReq) return res.status(400).json({ error: "Request not found" });

     let finalResponse = response;
     let conflict = false;

    if (response === "accepted") {
      const { data: acceptedReqs } = await supabase
        .from("hire_requests")
        .select("*")
        .eq("seeker_id", seeker_id)
        .eq("status", "accepted")
        .eq("date", currentReq.date); 

      conflict = acceptedReqs.some((r) =>
        r.slots.some((slot) => currentReq.slots.includes(slot))
      );

      if (conflict) {
        finalResponse = "rejected";

        await supabase
          .from("hire_requests")
          .update({ status: "rejected" })
          .eq("id", hire_request_id); 
      }
    }

    const { data, error } = await supabase
      .from("hire_requests")
      .update({ status: finalResponse })
      .eq("id", hire_request_id)
      .select("*");

    console.log("Updated hire_request:", data);
    const task_id=data[0].task_id;
    console.log("task_id",task_id);

    if (error) {
      console.error(" Update error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    
if (finalResponse === "rejected") {
  const { error: taskResetError } = await supabase
    .from("task")
    .update({ seeker_id: null })
    .eq("task_id", data[0].task_id); 

  if (taskResetError) {
    console.error(" Failed to reset seeker_id:", taskResetError.message);
  } else {
    console.log(" Seeker reset to null for rejected request");
  }
}


    const { error: notifError, data: notifData } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: poster_id,
          message: `Your hire request was ${finalResponse} by the seeker.`,
          status: finalResponse,
          read: false,
          related_id: task_id,
        },
      ])
      .select()
      .single();

    if (notifError) {
      console.error("Notification insert error:", notifError.message);
    }

    res.status(200).json({
      message: conflict
        ? "⚠️ Conflict: You already have a task at this time. Request rejected."
        : "✅ Hire request response saved",
      hire_request: data, 
      notification: notifData,
      conflict: conflict || false,
    });

  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};
