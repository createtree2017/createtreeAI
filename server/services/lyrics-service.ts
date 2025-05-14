/**
 * 음악 가사 생성 서비스
 * OpenAI API를 사용하여 음악 가사를 생성하는 기능
 */

import { z } from "zod";
// 타입스크립트 @ts-ignore 주석을 사용하여 오류 무시
// @ts-ignore
import OpenAI from 'openai';

// OpenAI 클라이언트를 직접 초기화
let openai: any = null;
try {
  // OpenAI API 키가 있는 경우에만 초기화
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log("OpenAI 클라이언트가 성공적으로 초기화되었습니다.");
  } else {
    console.log("OPENAI_API_KEY가 설정되지 않았습니다 - 임시 모드로 작동");
  }
} catch (error: any) {
  console.error("OpenAI 클라이언트 초기화 중 오류:", error.message);
  console.log("OpenAI 클라이언트 생성을 건너뜁니다 - 임시 모드로 작동");
}

// 가사 생성 요청 스키마
export const generateLyricsSchema = z.object({
  prompt: z.string().min(1, "프롬프트는 최소 1자 이상이어야 합니다."),
  genre: z.string().optional(),
  mood: z.string().optional(),
  language: z.string().default("korean"),
});

export type GenerateLyricsRequest = z.infer<typeof generateLyricsSchema>;

/**
 * 프롬프트 기반으로 음악 가사 생성
 * @param data 가사 생성 요청 데이터
 * @returns 생성된 가사
 */
export async function generateLyrics(data: GenerateLyricsRequest): Promise<string> {
  try {
    // OpenAI 클라이언트가 초기화되지 않은 경우
    if (!openai) {
      console.log("OpenAI 클라이언트가 초기화되지 않았습니다. 샘플 가사를 반환합니다.");
      return "가사 생성 서비스 준비 중입니다.\n잠시 후 다시 시도해주세요.";
    }

    const { prompt, genre, mood, language } = data;
    
    // 프롬프트 구성
    let fullPrompt = `아이를 위한 음악 가사를 작성해주세요. 프롬프트: ${prompt}`;
    
    if (genre) {
      fullPrompt += `\n장르: ${genre}`;
    }
    
    if (mood) {
      fullPrompt += `\n분위기: ${mood}`;
    }
    
    // 언어 설정 추가
    if (language === "english") {
      fullPrompt += "\n영어로 가사를 작성해주세요.";
    } else {
      fullPrompt += "\n한국어로 가사를 작성해주세요.";
    }
    
    fullPrompt += "\n\n가사는 다음과 같은 형식으로 작성해주세요:\n- 각 절은 명확하게 구분되어야 합니다.\n- 후렴구가 있어야 합니다.\n- 전체 길이는 약 4-5절 정도가 적당합니다.\n- 간단하고 듣기 쉬운 단어를 사용하세요.";

    // OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 최신 모델 사용
      messages: [
        { 
          role: "system", 
          content: "당신은 아이들을 위한 노래 가사를 작성하는 전문가입니다. 감성적이고 따뜻한 가사를 작성해주세요."
        },
        { role: "user", content: fullPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content || "가사 생성에 실패했습니다.";
  } catch (error: any) {
    console.error("가사 생성 중 오류 발생:", error.message);
    
    // 상세 에러 로깅
    if (error.response) {
      console.error("API 응답 오류:", JSON.stringify(error.response.data, null, 2));
    }
    
    throw new Error(`가사 생성 실패: ${error.message}`);
  }
}

/**
 * 텍스트 번역 함수
 * @param text 번역할 텍스트
 * @param targetLanguage 목표 언어
 * @returns 번역된 텍스트
 */
export async function translateText(text: string, targetLanguage: string = "english"): Promise<string> {
  try {
    if (!openai) {
      console.log("OpenAI 클라이언트가 초기화되지 않았습니다. 원본 텍스트를 반환합니다.");
      return text;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `당신은 전문 번역가입니다. 제공된 텍스트를 ${targetLanguage === "english" ? "영어" : "한국어"}로 번역해주세요.` 
        },
        { role: "user", content: text }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    return response.choices[0].message.content || text;
  } catch (error: any) {
    console.error("텍스트 번역 중 오류 발생:", error.message);
    return text; // 오류 발생 시 원본 텍스트 반환
  }
}