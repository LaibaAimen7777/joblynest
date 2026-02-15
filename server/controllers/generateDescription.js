import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});


const generateFallbackDescription = (mainCategory, subcategories) => {

  const categoryText = mainCategory
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const subcategoryTexts = subcategories.map(sub => 
    sub.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );

  const subcategoryList = subcategoryTexts.length > 0 
    ? subcategoryTexts.join(', ')
    : categoryText;

  const line1 = `Experienced professional specializing in ${categoryText.toLowerCase()} services with expertise in ${subcategoryList.toLowerCase()}.`;
  const line2 = `Committed to delivering high-quality work and excellent customer service with attention to detail and reliability.`;

  return `${line1}\n${line2}`;
};

export const generateDescription = async (req, res) => {
  try {
    const { main_category, subcategories } = req.body;

    if (!main_category) {
      return res.status(400).json({ error: 'main_category is required' });
    }

    if (!subcategories || !Array.isArray(subcategories) || subcategories.length === 0) {
      return res.status(400).json({ error: 'subcategories array is required' });
    }

    const categoryText = main_category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const subcategoryTexts = subcategories.map(sub => 
      sub.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );

    const prompt = `Write a professional 2-line description for a service provider profile. 
Category: ${categoryText}
Subcategories: ${subcategoryTexts.join(', ')}

Requirements:
- First line should describe their cateogory and subcategories.
- Second line should highlight their commitment to quality and professionalism
- Keep it concise, professional, and appealing
- Maximum 2 sentences, each on a separate line
-if category or subcategories have spelling mistake or illogical word. Correct them as much as possible.
-if category or subcategories have roman urdu word. Translate them to english as much as possible.
- Do not include any markdown formatting or quotes`;

    let description = '';
    let usedFallback = false;

    try {
        console.log('Prompt:', prompt);
      const result = await model.generateContent(prompt);
      console.log('Raw Gemini response:', result);
      description = result.response.text().trim();
 
      description = description
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/\*/g, '') // Remove markdown italic
        .replace(/^#+\s*/gm, '') // Remove markdown headers
        .trim();

      const lines = description.split('\n').filter(line => line.trim().length > 0);
      if (lines.length >= 2) {
        description = lines.slice(0, 2).join('\n');
      } else if (lines.length === 1) {

        const words = lines[0].split(' ');
        if (words.length > 15) {
          const midPoint = Math.floor(words.length / 2);
          description = words.slice(0, midPoint).join(' ') + '\n' + words.slice(midPoint).join(' ');
        } else {
          description = lines[0] + '\n' + 'Committed to delivering exceptional service and exceeding client expectations.';
        }
      }

      if (!description || description.trim().length < 20) {
        throw new Error('Generated description too short');
      }

    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      usedFallback = true;
      description = generateFallbackDescription(main_category, subcategories);
    }

    res.json({ 
      description,
      usedFallback 
    });

  } catch (err) {
    console.error('GenerateDescription Error:', err);
    
    const { main_category, subcategories } = req.body;
    const fallbackDescription = generateFallbackDescription(
      main_category || 'service',
      subcategories || []
    );
    
    res.json({ 
      description: fallbackDescription,
      usedFallback: true 
    });
  }
};

