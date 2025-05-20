import OpenAI from "openai";
import { logDebug, logError } from "../utils/logger";

const API_KEY = process.env.OPENAI_API_KEY;

// OpenAI 인스턴스 생성
const openai = new OpenAI({ apiKey: API_KEY });

/**
 * OpenAI API 키가 유효한지 확인
 */
function isValidApiKey(apiKey?: string): boolean {
  return !!apiKey && apiKey.startsWith('sk-');
}

/**
 * 태몽 내용을 바탕으로 동화 줄거리 생성
 */
export async function generateDreamStorySummary(
  dreamer: string,
  babyName: string,
  dreamContent: string
): Promise<string> {
  try {
    if (!isValidApiKey(API_KEY)) {
      logError("유효한 OpenAI API 키가 없습니다");
      throw new Error("API 키가 유효하지 않습니다");
    }

    const prompt = `
    당신은 한국의 태몽을 아름다운 문학적 이야기로 만드는 작가입니다.
    다음 정보를 바탕으로 아이가 태어나기 전 꾼 태몽을 감성적이고 아름다운 이야기로 요약해주세요.
    결과는 한국어로 반환해주세요.
    
    조건:
    - 문학적이고 감성적인 문체로 작성
    - 아기의 미래에 대한 희망찬 메시지 포함
    - 태몽의 상징성을 아름답게 해석
    - 3-4문장으로 간결하게 작성
    - 태몽을 꾼 사람은 "${dreamer}"
    - 아이의 이름은 "${babyName}"
    
    태몽 내용:
    ${dreamContent}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "태몽 이야기를 생성하지 못했습니다.";
  } catch (error) {
    logError("태몽 이야기 생성 중 오류 발생:", error);
    throw new Error("태몽 이야기를 생성하는 중 문제가 발생했습니다.");
  }
}

/**
 * 태몽 내용을 바탕으로 4개의 장면 생성
 */
export async function generateDreamScenes(
  dreamContent: string,
  style: string
): Promise<string[]> {
  try {
    if (!isValidApiKey(API_KEY)) {
      logError("유효한 OpenAI API 키가 없습니다");
      throw new Error("API 키가 유효하지 않습니다");
    }

    // 스타일에 따른 프롬프트 조정
    let stylePrompt = "";
    switch (style) {
      case "ghibli":
        stylePrompt = "in warm and fantasy Studio Ghibli anime style with soft colors and dreamy atmosphere";
        break;
      case "disney":
        stylePrompt = "in cheerful and magical Disney animation style with vibrant colors";
        break;
      case "watercolor":
        stylePrompt = "in soft and emotional watercolor painting style with gentle brushwork";
        break;
      case "realistic":
        stylePrompt = "in realistic style with natural lighting and detailed expressions";
        break;
      case "korean":
        stylePrompt = "in traditional Korean ink painting style (수묵화) with elegant brushstrokes and minimalist aesthetic";
        break;
      default:
        stylePrompt = "in gentle and dreamy illustration style";
    }

    const prompt = `
    당신은 태몽을 4개의 시각적 장면으로 나누어 묘사하는 전문가입니다.
    다음 태몽 내용을 이미지 생성을 위한 4개의 영어 프롬프트로 변환해주세요.
    
    각 장면은 다음 조건을 만족해야 합니다:
    1. 연속적인 내러티브를 형성할 것
    2. 태몽의 핵심 요소를 포함할 것
    3. 시각적으로 매력적인 장면일 것
    4. ${stylePrompt} 스타일에 맞게 묘사할 것
    5. 각 장면은 2-3줄로 상세히 묘사할 것
    6. 앞뒤 장면과 연결성이 있을 것

    태몽 내용:
    ${dreamContent}

    결과 형식:
    프롬프트를 4개만 반환해주세요. 각 프롬프트는 영어로 작성하고, JSON 배열 형태로 반환해주세요.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("응답 내용이 비어있습니다");
    }

    try {
      const parsedResponse = JSON.parse(content);
      if (Array.isArray(parsedResponse.prompts) && parsedResponse.prompts.length === 4) {
        return parsedResponse.prompts;
      } else {
        logError("잘못된 응답 형식:", parsedResponse);
        throw new Error("응답 형식이 올바르지 않습니다");
      }
    } catch (parseError) {
      logError("응답 파싱 오류:", parseError, content);
      throw new Error("응답을 파싱하는 중 오류가 발생했습니다");
    }
  } catch (error) {
    logError("태몽 장면 생성 중 오류 발생:", error);
    throw new Error("태몽 장면을 생성하는 중 문제가 발생했습니다.");
  }
}

/**
 * 프롬프트를 기반으로 이미지 생성
 */
export async function generateDreamImage(prompt: string): Promise<string> {
  try {
    if (!isValidApiKey(API_KEY)) {
      logError("유효한 OpenAI API 키가 없습니다");
      throw new Error("API 키가 유효하지 않습니다");
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data || !response.data[0] || !response.data[0].url) {
      throw new Error("이미지 URL이 생성되지 않았습니다");
    }

    return response.data[0].url;
  } catch (error) {
    logError("이미지 생성 중 오류 발생:", error);
    throw new Error("이미지를 생성하는 중 문제가 발생했습니다.");
  }
}