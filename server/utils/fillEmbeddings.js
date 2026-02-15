import { supabase } from "../supabaseClient.js"; 
import { embedText } from "./embedder.js"; 


async function fillEmbeddings() {
  try {
    // 1. Fetch all seekers with NULL embeddings
    const { data: seekers, error } = await supabase
      .from("seeker")
      .select("seeker_id, description")
    //   .is("descr_embedding", null);

    if (error) {
      console.error("Error fetching seekers:", error.message);
      return;
    }

    console.log(`Found ${seekers.length} seekers with null embeddings.`);

    // 2. Loop through each seeker
    for (const seeker of seekers) {
      if (!seeker.description || !seeker.description.trim()) continue;

      try {
        // Generate embedding
        const descr_embedding = await embedText(seeker.description);
        if (!descr_embedding) continue;

        // Update the seeker row
        const { error: updateError } = await supabase
          .from("seeker")
          .update({ descr_embedding: JSON.stringify(descr_embedding) })
          .eq("seeker_id", seeker.seeker_id);

        if (updateError) {
          console.error(
            `Error updating seeker ${seeker.seeker_id}:`,
            updateError.message
          );
        } else {
          console.log(`Updated embedding for seeker ${seeker.seeker_id}`);
        }
      } catch (err) {
        console.error("Error generating embedding:", err.message);
      }
    }

    console.log("All embeddings updated!");
  } catch (err) {
    console.error("Script error:", err.message);
  }
}

// Run the script
fillEmbeddings();
