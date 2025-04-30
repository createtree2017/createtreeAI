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
    
    // 프롬프트 검증: 빈 프롬프트 또는 undefined인 경우 로그 출력
    if (!prompt || prompt.trim() === '') {
      console.error("DALL-E API 호출 오류: 프롬프트가 비어 있습니다!");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("=== DALL-E API에 전송되는 최종 프롬프트 ===");
    console.log(prompt);
    console.log("=== DALL-E API 프롬프트 종료 ===");
    console.log("프롬프트 길이:", prompt.length);
    
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
async function callGPT4oVisionAndDALLE3(imageBuffer: Buffer, prompt: string, systemPrompt: string | null = null): Promise<string> {
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
    
    // 1단계: GPT-4o Vision으로 이미지 분석 및 설명 생성 (시스템 프롬프트 제공 여부에 따라 달라짐) 
    console.log("1단계: GPT-4o Vision으로 이미지 분석 중...");
    
    // 이미지 분석을 위한 API 요청 준비
    let analysisMessages = [];

    // systemPrompt가 제공된 경우 system 역할로 추가
    if (systemPrompt) {
      console.log("제공된 시스템 프롬프트 사용:", systemPrompt.substring(0, 100) + "...");
      analysisMessages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // 기본 또는 커스텀 지침으로 사용자 메시지 추가
    analysisMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: systemPrompt ? 
            `이 이미지를 분석해주세요.` : 
            `이 이미지에 대한 정확한 설명을 작성해 주세요:

인물 특성에 초점을 맞춰 자세히 설명해주세요:
1. 인물 수: 이미지에 있는 모든 사람의 수
2. 각 인물의 특징:
   - 성별과 나이
   - 눈, 코, 입 모양
   - 헤어스타일 (길이, 색상, 스타일)
   - 피부 톤
   - 특징 (안경, 귀걸이, 주근깨 등)
3. 의상: 각 인물의 옷 설명 (색상과 종류)
4. 표정과 포즈
5. 배경 환경
6. 이미지의 전반적인 분위기

주의: AI가 이미지를 변환할 때 원본 인물의 특징을 그대로 유지하는 데 필요한 정보입니다. 아주 자세하게 작성해 주세요.`
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    });

    // 분석 요청 본문 구성
    const analysisBody = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: analysisMessages,
      max_tokens: 1000
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
    const imageDescription = analysisData.choices?.[0]?.message?.content || "";
    if (!imageDescription) {
      console.error("이미지 분석 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2단계: GPT-4o로 원본 특성 유지 프롬프트 생성
    console.log("2단계: GPT-4o로 프롬프트 지침 생성 중...");
    const promptGenerationBody = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `당신은 이미지 스타일 변환을 위한 프롬프트 전문가입니다. 사용자가 제공하는 이미지 분석 정보를 바탕으로 DALL-E 3가 원본 이미지의 특성을 최대한 정확하게 유지하면서 스타일 변환할 수 있는 프롬프트를 작성해야 합니다.

다음 사항을 반드시 프롬프트에 포함시키세요:
1. 모든 인물의 정확한 특징 유지 지시
   - 얼굴 생김새 (눈, 코, 입 모양)
   - 헤어스타일 (길이, 색상, 스타일)
   - 피부톤
   - 특징적 요소 (안경, 모자, 악세서리 등)
2. 정확한 구도와 배경 유지 명령
3. 동일한 인물 수와 위치 관계 보존 
4. 의상의 색상과 스타일 보존
5. 표정, 감정, 자세 동일하게 유지

프롬프트는 DALL-E 3에게 지시하는 형식으로 영어로 작성하세요. 
중요: 스타일 관련 내용은 직접 지정하지 말고, 원본 요청의 스타일 지시를 따르도록 하세요. 스타일은 사용자의 요청에서 가져오고, 당신은 오직 원본 이미지 특성 보존에만 집중하세요.`
        },
        {
          role: "user",
          content: `원본 이미지 분석 정보:
${imageDescription}

사용자 요청: ${prompt}

위 정보를 바탕으로 DALL-E 3가 원본 이미지의 특성(인물 외모, 의상, 배경, 구도 등)을 완벽하게 보존하면서 요청된 스타일로 변환할 수 있는 프롬프트를 작성해 주세요. 스타일은 사용자 요청에서 언급된 스타일을 따르세요.`
        }
      ],
      max_tokens: 1000
    };
    
    // GPT-4o로 프롬프트 생성 요청
    const promptResponse = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(promptGenerationBody)
    });
    
    const promptResponseText = await promptResponse.text();
    let promptData: OpenAIChatResponse;
    
    try {
      promptData = JSON.parse(promptResponseText);
    } catch (e) {
      console.error("프롬프트 생성 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!promptResponse.ok || promptData.error) {
      console.error("프롬프트 생성 API 오류:", promptData.error?.message || `HTTP 오류: ${promptResponse.status}`);
      return SERVICE_UNAVAILABLE;
    }
    
    // 생성된 프롬프트
    const generatedPrompt = promptData.choices?.[0]?.message?.content || "";
    if (!generatedPrompt) {
      console.error("프롬프트 생성 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 3단계: DALL-E 3로 이미지 생성 
    console.log("3단계: DALL-E 3로 이미지 생성 중...");
    console.log("생성된 프롬프트:", generatedPrompt.substring(0, 150) + "...");
    
    // 최종 프롬프트 - 사용자 원본 요청을 더 명확하게 강조
    const finalPrompt = `${prompt}\n\nPreserve these exact details from the original image:\n${generatedPrompt}`;
    
    console.log("최종 프롬프트 구조:", 
      "1. 사용자 원본 요청 (스타일 지시)",
      "2. 원본 이미지 특성 보존 지침");
    
    // DALL-E 3로 이미지 생성
    return await callDALLE3Api(finalPrompt);
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
  customPromptTemplate?: string | null,
  systemPrompt?: string | null
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
    const imageUrl = await callGPT4oVisionAndDALLE3(imageBuffer, promptText, systemPrompt);
    
    if (imageUrl !== SERVICE_UNAVAILABLE) {
      console.log("이미지 변환 성공 (GPT-4o + DALL-E 3)");
    }
    
    return imageUrl;
  } catch (error) {
    console.error("이미지 변환 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}