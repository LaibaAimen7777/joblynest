
import { supabase } from "../supabaseClient.js";

export const createRatingReview = async (req, res) => {
  try {
    const { task_id, reviewer_id, reviewed_user_id, rating, review } = req.body;

    if (!task_id || !reviewer_id || !reviewed_user_id || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("rating_reviews")
      .select("id")
      .eq("task_id", task_id)
      .eq("reviewer_id", reviewer_id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing rating/review:", existingError);
    }

    let dbResult, dbError;

    if (existing) {
      const { data, error } = await supabase
        .from("rating_reviews")
        .update({ rating, review })
        .eq("id", existing.id)
        .select()
        .single();

      dbResult = data;
      dbError = error;
    } else {

      const { data, error } = await supabase
        .from("rating_reviews")
        .insert([
          {
            task_id,
            reviewer_id,
            reviewed_user_id,
            rating,
            review,
          },
        ])
        .select()
        .single();

      dbResult = data;
      dbError = error;
    }

    if (dbError) {
      console.error("Error saving rating/review:", dbError);
      return res.status(500).json({ error: "Failed to save rating/review" });
    }

    try {
      const { data: reviewerProfile, error: reviewerErr } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", reviewer_id)
        .single();

      let reviewerName = "a user";
      if (!reviewerErr && reviewerProfile) {
        const fn = reviewerProfile.first_name || "";
        const ln = reviewerProfile.last_name || "";
        const full = `${fn} ${ln}`.trim();
        if (full) reviewerName = full;
      }

      const hasReviewText = review && review.trim().length > 0;
      const shortReview = hasReviewText
        ? review.trim().length > 80
          ? review.trim().slice(0, 77) + "..."
          : review.trim()
        : "";

      const base = existing
        ? `Your rating/review was updated by ${reviewerName} as (${rating}/5)`
        : `You received a rating/review from ${reviewerName} as (${rating}/5)`;

      const message = hasReviewText ? `${base}: "${shortReview}"` : base;

      const { error: notifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: reviewed_user_id,
            message,
            read: false,
            status: "rating_review",
            related_id: task_id,
          },
        ]);

      if (notifError) {
        console.error("Error inserting notification:", notifError);
      }
    } catch (notifErr) {
      console.error("Notification creation exception:", notifErr);
    }

    return res.status(existing ? 200 : 201).json({ ratingReview: dbResult });
  } catch (err) {
    console.error("createRatingReview exception:", err);
    return res
      .status(500)
      .json({ error: "Server error while saving rating/review" });
  }
};

export const getRatingsByReviewer = async (req, res) => {
  const { reviewerId } = req.params;

  try {
    const { data, error } = await supabase
      .from("rating_reviews")
      .select("id, task_id, rating, review")
      .eq("reviewer_id", reviewerId);

    if (error) {
      console.error("Error fetching ratings by reviewer:", error);
      return res.status(500).json({ error: "Failed to fetch ratings" });
    }

    return res.json({ ratings: data || [] });
  } catch (err) {
    console.error("getRatingsByReviewer exception:", err);
    return res
      .status(500)
      .json({ error: "Server error while fetching ratings" });
  }
};
