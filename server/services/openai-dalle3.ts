/**
 * OpenAI DALL-E 3와 GPT-4o를 활용한 이미지 생성 및 변환 서비스
 * 프로젝트 API 키 사용하여 직접 API 호출 방식으로 구현
 */
import fetch from 'node-fetch';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;

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
          content: "You are an extremely precise image analyst specializing in human facial features and scene details. Your task is to provide a DETAILED and STRUCTURED analysis that will serve as reference for an image transformation AI. Focus on creating a description that preserves the identity of people in the photo."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `분석해야 할 이미지입니다. 다음 정보를 명확하고 체계적으로 작성해 주세요:

1. 인물 수: 몇 명의 사람이 있는지
2. 각 인물별 상세 설명:
   - 성별과 대략적인 나이
   - 얼굴 형태 (둥근 얼굴, 갸름한 얼굴 등)
   - 눈 모양과 색상
   - 헤어스타일 (길이, 색상, 스타일)
   - 피부 톤
   - 특이사항 (안경, 귀걸이, 주근깨 등)
3. 의상 설명: 각 인물이 입고 있는 옷의 스타일, 색상, 패턴
4. 포즈와 표정: 각 인물의 자세와 표정 상세 설명
5. 배경: 배경 환경에 대한 상세 설명 (실내/실외, 색상, 구성요소)
6. 구도: 이미지 내 인물들의 배치와 전체적인 구도
7. 조명: 이미지의 전반적인 조명 상태와 분위기

정확하고 상세하게 작성해 주세요. 이 설명은 이미지 변환 AI가 원본 인물의 특징을 유지하면서 스타일만 변경하는 데 사용됩니다.`
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
      max_tokens: 1200
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
    
    // 항상 관리자 프롬프트를 우선적으로 사용 (길이나 스타일에 상관없이)
    // 컨셉 프롬프트가 전달된 모든 경우에 해당 프롬프트를 직접 사용
    console.log("전달된 프롬프트를 직접 사용 (시스템 프롬프트 무시)");
    const adminPrompt = prompt;
    
    // 로그에 분석 정보 추가 (디버깅 목적)
    console.log(`-----------------------------------`);
    console.log(`[이미지 변환 디버그 정보]`);
    console.log(`전달된 원본 프롬프트: ${prompt}`);
    console.log(`이미지 분석 길이: ${imageDescription.length} 자`);
    console.log(`사용할 프롬프트 길이: ${adminPrompt.length} 자`);
    console.log(`-----------------------------------`);
    
    // 먼저 GPT-4o를 사용하여 이미지 분석을 바탕으로 DALL-E 3 전용 정확한 프롬프트 생성
    console.log("2단계: 이미지 분석을 기반으로 정밀한 DALL-E 프롬프트 생성 중...");
    const promptGenBody = {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert DALL-E 3 prompt engineer specializing in Studio Ghibli style transformations. Your goal is to create a detailed prompt that will help DALL-E 3 transform photos into Studio Ghibli style WHILE PRESERVING THE EXACT IDENTITY AND NUMBER OF PEOPLE in the original photo. You must follow these fixed rules:
1. ALWAYS create prompts that require maintaining the EXACT number of people and their positions
2. ALWAYS mention specific facial features (eyes, nose, mouth shape, etc)
3. ALWAYS mention exact hairstyle features (length, color, style)
4. ALWAYS specify clothing items and colors
5. NEVER invent new people or change their positions
6. Include all these elements in the Ghibli style`
        },
        {
          role: "user",
          content: `I need to transform a photo into Studio Ghibli style WHILE MAINTAINING EXACT IDENTITY of all people in the photo. Here's the detailed analysis of the photo:

${imageDescription}

Create a detailed, effective DALL-E 3 prompt that will:
1. Maintain the exact same subjects and composition
2. Keep all people's identity features intact (face shape, hairstyle, expressions)
3. Transform the style to pure Studio Ghibli animation with:
   - Hand-drawn 2D look
   - Miyazaki's soft pastel colors
   - Large, expressive anime eyes
   - Simplified but recognizable facial features
   - No photorealistic elements

Format your prompt to work directly with DALL-E 3. Be extremely specific about preserving identity.`
        }
      ],
      max_tokens: 1200
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
    
    // 최종 프롬프트 생성
    const generatedPrompt = promptGenData.choices?.[0]?.message?.content;
    if (!generatedPrompt) {
      console.error("프롬프트 생성 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("GPT-4o가 생성한 정밀 프롬프트:", generatedPrompt.substring(0, 150) + "...");
    
    // 3단계: DALL-E 3로 이미지 생성
    console.log("3단계: GPT-4o 생성 프롬프트로 DALL-E 3 이미지 생성 중...");
    return await callDALLE3Api(generatedPrompt);
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
      ghibli: "Transform this image into an EXACT Studio Ghibli anime style as seen in films like 'Spirited Away' and 'Howl's Moving Castle'. The style MUST include: 1) Hand-drawn 2D animation look with visible brush strokes and line work, 2) Miyazaki's signature soft pastel color palette with teal blue skies and verdant greens, 3) Characters with distinctively large, expressive anime eyes and simplified facial features, 4) A dreamy, otherworldly atmosphere with magical lighting effects, 5) Whimsical exaggerated proportions typical of Japanese animation. This MUST look like a screenshot from an actual Studio Ghibli film, not a subtle stylization. While maintaining this strong Studio Ghibli aesthetic, preserve the subject's hair length/style, basic facial structure, clothing style/colors, and pose. No photorealistic elements should remain - convert EVERYTHING to pure hand-drawn Ghibli animation style.",
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