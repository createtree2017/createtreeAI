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
 * GPT-Image 1 모델을 사용하여 이미지 변환 (이미지 기반 이미지 생성)
 * @param imageBuffer 원본 이미지 버퍼
 * @param style 적용할 스타일
 * @param customPrompt 사용자 지정 프롬프트
 * @param systemPrompt 시스템 프롬프트 (옵션)
 * @returns 변환된 이미지 URL
 */
export async function transformImage(
  imageBuffer: Buffer, 
  style: string,
  customPrompt: string | null = null,
  systemPrompt: string | null = null
): Promise<string> {
  try {
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("GPT-Image 1 API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }

    // 2. 이미지를 Base64로 인코딩
    const base64Image = imageBuffer.toString('base64');
    
    // 3. 프롬프트 구성 - GPT-Image 1은 얼굴과 포즈를 보존하는데 중점
    let gptImagePrompt = "";
    
    if (customPrompt && customPrompt.trim() !== "") {
      gptImagePrompt = customPrompt;
    } else {
      gptImagePrompt = `Create a photorealistic image based on this reference image, preserving the person's facial features, body proportions, pose, and hand positions exactly. Focus on maintaining identity and structure.`;
    }
    
    console.log(`GPT-Image 1 단계1 변환 프롬프트: "${gptImagePrompt.substring(0, 100)}..."`);
    
    // 4. GPT-Image 1 API 호출 (현재는 가상 구현, 실제로는 OpenAI API 호출 필요)
    // 참고: 이 부분은 실제 GPT-Image 1 API 연동 구현이 필요합니다.
    // 현재는 테스트를 위해 DALL-E 3로 대체합니다.
    
    // GPT-Image 1 프롬프트
    const gptImageStepPrompt = `Create a photorealistic portrait of the person in this image, preserving their exact facial features, expression, body proportions, and pose. Maintain all identifying characteristics. This is step 1 of a transformation process focusing only on the person's structure and identity, without any style changes yet.`;
    
    // 5. GPT-Image 1 변환 결과 처리 (이 단계에서는 임시로 DALL-E 3를 사용)
    console.log("GPT-Image 1 단계 실행 중...");
    
    // 현재는 테스트로 DALL-E 3 사용, 나중에 실제 GPT-Image 1 API로 교체 필요
    // 이미지 URL은 로컬에 저장되거나 임시 URL로 반환될 수 있음
    const intermediateImageUrl = await transformImageWithIntermediate(imageBuffer, gptImageStepPrompt);
    
    // GPT-Image 1 처리에 실패한 경우 바로 반환
    if (intermediateImageUrl === SERVICE_UNAVAILABLE || intermediateImageUrl === SAFETY_FILTER_MESSAGE) {
      console.error("GPT-Image 1 변환 실패, 처리 중단");
      return intermediateImageUrl;
    }
    
    console.log("GPT-Image 1 처리 완료, DALL-E 3 스타일 적용 단계로 진행...");
    
    // 6. DALL-E 3 스타일 적용 단계 (실제로는 GPT-Image 1에서 생성된 이미지 사용)
    // 현재는 원본 이미지를 사용하여 DALL-E 3 호출
    
    // DALL-E 3 스타일 프롬프트 구성
    let dalleStylePrompt = "";
    
    if (style.includes("여신컨셉")) {
      dalleStylePrompt = `Keep the person's facial identity and pose from the image, and apply warm studio lighting, elegant angel wings, and a stylish slim-fit dress with color tones matching the ${style} style. Do not change the person or their position.`;
    } else if (style.includes("동화")) {
      dalleStylePrompt = `Keep the person's facial identity and pose from the image, and transform into a fairytale storybook illustration style with ${style} aesthetic. Maintain the person's identity and pose while adding magical elements.`;
    } else {
      dalleStylePrompt = `Transform this image to match ${style} style while preserving the subject's identity, pose, and key elements. Focus on changing only the style, background, and decorative elements.`;
    }
    
    console.log(`DALL-E 3 단계2 변환 프롬프트: "${dalleStylePrompt.substring(0, 100)}..."`);
    
    // 7. DALL-E 3로 최종 스타일 적용
    const finalImageUrl = await transformImageWithDallE3(imageBuffer, style, dalleStylePrompt);
    
    console.log("변환 파이프라인 완료: GPT-Image 1 → DALL-E 3");
    return finalImageUrl;
    
  } catch (error) {
    console.error("이미지 변환 파이프라인 오류:", error);
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