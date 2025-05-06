/**
 * OpenAI DALL-E 3 모델을 활용한 이미지 생성 서비스
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
 * DALL-E 3 모델을 사용하여 이미지 변환
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

    // 2. 이미지를 Base64로 인코딩 (참조용으로만 사용)
    const base64Image = imageBuffer.toString('base64');
    
    // 3. 프롬프트 구성
    let finalPrompt = "";
    
    if (customPrompt && customPrompt.trim() !== "") {
      finalPrompt = customPrompt;
    } else {
      finalPrompt = `Transform this uploaded image to match ${style} style while preserving the subject's identity, pose, and key elements.`;
    }
    
    console.log(`DALL-E 3 변환 프롬프트: "${finalPrompt.substring(0, 100)}..."`);
    
    // 4. DALL-E 3 API 호출
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
    
    const responseData: OpenAIImageGenerationResponse = await response.json();
    
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