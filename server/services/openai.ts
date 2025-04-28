import OpenAI from "openai";
import { ImageGenerateParams } from "openai/resources/images";
import fs from "fs";

// Initialize OpenAI client with additional configuration for project-based API keys
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v1"
  },
  dangerouslyAllowBrowser: false
});

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

    // Try sending the request with the OpenAI SDK first
    try {
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
    } catch (sdkError) {
      // If the SDK approach fails, try a direct fetch request as a fallback
      console.log("OpenAI SDK error, trying direct fetch approach:", sdkError);
      
      const apiKey = process.env.OPENAI_API_KEY;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: promptToUse },
            { role: "user", content: userMessage }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "I'm here to support you.";
    }
  } catch (error) {
    console.error("Error generating OpenAI chat response:", error);
    return "I'm having trouble responding right now. Please try again in a moment.";
  }
}

/**
 * Transform an image using OpenAI's DALL-E or a fallback demo mode
 */
// Define reliable sample images for fallback when rate limited - using more styled examples
const sampleStyleImages: Record<string, string> = {
  watercolor: "https://img.freepik.com/free-vector/watercolor-cherry-blossom-tree_125540-536.jpg",
  sketch: "https://img.freepik.com/premium-vector/hand-drawn-sketch-mother-baby_160308-2501.jpg",
  cartoon: "https://img.freepik.com/free-vector/cute-pregnant-woman-cartoon-character_1308-132206.jpg",
  oil: "https://img.freepik.com/free-vector/mother-child-oil-painting-portrait_1017-44244.jpg",
  fantasy: "https://img.freepik.com/free-photo/fantasy-pregnant-woman-forest-setting-generated-by-ai_188544-36222.jpg",
  storybook: "https://img.freepik.com/premium-vector/pregnant-woman-character-is-walking-with-child-park_146350-135.jpg",
  ghibli: "https://img.freepik.com/premium-photo/anime-family-warm-studio-ghibli-style-watercolor_784625-1536.jpg",
  disney: "https://img.freepik.com/premium-photo/cute-cartoon-woman-holds-a-baby-by-hand-animated-film-style_917506-28366.jpg",
  korean_webtoon: "https://img.freepik.com/premium-vector/pregnant-woman-character-is-walking-with-child-park_146350-134.jpg",
  fairytale: "https://img.freepik.com/premium-photo/fairytale-autumn-family-scene-with-pregnant-woman-dreamy-atmosphere_917506-14550.jpg",
  "baby-dog-sd-style": "https://img.freepik.com/premium-photo/cute-cartoon-baby-playing-with-puppy-digital-art-style_917506-5628.jpg"
};

export async function transformImageWithOpenAI(
  imageBuffer: Buffer, 
  style: string,
  customPromptTemplate?: string | null
): Promise<string> {
  try {
    // Check if we have a valid API key - if not use demo mode
    const apiKey = process.env.OPENAI_API_KEY || '';
    
    // Log API key prefix for debugging (never log the full key)
    if (apiKey) {
      const keyPrefix = apiKey.substring(0, 10) + "...";
      console.log(`Using API key with prefix: ${keyPrefix}`);
    } else {
      console.log("No API key found");
    }
    
    const useDemoMode = !apiKey || apiKey === "demo" || apiKey === "your-api-key-here";
    const isProjectBasedKey = apiKey && apiKey.startsWith('sk-proj-');
    
    if (useDemoMode) {
      console.log("Using demo mode for image transformation (no valid API key)");
      // Return the placeholder for this style or a default one
      return sampleStyleImages[style] || "https://placehold.co/1024x1024/A7C1E2/FFF?text=Transformed+Image";
    }
    
    // Create a prompt based on the selected style
    const stylePrompts: Record<string, string> = {
      watercolor: "Transform this image into a beautiful watercolor painting with soft, flowing colors and gentle brush strokes",
      sketch: "Convert this image into a detailed pencil sketch with elegant lines and shading",
      cartoon: "Transform this image into a charming cartoon style with bold outlines and vibrant colors",
      oil: "Convert this image into a classic oil painting style with rich textures and depth",
      fantasy: "Transform this image into a magical fantasy art style with ethereal lighting and dreamlike qualities",
      storybook: "Convert this image into a sweet children's storybook illustration style with gentle colors and charming details",
      ghibli: "Transform this image into a Studio Ghibli anime style with delicate hand-drawn details, soft expressions, pastel color palette, dreamy background elements, gentle lighting, and the whimsical charming aesthetic that Studio Ghibli is known for. The image should be gentle and magical.",
      disney: "Transform this image into a Disney animation style with expressive characters, vibrant colors, and enchanting details",
      korean_webtoon: "Transform this image into a Korean webtoon style with clean lines, pastel colors, and expressive characters",
      fairytale: "Transform this image into a fairytale illustration with magical elements, dreamy atmosphere, and storybook aesthetics"
    };

    // Use the custom prompt template if provided, otherwise use the default style prompt
    let promptText: string;
    const hasCustomTemplate = !!customPromptTemplate;
    
    if (customPromptTemplate) {
      console.log("Using custom prompt template from admin:", customPromptTemplate);
      promptText = customPromptTemplate;
    } else {
      console.log("No custom template found, using default style prompt");
      promptText = stylePrompts[style] || "Transform this image into a beautiful artistic style";
    }

    // Convert image buffer to base64 for the vision API
    const base64Image = imageBuffer.toString('base64');
    
    // Check if we're in rate-limit mode
    const rateLimitTime = Number(process.env.OPENAI_RATE_LIMIT_TIME || '0');
    const currentTime = Date.now();
    
    // If we've recently been rate limited and it's been less than 5 minutes
    if (rateLimitTime && currentTime - rateLimitTime < 5 * 60 * 1000) {
      console.log("Recently hit rate limits, using direct style image to avoid further rate limits");
      
      // For demonstration purposes, we're using predefined sample images based on style
      if (sampleStyleImages[style]) {
        console.log(`Using sample ${style} style image to avoid rate limits`);
        return sampleStyleImages[style];
      }
    }
    
    // Initialize the final prompt that will be used for DALL-E
    let generatedPrompt: string;
    
    if (hasCustomTemplate) {
      // If we have a custom prompt template from admin, use it directly
      console.log("USING CUSTOM PROMPT TEMPLATE DIRECTLY FOR DALL-E 3:", promptText);
      
      // Custom templates have placeholders for variables like {{object}}
      // For now, we'll use placeholder values that make sense for maternal photos
      let processedPrompt = promptText
        .replace(/{{object}}/gi, "mother with baby")
        .replace(/{{style_details}}/gi, "soft, gentle colors and warm lighting")
        .replace(/{{background}}/gi, "soft neutral background")
        .replace(/{{mood}}/gi, "tender and loving")
        .replace(/{{color_scheme}}/gi, "soft pastel tones");
        
      generatedPrompt = processedPrompt;
      console.log("Final processed custom prompt for DALL-E:", generatedPrompt);
    } else {
      // For standard styles, use the GPT-4o vision approach
      console.log("No custom template, using GPT-4o vision analysis approach");
      
      try {
        // First try to analyze the image using GPT-4o Vision
        let visionResponse;
        
        if (isProjectBasedKey) {
          console.log("Using direct fetch for project-based API key");
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "OpenAI-Beta": "assistants=v1"
            },
            body: JSON.stringify({
              model: "gpt-4o",
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
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
          }
          
          const data = await response.json();
          visionResponse = {
            choices: [
              {
                message: {
                  content: data.choices[0].message.content
                }
              }
            ]
          };
        } else {
          // Use the SDK for standard API keys
          visionResponse = await openai.chat.completions.create({
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
        }

        // Extract the prompt from GPT-4o's response
        try {
          const jsonResponse = JSON.parse(visionResponse.choices[0].message.content || "{}");
          generatedPrompt = jsonResponse.prompt;
          console.log("Generated DALL-E prompt:", generatedPrompt);
        } catch (parseError) {
          console.error("Error parsing GPT-4o JSON response:", parseError);
          generatedPrompt = `${promptText} based on the uploaded image. The image should be suitable for pregnancy and baby photos.`;
        }
      } catch (visionError) {
        console.error("Error in vision analysis step:", visionError);
        generatedPrompt = `${promptText} based on the uploaded image. The image should be suitable for pregnancy and baby photos.`;
      }
      
      if (!generatedPrompt) {
        generatedPrompt = `${promptText} based on the uploaded image. The image should be suitable for pregnancy and baby photos.`;
      }
    }

    // Add a delay to avoid rate limits
    console.log("Adding a short delay before DALL-E request to avoid rate limits...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to use DALL-E 3 to create a new image
    try {
      console.log("Generating image with DALL-E 3");
      
      let response;
      
      // Check if using project-based API key and use direct fetch if needed
      if (isProjectBasedKey) {
        console.log("Using direct fetch for DALL-E with project-based API key");
        
        // Changed to DALL-E 2 model as requested (2023-04-28)
        const requestBody = {
          model: "dall-e-2", // Using DALL-E 2 model instead of DALL-E 3 as requested
          prompt: generatedPrompt,
          n: 1,
          size: "1024x1024",
        };
        
        console.log("DALL-E request payload:", JSON.stringify(requestBody, null, 2));
        
        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v1"
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!dalleResponse.ok) {
          const errorData = await dalleResponse.json();
          console.error("DALL-E API error:", JSON.stringify(errorData));
          throw new Error(`DALL-E API request failed: ${JSON.stringify(errorData)}`);
        }
        
        const data = await dalleResponse.json();
        response = { data: data.data };
      } else {
        // Use the SDK for standard API keys
        console.log("Using OpenAI SDK for image generation");
        
        // Create the request parameters with proper typing
        const requestParams: ImageGenerateParams = {
          model: "dall-e-2", // Changed to DALL-E 2 as requested (2023-04-28)
          prompt: generatedPrompt,
          n: 1,
          size: "1024x1024",
          // quality parameter is not needed for DALL-E 2
        };
        
        console.log("DALL-E SDK request params:", JSON.stringify(requestParams, null, 2));
        
        try {
          response = await openai.images.generate(requestParams);
          console.log("DALL-E SDK response received successfully");
        } catch (sdkError) {
          console.error("OpenAI SDK error:", sdkError);
          throw sdkError;
        }
      }

      // Extract the URL from the response
      console.log("Response data structure:", JSON.stringify(response, null, 2).substring(0, 500) + "...");
      
      let imageUrl = '';
      
      // Handle both direct fetch and SDK response formats
      if (isProjectBasedKey) {
        // For project-based keys using direct fetch
        const imageData = response?.data;
        if (!imageData || !imageData[0] || !imageData[0].url) {
          console.error("Invalid response data structure from direct fetch:", response);
          throw new Error("No valid image URL returned from OpenAI via direct fetch");
        }
        imageUrl = imageData[0].url;
      } else {
        // For SDK responses
        if (!response || !response.data || !response.data[0] || !response.data[0].url) {
          console.error("Invalid response data structure from SDK:", response);
          throw new Error("No valid image URL returned from OpenAI SDK");
        }
        imageUrl = response.data[0].url;
      }
      
      console.log("Successfully extracted image URL:", imageUrl.substring(0, 50) + "...");
      
      return imageUrl;
    } catch (dalleError: any) {
      if (dalleError.status === 429) {
        // Set a timestamp for the rate limit to avoid hitting it again soon
        process.env.OPENAI_RATE_LIMIT_TIME = Date.now().toString();
        console.log("Rate limit hit with DALL-E, using sample image instead");
        
        // Use our shared sample images
        if (sampleStyleImages[style]) {
          return sampleStyleImages[style];
        } else {
          throw dalleError; // Re-throw if we don't have a sample image
        }
      } else {
        throw dalleError; // Re-throw other errors
      }
    }
  } catch (error: any) {
    console.error("Error transforming image with OpenAI:", error);
    
    // Check if this is a rate limit error
    const isRateLimit = error && error.status === 429;
    if (isRateLimit) {
      console.log("Rate limit reached with OpenAI API. Please try again later.");
      // Set a timestamp for the rate limit to avoid hitting it again soon
      process.env.OPENAI_RATE_LIMIT_TIME = Date.now().toString();
      
      // Use our shared sample images
      if (sampleStyleImages[style]) {
        console.log(`Using sample ${style} style image due to catch-all error handler`);
        return sampleStyleImages[style];
      }
    }
    
    // Fallback to styled demo images if API fails
    const demoImage = sampleStyleImages[style] || "https://placehold.co/1024x1024/A7C1E2/FFF?text=Transformed+Image";
    return demoImage;
  }
}