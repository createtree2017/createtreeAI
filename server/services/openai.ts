import OpenAI from "openai";
import fs from "fs";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a chat response for the user's message
 */
export async function generateChatResponse(userMessage: string, systemPrompt?: string): Promise<string> {
  try {
    // Use the provided systemPrompt or fallback to the default
    const defaultSystemPrompt = `You are MomMelody Assistant, a supportive AI companion for pregnant women and young mothers.
Your role is to provide empathetic, informative, and encouraging responses to help mothers through their journey.
Always be warm, patient, and positive in your tone. Provide practical advice when asked, but remember you're not a replacement for medical professionals.
Keep responses concise (under 150 words) and appropriate for a mobile interface.`;

    const promptToUse = systemPrompt || defaultSystemPrompt;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: promptToUse },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm here to support you.";
  } catch (error) {
    console.error("Error generating OpenAI chat response:", error);
    return "I'm having trouble responding right now. Please try again in a moment.";
  }
}

/**
 * Transform an image using OpenAI's DALL-E or a fallback demo mode
 */
export async function transformImageWithOpenAI(
  imageBuffer: Buffer, 
  style: string,
  customPromptTemplate?: string | null
): Promise<string> {
  try {
    // Check if we have a valid API key - if not use demo mode
    const apiKey = process.env.OPENAI_API_KEY;
    const useDemoMode = !apiKey || apiKey === "demo" || apiKey === "your-api-key-here";
    
    if (useDemoMode) {
      console.log("Using demo mode for image transformation");
      // Demo mode - return placeholder transformation URLs based on style
      const demoImages: Record<string, string> = {
        watercolor: "https://placehold.co/1024x1024/FFD1DC/FFF?text=Watercolor+Style",
        sketch: "https://placehold.co/1024x1024/EFEFEF/333?text=Sketch+Style",
        cartoon: "https://placehold.co/1024x1024/FFEA87/333?text=Cartoon+Style",
        oil: "https://placehold.co/1024x1024/916C47/FFF?text=Oil+Painting",
        fantasy: "https://placehold.co/1024x1024/C1A7E2/FFF?text=Fantasy+Style",
        storybook: "https://placehold.co/1024x1024/A7E2C3/333?text=Storybook+Style",
        ghibli: "https://placehold.co/1024x1024/FFD5AA/333?text=Ghibli+Style",
        disney: "https://placehold.co/1024x1024/B6E1FF/333?text=Disney+Style",
        korean_webtoon: "https://placehold.co/1024x1024/FFD6E7/333?text=Korean+Webtoon",
        fairytale: "https://placehold.co/1024x1024/DCBEFF/333?text=Fairytale"
      };
      
      // Return the placeholder for this style or a default one
      return demoImages[style] || "https://placehold.co/1024x1024/A7C1E2/FFF?text=Transformed+Image";
    }
    
    // Create a prompt based on the selected style
    const stylePrompts: Record<string, string> = {
      watercolor: "Transform this image into a beautiful watercolor painting with soft, flowing colors and gentle brush strokes",
      sketch: "Convert this image into a detailed pencil sketch with elegant lines and shading",
      cartoon: "Transform this image into a charming cartoon style with bold outlines and vibrant colors",
      oil: "Convert this image into a classic oil painting style with rich textures and depth",
      fantasy: "Transform this image into a magical fantasy art style with ethereal lighting and dreamlike qualities",
      storybook: "Convert this image into a sweet children's storybook illustration style with gentle colors and charming details",
      ghibli: "Transform this image into a Studio Ghibli anime style with delicate details, soft expressions, and warm colors",
      disney: "Transform this image into a Disney animation style with expressive characters, vibrant colors, and enchanting details",
      korean_webtoon: "Transform this image into a Korean webtoon style with clean lines, pastel colors, and expressive characters",
      fairytale: "Transform this image into a fairytale illustration with magical elements, dreamy atmosphere, and storybook aesthetics"
    };

    // Use the custom prompt template if provided, otherwise use the default style prompt
    let promptText;
    if (customPromptTemplate) {
      promptText = customPromptTemplate;
    } else {
      promptText = stylePrompts[style] || "Transform this image into a beautiful artistic style";
    }

    // Convert image buffer to base64 for the vision API
    const base64Image = imageBuffer.toString('base64');
    
    // Use a single-step approach with GPT-4o vision to avoid rate limits
    console.log("Using single-step approach with GPT-4o vision");
    
    try {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a vision analysis assistant that helps generate detailed image descriptions to be used for image transformations.
            
When provided with an image, analyze it carefully and provide a DALL-E 3 compatible prompt that will recreate the image in the requested style.
            
Format your response as a JSON object with a single field "prompt" containing the detailed DALL-E prompt.`
          },
          {
            role: "user",
            content: [
              {
                type: "text", 
                text: `I want to transform this image into the following style: "${promptText}".
                
Please create a detailed DALL-E 3 prompt that describes the key elements of this image and how they should be transformed into the ${style} style. Focus on subjects, expressions, composition, colors, and mood.
                
Return only a JSON object with a "prompt" field containing the DALL-E prompt.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      // Extract the prompt from GPT-4o's response
      let generatedPrompt;
      try {
        const jsonResponse = JSON.parse(visionResponse.choices[0].message.content || "{}");
        generatedPrompt = jsonResponse.prompt;
        console.log("Generated DALL-E prompt:", generatedPrompt);
      } catch (parseError) {
        console.error("Error parsing GPT-4o JSON response:", parseError);
        generatedPrompt = `${promptText} based on the uploaded image. The image should be suitable for pregnancy and baby photos.`;
      }
      
      if (!generatedPrompt) {
        generatedPrompt = `${promptText} based on the uploaded image. The image should be suitable for pregnancy and baby photos.`;
      }

      // Add a delay to avoid rate limits
      console.log("Adding a short delay before DALL-E request to avoid rate limits...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use DALL-E 3 to create a new image based on the description and style
      console.log("Generating image with DALL-E 3");
      const response = await openai.images.generate({
        model: "dall-e-3", // Use DALL-E 3 for transformations
        prompt: generatedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      // Extract the URL from the response
      const imageData = response?.data;
      if (!imageData || !imageData[0] || !imageData[0].url) {
        throw new Error("No valid image URL returned from OpenAI");
      }
      const imageUrl = imageData[0].url;
      
      return imageUrl;
    } catch (apiError: any) {
      // Handle rate limit errors specifically
      if (apiError.status === 429) {
        console.log("Encountered rate limit error, trying alternative approach");
        
        // If we hit a rate limit, try the simplified approach with just DALL-E
        const simplePrompt = `Transform this image into the ${style} style: A photo showing ${style === 'ghibli' ? 'Studio Ghibli anime style with warm colors, soft expressions, and delicate details' : stylePrompts[style]}. The image should maintain the essence of the original.`;
        
        // Add a longer delay for rate limits
        console.log("Adding a longer delay to avoid rate limits...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const fallbackResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: simplePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });
        
        const fallbackData = fallbackResponse?.data;
        if (!fallbackData || !fallbackData[0] || !fallbackData[0].url) {
          throw new Error("No valid image URL returned from fallback OpenAI approach");
        }
        const fallbackUrl = fallbackData[0].url;
        
        return fallbackUrl;
      } else {
        // Re-throw other errors
        throw apiError;
      }
    }
  } catch (error: any) {
    console.error("Error transforming image with OpenAI:", error);
    
    // Check if this is a rate limit error
    const isRateLimit = error && error.status === 429;
    if (isRateLimit) {
      console.log("Rate limit reached with OpenAI API. Please try again later.");
    }
    
    // Fallback to demo mode if API fails
    const demoImages: Record<string, string> = {
      watercolor: "https://placehold.co/1024x1024/FFD1DC/FFF?text=Watercolor+Style",
      sketch: "https://placehold.co/1024x1024/EFEFEF/333?text=Sketch+Style",
      cartoon: "https://placehold.co/1024x1024/FFEA87/333?text=Cartoon+Style",
      oil: "https://placehold.co/1024x1024/916C47/FFF?text=Oil+Painting",
      fantasy: "https://placehold.co/1024x1024/C1A7E2/FFF?text=Fantasy+Style",
      storybook: "https://placehold.co/1024x1024/A7E2C3/333?text=Storybook+Style",
      ghibli: "https://placehold.co/1024x1024/FFD5AA/333?text=Ghibli+Style",
      disney: "https://placehold.co/1024x1024/B6E1FF/333?text=Disney+Style",
      korean_webtoon: "https://placehold.co/1024x1024/FFD6E7/333?text=Korean+Webtoon",
      fairytale: "https://placehold.co/1024x1024/DCBEFF/333?text=Fairytale"
    };
    
    // Return the placeholder for this style or a default one
    return demoImages[style] || "https://placehold.co/1024x1024/A7C1E2/FFF?text=Transformed+Image";
  }
}
