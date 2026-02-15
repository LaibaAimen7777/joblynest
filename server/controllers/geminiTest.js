import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"

});

router.get("/test", async (req, res) => {
  try {
    const result = await model.generateContent("Say: Hello from Gemini!");
    res.json({ ok: true, reply: result.response.text() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
