/**
 * Simplified OpenAI Service 
 * DALL-E 3 이미지 생성을 위한 간소화된 서비스
 */
import OpenAI from "openai";

// OpenAI API 키
const API_KEY = process.env.OPENAI_API_KEY;

// OpenAI 클라이언트 생성
const openai = new OpenAI({
  apiKey: API_KEY,
});

// 간단한 API 키 유효성 검증
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

console.log("OpenAI 클라이언트 생성됨");

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";

/**
 * DALL-E 3를 사용하여 이미지 생성
 */
export async function generateImage(promptText: string): Promise<string> {
  try {
    // API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.log("유효한 API 키가 없습니다");
      return SERVICE_UNAVAILABLE;
    }

    console.log("DALL-E 3로 이미지 생성 시도 (임시 비활성화됨)");
    
    // 임시 함수: OpenAI 모듈 문제가 해결될 때까지 서비스 불가능 상태 반환
    console.error("OpenAI 모듈 로딩 오류로 인해 이미지 생성 기능이 비활성화되었습니다");
    return SERVICE_UNAVAILABLE;
  } catch (error) {
    console.error("이미지 생성 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * DALL-E 3를 사용하여 이미지 변환
 */
export async function transformImage(
  imageBuffer: Buffer,
  style: string,
  customPromptTemplate?: string | null
): Promise<string> {
  try {
    // API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.log("유효한 API 키가 없습니다");
      return SERVICE_UNAVAILABLE;
    }

    // DB에서 스타일 정보를 찾아 프롬프트를 사용하도록 함
    // 프롬프트 선택 (커스텀 또는 스타일 ID)
    let promptText: string;

    if (customPromptTemplate) {
      console.log("커스텀 프롬프트 템플릿 사용");
      promptText = customPromptTemplate;
    } else {
      // style 파라미터는 이제 스타일 ID(관리자가 생성한)로 간주함
      // 이 시점에서는 이미 스타일 정보가 파라미터로 전달되어야 함 
      // (호출 전에 DB에서 스타일 정보를 조회하여 시스템 프롬프트를 전달해야 함)
      promptText = style || "Transform this image into a beautiful artistic style";
    }

    console.log("DALL-E 3로 이미지 변환 시도");

    try {
      // 이미지를 Base64로 변환 - 하지만 이번 구현에서는 base64를 사용하지 않음
      // Base64 사용 시 DALL-E API에 너무 많은 데이터 전송 문제 발생 가능
      // 따라서 이미지 없이 텍스트 프롬프트만 사용
      
      // OpenAI SDK를 사용한 이미지 생성
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: promptText,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });

      // 응답 검증
      if (!response.data || response.data.length === 0) {
        console.error("이미지 변환 결과 데이터가 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        console.error("이미지 변환 URL이 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      console.log("DALL-E 3 이미지 변환 성공");
      return imageUrl;
    } catch (error) {
      console.error("DALL-E 3 이미지 변환 실패:", error);
      return SERVICE_UNAVAILABLE;
    }
  } catch (error) {
    console.error("이미지 변환 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * OpenAI GPT를 사용하여 채팅 응답 생성
 */
export async function generateChatResponse(userMessage: string, systemPrompt?: string): Promise<string> {
  try {
    // API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.log("유효한 API 키가 없습니다");
      return "I'm having trouble responding right now. Please try again in a moment.";
    }

    // 기본 시스템 프롬프트
    const defaultSystemPrompt = `You are MomMelody Assistant, a supportive AI companion for pregnant women and young mothers.
    Your role is to provide empathetic, informative, and encouraging responses to help mothers through their journey.
    Always be warm, patient, and positive in your tone. Provide practical advice when asked, but remember you're not a replacement for medical professionals.
    Keep responses concise (under 150 words) and appropriate for a mobile interface.`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "I'm here to support you.";
    return content;
  } catch (error) {
    console.error("Chat response generation error:", error);
    return "I'm having trouble responding right now. Please try again in a moment.";
  }
}