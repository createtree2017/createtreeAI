import OpenAI from "openai";
import { ImageGenerateParams } from "openai/resources/images";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from "fs";

// 채팅에 사용할 API 키 (PROJECT KEY 지원)
const CHAT_API_KEY = process.env.OPENAI_API_KEY;
// 이미지 생성에 사용할 API 키 (DALL-E API 키 - 환경변수 DALLE_API_KEY가 설정되어 있으면 사용)
const IMAGE_API_KEY = process.env.DALLE_API_KEY || process.env.OPENAI_API_KEY;
// Project ID (OpenAI-Project 헤더 값)
const PROJECT_ID = process.env.OPENAI_PROJECT_ID;

console.log("Chat API Key 설정됨. 키 유형:", CHAT_API_KEY?.startsWith('sk-proj-') ? "Project Key" : "Standard Key");
console.log("Image API Key 설정됨. 키 유형:", IMAGE_API_KEY?.startsWith('sk-proj-') ? "Project Key" : "Standard Key");
console.log("OpenAI Project ID 설정됨:", PROJECT_ID ? "Yes" : "No");

/**
 * OpenAI API 키 유효성 검증 함수
 * User Key(sk-) 및 Project Key(sk-proj-) 모두 지원
 */
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

/**
 * 인증 헤더 생성 함수
 * Project Key와 User Key에 따라 적절한 인증 헤더 설정
 */
function getAuthHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v1'
  };
  
  if (!apiKey) return headers;
  
  // Project Key(sk-proj-)와 User Key(sk-) 인증 방식 구분
  if (apiKey.startsWith('sk-proj-') && PROJECT_ID) {
    // Project Key 사용 시 필요한 헤더 설정
    // 주의: Authorization 헤더 형식이 달라지지 않음
    headers['Authorization'] = `Bearer ${apiKey}`;
    
    // 프로젝트 ID를 OpenAI-Organization 헤더에 설정
    // OpenAI-Project 대신 OpenAI-Organization을 사용해 봄
    headers['OpenAI-Organization'] = PROJECT_ID;
    
    // 디버깅을 위해 로그 출력
    console.log("Project Key 인증: 조직 ID 설정됨 - " + PROJECT_ID);
  } else {
    // 일반 User Key 사용 시 표준 Authorization 헤더만 설정
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  return headers;
}

/**
 * 키 타입에 따른 OpenAI 클라이언트 설정 생성
 * Project Key와 User Key 모두 지원하는 설정을 반환
 */
function getOpenAIConfig(apiKey: string | undefined) {
  const isProjectKey = apiKey?.startsWith('sk-proj-') || false;
  
  // API 키 유형에 따른 헤더 설정
  const headers = getAuthHeaders(apiKey);
  
  // 기본 설정
  const config = {
    apiKey: apiKey,
    defaultHeaders: headers,
    dangerouslyAllowBrowser: false
  };
  
  return {
    config,
    isProjectKey
  };
}

// Chat API를 위한 설정 및 클라이언트 초기화
const chatConfig = getOpenAIConfig(CHAT_API_KEY);
const openai = new OpenAI(chatConfig.config);
const isChatProjectKey = chatConfig.isProjectKey;

// 이미지 생성용 설정 및 클라이언트 초기화
const imageConfig = getOpenAIConfig(IMAGE_API_KEY);
const imageOpenai = new OpenAI(imageConfig.config);
const isImageProjectKey = imageConfig.isProjectKey;

console.log("Chat API 클라이언트 초기화 완료. Project Key 모드:", isChatProjectKey);
console.log("Image API 클라이언트 초기화 완료. Project Key 모드:", isImageProjectKey);

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

    // 메시지 구성
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: promptToUse },
      { role: "user", content: userMessage }
    ];

    // 요청 파라미터 구성
    const requestParams = {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    };
    
    // Project Key인 경우 직접 fetch 사용
    if (isChatProjectKey) {
      console.log("Using direct fetch for chat with project-based API key");
      
      // Project Key 인증을 위한 헤더 생성
      const headers = getAuthHeaders(CHAT_API_KEY);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestParams)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content || "I'm here to support you.";
    } else {
      // 일반 User Key 사용 시 SDK로 처리
      try {
        const response = await openai.chat.completions.create(requestParams);
        return response.choices[0].message.content || "I'm here to support you.";
      } catch (sdkError) {
        // SDK 오류 시 직접 fetch 사용 (폴백 방식)
        console.log("OpenAI SDK error, trying direct fetch approach:", sdkError);
        
        // Project Key 인증을 위한 헤더 생성 (폴백 방식에서도 동일하게 적용)
        const headers = getAuthHeaders(CHAT_API_KEY);
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestParams)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
        }
  
        const data = await response.json();
        return data.choices[0].message.content || "I'm here to support you.";
      }
    }
  } catch (error) {
    console.error("Error generating OpenAI chat response:", error);
    return "I'm having trouble responding right now. Please try again in a moment.";
  }
}

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

/**
 * Generate an image using DALL-E model
 */
export async function generateImageWithDALLE(promptText: string): Promise<string> {
  try {
    // Check if API key exists
    const apiKey = IMAGE_API_KEY || '';
    if (!apiKey) {
      console.log("No Image API key found");
      // Return a placeholder image if no API key
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=Generated+Image";
    }
    
    // 초기화 시 설정된 Project Key 정보 사용
    const isProjectBasedKey = isImageProjectKey;
    
    // Prepare request parameters
    const requestParams: ImageGenerateParams = {
      model: "dall-e-3",
      prompt: promptText,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    };
    
    let imageUrl: string;
    
    // Use direct fetch for project-based API keys (workaround)
    if (isProjectBasedKey) {
      console.log("Using direct fetch for DALL-E with project-based API key");
      
      // Project Key 인증을 위한 헤더 생성
      const headers = getAuthHeaders(apiKey);
      console.log("DALL-E API request with Project Key 인증 헤더:", 
        JSON.stringify(Object.keys(headers).map(k => `${k}: ${k === 'Authorization' ? '**hidden**' : headers[k]}`)));
      
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestParams)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      imageUrl = data.data[0].url;
    } else {
      // Use the OpenAI SDK for standard API keys
      const response = await imageOpenai.images.generate(requestParams);
      if (!response.data || response.data.length === 0) {
        throw new Error("No image data returned from DALL-E API");
      }
      imageUrl = response.data[0].url || '';
    }
    
    console.log("Generated image URL:", imageUrl.substring(0, 50) + "...");
    return imageUrl;
  } catch (error: any) {
    console.error("Error generating image with DALL-E:", error);
    throw new Error(`Failed to generate image: ${error.message || 'Unknown error'}`);
  }
}

export async function transformImageWithOpenAI(
  imageBuffer: Buffer, 
  style: string,
  customPromptTemplate?: string | null
): Promise<string> {
  try {
    // 이미지 생성용 API 키 사용 (DALLE_API_KEY 환경변수 또는 기본 OPENAI_API_KEY)
    const apiKey = IMAGE_API_KEY || '';
    
    // Log API key prefix for debugging (never log the full key)
    if (apiKey) {
      const keyPrefix = apiKey.substring(0, 10) + "...";
      console.log(`Using Image API key with prefix: ${keyPrefix}`);
    } else {
      console.log("No Image API key found");
    }
    
    // 초기화 시 설정된 Project Key 정보 사용
    const useDemoMode = !apiKey || apiKey === "demo" || apiKey === "your-api-key-here";
    const isProjectBasedKey = isImageProjectKey;
    
    // Project Key 상태 로깅 추가
    console.log(`Image API key status - Demo Mode: ${useDemoMode}, Project Key Mode: ${isProjectBasedKey}`);
    
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
          console.log("Using direct fetch for project-based API key (Vision)");
          
          // Project Key 인증을 위한 헤더 생성
          const headers = getAuthHeaders(apiKey);
          
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: headers,
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
          // Vision 분석을 위해 채팅용 API 클라이언트 사용
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
        
        // Project Key 인증을 위한 헤더 생성 (DALL-E 이미지 변환)
        const headers = getAuthHeaders(apiKey);
        
        // 헤더 로깅 (디버깅용)
        const logHeaders = Object.keys(headers).map(k => {
          if (k === 'Authorization') return `${k}: **hidden**`;
          return `${k}: ${headers[k]}`;
        });
        console.log("DALL-E Transform API request with Headers:", JSON.stringify(logHeaders));
        
        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestBody)
        });
        
        if (!dalleResponse.ok) {
          const errorData = await dalleResponse.json();
          console.error("DALL-E API error:", JSON.stringify(errorData));
          throw new Error(`DALL-E API request failed: ${JSON.stringify(errorData)}`);
        }
        
        const data = await dalleResponse.json();
        return data.data[0].url;
      } else {
        // For standard keys, use the OpenAI SDK
        console.log("Using OpenAI SDK for image generation");
        const dalleResponse = await imageOpenai.images.generate({
          model: "dall-e-2", // Using DALL-E 2 model instead of DALL-E 3 
          prompt: generatedPrompt,
          n: 1,
          size: "1024x1024"
        });
        
        // Extract image URL
        if (!dalleResponse.data || dalleResponse.data.length === 0) {
          throw new Error("No image data returned");
        }
        
        return dalleResponse.data[0].url || "";
      }
    } catch (dalleError: any) {
      console.error("Error in DALL-E image generation:", dalleError);
      
      // Check if this is a rate limit error
      const isRateLimit = dalleError && dalleError.status === 429;
      if (isRateLimit) {
        console.log("Rate limit reached with OpenAI API. Please try again later.");
        // Set a timestamp for the rate limit to avoid hitting it again soon
        process.env.OPENAI_RATE_LIMIT_TIME = Date.now().toString();
        
        // Use fallback style images if available
        if (sampleStyleImages[style]) {
          console.log(`Using sample ${style} style image due to rate limits`);
          return sampleStyleImages[style];
        }
      }
      
      // For any other error, throw it to be handled by the caller
      throw dalleError;
    }
  } catch (error: any) {
    console.error("Image transformation error:", error);
    // In case of any error, provide a friendly fallback image based on style
    if (sampleStyleImages[style]) {
      return sampleStyleImages[style];
    }
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=Image+Transform+Error";
  }
}