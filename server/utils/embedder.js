import { pipeline } from "@huggingface/transformers";

let extractor = null;

/**
 * Convert text into a 384-dim embedding (all-MiniLM-L6-v2).
 */
export async function embedText(text) {
  console.log("Embedding text:", text);


  if (!text || !String(text).trim()) return null;

  // if (!extractor) {
  //   extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  // }
  // feature extraction,
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L12-v2");
  }
  // averages token embeddings to get a single vector for the whole text.
  // scales the vector to unit length (common for similarity calculations).

  const out = await extractor(text, { pooling: "mean", normalize: true });

  if (out?.data) return Array.from(out.data); // Float32Array
  if (Array.isArray(out)) return out.flat(); // nested array fallback

  throw new Error("Unexpected output from transformer pipeline");
}
