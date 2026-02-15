
import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();


router.get("/complaints", async (req, res) => {
  try {
 const { data, error } = await supabase
  .from("complaints")
  .select(`
    id,
    task_id,
    description,
    status,
    created_at,

    complainant:profiles!complaints_complainant_id_fkey (
      id,
      first_name,
      last_name,
      email,
      user_type
    ),

    reported:profiles!complaints_reported_user_id_fkey (
      id,
      first_name,
      last_name,
      email,
      user_type
    ),

    task:task!complaints_task_id_fkey (
      task_id,
      description
    )
  `)
  .order("created_at", { ascending: false });


    if (error) {
      console.error("Supabase complaints join error:", error);
      return res.status(500).json({ error: "Could not fetch complaints." });
    }

    const complaints = data || [];
    if (!complaints.length) return res.json([]);

    const profileIds = [
      ...new Set(
        complaints
          .flatMap((c) => [c.complainant?.id, c.reported?.id])
          .filter(Boolean)
      ),
    ];

    if (!profileIds.length) {
      return res.json(complaints);
    }

    const { data: seeker, error: seekerErr } = await supabase
      .from("seeker")
      .select("seeker_id, profile_picture")
      .in("seeker_id", profileIds);

    if (seekerErr) {
      console.error("Seeker avatar fetch error:", seekerErr);
    }

    const { data: poster, error: posterErr } = await supabase
      .from("poster")
      .select("poster_id, profile_picture")
      .in("poster_id", profileIds);

    if (posterErr) {
      console.error("Poster avatar fetch error:", posterErr);
    }


    const avatarMap = {};

    (seeker || []).forEach((row) => {
      if (row.seeker_id && row.profile_picture) {
        avatarMap[row.seeker_id] = row.profile_picture;
      }
    });

    (poster || []).forEach((row) => {
      if (row.poster_id && row.profile_picture) {
        avatarMap[row.poster_id] = row.profile_picture;
      }
    });

    const final = complaints.map((c) => ({
      ...c,
      complainant: c.complainant
        ? {
            ...c.complainant,
            avatar_url: avatarMap[c.complainant.id] || null,
          }
        : null,
      reported: c.reported
        ? {
            ...c.reported,
            avatar_url: avatarMap[c.reported.id] || null,
          }
        : null,
    }));

    return res.json(final);
  } catch (err) {
    console.error("GET /api/complaints ERROR:", err.message);
    return res.status(500).json({ error: "Server error." });
  }
});


router.post("/complaints", async (req, res) => {
  try {
    const { task_id, complainant_id, reported_user_id, description } = req.body;

    if (!task_id || !complainant_id || !description) {
      return res.status(400).json({
        error: "task_id, complainant_id and description are required.",
      });
    }

    const { data, error } = await supabase
      .from("complaints")
      .insert({
        task_id,
        complainant_id,
        reported_user_id: reported_user_id || null,
        description,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase complaint insert error:", error);
      return res.status(500).json({ error: "Failed to save complaint." });
    }

    return res.json({ complaint: data });
  } catch (err) {
    console.error("POST /api/complaints ERROR:", err.message);
    return res.status(500).json({ error: "Server error." });
  }
});

export default router;
