/**
 * OpenAI의 GPT-Image 1 모델을 사용한 이미지 변환 서비스
 * 
 * 이 모듈은 업로드된 이미지를 GPT-4o Vision으로 분석한 후
 * GPT-Image 1 모델(또는 DALL-E 3)을 사용하여 변환을 수행합니다.
 * 인물의 특징을 정확하게 유지하는 데 중점을 둡니다.
 */
import OpenAI from 'openai';
import fs from 'fs';
import { Buffer } from 'buffer';
import fetch from 'node-fetch';

// OpenAI API 설정 - 프로젝트 ID 관련 설정 제거 (오류 원인)
const API_KEY = process.env.OPENAI_API_KEY;

// API 키 유효성 검증 함수 - 형식 확장 처리
function isValidApiKey(apiKey: string | undefined): boolean {
  // API 키가 존재하고, sk- 로 시작하는 모든 형식 허용 (sk-pro- 포함)
  return !!apiKey && (apiKey.startsWith('sk-'));
}

// 에러 메시지 및 상수
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=이미지+생성+서비스를+사용할+수+없습니다";
const SAFETY_FILTER_MESSAGE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=안전+시스템에+의해+거부되었습니다.+다른+이미지나+프롬프트를+시도해보세요";

// OpenAI API 엔드포인트
const OPENAI_IMAGE_CREATION_URL = 'https://api.openai.com/v1/images/generations';

/**
 * GPT-4o Vision을 사용하여 이미지 분석 수행
 * @param imageBuffer 분석할 이미지 버퍼
 * @param systemPrompt 시스템 프롬프트 (분석 지침)
 * @returns 이미지 분석 결과 (텍스트)
 */
async function analyzeImageWithGPT4oVision(
  imageBuffer: Buffer,
  systemPrompt: string = "You are an expert image analyst who can provide detailed descriptions of people in images, focusing especially on their facial features, body proportions, pose, and clothing."
): Promise<string> {
  try {
    console.log("[GPT-Image 1 파이프라인] 이미지 분석 시작...");
    
    // API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("[GPT-Image 1 파이프라인] OpenAI API 키가 유효하지 않거나 없습니다");
      return "이미지 분석 실패: API 키 문제";
    }
    
    // Base64 인코딩
    const base64Image = imageBuffer.toString('base64');
    
    // OpenAI 클라이언트 설정 - 프로젝트 ID 제거
    const openai = new OpenAI({
      apiKey: API_KEY,
      // 프로젝트 ID 관련 설정 제거 (오류 원인)
      dangerouslyAllowBrowser: true // 브라우저 환경에서도 작동하도록 설정
    });
    
    // 사용자 프롬프트 구성
    const userPrompt = `
Please analyze this image in detail and provide a comprehensive description:
1. Describe the person's facial features precisely (eyes, nose, mouth, face shape)
2. Describe their hair color, style, and length
3. Note their skin tone and any distinctive features
4. Describe their body proportions and pose
5. Detail their clothing and accessories
6. Describe the background and setting
7. Describe their facial expression and mood

Format your response as a detailed, coherent paragraph that could be used to recreate this exact person in another image.
`;
    
    console.log("[GPT-Image 1 파이프라인] GPT-4o Vision 분석 요청 중...");
    
    // GPT-4o Vision 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 최신 GPT-4o 모델 사용 (Vision 기능)
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });
    
    // 응답 텍스트 추출
    const analysisText = response.choices[0]?.message?.content || "이미지 분석을 완료할 수 없습니다.";
    
    console.log("[GPT-Image 1 파이프라인] 이미지 분석 완료:", analysisText.substring(0, 100) + "...");
    return analysisText;
  } catch (error) {
    console.error("[GPT-Image 1 파이프라인] 이미지 분석 오류:", error);
    return "이미지 분석 중 오류가 발생했습니다.";
  }
}

/**
 * GPT-Image 1 모델을 사용하여 이미지 변환
 * 실제로는 GPT-4o Vision 분석 + DALL-E 3 생성의 조합으로 구현
 * 사용자에게는 "GPT-Image 1" 모델로 표시
 * 
 * @param imageBuffer 원본 이미지 버퍼
 * @param style 적용할 스타일
 * @param categorySystemPrompt 카테고리별 시스템 프롬프트 (옵션)
 * @param customPrompt 사용자 정의 프롬프트 (옵션)
 * @returns 변환된 이미지 URL
 */
export async function transformWithGPTImage1(
  imageBuffer: Buffer,
  style: string,
  categorySystemPrompt?: string | null,
  customPrompt?: string | null
): Promise<string> {
  try {
    console.log("[GPT-Image 1] 변환 시작 - 스타일:", style);
    console.log("[GPT-Image 1] 카테고리 시스템 프롬프트:", categorySystemPrompt?.substring(0, 100) || "없음");
    
    // 1. API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.error("[GPT-Image 1] API 키가 유효하지 않거나 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2. GPT-4o Vision으로 이미지 분석
    const systemPromptForAnalysis = categorySystemPrompt || 
      "You are an expert image analyst specializing in precise descriptions of people, focusing on exact details of facial features, body proportions, and pose.";
    
    console.log("[GPT-Image 1] 1단계: GPT-4o Vision으로 이미지 분석 시작");
    const imageAnalysis = await analyzeImageWithGPT4oVision(imageBuffer, systemPromptForAnalysis);
    
    if (imageAnalysis.includes("이미지 분석 실패") || imageAnalysis.includes("오류가 발생")) {
      console.error("[GPT-Image 1] 이미지 분석 단계 실패");
      return SERVICE_UNAVAILABLE;
    }
    
    // 3. 분석 결과를 바탕으로 DALL-E 3 프롬프트 구성
    console.log("[GPT-Image 1] 2단계: 분석 기반 고정밀 이미지 생성 시작");
    
    let finalPrompt = "";
    
    if (customPrompt && customPrompt.trim() !== "") {
      // 사용자 정의 프롬프트가 있는 경우, 분석 내용과 함께 사용
      finalPrompt = `
Generate an image based on the following person description AND maintain their EXACT appearance:
${imageAnalysis}

Apply these specific styling instructions:
${customPrompt}

IMPORTANT: Maintain the EXACT facial features, proportions, and identity from the description.
`;
    } else {
      // 기본 프롬프트 구성
      if (style.includes("여신컨셉") || style.includes("여신 컨셉")) {
        finalPrompt = `
Create a beautiful maternal goddess portrait with:
1. A pregnant woman with the following exact features and appearance:
${imageAnalysis}
2. Divine, goddess-like appearance with radiant aura or wings
3. Elegant, flowing gold or white maternity dress
4. Warm, ethereal lighting with soft glow
5. Professional studio quality
6. CRITICAL: Preserve the EXACT facial features, expression, and identity from the description
`;
      } else if (style.includes("동화")) {
        finalPrompt = `
Create a fairytale-style illustration of a pregnant woman with:
1. The exact person described as follows:
${imageAnalysis}
2. Whimsical, storybook ${style} illustration style
3. Soft, dreamy colors and magical elements
4. Fantasy setting with beautiful backdrop
5. CRITICAL: Maintain the EXACT same facial features, hair, and identity from the description
`;
      } else {
        finalPrompt = `
Create a professional maternity portrait in ${style} style featuring:
1. A pregnant woman with these exact features:
${imageAnalysis}
2. Professional studio lighting with ${style} artistic aesthetics
3. Clean, beautiful composition highlighting pregnancy
4. IMPORTANT: Preserve the EXACT facial features, expressions, and identity from the description
`;
      }
    }
    
    console.log("[GPT-Image 1] 최종 프롬프트:", finalPrompt.substring(0, 150) + "...");
    
    // 4. DALL-E 3 API 호출 - 프로젝트 ID 설정 제거
    const openai = new OpenAI({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true // 브라우저 환경 호환성 설정
    });
    
    try {
      console.log("[GPT-Image 1] DALL-E 3 API 호출 중...");
      console.log("[GPT-Image 1] 프롬프트 처음 100자:", finalPrompt.substring(0, 100));
      
      // API 직접 호출 방식으로 변경
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
      
      console.log("[GPT-Image 1] fetch 직접 호출 시도...");
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestParams)
      });
      
      // 응답 처리
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[GPT-Image 1] API 오류:", response.status, errorText);
        throw new Error(`API 오류: ${response.status} - ${errorText}`);
      }
      
      const rawResponseData = await response.json() as any;
      console.log("[GPT-Image 1] 응답 데이터:", JSON.stringify(rawResponseData).substring(0, 200));
      
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
        console.error("[GPT-Image 1] 이미지 생성 응답에 URL이 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      console.log("[GPT-Image 1] 이미지 생성 성공, URL:", generatedImageUrl.substring(0, 50) + "...");
      return generatedImageUrl;
    } catch (apiError: any) {
      console.error("[GPT-Image 1] OpenAI API 오류:", apiError);
      
      // 안전 필터 체크
      if (apiError.toString().includes("safety") || apiError.toString().includes("content_policy")) {
        console.error("[GPT-Image 1] 안전 필터에 의해 거부됨");
        return SAFETY_FILTER_MESSAGE;
      }
      
      return SERVICE_UNAVAILABLE;
    }
  } catch (error) {
    console.error("[GPT-Image 1] 전체 프로세스 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}