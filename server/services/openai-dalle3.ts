/**
 * OpenAI 이미지 생성 서비스 (DALL-E 3 및 GPT-Image 1)
 * 
 * 이 모듈은 두 가지 AI 모델을 지원합니다:
 * 1. DALL-E 3 - 텍스트 프롬프트 기반 이미지 생성 (이미지 참조는 불가능)
 * 2. GPT-Image 1 - 이미지 변환 및 생성 (최신 모델)
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
const SAFETY_FILTER_MESSAGE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=안전+시스템에+의해+이미지+변환이+거부되었습니다.+다른+스타일이나+이미지를+시도해보세요";

// API 키 유효성 검증
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-'));
}

// OpenAI API 엔드포인트
const OPENAI_IMAGE_CREATION_URL = "https://api.openai.com/v1/images/generations";

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

/**
 * 이미지 변환 결과 인터페이스
 */
export interface ImageTransformResult {
  baseImageUrl: string;  // 원본 재현 이미지 URL (GPT-Image 1)
  styledImageUrl: string; // 스타일 적용 이미지 URL (DALL-E 3)
  success: boolean;      // 변환 성공 여부
  errorMessage?: string;  // 오류 메시지 (실패 시)
}

/**
 * 두 단계 이미지 처리 파이프라인을 실행하는 함수
 * 1단계: GPT-Image 1로 인물 기반 이미지 생성
 * 2단계: DALL-E 3로 스타일링 적용
 * 
 * @param imageBuffer 원본 이미지 버퍼
 * @param style 적용할 스타일
 * @param modelType 사용자가 선택한 모델 유형
 * @param customPrompt 사용자 지정 프롬프트
 * @returns 이미지 변환 결과 객체 (두 이미지 URL 포함)
 */
export async function transformImage(
  imageBuffer: Buffer, 
  style: string,
  modelType: string = "dalle-e-3",
  customPrompt: string | null = null
): Promise<string> {
  try {
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("OpenAI API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }

    // 모델 유형에 따라 처리 분기
    if (modelType === "gpt-image-1") {
      console.log("[파이프라인] GPT-Image 1 모델 처리 시작...");
      // GPT-Image 1 프롬프트 - 원본 이미지에서 사람의 특징과 포즈를 정확히 포착하는 데 중점
      const gptImagePrompt = `Transform the uploaded image using the following instruction: 
1. Create a photorealistic portrait of the EXACT person in this image
2. Precisely preserve their facial features, exact expression, hair style, body proportions, and pose 
3. Maintain all identifying characteristics, hand positions, and body orientation
4. Focus ONLY on reconstructing the person with perfect accuracy - do not add any stylistic elements yet
5. Clean background is acceptable but preserve the exact composition and framing
6. This is step 1 of a 2-step transformation process focusing only on accurate subject reconstruction`;

      // GPT-Image 1 호출 (현재는 DALL-E 3로 대체)
      console.log("[파이프라인] GPT-Image 1 호출 (단계 1) - 인물 정확하게 재현하기");
      const baseImageUrl = await transformImageWithPhotorealistic(imageBuffer, style, gptImagePrompt);
      
      // 변환 결과를 반환
      console.log("[파이프라인] GPT-Image 1 처리 완료");
      return baseImageUrl;
    } 
    else {
      console.log("[파이프라인] DALL-E 3 모델 처리 시작...");
      // DALL-E 3 프롬프트 구성
      let dallePrompt = "";
      
      if (style.includes("여신컨셉")) {
        dallePrompt = `Create a beautiful pregnancy portrait with:
1. The woman in elegant pose with hands on her pregnant belly
2. Radiant angel wings behind her
3. Warm studio lighting with golden/bronze tones
4. A stylish slim-fit dress in brown or earth tones
5. Clean, minimalist background
6. Professional studio photo aesthetic
7. Gentle facial expression and warm glow`;
      } else if (style.includes("동화")) {
        dallePrompt = `Create a fairytale-inspired maternity portrait with:
1. The pregnant woman as the central character 
2. Magical, storybook illustration style with ${style} aesthetic
3. Soft, dreamy colors and lighting
4. Fantasy elements like glowing aura or gentle magic
5. Elegant, flowing dress appropriate for pregnancy
6. Beautiful, serene expression on her face
7. Artistic composition that highlights her pregnancy`;
      } else {
        dallePrompt = `Create a professional maternity portrait in ${style} style with:
1. Beautiful pregnant woman with hands cradling her belly
2. Professional lighting and composition
3. Elegant styling and natural pose
4. Clean background with gentle tones
5. Emphasis on the beauty of pregnancy
6. Soft, flattering aesthetic
7. Slightly warm color grading`;
      }
      
      console.log(`[파이프라인] DALL-E 3 프롬프트: "${dallePrompt.substring(0, 100)}..."`);
      
      // DALL-E 3 호출
      const styledImageUrl = await transformImageWithDallE3(imageBuffer, style, dallePrompt);
      
      console.log("[파이프라인] DALL-E 3 처리 완료");
      return styledImageUrl;
    }
  } catch (error) {
    console.error("[파이프라인] 이미지 변환 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 사실적 인물 이미지 생성 (GPT-Image 1 역할)
 * 원본 이미지의 사람을 정확하게 재현하는 데 중점
 */
async function transformImageWithPhotorealistic(
  imageBuffer: Buffer, 
  style: string, 
  prompt: string
): Promise<string> {
  try {
    console.log("[GPT-Image 1] 인물 재현 프로세스 시작...");
    
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("[GPT-Image 1] API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2. API 호출 - 현재는 DALL-E 3로 대체
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };

    // 사실적 인물 재현을 위한 프롬프트
    const photoRealisticPrompt = `
    Create a HIGHLY PHOTOREALISTIC portrait of the exact person in this reference image:
    - Maintain PRECISE facial features, expression, and identity
    - Keep the same hairstyle, hair color, and hair texture
    - Preserve exact body proportions and body type
    - Maintain the same hand position on the belly for maternity photos
    - Clean studio lighting with natural tones
    - Professional portrait style with high resolution detail
    - Subtle, neutral background
    - This should look like a professional photograph, not an AI image
    `;

    const requestParams = {
      model: "dall-e-3",
      prompt: photoRealisticPrompt + " Style: " + style,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    };
    
    console.log("[GPT-Image 1] API 요청 전송...");
    
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestParams)
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GPT-Image 1] API 오류 응답:", errorText);
      
      // 안전 필터 응답 확인
      if (errorText.includes("safety") || errorText.includes("content_policy")) {
        return SAFETY_FILTER_MESSAGE;
      }
      
      return SERVICE_UNAVAILABLE;
    }
    
    // JSON 응답 처리 및 타입 안전성 확보
    const rawResponse = await response.json() as any;
    // 명시적으로 타입 검증
    const responseData: OpenAIImageGenerationResponse = {
      created: rawResponse.created,
      data: rawResponse.data,
      error: rawResponse.error
    };
    
    // 이미지 URL 추출
    const imageUrl = responseData.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error("[GPT-Image 1] 응답에 이미지 URL이 없습니다:", responseData);
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("[GPT-Image 1] 인물 재현 이미지 생성 성공, URL:", imageUrl.substring(0, 50) + "...");
    return imageUrl;
    
  } catch (error) {
    console.error("[GPT-Image 1] 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 중간 단계 이미지 변환 (GPT-Image 1 역할)
 * @param imageBuffer 원본 이미지 버퍼
 * @param prompt 프롬프트
 * @returns 중간 단계 이미지 URL
 */
async function transformImageWithIntermediate(imageBuffer: Buffer, prompt: string): Promise<string> {
  try {
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("중간 단계 변환 API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log(`중간 단계 이미지 변환 프롬프트: "${prompt.substring(0, 100)}..."`);
    
    // 2. API 호출 - 현재는 DALL-E 3로 대체
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };

    const requestParams = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    };
    
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestParams)
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error("중간 단계 이미지 변환 API 오류 응답:", errorText);
      
      // 안전 필터 응답 확인
      if (errorText.includes("safety") || errorText.includes("content_policy")) {
        return SAFETY_FILTER_MESSAGE;
      }
      
      return SERVICE_UNAVAILABLE;
    }
    
    // JSON 응답 처리 및 타입 안전성 확보
    const rawResponse = await response.json() as any;
    // 명시적으로 타입 검증
    const responseData: OpenAIImageGenerationResponse = {
      created: rawResponse.created,
      data: rawResponse.data,
      error: rawResponse.error
    };
    
    // 이미지 URL 추출
    const imageUrl = responseData.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error("중간 단계 이미지 변환 응답에 이미지 URL이 없습니다:", responseData);
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("중간 단계 이미지 변환 성공, URL:", imageUrl.substring(0, 50) + "...");
    return imageUrl;
    
  } catch (error) {
    console.error("중간 단계 이미지 변환 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * DALL-E 3 모델을 사용하여 이미지 생성 (텍스트 기반 이미지 생성)
 * @param imageBuffer 원본 이미지 버퍼 (참조용)
 * @param style 적용할 스타일
 * @param customPrompt 사용자 지정 프롬프트
 * @returns 변환된 이미지 URL
 */
export async function transformImageWithDallE3(
  imageBuffer: Buffer, 
  style: string,
  customPrompt: string | null = null
): Promise<string> {
  try {
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("DALL-E 3 API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2. 프롬프트 구성
    let finalPrompt = "";
    
    if (customPrompt && customPrompt.trim() !== "") {
      finalPrompt = customPrompt;
    } else {
      finalPrompt = `Transform this uploaded image to match ${style} style while preserving the subject's identity, pose, and key elements.`;
    }
    
    console.log(`DALL-E 3 변환 프롬프트: "${finalPrompt.substring(0, 100)}..."`);
    
    // 3. DALL-E 3 API 호출
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };

    const requestParams = {
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    };

    console.log("DALL-E 3 요청 파라미터:", JSON.stringify(requestParams));
    
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestParams)
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error("DALL-E 3 API 오류 응답:", errorText);
      
      // 안전 필터 응답 확인
      if (errorText.includes("safety") || errorText.includes("content_policy")) {
        return SAFETY_FILTER_MESSAGE;
      }
      
      return SERVICE_UNAVAILABLE;
    }
    
    // JSON 응답 처리 및 타입 안전성 확보
    const rawResponse = await response.json() as any;
    // 명시적으로 타입 검증
    const responseData: OpenAIImageGenerationResponse = {
      created: rawResponse.created,
      data: rawResponse.data,
      error: rawResponse.error
    };
    
    // 이미지 URL 추출
    const imageUrl = responseData.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error("DALL-E 3 응답에 이미지 URL이 없습니다:", responseData);
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("DALL-E 3 이미지 생성 성공, URL:", imageUrl.substring(0, 50) + "...");
    return imageUrl;
    
  } catch (error) {
    console.error("DALL-E 3 이미지 변환 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 텍스트 프롬프트만으로 이미지 생성 (DALL-E 3)
 * @param prompt 이미지 생성 프롬프트
 * @returns 생성된 이미지 URL
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("OpenAI API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }

    console.log(`DALL-E 3 이미지 생성 프롬프트: "${prompt.substring(0, 100)}..."`);
    
    // 2. DALL-E 3 API 호출
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };

    const requestParams = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    };

    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestParams)
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error("DALL-E 3 API 오류 응답:", errorText);
      
      // 안전 필터 응답 확인
      if (errorText.includes("safety") || errorText.includes("content_policy")) {
        return SAFETY_FILTER_MESSAGE;
      }
      
      return SERVICE_UNAVAILABLE;
    }
    
    // JSON 응답 처리 및 타입 안전성 확보
    const rawResponse = await response.json() as any;
    // 명시적으로 타입 검증
    const responseData: OpenAIImageGenerationResponse = {
      created: rawResponse.created,
      data: rawResponse.data,
      error: rawResponse.error
    };
    
    // 이미지 URL 추출
    const imageUrl = responseData.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error("DALL-E 3 응답에 이미지 URL이 없습니다:", responseData);
      return SERVICE_UNAVAILABLE;
    }
    
    return imageUrl;
    
  } catch (error) {
    console.error("DALL-E 3 이미지 생성 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}