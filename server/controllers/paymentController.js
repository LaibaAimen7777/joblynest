
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const createCheckoutSession = async (req, res) => {
  const { task_id } = req.body;
  try {
    if (!task_id) return res.status(400).json({ error: "task_id required" });

    const { data: hireData, error: hrError } = await supabase
      .from("hire_requests")
      .select("seeker_id, slots")
      .eq("task_id", task_id)
      .single();

    if (hrError || !hireData) {
      return res.status(400).json({ error: "Hire request not found" });
    }

    const { data: seekerData, error: seekerError } = await supabase
      .from("seeker")
      .select("pay_rate")
      .eq("seeker_id", hireData.seeker_id)
      .single();

    if (seekerError || !seekerData) {
      return res.status(400).json({ error: "Seeker not found" });
    }

    const hourlyRate = Number(seekerData.pay_rate);
    const slots = hireData.slots || [];
    const numSlots = Array.isArray(slots) ? slots.length : 0;
    
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      return res.status(400).json({ error: "Invalid hourly rate" });
    }
    
    if (numSlots === 0) {
      return res.status(400).json({ error: "No slots found for this task" });
    }

    const totalPayment = hourlyRate * numSlots;
    const amountInCents = Math.round(totalPayment * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: `Payment for Task #${task_id} (${numSlots} hour${numSlots > 1 ? 's' : ''})`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/poster-my-tasks?payment_success=1&task_id=${task_id}`,
      cancel_url: `${process.env.CLIENT_URL}/poster-my-tasks?payment_failed=1&task_id=${task_id}`,

      metadata: { task_id: String(task_id) },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createCheckoutSession error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

export const completePaymentRoute = async (req, res) => {
  try {
    const { task_id } = req.params;
    if (!task_id) return res.status(400).json({ error: "task_id required" });

    const { data: paymentRow, error: payErr } = await supabase
      .from("payment")
      .select("id, status")
      .eq("task_id", task_id)
      .single();

    if (payErr) {
      return res.status(400).json({ error: "Payment row not found" });
    }

    if (paymentRow.status === "completed") {
      return res.json({ success: true, message: "Already completed" });
    }


    const { error: updateErr } = await supabase
      .from("payment")
      .update({ status: "completed" })
      .eq("task_id", task_id);

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    const { data: taskRow, error: taskErr } = await supabase
      .from("task")
      .select("seeker_id")
      .eq("task_id", task_id) 
      .single();

    if (taskErr || !taskRow?.seeker_id) {
      console.error(" Failed to fetch seeker for notification:", taskErr?.message);
    } else {
      const seekerId = taskRow.seeker_id;

    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", seekerId)
      .eq("related_id", task_id)
      .eq("status", "completed")
      .maybeSingle();

    if (!existingNotif) {

      await supabase.from("notifications").insert([
        {
          user_id: seekerId,
          message: "Payment for your task has been completed.",
          status: "completed",
          read: false,
          related_id: task_id,
        },
      ]);
    }
  }

    return res.json({ success: true });
  } catch (err) {
    console.error("completePaymentRoute error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

export const getPaymentDetails = async (req, res) => {
  const { task_id } = req.params;
  try {
    if (!task_id) return res.status(400).json({ error: "task_id required" });

    const { data: hireData, error: hrError } = await supabase
      .from("hire_requests")
      .select("seeker_id, slots")
      .eq("task_id", task_id)
      .single();

    if (hrError || !hireData) {
      return res.status(400).json({ error: "Hire request not found" });
    }


    const { data: seekerData, error: seekerError } = await supabase
      .from("seeker")
      .select("pay_rate")
      .eq("seeker_id", hireData.seeker_id)
      .single();

    if (seekerError || !seekerData) {
      return res.status(400).json({ error: "Seeker not found" });
    }


    const { data: taskData, error: taskError } = await supabase
      .from("task")
      .select("payment_type")
      .eq("task_id", task_id)
      .single();

    if (taskError || !taskData) {
      return res.status(400).json({ error: "Task not found" });
    }

    const hourlyRate = Number(seekerData.pay_rate);
    const slots = hireData.slots || [];
    const numSlots = Array.isArray(slots) ? slots.length : 0;
    
    const totalPayment = hourlyRate * numSlots;

    return res.json({
      totalPayment,
      numSlots,
      hourlyRate,
      paymentType: taskData.payment_type,
      task_id,
    });
  } catch (err) {
    console.error("getPaymentDetails error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
