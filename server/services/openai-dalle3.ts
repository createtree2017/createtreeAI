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
 * GPT-4o Vision으로 이미지를 분석하여 향상된 프롬프트 생성 후 DALL-E 3로 이미지 생성 요청
 * 멀티모달 분석을 통한 향상된 이미지 변환 기능
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
    
    // 1단계: GPT-4o Vision으로 이미지 분석 및 설명 생성
    console.log("1단계: GPT-4o Vision으로 이미지 분석 중...");
    const analysisBody = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system", 
          content: "You are a professional image analyst. Analyze the uploaded image in detail, describing key elements like subjects, poses, clothing, expressions, background, colors, and unique features. Your analysis will be used to create a transformation prompt."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 이미지를 보고 프롬프트를 만들기 위한 자세한 설명을 해주세요. 인물, 표정, 포즈, 의상, 배경 등 모든 중요한 요소를 포함해 주세요."
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
      max_tokens: 800
    };
    
    // GPT-4o Vision으로 이미지 분석 요청
    const analysisResponse = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(analysisBody)
    });
    
    const analysisResponseText = await analysisResponse.text();
    let analysisData: OpenAIChatResponse;
    
    try {
      analysisData = JSON.parse(analysisResponseText);
    } catch (e) {
      console.error("이미지 분석 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!analysisResponse.ok || analysisData.error) {
      console.error("이미지 분석 API 오류:", analysisData.error?.message || `HTTP 오류: ${analysisResponse.status}`);
      return SERVICE_UNAVAILABLE;
    }
    
    // 이미지 분석 결과
    const imageDescription = analysisData.choices?.[0]?.message?.content;
    if (!imageDescription) {
      console.error("이미지 분석 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2단계: 분석 내용 기반으로 DALL-E 3 프롬프트 생성
    console.log("2단계: 분석 내용 기반으로 DALL-E 3 프롬프트 생성 중...");
    const promptGenBody = {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a precise DALL-E 3 prompt engineer. Your task is to create prompts that EXACTLY preserve the original image's key elements (subjects, expressions, poses, composition) while ONLY applying the requested artistic style. Do NOT add new elements, change the scene, or modify the core image content in any way. Focus exclusively on style transformation."
        },
        {
          role: "user",
          content: `다음 이미지 설명을 기반으로 ${prompt} 스타일로 변환하기 위한 DALL-E 3용 영어 프롬프트를 작성해 주세요. 원본 이미지의 핵심 요소(인물, 표정, 구도 등)를 정확히 유지하면서 요청된 스타일만 적용하세요.\n\n이미지 설명: "${imageDescription}"\n\n스타일: ${prompt}`
        }
      ],
      max_tokens: 600
    };
    
    const promptGenResponse = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(promptGenBody)
    });
    
    const promptGenResponseText = await promptGenResponse.text();
    let promptGenData: OpenAIChatResponse;
    
    try {
      promptGenData = JSON.parse(promptGenResponseText);
    } catch (e) {
      console.error("프롬프트 생성 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!promptGenResponse.ok || promptGenData.error) {
      console.error("프롬프트 생성 API 오류:", promptGenData.error?.message || `HTTP 오류: ${promptGenResponse.status}`);
      return SERVICE_UNAVAILABLE;
    }
    
    // 최종 프롬프트
    const enhancedPrompt = promptGenData.choices?.[0]?.message?.content;
    if (!enhancedPrompt) {
      console.error("프롬프트 생성 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("GPT-4o가 생성한 향상된 프롬프트:", enhancedPrompt);
    
    // 로그에 분석 정보 추가 (디버깅 목적)
    console.log(`-----------------------------------`);
    console.log(`[이미지 변환 디버그 정보]`);
    console.log(`원본 스타일 요청: ${prompt}`);
    console.log(`이미지 분석 길이: ${imageDescription.length} 자`);
    console.log(`생성된 프롬프트 길이: ${enhancedPrompt.length} 자`);
    console.log(`-----------------------------------`);
    
    // 3단계: DALL-E 3로 이미지 생성
    console.log("3단계: 멀티모달 분석 기반 프롬프트로 DALL-E 3 이미지 생성 중...");
    return await callDALLE3Api(enhancedPrompt);
  } catch (error) {
    console.error("멀티모달 이미지 변환 중 오류:", error);
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