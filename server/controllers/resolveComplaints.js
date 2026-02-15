
import { supabase } from "../supabaseClient.js";

export const resolveComplaint = async (req, res) => {
  const { complaintId, reportedUserId, action } = req.body;

if (!complaintId || !action) {
  return res.status(400).json({ error: "Missing required fields" });
}

if (action !== "ignore" && !reportedUserId) {
  return res.status(400).json({ error: "reportedUserId required" });
}

  if (!["ban", "suspend_week", "warning", "ignore"].includes(action)) {
    return res.status(400).json({ error: "Invalid action type" });
  }

  try {
    const { data: complaintRow, error: complaintFetchError } = await supabase
      .from("complaints")
      .select("id, complainant_id")
      .eq("id", complaintId)
      .single();

    if (complaintFetchError || !complaintRow) {
      console.error("Complaint fetch error:", complaintFetchError);
      return res
        .status(404)
        .json({ error: "Complaint not found for given id" });
    }

    const complainantId = complaintRow.complainant_id;

    if (action === "ban" || action === "suspend_week") {
      let profileUpdate = {};

      if (action === "ban") {
        profileUpdate = {
          is_banned: true,
          is_active: false,
          suspended_until: null,
        };
      }

      if (action === "suspend_week") {
        const suspendedUntil = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        profileUpdate = {
          is_banned: false,
          is_active: true,
          suspended_until: suspendedUntil,
        };
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", reportedUserId);

      if (profileError) {
        console.error("Profile Update Error:", profileError);
        return res
          .status(500)
          .json({ error: "Failed to update profile status" });
      }
    }

    if (action === "ignore") {
      

      const { error: ignoreError } = await supabase
        .from("complaints")
      .update({
  status: "resolved",
  resolved_action: "ignored",
})

        .eq("id", complaintId);

      if (ignoreError) {
        console.error("Ignore Error:", ignoreError);
        return res.status(500).json({ error: "Failed to ignore complaint" });
      }
    } else {
      const { error: complaintError } = await supabase
        .from("complaints")
        .update({
          status: "resolved",
          resolved_action: action,
        })
        .eq("id", complaintId);

      if (complaintError) {
        console.error("Complaint Update Error:", complaintError);
        return res
          .status(500)
          .json({ error: "Failed to update complaint status" });
      }
    }

    if (action === "warning") {
      const warningMessage =
        "You have received an official warning due to a complaint regarding your recent activity. " +
        "Please follow JoblyNest community guidelines to avoid suspension or permanent ban.";

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: reportedUserId, // reported user gets the warning
          message: warningMessage,
          status: "warning", // matches your 'status' column
          related_id: complaintId, // optional link to complaint
          read: false,
        });

      if (notifError) {
        console.error("Notification insert error (reported user):", notifError);
        
      }
    }

    let complainantMessage = "";

    if (action === "ban") {
      complainantMessage =
        "We have reviewed your complaint and permanently banned the reported user from JoblyNest due to violation of our community guidelines. Thank you for helping us keep the community safe.";
    } else if (action === "suspend_week") {
      complainantMessage =
        "We have reviewed your complaint and temporarily suspended the reported user's account due to their behaviour. Thank you for raising this issue.";
    } else if (action === "warning") {
      complainantMessage =
        "We have reviewed your complaint and issued an official warning to the reported user regarding their behaviour. We will continue to monitor their activity.";
    } else if (action === "ignore") {
      complainantMessage =
        "We conducted a thorough review of your complaint but could not find enough evidence of offensive or unsafe behaviour from the reported user. If you still believe action should be taken, please report your problem in more detail at joblynest@gmail.com.";
    }

    if (complainantMessage && complainantId) {
      const { error: complainantNotifError } = await supabase
        .from("notifications")
        .insert({
          user_id: complainantId,
          message: complainantMessage,
          status: "info", 
          related_id: complaintId,
          read: false,
        });

      if (complainantNotifError) {
        console.error(
          "Notification insert error (complainant):",
          complainantNotifError
        );
        
      }
    }

    return res.json({ message: "Action applied successfully" });
  } catch (err) {
    console.error("Resolve Complaint Error:", err);
    return res
      .status(500)
      .json({ error: "Server error while resolving complaint" });
  }
};
