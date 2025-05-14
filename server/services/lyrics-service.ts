/**
 * 음악 가사 생성 서비스
 * OpenAI API를 사용하여 음악 가사를 생성하는 기능
 */

import { z } from "zod";
// @ts-ignore - 타입 선언 파일 없음 오류 무시
import OpenAI from 'openai';

// OpenAI API 키 및 프로젝트 ID
const API_KEY = process.env.OPENAI_API_KEY;

// OpenAI 클라이언트 인스턴스 생성 및 상태 관리
let openai: any = null;
let isOpenAIAvailable = false;

// API 키 유효성 검증 함수
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// API 키가 있는지 확인하고 OpenAI 클라이언트 초기화
try {
  if (API_KEY && isValidApiKey(API_KEY)) {
    console.log("OpenAI 클라이언트 초기화 시작");
    
    // 이미지 생성 서비스와 동일하게 단순화된 방식으로 초기화
    openai = new OpenAI({
      apiKey: API_KEY,
    });
    
    isOpenAIAvailable = true;
    
    console.log("OpenAI 클라이언트가 성공적으로 초기화되었습니다.");
    console.log("API 키 유형:", API_KEY.startsWith('sk-proj-') ? "Project Key" : "Standard Key");
  } else {
    console.log("OPENAI_API_KEY가 설정되지 않았거나 유효하지 않습니다. API 키를 확인해주세요.");
  }
} catch (error: any) {
  console.error("OpenAI 클라이언트 초기화 중 오류 발생:", error.message);
  if (error.stack) {
    console.error("오류 스택:", error.stack);
  }
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
    // OpenAI를 사용할 수 없는 경우
    if (!isOpenAIAvailable || !openai) {
      console.log("OpenAI 클라이언트가 초기화되지 않았습니다.");
      return "가사 생성 서비스를 사용할 수 없습니다. API 키를 확인해주세요.";
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

    try {
      console.log("OpenAI API 호출 시작 - 가사 생성");
      
      // 이미지 생성 서비스에서 성공적으로 사용 중인 직접 fetch API 호출 방식 사용
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
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
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }
      
      const responseData = await response.json();

      console.log("OpenAI API 호출 성공 - 가사 생성 완료");
      
      if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
        return responseData.choices[0].message.content || "가사 생성에 실패했습니다.";
      } else {
        console.error("OpenAI API 응답 형식 오류:", responseData);
        return "API 응답 형식 오류로 가사 생성에 실패했습니다.";
      }
    } catch (apiError: any) {
      console.error("OpenAI API 호출 중 오류:", apiError.message);
      
      // 상세 에러 로깅
      if (apiError.response) {
        console.error("API 응답 오류:", JSON.stringify(apiError.response.data, null, 2));
      }
      
      // 스택 트레이스 로깅
      if (apiError.stack) {
        console.error("API 오류 스택:", apiError.stack);
      }
      
      return `OpenAI API 오류: ${apiError.message}`;
    }
  } catch (error: any) {
    console.error("가사 생성 중 오류 발생:", error.message);
    console.error("오류 스택:", error.stack);
    return `가사 생성 실패: ${error.message}`;
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
    // OpenAI를 사용할 수 없는 경우
    if (!isOpenAIAvailable || !openai) {
      console.log("OpenAI 클라이언트가 초기화되지 않았습니다. 원본 텍스트를 반환합니다.");
      return text;
    }

    try {
      console.log("OpenAI API 호출 시작 - 텍스트 번역");
      
      // 이미지 생성 서비스에서 성공적으로 사용 중인 직접 fetch API 호출 방식 사용
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
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
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
      }
      
      const responseData = await response.json();
      
      console.log("OpenAI API 호출 성공 - 텍스트 번역 완료");

      if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
        return responseData.choices[0].message.content || text;
      } else {
        console.error("OpenAI API 응답 형식 오류:", responseData);
        return text;
      }
    } catch (apiError: any) {
      console.error("OpenAI API 번역 호출 중 오류:", apiError.message);
      
      // 상세 에러 로깅
      if (apiError.response) {
        console.error("API 응답 오류:", JSON.stringify(apiError.response.data, null, 2));
      }
      
      // 스택 트레이스 로깅
      if (apiError.stack) {
        console.error("API 오류 스택:", apiError.stack);
      }
      
      return text; // API 오류 시 원본 텍스트 반환
    }
  } catch (error: any) {
    console.error("텍스트 번역 중 오류 발생:", error.message);
    console.error("오류 스택:", error.stack);
    return text; // 오류 발생 시 원본 텍스트 반환
  }
}