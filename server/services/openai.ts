import OpenAI from "openai";
import fs from "fs";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a chat response for the user's message
 */
export async function generateChatResponse(userMessage: string): Promise<string> {
  try {
    const systemPrompt = `You are MomMelody Assistant, a supportive AI companion for pregnant women and young mothers.
Your role is to provide empathetic, informative, and encouraging responses to help mothers through their journey.
Always be warm, patient, and positive in your tone. Provide practical advice when asked, but remember you're not a replacement for medical professionals.
Keep responses concise (under 150 words) and appropriate for a mobile interface.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
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
 * Transform an image using OpenAI's DALL-E
 */
export async function transformImageWithOpenAI(imageBuffer: Buffer, style: string): Promise<string> {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Create a prompt based on the selected style
    const stylePrompts: Record<string, string> = {
      watercolor: "Transform this image into a beautiful watercolor painting with soft, flowing colors and gentle brush strokes",
      sketch: "Convert this image into a detailed pencil sketch with elegant lines and shading",
      cartoon: "Transform this image into a charming cartoon style with bold outlines and vibrant colors",
      oil: "Convert this image into a classic oil painting style with rich textures and depth",
      fantasy: "Transform this image into a magical fantasy art style with ethereal lighting and dreamlike qualities",
      storybook: "Convert this image into a sweet children's storybook illustration style with gentle colors and charming details"
    };
    
    const promptText = stylePrompts[style] || "Transform this image into a beautiful artistic style";
    
    // Use DALL-E to generate the transformed image
    const response = await openai.images.edit({
      model: "dall-e-2", // Using DALL-E for image generation
      image: imageBuffer,
      prompt: promptText,
      n: 1,
      size: "1024x1024",
    });
    
    // Return the URL of the generated image
    return response.data[0].url;
  } catch (error) {
    console.error("Error transforming image with OpenAI:", error);
    throw new Error("Failed to transform image");
  }
}
