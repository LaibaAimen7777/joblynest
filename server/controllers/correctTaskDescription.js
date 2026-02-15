
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanText } from "./spellCheck.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

export const correctTaskDescription = async (req, res) => {
    try {
        const { description } = req.body;

        if (!description || typeof description !== "string") {
            return res.status(400).json({ error: 'description is required and must be a string' });
        }

        const cleanedDescription = cleanText(description);

        if (!cleanedDescription || cleanedDescription.trim().length === 0) {
            return res.status(400).json({ error: 'Description is empty after cleaning' });
        }

        const prompt = `You are an expert at writing professional task descriptions for job seekers. 
Correct and improve the following task description while keeping the intent and meaning intact. 

Original Description: ${cleanedDescription}

Guidelines:
- Correct spelling and grammar mistakes
- Translate Roman Urdu (Urdu in English letters) to proper English
- Remove any offensive, inappropriate, or slang words
- Make it professional, concise, and clear (2-3 lines)
- Do not add extra information that was not in the original description
- Keep the description relevant to the job categories in this project: Air Conditioner Service and Gas Filling, Baby Care, Beauty and Grooming, Bill Payment, Car Mechanic, Carpenter Work, Cleaning, Computer and Laptop Repair, Delivery and Pickup, Drilling and Wall Fixing, Elderly Care, Electrical Work, Event Assistance, Furniture Assembly, Gas Cylinder Refill, Geyser Repair, Grocery Help, Home Cooking, House Sitting, Laundry and Ironing, Moving Help, Other, Painting Service, Pest Control, Pet Care, Photography and Videography, Pick and Drop, Plumbing Help, Tutoring, Water Dispenser Service, Water Motor Repair, Yardwork (with their relevant subcategories)
- Return only the corrected and improved description, without quotes, markdown, or extra explanations
- Maximum 500 characters`;


        let correctedDescription = '';

        try {
            console.log('Prompt:', prompt);
            const result = await model.generateContent(prompt);
            console.log("Raw Gemini result:", JSON.stringify(result, null, 2));
            if (!result?.response?.text) {
                throw new Error("Gemini returned no text response");
            }

            correctedDescription = result.response.text().trim();

            correctedDescription = correctedDescription
                .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                .replace(/\*\*/g, '') // Remove markdown bold
                .replace(/\*/g, '') // Remove markdown italic
                .replace(/^#+\s*/gm, '') // Remove markdown headers
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .trim();

            if (correctedDescription.length > 500) {
                correctedDescription = correctedDescription.substring(0, 500).trim();
            }

            if (!correctedDescription || correctedDescription.trim().length < 1) {
                throw new Error('Generated description is empty');
            }

        } catch (geminiError) {
            console.error('Gemini API Error:', geminiError);

            return res.json({
                correctedDescription: cleanedDescription,
                originalCleaned: cleanedDescription,
                geminiError: geminiError.message || String(geminiError)
            });
        }

        return res.json({
            correctedDescription,
            originalCleaned: cleanedDescription
        });


    } catch (err) {
        console.error('CorrectTaskDescription Error:', err);

       
        try {
            const { description } = req.body;
            if (description) {
                const cleanedDescription = cleanText(description);
                return res.json({
                    correctedDescription: cleanedDescription,
                    originalCleaned: cleanedDescription
                });
            }
        } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
        }

        res.status(500).json({ error: 'Failed to correct description' });
    }
};

