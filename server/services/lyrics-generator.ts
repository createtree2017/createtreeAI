/**
 * 가사 생성 서비스
 * OpenAI GPT를 활용하여 음악 가사를 자동 생성합니다.
 */
// @azure/openai 패키지 대신 공식 OpenAI 패키지만 사용
import { OpenAI } from 'openai';

// OpenAI 클라이언트 설정
let openaiClient: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.warn("OpenAI API 키가 설정되지 않았습니다. 가사 생성 기능이 제한됩니다.");
}

// 가사 생성 옵션 타입
export interface LyricsGenerationOptions {
  prompt: string;
  style?: string;
  length?: number;
  includeChorus?: boolean;
}

/**
 * 프롬프트 기반 가사 생성
 * @param options 가사 생성 옵션
 * @returns 생성된 가사 텍스트
 */
export async function generateLyrics(options: LyricsGenerationOptions): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI API 클라이언트가 초기화되지 않았습니다. API 키를 확인해주세요.");
  }

  const { prompt, style = "", length = 4, includeChorus = true } = options;
  
  // 기본 시스템 메시지
  let systemMessage = `당신은 창의적인 음악 작사가입니다. 주어진 주제와 스타일에 맞는 한국어 가사를 작성해주세요.
주요 요구사항:
- 모든 가사는 순수 한국어로 작성하세요.
- 자연스럽고 운율이 있는 가사를 작성하세요.
- 가사는 verse와 chorus 섹션을 구분하여 작성하고, 각 섹션 앞에 [verse], [chorus] 등의 태그를 붙여주세요.
- 총 ${length}개의 verse와 ${includeChorus ? "1개의 chorus" : "chorus 없음"}을 작성해주세요.`;

  if (style) {
    systemMessage += `\n- '${style}' 스타일에 맞는 가사를 작성해주세요.`;
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o", // 최신 모델 사용
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: `다음 주제로 가사를 작성해주세요: "${prompt}"`
        }
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const generatedLyrics = response.choices[0]?.message?.content || "가사 생성에 실패했습니다.";
    return generatedLyrics;
  } catch (error) {
    console.error("가사 생성 API 호출 중 오류 발생:", error);
    throw new Error(`가사 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 가사를 음악 생성에 적합한 형식으로 포맷팅
 * @param lyrics 원본 가사
 * @returns 포맷팅된 가사
 */
export function formatLyrics(lyrics: string): string {
  // 특수 문자 제거 및 태그 정렬
  return lyrics
    .replace(/^\s+/gm, '') // 각 줄 시작 부분의 공백 제거
    .replace(/\n{3,}/g, '\n\n') // 여러 줄 개행을 두 줄로 통일
    .trim();
}