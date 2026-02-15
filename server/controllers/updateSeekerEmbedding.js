import { supabase } from "../supabaseClient.js";
import { embedText } from "../utils/embedder.js";

export const updateSeekerEmbedding = async (req, res) => {
  try {
    const { seeker_id, description } = req.body;
    if (!seeker_id || !description) {
      return res.status(400).json({ error: "Missing seeker_id or description" });
    }

    const descr_embedding = await embedText(description);

    const { data, error } = await supabase
      .from("seeker")
      .update({ descr_embedding: JSON.stringify(descr_embedding) })
      .eq("seeker_id", seeker_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Embedding updated", seeker: data });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
};
