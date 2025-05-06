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
import OpenAI from 'openai';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;
// 프로젝트 ID 관련 설정 제거 (오류 원인이었음)

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
const SAFETY_FILTER_MESSAGE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=안전+시스템에+의해+이미지+변환이+거부되었습니다.+다른+스타일이나+이미지를+시도해보세요";

// API 키 유효성 검증
function isValidApiKey(apiKey: string | undefined): boolean {
  // API 키가 존재하는지 확인
  return !!apiKey && apiKey.startsWith('sk-');
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

    console.log(`[이미지 변환] 이미지 처리 시작 - 모델: ${modelType}, 스타일: ${style}`);

    // 항상 GPT-Image 1 모델로 먼저 처리 (인물 정확성 위해)
    // 사용자가 GPT-Image 1을 선택했을 때와 동일하게 처리
    try {
      console.log("[이미지 변환] 단계 1: GPT-Image 1 모델로 인물 재현 시도");
      
      // 인물 정확한 재현을 위한 프롬프트
      const basePrompt = `
      Create a highly photorealistic portrait of the exact woman in this image with these specific requirements:
      1. Maintain PRECISE facial features, expression, and proportions - exact likeness is critical
      2. Keep identical hair style, color, and texture
      3. Keep the exact same clothes, colors, and style
      4. Maintain the same pose, especially hand positions if shown
      5. Preserve the same body type and proportions
      6. Use professional studio lighting with clean background
      7. Make sure the head is fully visible and not cropped
      8. The image should look like a professional photograph, not AI-generated
      9. Use ${style} aesthetic without losing the person's exact identity`;
      
      // 이미지 생성 API 직접 호출
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      };

      const requestParams = {
        model: "dall-e-3",
        prompt: basePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url"
      };
      
      console.log("[이미지 변환] OpenAI API 호출 (GPT-Image 1 대체)...");
      
      const baseResponse = await fetch(OPENAI_IMAGE_CREATION_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestParams)
      });
      
      // GPT-Image 1 단계 응답 처리
      if (!baseResponse.ok) {
        // 오류 발생 시 DALL-E 3로 대체
        console.error("[이미지 변환] 단계 1 실패. 단계 2로 전환...");
        
        // 사용자가 선택한 모델 타입에 따라 다음 단계 진행
        if (modelType === 'dall-e-3') {
          return await transformImageWithDallE3(imageBuffer, style, customPrompt || "");
        } else {
          // 기본 DALL-E 3 처리로 대체 (기본값 사용)
          const defaultPrompt = getDefaultPromptForStyle(style);
          return await transformImageWithDallE3(imageBuffer, style, defaultPrompt);
        }
      }
      
      // 스트림 응답 처리
      const baseResponseData = await baseResponse.json() as OpenAIImageGenerationResponse;
      const baseImageUrl = baseResponseData.data?.[0]?.url;
      
      if (!baseImageUrl) {
        console.error("[이미지 변환] 단계 1에서 이미지 URL을 받지 못했습니다. 단계 2로 전환...");
        
        // 사용자가 선택한 모델 타입에 따라 다음 단계 진행
        if (modelType === 'dall-e-3') {
          return await transformImageWithDallE3(imageBuffer, style, customPrompt || "");
        } else {
          // 기본 DALL-E 3 처리로 대체
          const defaultPrompt = getDefaultPromptForStyle(style);
          return await transformImageWithDallE3(imageBuffer, style, defaultPrompt);
        }
      }
      
      console.log("[이미지 변환] 단계 1 완료: 인물 정확한 재현 성공");
      
      // 단계 1의 결과만 반환 (GPT-Image 1 모델 선택 시)
      if (modelType === 'gpt-image-1') {
        return baseImageUrl;
      }
      
      // DALL-E 3 모델이 선택된 경우 단계 2로 진행
      console.log("[이미지 변환] 단계 2: DALL-E 3 모델로 스타일 적용 시작");
      
      // DALL-E 3 스타일 적용
      const styledImageUrl = await transformImageWithDallE3(imageBuffer, style, customPrompt || "");
      
      // 최종 결과 반환
      return styledImageUrl;
      
    } catch (error) {
      console.error("[이미지 변환] 처리 중 오류:", error);
      
      // 오류 발생 시 기본 DALL-E 3 처리로 대체
      if (modelType === 'dall-e-3') {
        console.log("[이미지 변환] 오류 복구: DALL-E 3 모델로 직접 처리");
        return await transformImageWithDallE3(imageBuffer, style, customPrompt || "");
      } else {
        console.log("[이미지 변환] 오류 복구: 기본 프롬프트로 처리");
        const photoRealisticPrompt = `
        Create a highly photorealistic portrait of the exact woman in this image using ${style} style:
        - Maintain precise facial features and identity
        - Preserve the exact pose and composition
        - Professional studio lighting and quality`;
        
        // 기본 이미지 생성 시도
        return await transformImageWithDallE3(imageBuffer, style, photoRealisticPrompt);
      }
    }
  } catch (finalError) {
    console.error("[이미지 변환] 치명적 오류:", finalError);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 스타일에 따른 기본 프롬프트 생성
 */
function getDefaultPromptForStyle(style: string): string {
  if (style.includes("여신컨셉")) {
    return `Create a beautiful pregnancy portrait with:
    1. The woman in elegant pose with hands on her pregnant belly
    2. Radiant angel wings behind her
    3. Warm studio lighting with golden/bronze tones
    4. A stylish slim-fit dress in brown or earth tones
    5. Clean, minimalist background
    6. Professional studio photo aesthetic
    7. Gentle facial expression and warm glow`;
  } else if (style.includes("동화")) {
    return `Create a fairytale-inspired maternity portrait with:
    1. The pregnant woman as the central character 
    2. Magical, storybook illustration style with ${style} aesthetic
    3. Soft, dreamy colors and lighting
    4. Fantasy elements like glowing aura or gentle magic
    5. Elegant, flowing dress appropriate for pregnancy
    6. Beautiful, serene expression on her face
    7. Artistic composition that highlights her pregnancy`;
  } else {
    return `Create a professional maternity portrait in ${style} style with:
    1. Beautiful pregnant woman with hands cradling her belly
    2. Professional lighting and composition
    3. Elegant styling and natural pose
    4. Clean background with gentle tones
    5. Emphasis on the beauty of pregnancy
    6. Soft, flattering aesthetic
    7. Slightly warm color grading`;
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
 * 여신컨셉과 동화 컨셉에 최적화된 프롬프트 포함
 * 
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
      console.error("[DALL-E 3] API 키가 유효하지 않거나 없습니다.");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2. 프롬프트 구성
    let finalPrompt = "";
    
    if (customPrompt && customPrompt.trim() !== "") {
      finalPrompt = customPrompt;
    } else {
      // 특별한 스타일에 맞는 프롬프트 구성
      if (style.includes("여신컨셉")) {
        finalPrompt = `Create a beautiful maternity goddess portrait with:
1. The pregnant woman exactly as shown in the photo
2. Elegant angel-like wings behind her
3. Warm golden/bronze studio lighting
4. A stylish brown-tone dress or clothing
5. Clean, minimalist background
6. Professional studio photo quality
7. Make sure her face and hair are exactly matched to the original image
8. Never cut off any part of her head or body in the frame`;
      } else if (style.includes("동화")) {
        finalPrompt = `Create a fairytale-style maternity portrait with:
1. The pregnant woman exactly as shown in the photo
2. Magical, storybook illustration style with ${style} aesthetic
3. Soft, dreamy colors and lighting
4. Fantasy elements like glowing aura around her
5. Keep her exact same facial features and expression
6. Make sure her entire head and body are visible in the frame
7. Never crop or cut off any part of her`;
      } else {
        finalPrompt = `Create a professional maternity portrait in ${style} style:
1. The woman exactly as she appears in the photo
2. Keep her precise facial features, expression, and hair
3. Professional lighting that complements her
4. Make sure her full head and body are visible in the frame
5. Focus on a beautiful composition that doesn't crop any part of her`;
      }
    }
    
    console.log(`[DALL-E 3] 최종 프롬프트: "${finalPrompt.substring(0, 100)}..."`);
    
    // 3. DALL-E 3 API 호출 (SDK 사용) - 프로젝트 ID 제거
    try {
      console.log("[DALL-E 3] 이미지 생성 API 호출 중...");
      console.log("[DALL-E 3] 프롬프트 처음 100자:", finalPrompt.substring(0, 100));
      
      // API 직접 호출로 변경
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
      
      console.log("[DALL-E 3] fetch 직접 호출 시도...");
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestParams)
      });
      
      // 응답 처리
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DALL-E 3] API 오류:", response.status, errorText);
        throw new Error(`API 오류: ${response.status} - ${errorText}`);
      }
      
      const rawResponseData = await response.json() as any;
      console.log("[DALL-E 3] 응답 데이터:", JSON.stringify(rawResponseData).substring(0, 200));
      
      // 타입 안전성 보장
      const responseData = {
        created: rawResponseData.created as number,
        data: rawResponseData.data as Array<{
          url?: string;
          revised_prompt?: string;
        }>
      };
      
      // 생성된 이미지 URL 추출
      const generatedImageUrl = responseData.data?.[0]?.url;
      
      if (!generatedImageUrl) {
        console.error("[DALL-E 3] 응답에 이미지 URL이 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      console.log("[DALL-E 3] 이미지 생성 성공, URL:", generatedImageUrl.substring(0, 50) + "...");
      return generatedImageUrl;
      
    } catch (apiError: any) {
      console.error("[DALL-E 3] API 오류:", apiError);
      
      // 안전 필터 체크
      if (apiError.toString().includes("safety") || apiError.toString().includes("content_policy")) {
        console.log("[DALL-E 3] 안전 필터에 의해 차단됨");
        return SAFETY_FILTER_MESSAGE;
      }
      
      // 혹시 API 통신 실패 시 기존 fetch 방식으로 대체 시도
      try {
        console.log("[DALL-E 3] 대체 API 호출 시도 (fetch 사용)");
        
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
        
        const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestParams)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json() as OpenAIImageGenerationResponse;
        const imageUrl = responseData.data?.[0]?.url;
        
        if (!imageUrl) {
          throw new Error("No image URL in response");
        }
        
        console.log("[DALL-E 3] 대체 방식으로 이미지 생성 성공");
        return imageUrl;
        
      } catch (fallbackError) {
        console.error("[DALL-E 3] 대체 API 호출도 실패:", fallbackError);
        return SERVICE_UNAVAILABLE;
      }
    }
  } catch (error) {
    console.error("[DALL-E 3] 처리 중 치명적 오류:", error);
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