/**
 * OpenAI DALL-E 3와 GPT-4o를 활용한 이미지 생성 및 변환 서비스
 * 프로젝트 API 키 사용하여 직접 API 호출 방식으로 구현
 */
import fetch from 'node-fetch';

// OpenAI API 키 - 사용자가 제공한 새 프로젝트 API 키
const API_KEY = "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";

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";

// API 키 유효성 검증 - 프로젝트 API 키 지원 추가 (sk-proj- 시작)
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// OpenAI API 엔드포인트
const OPENAI_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// API 응답 타입 정의
interface OpenAIImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

// GPT 응답 타입
interface OpenAIChatResponse {
  id?: string;
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * DALL-E 3로 직접 이미지 생성 요청 보내기
 */
async function callDALLE3Api(prompt: string): Promise<string> {
  if (!isValidApiKey(API_KEY)) {
    console.log("유효한 API 키가 없습니다");
    return SERVICE_UNAVAILABLE;
  }

  try {
    // API 요청 헤더 및 바디 구성
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const body = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    };
    
    // API 호출
    const response = await fetch(OPENAI_GENERATIONS_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    // 응답 텍스트로 가져오기
    const responseText = await response.text();
    
    // JSON 파싱 시도
    let responseData: OpenAIImageGenerationResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("응답 JSON 파싱 오류:", e);
      console.error("원본 응답:", responseText);
      return SERVICE_UNAVAILABLE;
    }
    
    // 오류 응답 확인
    if (!response.ok || responseData.error) {
      const errorMessage = responseData.error?.message || `HTTP 오류: ${response.status}`;
      console.error("DALL-E 3 API 오류:", errorMessage);
      return SERVICE_UNAVAILABLE;
    }
    
    // 응답 데이터 검증
    if (!responseData.data || responseData.data.length === 0) {
      console.error("이미지 데이터가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    const imageUrl = responseData.data[0]?.url;
    if (!imageUrl) {
      console.error("이미지 URL이 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    return imageUrl;
  } catch (error) {
    console.error("API 호출 중 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * GPT-4o Vision으로 이미지를 참조하여 향상된 프롬프트 생성 후 이미지 생성 요청
 */
async function callGPT4oVisionAndDALLE3(imageBuffer: Buffer, prompt: string): Promise<string> {
  if (!isValidApiKey(API_KEY)) {
    console.log("유효한 API 키가 없습니다");
    return SERVICE_UNAVAILABLE;
  }

  try {
    // 이미지를 Base64로 인코딩
    const base64Image = imageBuffer.toString('base64');
    
    // API 요청 헤더 및 바디 구성
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    // GPT-4o에 이미지와 프롬프트를 함께 전송 (Vision 기능 사용)
    const body = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system", 
          content: "You are a professional image transformation assistant. Your task is to create a detailed DALL-E 3 prompt that will transform the image according to the user's style request. Focus on creating a detailed, clear prompt that maintains the key elements and identity from the original image."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Transform this image according to the following style: ${prompt}. Return ONLY a DALL-E 3 prompt that will achieve this transformation. The prompt should be detailed and include specifics from the image like the subject, pose, clothes, background, etc.`
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
      max_tokens: 500
    };
    
    console.log("GPT-4o에 이미지 변환 프롬프트 요청 중...");
    
    // 첫 번째 API 호출: GPT-4o로 이미지 기반 프롬프트 생성
    const gptResponse = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    // 응답 텍스트로 가져오기
    const gptResponseText = await gptResponse.text();
    
    // JSON 파싱 시도
    let gptData: OpenAIChatResponse;
    try {
      gptData = JSON.parse(gptResponseText);
    } catch (e) {
      console.error("GPT-4o 응답 JSON 파싱 오류:", e);
      console.error("원본 응답:", gptResponseText);
      return SERVICE_UNAVAILABLE;
    }
    
    // 응답 처리
    if (!gptResponse.ok || gptData.error) {
      const errorMessage = gptData.error?.message || `HTTP 오류: ${gptResponse.status}`;
      console.error("GPT-4o API 오류:", errorMessage);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!gptData.choices || gptData.choices.length === 0) {
      console.error("GPT-4o 응답에 선택지가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // GPT-4o가 생성한 DALL-E 3 프롬프트
    const enhancedPrompt = gptData.choices[0].message.content;
    console.log("GPT-4o가 생성한 향상된 프롬프트:", enhancedPrompt);
    
    // 두 번째 API 호출: DALL-E 3로 이미지 생성
    return await callDALLE3Api(enhancedPrompt);
  } catch (error) {
    console.error("이미지 기반 프롬프트 생성 중 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 새로운 이미지 생성 (DALL-E 3)
 */
export async function generateImage(promptText: string): Promise<string> {
  console.log("DALL-E 3로 이미지 생성 시도 (직접 API 호출)");
  
  try {
    const imageUrl = await callDALLE3Api(promptText);
    
    if (imageUrl !== SERVICE_UNAVAILABLE) {
      console.log("DALL-E 3 이미지 생성 성공");
    }
    
    return imageUrl;
  } catch (error) {
    console.error("이미지 생성 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 이미지 변환/스타일 변경 (DALL-E 3 + GPT-4o)
 * 원본 이미지를 참조하여 이미지 변환 수행
 */
export async function transformImage(
  imageBuffer: Buffer,
  style: string,
  customPromptTemplate?: string | null
): Promise<string> {
  try {
    // 스타일별 프롬프트 템플릿
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

    // 프롬프트 선택 (커스텀 또는 기본)
    let promptText: string;
    if (customPromptTemplate) {
      console.log("커스텀 프롬프트 템플릿 사용");
      promptText = customPromptTemplate;
    } else {
      promptText = stylePrompts[style] || "Transform this image into a beautiful artistic style";
    }

    console.log("GPT-4o + DALL-E 3로 이미지 변환 시도 (이미지 기반)");
    
    // 원본 이미지를 참조하여 변환 (GPT-4o의 Vision 기능 사용)
    const imageUrl = await callGPT4oVisionAndDALLE3(imageBuffer, promptText);
    
    if (imageUrl !== SERVICE_UNAVAILABLE) {
      console.log("이미지 변환 성공 (GPT-4o + DALL-E 3)");
    }
    
    return imageUrl;
  } catch (error) {
    console.error("이미지 변환 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}