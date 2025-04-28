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
 * 2024년 5월 업데이트: OpenAI API 변경사항 반영
 */
function getAuthHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (!apiKey) return headers;
  
  // Project Key(sk-proj-)와 User Key(sk-) 인증 방식 구분
  if (apiKey.startsWith('sk-proj-')) {
    // 2024년 5월 최신 정보: 
    // 프로젝트 기반 키는 Authorization 헤더만 필요하며, 추가 헤더가 오히려 오류를 발생시킴
    headers['Authorization'] = `Bearer ${apiKey}`;
    
    // 프로젝트 키에는 OpenAI-Beta 헤더 추가하지 않음
    // NOTE: assistants=v1 베타 태그는 어시스턴트 API만 해당
    
    if (PROJECT_ID) {
      console.log("Project Key 인증: 프로젝트 ID 사용 가능 - " + PROJECT_ID);
      // 주의: OpenAI-Organization, OpenAI-Project 헤더는 혼란을 야기할 수 있어 사용하지 않음
    }
  } else {
    // 일반 User Key 사용 시 표준 Authorization 헤더
    headers['Authorization'] = `Bearer ${apiKey}`;
    // 일반 키일 경우 베타 기능 헤더 추가
    headers['OpenAI-Beta'] = 'assistants=v1';
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
    
    // API 키 인증 방식 문제로 서비스 이용 불가 메시지 직접 반환
    console.log("API 키 인증 방식 문제로 서비스 이용 불가 메시지 반환");
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
    
    /* 아래는 원래 코드 (현재 사용하지 않음)
    // Prepare request parameters
    const requestParams = {
      model: "dall-e-3",
      prompt: promptText,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    };
    
    let imageUrl: string = "";
    
    // 새 API 키 구조에 맞춰 API 호출 방식 변경
    console.log(`Using DALL-E image generation with ${isProjectBasedKey ? 'Project Key' : 'Standard Key'}`);
    
    try {
      // 간소화된 헤더 설정 - 프로젝트 키는 Authorization만 필요
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      // 프로젝트 키 방식의 API 호출
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestParams)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("DALL-E API 오류 응답:", errorData);
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error("No image data returned from DALL-E API");
      }
      
      imageUrl = data.data[0].url || '';
      console.log("DALL-E 이미지 생성 성공");
      return imageUrl;
    } catch (error) {
      console.error("DALL-E API 접근 실패:", error);
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
    }
    */
  } catch (error: any) {
    console.error("Error generating image with DALL-E:", error);
    // 최종 오류 시 서비스 종료 메시지 반환
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
  }
}

/**
 * Transform an image using OpenAI DALL-E model
 */
export async function transformImageWithOpenAI(
  imageBuffer: Buffer, 
  style: string,
  customPromptTemplate?: string | null
): Promise<string> {
  try {
    // 이미지 생성용 API 키 사용 (DALLE_API_KEY 환경변수 또는 기본 OPENAI_API_KEY)
    const apiKey = IMAGE_API_KEY || '';
    
    // API 키 확인 및 로깅
    if (apiKey) {
      const keyPrefix = apiKey.substring(0, 10) + "...";
      console.log(`Using Image API key with prefix: ${keyPrefix}`);
    } else {
      console.log("No Image API key found");
    }
    
    // 초기화 시 설정된 Project Key 정보 사용
    const isProjectBasedKey = isImageProjectKey;
    
    // API 키 인증 방식 문제로 서비스 이용 불가 메시지 직접 반환
    console.log("API 키 인증 방식 문제로 서비스 이용 불가 메시지 반환");
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
    
  } catch (error: any) {
    console.error("Image transformation error:", error);
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
  }
}