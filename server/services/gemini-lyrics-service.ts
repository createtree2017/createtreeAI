import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini API 키 확인 및 클라이언트 초기화
if (!process.env.GEMINI_API_KEY) {
  console.warn("경고: GEMINI_API_KEY가 없습니다. Gemini 가사 생성 서비스가 작동하지 않을 수 있습니다.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 2048,
  }
});

export interface GenerateLyricsRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  language?: string;
  targetLength?: number;
}

/**
 * Gemini 1.5 Pro를 사용하여 가사 생성
 */
export async function generateLyrics(request: GenerateLyricsRequest): Promise<string> {
  const { prompt, genre, mood, language = "korean", targetLength = 200 } = request;

  // 프롬프트 구성
  const systemPrompt = `당신은 아기를 위한 자장가와 태교송을 작곡하는 전문 작사가입니다. 
다음 요청에 맞는 가사를 작성해주세요:

- 가사 주제 또는 배경: ${prompt}
${genre ? `- 장르: ${genre}` : ''}
${mood ? `- 분위기: ${mood}` : ''}
- 언어: ${language === "korean" ? "한국어" : "영어"}
- 길이: 약 ${targetLength}자 내외

다음 지침을 따라주세요:
1. 아기나 임산부에게 적합한 긍정적인 내용이어야 합니다.
2. 단순하고 따뜻한 어조를 유지하세요.
3. 자연스러운 운율과 리듬감이 있어야 합니다.
4. 반복적인 후렴구가 있으면 좋습니다.
5. 가사만 작성하고 다른 설명은 포함하지 마세요.`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error("Gemini 가사 생성 오류:", error);
    throw new Error(`Gemini 가사 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gemini 1.5 Pro를 사용하여 음악 생성을 위한 상세 프롬프트 생성
 */
export async function generateMusicPrompt(
  originalPrompt: string,
  lyrics: string,
  style?: string
): Promise<string> {
  const systemPrompt = `당신은 AI 음악 생성 시스템을 위한 프롬프트 엔지니어입니다.
사용자가 음악 생성 AI에 제공할 수 있는 상세한 음악 생성 프롬프트를 작성해주세요.

다음은 생성된 가사입니다:
"""
${lyrics}
"""

원본 주제/요청:
"""
${originalPrompt}
"""
${style ? `희망하는 음악 스타일: ${style}` : ''}

다음 요소를 포함한 음악 생성 프롬프트를 작성해주세요:
1. 선호하는 악기 구성 (예: 피아노, 현악기, 기타 등)
2. 템포 및 리듬 제안 (예: 느리고 차분한, 중간 템포의 경쾌한 등)
3. 음악적 분위기 및 감정 (예: 따뜻하고 포근한, 밝고 희망찬 등)
4. 음악 구조에 대한 제안 (예: 인트로, 벌스, 코러스 등)
5. 참조할 수 있는 비슷한 음악 장르나 스타일

프롬프트는 음악 생성 AI가 바로 활용할 수 있도록 명확하고 구체적이어야 합니다.
영어로 작성하되, 한국어 원문의 의미와 느낌이 잘 전달되어야 합니다.
음악 생성 AI에게 직접 말하는 것처럼 작성하세요.`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error("Gemini 음악 프롬프트 생성 오류:", error);
    throw new Error(`Gemini 음악 프롬프트 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 텍스트 번역 (한국어 -> 영어 또는 영어 -> 한국어)
 */
export async function translateText(text: string, targetLanguage: "english" | "korean" = "english"): Promise<string> {
  const systemPrompt = `다음 텍스트를 ${targetLanguage === "english" ? "영어" : "한국어"}로 번역해주세요. 
원문의 의미와 뉘앙스를 최대한 유지하면서 자연스러운 번역을 제공해주세요.

원문:
"""
${text}
"""

번역한 내용만 출력하고 다른 설명은 포함하지 마세요.`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const translatedText = response.text();
    return translatedText.trim();
  } catch (error) {
    console.error("Gemini 번역 오류:", error);
    throw new Error(`Gemini 번역 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}