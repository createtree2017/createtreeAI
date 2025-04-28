/**
 * OpenAI DALL-E 3 기반 이미지 생성 서비스
 * 간단하고 명확한 구현으로 유지
 */
import OpenAI from "openai";

// OpenAI API 키
const API_KEY = process.env.OPENAI_API_KEY;

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";

// 간단한 API 키 유효성 검증
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// 기본 OpenAI 클라이언트 생성
const openai = new OpenAI({
  apiKey: API_KEY,
});

/**
 * 새로운 이미지 생성 (DALL-E 3)
 */
export async function generateImage(promptText: string): Promise<string> {
  try {
    // API 키 확인
    if (!isValidApiKey(API_KEY)) {
      console.log("유효한 API 키가 없습니다");
      return SERVICE_UNAVAILABLE;
    }

    console.log("DALL-E 3로 이미지 생성 시도");
    
    try {
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
        console.error("이미지 데이터가 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        console.error("이미지 URL이 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      console.log("DALL-E 3 이미지 생성 성공");
      return imageUrl;
    } catch (error) {
      console.error("DALL-E 3 이미지 생성 실패:", error);
      return SERVICE_UNAVAILABLE;
    }
  } catch (error) {
    console.error("이미지 생성 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 이미지 변환/스타일 변경 (DALL-E 3)
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

    console.log("DALL-E 3로 이미지 변환 시도");

    try {
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