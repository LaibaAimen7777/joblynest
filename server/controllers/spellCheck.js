const cleanText = (text) => {
  if (!text || typeof text !== "string") return "";

  let cleaned = text.trim();
  if (!cleaned) return "";

  cleaned = cleaned.replace(/[^\p{L}\s]/gu, " ");

  const words = cleaned.split(/\s+/);

  const normalizedWords = words
    .map(word => {
      if (!word.trim()) return "";

      return word.replace(/(.)\1{2,}/gu, "$1$1");
    })
    .filter(Boolean); 

  return normalizedWords.join(" ").trim();
};

export { cleanText };


