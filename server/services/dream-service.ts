/**
 * 태몽동화 이미지 생성 서비스 (간소화된 버전)
 * DALL-E 3 모델을 활용한 간단한 이미지 생성 및 저장 구현
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;

// 서비스 불가능 상태 메시지
export const SERVICE_UNAVAILABLE = "/static/uploads/dream-books/error.png";

// API 키 유효성 검증
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// OpenAI API 엔드포인트
const OPENAI_IMAGE_CREATION_URL = "https://api.openai.com/v1/images/generations";

// API 응답 타입 정의
interface OpenAIImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;
    revised_prompt?: string;
    b64_json?: string;
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * 로그 함수들
 */
function logInfo(message: string, data?: any): void {
  console.info(`[INFO] ${message}`, data || '');
}

function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${message}`, error || '');
}

/**
 * 태몽동화 캐릭터 이미지 생성 (사진 기반)
 * @param prompt 기본 프롬프트 (이름, 특징 등)
 * @param systemPrompt 스타일 시스템 프롬프트
 * @param uploadedImagePath 업로드된 이미지 파일 경로 (옵션)
 * @returns 생성된 캐릭터 이미지의 URL 경로
 */
export async function generateCharacterImage(
  prompt: string, 
  systemPrompt: string, 
  uploadedImagePath?: string
): Promise<string> {
  try {
    // 업로드된 이미지가 있는 경우 (사진 기반 캐릭터 생성)
    if (uploadedImagePath && fs.existsSync(uploadedImagePath)) {
      logInfo('사진 기반 캐릭터 생성 시작', { 
        prompt, 
        imagePath: uploadedImagePath 
      });
      
      // 업로드된 이미지를 Base64로 인코딩
      const imageBuffer = fs.readFileSync(uploadedImagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // API 키 검증
      if (!isValidApiKey(API_KEY)) {
        logError('유효한 API 키가 없습니다');
        return SERVICE_UNAVAILABLE;
      }
      
      // 사진 기반 캐릭터 생성 프롬프트
      const characterSystemPrompt = `${systemPrompt}\n\n업로드된 사진 속 인물을 기반으로 캐릭터를 생성하세요. 인물의 특징과 외모를 유지하면서, 해당 스타일에 맞게 생성해주세요. 전신이 보이는 캐릭터 한 명만 정면에서 바라본 모습으로 생성하세요. 배경은 단순하게 하고 캐릭터에 집중하세요.`;
      
      // OpenAI Vision API 엔드포인트 (GPT-4-vision)
      const OPENAI_VISION_URL = "https://api.openai.com/v1/chat/completions";
      
      // 요청 본문 구성
      const requestBody = {
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: characterSystemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `이 사진을 기반으로 "${prompt}"를 생성해주세요.`
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
        max_tokens: 1000
      };
      
      // API 헤더 설정
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      };

      // 단계 1: Vision API로 이미지 분석 및 캐릭터 설명 생성
      logInfo('Vision API를 사용한 이미지 분석 시작');
      
      // 1차 API 호출: 이미지 분석
      const visionResponse = await fetch(OPENAI_VISION_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!visionResponse.ok) {
        const errorData = await visionResponse.json();
        logError('Vision API 오류', errorData);
        return SERVICE_UNAVAILABLE;
      }
      
      // 응답 파싱
      const visionData = await visionResponse.json() as any;
      
      // 이미지 분석 결과 추출
      const characterDescription = visionData.choices && visionData.choices[0]?.message?.content || "";
      
      logInfo('Vision API 이미지 분석 완료', { 
        description: characterDescription.substring(0, 100) + '...' 
      });
      
      // 단계 2: 캐릭터 설명을 바탕으로 캐릭터 이미지 생성
      const generationPrompt = `
사진 분석 결과: ${characterDescription}

위 설명을 바탕으로 "${prompt}"의 캐릭터를 생성해주세요. 
인물의 특징과 외모를 유지하며, 전신이 보이게 생성해주세요.
배경은 단순하게 하고 캐릭터에만 집중해주세요.
`;
      
      // 2차 이미지 생성
      return generateDreamImage(generationPrompt, systemPrompt);
    } 
    // 사진이 없는 경우 (기존 방식)
    else {
      const characterSystemPrompt = `${systemPrompt}\n\n전신이 보이는 캐릭터 한 명만 정면에서 바라본 모습으로 생성하세요. 배경은 단순하게 하고 캐릭터에 집중하세요.`;
      return generateDreamImage(prompt, characterSystemPrompt);
    }
  } catch (error) {
    logError('캐릭터 이미지 생성 중 오류 발생', error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 태몽동화 장면 이미지 생성 (캐릭터 참조 포함)
 * @param scenePrompt 장면 프롬프트
 * @param characterPrompt 캐릭터 참조 프롬프트
 * @param stylePrompt 스타일 지시 프롬프트
 * @returns 생성된 장면 이미지의 URL 경로
 */
export async function generateDreamSceneImage(
  scenePrompt: string, 
  characterPrompt: string, 
  stylePrompt: string, 
  peoplePrompt: string,
  backgroundPrompt: string
): Promise<string> {
  const fullPrompt = `
System: ${stylePrompt}

캐릭터 참조: ${characterPrompt}

인물 표현: ${peoplePrompt}

배경 표현: ${backgroundPrompt}

User: ${scenePrompt}
`;
  return generateDreamImage(fullPrompt);
}

/**
 * DALL-E 3를 사용하여 태몽동화 이미지 생성
 * @param prompt 이미지 생성에 사용할 프롬프트
 * @param systemPrompt 시스템 프롬프트 (스타일 지시사항)
 * @returns 생성된 이미지의 URL 경로
 */
export async function generateDreamImage(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    // API 키 검증
    if (!isValidApiKey(API_KEY)) {
      logError('유효한 API 키가 없습니다');
      return SERVICE_UNAVAILABLE;
    }

    // 최종 프롬프트 생성 (시스템 프롬프트가 있는 경우 결합)
    let finalPrompt = prompt;
    if (systemPrompt && systemPrompt.trim()) {
      finalPrompt = `${systemPrompt}\n\n${prompt}`;
    }

    // 프롬프트 로깅
    logInfo('태몽동화 이미지 생성 프롬프트', {
      prompt: finalPrompt.substring(0, 100) + (finalPrompt.length > 100 ? '...' : '')
    });

    // DALL-E 3 API 요청 본문
    const requestBody = {
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json"
    };

    // API 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };

    // API 호출
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // 응답 검증
    if (!response.ok) {
      const errorData = await response.json();
      logError('DALL-E 3 API 오류', errorData);
      return SERVICE_UNAVAILABLE;
    }

    // 응답 파싱
    const responseData = await response.json() as OpenAIImageGenerationResponse;

    // 데이터 검증
    if (!responseData.data || responseData.data.length === 0) {
      logError('응답에 이미지 데이터가 없습니다');
      return SERVICE_UNAVAILABLE;
    }

    // 이미지 URL 또는 base64 데이터 추출
    const imageData = responseData.data[0];
    let imageUrl = imageData.url;
    const base64Data = imageData.b64_json;

    // base64 데이터가 있는 경우 파일로 저장
    if (base64Data) {
      // 파일 이름 및 경로 설정
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 10000);
      const filename = `dreambook-${timestamp}-${randomId}.png`;
      
      // 저장 경로 설정
      const uploadPath = path.join(process.cwd(), 'static', 'uploads', 'dream-books');
      
      try {
        // 디렉토리가 없으면 생성
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        const filePath = path.join(uploadPath, filename);
        
        // Base64 데이터를 파일로 저장
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        
        // 웹에서 접근 가능한 URL 경로 반환
        imageUrl = `/static/uploads/dream-books/${filename}`;
        
        logInfo('이미지 파일 저장 완료', {
          filePath,
          accessUrl: imageUrl
        });
      } catch (err) {
        logError('이미지 파일 저장 실패', err);
        return SERVICE_UNAVAILABLE;
      }
    } else if (imageUrl) {
      // OpenAI에서 URL만 받은 경우 - URL 그대로 반환 (단, 파일로 저장 안됨)
      logInfo('OpenAI에서 이미지 URL 받음', { url: imageUrl });
      // 참고: OpenAI URL은 시간 제한이 있어 만료될 수 있음
    } else {
      // URL도 base64도 없는 경우
      logError('이미지 URL과 base64 데이터 모두 없음');
      return SERVICE_UNAVAILABLE;
    }

    return imageUrl || SERVICE_UNAVAILABLE;
  } catch (error) {
    logError('태몽동화 이미지 생성 중 오류 발생', error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 스타일 키워드를 프롬프트에 추가 (기존 코드 간소화)
 */
export function getStylePrompt(style: string): string {
  const stylePrompts: Record<string, string> = {
    realistic: "사실적인 스타일로 이미지를 생성해주세요. 세부 디테일과 사실적인 질감을 포함해야 합니다.",
    ghibli: "지브리 스튜디오 스타일과 비슷하게 이미지를 생성해주세요. 한장에 한장면만 연출되도록 생성해주세요. 일본 애니메이션 특유의 섬세한 선과 느낌을 충분히 살려주세요.",
    disney: "디즈니 애니메이션 스타일로 이미지를 생성해주세요. 부드러운 색감과 생동감 있는 캐릭터 표현을 포함해주세요.",
    fairytale: "동화책 일러스트레이션 스타일로 이미지를 생성해주세요. 환상적이고 아름다운 분위기를 담아주세요.",
    webtoon: "한국 웹툰 스타일로 이미지를 생성해주세요. 깔끔한 선과 선명한 색상을 사용해주세요."
  };

  return stylePrompts[style] || stylePrompts.realistic;
}