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
    
    // First, use GPT-4o with vision to analyze the image and create a detailed description
    console.log("Using GPT-4o with vision to analyze the image");
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert image analyzer. Generate a detailed description of the image that captures all important visual elements, subjects, expressions, and composition. Focus on details that would be important to include when creating a stylized version of this image."
        },
        {
          role: "user",
          content: [
            {
              type: "text", 
              text: "Please analyze this image and provide a detailed description of what you see. Focus on the subjects, expressions, arrangement, and key visual elements."
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
      max_tokens: 300
    });

    // Extract the image description
    const imageDescription = visionResponse.choices[0].message.content || "";
    
    console.log("Image description generated, now creating DALL-E prompt");
    
    // Then use DALL-E 3 to create a new image based on the description and style
    const response = await openai.images.generate({
      model: "dall-e-3", // Use DALL-E 3 for transformations
      prompt: `${promptText}. Based on this image: ${imageDescription}. The image should be suitable for pregnancy and baby photos.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    // Extract the URL from the response
    const imageUrl = response.data[0].url;
    
    if (!imageUrl) {
      throw new Error("No valid image URL returned from OpenAI");
    }
    
    return imageUrl;
  } catch (error) {
    console.error("Error transforming image with OpenAI:", error);
    
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
