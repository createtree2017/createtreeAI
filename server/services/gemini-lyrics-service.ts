import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Gemini API 클라이언트 초기화
let genAI: GoogleGenerativeAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    console.log("Gemini API 클라이언트 초기화 시작...");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini API 클라이언트 초기화 성공");
  } else {
    console.warn("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
} catch (error) {
  console.error("Gemini API 클라이언트 초기화 오류:", error);
}

// 안전 설정 구성
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// 모델 설정
const MODEL_NAME = "gemini-1.5-pro";

// 요청 타입 정의
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
  if (!genAI) {
    throw new Error("Gemini API 클라이언트가 초기화되지 않았습니다. API 키가 올바르게 설정되었는지 확인하세요.");
  }

  const {
    prompt,
    genre = "lullaby",
    mood = "soothing",
    language = "korean",
    targetLength = 4
  } = request;

  try {
    console.log(`Gemini API를 사용하여 가사 생성 시작: "${prompt}" (장르: ${genre}, 분위기: ${mood}, 언어: ${language})`);

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings
    });

    const promptText = `당신은 전문 작사가입니다. 아래 지시사항에 따라 아기 자장가 가사를 작성해주세요.

주제: ${prompt}
장르: ${genre}
분위기: ${mood}
언어: ${language}
구조: 
- ${targetLength}개의 절(verse)과 각 절 후에 반복되는 후렴구(chorus)로 구성해주세요.
- 각 절은 4줄로 구성해주세요.
- 후렴구는 4줄로 구성해주세요.

다음 형식으로 작성해주세요:
(Verse 1)
[4줄의 가사]
(Chorus)
[4줄의 가사]
(Verse 2)
[4줄의 가사]
...
이런 식으로.

가사는 아기에게 부드럽고 편안한 느낌을 주어야 하며, 아기가 평화롭게 잠들 수 있도록 도와주는 내용이어야 합니다.
아기 이름이 프롬프트에 있다면 가사에 그 이름을 포함시켜주세요.
한국어로 작성하되, 간결하고 부드러운 리듬감을 유지해주세요.
`;

    const result = await model.generateContent(promptText);
    const text = result.response.text();

    console.log("Gemini API로 생성된 가사:", text.substring(0, 100) + "...");
    return text;
  } catch (error) {
    console.error("Gemini API 가사 생성 중 오류 발생:", error);
    throw new Error(`Gemini API로 가사 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gemini 1.5 Pro를 사용하여 음악 생성을 위한 상세 프롬프트 생성
 */
export async function generateMusicPrompt(
  originalPrompt: string,
  lyrics: string,
  style: string = "lullaby"
): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini API 클라이언트가 초기화되지 않았습니다. API 키가 올바르게 설정되었는지 확인하세요.");
  }

  try {
    console.log(`Gemini API를 사용하여 음악 생성 프롬프트 생성 시작: "${originalPrompt}" (스타일: ${style})`);

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings
    });

    const promptText = `당신은 음악 프로듀서입니다. 다음 가사와 기본 프롬프트에 맞는 음악을 생성하기 위한 상세한 프롬프트를 작성해주세요.

기본 프롬프트: ${originalPrompt}
스타일: ${style}
가사: 
${lyrics.substring(0, 500)}${lyrics.length > 500 ? '...' : ''}

음악 생성 AI 모델을 위한 상세 프롬프트를 작성해주세요. 다음 요소들을 포함시켜야 합니다:
1. 악기 구성 (예: 피아노, 현악기, 어쿠스틱 기타 등)
2. 템포 및 리듬 특성 (예: 부드러운 워킹 베이스, 느린 템포, 자연스러운 리듬 등)
3. 멜로디 특성 (예: 서정적인 멜로디, 단순하고 반복적인 패턴 등)
4. 화음 및 화성 특성 (예: 메이저 코드 진행, 부드러운 화음 전환 등)
5. 분위기 및 감정 (예: 따뜻하고 포근한 느낌, 평화롭고 안정적인 분위기 등)

자장가에 적합한 특성을 중심으로 상세하게 설명해주세요. 아기를 잠재우기에 적합한 부드럽고 편안한 음악을 묘사해주세요.
`;

    const result = await model.generateContent(promptText);
    const text = result.response.text();

    console.log("Gemini API로 생성된 음악 프롬프트:", text.substring(0, 100) + "...");
    return text;
  } catch (error) {
    console.error("Gemini API 음악 프롬프트 생성 중 오류 발생:", error);
    throw new Error(`Gemini API로 음악 프롬프트 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 텍스트 번역 (한국어 -> 영어 또는 영어 -> 한국어)
 */
export async function translateText(text: string, targetLanguage: "english" | "korean" = "english"): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini API 클라이언트가 초기화되지 않았습니다. API 키가 올바르게 설정되었는지 확인하세요.");
  }

  try {
    console.log(`Gemini API를 사용하여 번역 시작: "${text.substring(0, 30)}..." (대상 언어: ${targetLanguage})`);

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings
    });

    const promptText = `다음 텍스트를 ${targetLanguage === "english" ? "영어" : "한국어"}로 번역해주세요. 가능한 자연스럽게 번역하되, 원문의 의미와 뉘앙스를 최대한 보존해주세요:

${text}

번역:`;

    const result = await model.generateContent(promptText);
    const translatedText = result.response.text();

    console.log(`Gemini API로 번역 완료 (${targetLanguage}): "${translatedText.substring(0, 30)}..."`);
    return translatedText;
  } catch (error) {
    console.error("Gemini API 번역 중 오류 발생:", error);
    throw new Error(`Gemini API로 번역에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}