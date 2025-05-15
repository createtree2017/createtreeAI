import Replicate from "replicate";
import { z } from "zod";
import { generateLyrics as generateLyricsFromService } from "./lyrics-service";
import { translateText } from "./gemini-lyrics-service";

// GenerateLyricsRequest 인터페이스 정의
export interface GenerateLyricsRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  language?: string;
  targetLength?: number;
}

// Replicate API 클라이언트 초기화
let replicate: any = null;
try {
  if (process.env.REPLICATE_API_TOKEN) {
    console.log("Replicate API 클라이언트 초기화 시작...");
    replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    console.log("Replicate API 클라이언트 초기화 성공");
  } else {
    console.warn("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
  }
} catch (error) {
  console.error("Replicate API 클라이언트 초기화 오류:", error);
}

// 음악 생성시 지원되는 스타일 목록
export const ALLOWED_MUSIC_STYLES = [
  "lullaby",
  "classical",
  "ambient",
  "relaxing",
  "piano",
  "orchestral",
  "korean-traditional",
  "nature-sounds",
  "meditation",
  "prenatal"
];

// 음악 생성 요청 스키마
export const createSongSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  prompt: z.string().min(3, "최소 3글자 이상의 프롬프트를 입력해주세요"),
  style: z.string().optional(),
  instrumental: z.boolean().default(false),
  translatePrompt: z.boolean().default(true)
});

// 서비스 관련 타입 선언
export type CreateSongRequest = z.infer<typeof createSongSchema>;

export interface SongGenerationResult {
  audioUrl: string;
  prompt: string;
  translatedPrompt?: string;
  tags: string[];
  instrumental: boolean;
  lyrics?: string;
  error?: string;
}

/**
 * 한국어 텍스트를 영어로 번역
 */
async function translateToEnglish(text: string): Promise<string> {
  try {
    // lyrics-service의 번역 기능 사용
    return await translateText(text, "english");
  } catch (error) {
    console.error("번역 중 오류 발생:", error);
    return text; // 오류 발생 시 원본 텍스트 반환
  }
}

/**
 * 가사 생성 서비스 호출하기
 */
export async function generateLyrics(prompt: string): Promise<string> {
  try {
    console.log(`music-service: "${prompt}" 프롬프트로 가사 생성 시작`);
    
    // 스타일은 기본값으로 자장가 사용
    const style = "자장가";
    
    // lyrics-service의 가사 생성 기능 호출
    const result = await generateLyricsFromService(prompt, style);
    
    if (result && result.lyrics) {
      console.log(`music-service: 가사 생성 완료 (${result.lyrics.length}자)`);
      return result.lyrics;
    } else {
      throw new Error("가사 생성 결과가 없습니다");
    }
  } catch (error) {
    console.error("가사 생성 중 오류 발생:", error);
    throw new Error(`가사 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Replicate API를 사용하여 음악 생성하기
 */
export async function generateMusic(data: CreateSongRequest): Promise<SongGenerationResult> {
  try {
    // Replicate API 클라이언트가 초기화되었는지 확인
    if (!replicate) {
      throw new Error("Replicate API 클라이언트가 초기화되지 않았습니다. API 키가 올바르게 설정되었는지 확인하세요.");
    }
    
    let prompt = data.prompt;
    let translatedPrompt: string | undefined;
    
    // 한국어 프롬프트인 경우 영어로 번역 (Replicate 모델이 영어 프롬프트에 더 최적화되어 있음)
    if (data.translatePrompt && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(prompt)) {
      try {
        translatedPrompt = await translateToEnglish(prompt);
        console.log(`원본 프롬프트: ${prompt}`);
        console.log(`번역된 프롬프트: ${translatedPrompt}`);
        prompt = translatedPrompt || prompt; // 번역된 프롬프트로 대체, 실패 시 원본 유지
      } catch (translateError) {
        console.error("번역 중 오류 발생, 원본 프롬프트 사용:", translateError);
        // 번역 오류 시 원본 유지
      }
    }
    
    // 스타일 키워드 추가
    if (data.style) {
      prompt = `${prompt}, style: ${data.style}`;
    }
    
    // 테스트 목적으로 더미 URL 반환하는 개발 모드 추가
    // 현재 Replicate API 모델 접근에 문제가 있어 개발 모드 강제 활성화
    const useDummyMusic = true; // 항상 더미 음악 사용하도록 수정
    if (useDummyMusic) {
      console.log("개발 모드: 더미 음악 URL 사용 (Replicate API 이슈로 인해 활성화)");
      
      // 기본 테스트용 음원 URL (외부 호스팅된 음원)
      const dummyAudioUrl = "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3";
      
      // 가사 생성 (instrumental이 false인 경우만)
      let lyrics: string | undefined;
      if (!data.instrumental) {
        try {
          // 개선된 lyrics 생성 기능 사용
          lyrics = await generateLyrics(data.prompt);
        } catch (lyricsError) {
          console.error("가사 생성 중 오류가 발생했지만 계속 진행합니다:", lyricsError);
          // 가사 생성 실패해도 음악 생성은 계속 진행
        }
      }
      
      // 태그 생성
      const tags = [
        ...(data.style ? [data.style] : []),
        "음악",
        "태교",
        "자장가"
      ];
      
      return {
        audioUrl: dummyAudioUrl,
        prompt: data.prompt,
        translatedPrompt,
        tags,
        instrumental: data.instrumental,
        lyrics
      };
    }
    
    // 오류 재시도 로직 추가 (3번 시도)
    let attempt = 1;
    let maxAttempts = 3;
    let output: any = null;
    let lastError: Error | null = null;
    
    while (attempt <= maxAttempts) {
      try {
        console.log(`음악 생성 시도 ${attempt}/${maxAttempts} - 프롬프트: "${prompt}"`);
        
        // Replicate API를 통한 음악 생성
        // MusicGen Melody 모델 사용 - 고품질 음악 생성
        output = await replicate.run(
          "meta/musicgen-melody:5e729892184e758ebf41e5064fc788a76fd56a92f836aa217791409f2244219c",
          {
            input: {
              prompt: prompt,
              duration: 30, // 기본 30초
              continuation: false,
              normalize: true,
              output_format: "mp3"
            }
          }
        );
        
        console.log("Replicate API 응답:", JSON.stringify(output, null, 2));
        break; // 성공하면 반복 중단
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`음악 생성 시도 ${attempt}/${maxAttempts} 실패:`, lastError.message);
        
        if (error instanceof Error && error.stack) {
          console.error("오류 스택:", error.stack);
        }
        
        if (attempt < maxAttempts) {
          // 백오프 지연 - 시도할 때마다 대기 시간 증가 (지수 백오프)
          const delay = Math.pow(2, attempt) * 1000; // 2초, 4초, 8초...
          console.log(`${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        attempt++;
      }
    }
    
    if (!output) {
      throw new Error(`${maxAttempts}번의 시도 후에도 음악 생성에 실패했습니다: ${lastError?.message || '알 수 없는 오류'}`);
    }
    
    // 출력 결과에서 오디오 URL 추출
    const audioUrl = output.audio;
    if (!audioUrl) {
      throw new Error("음악 생성에 실패했습니다. 오디오 URL을 받지 못했습니다.");
    }
    
    // 태그 생성 - 프롬프트에서 주요 키워드 추출
    const tags = [
      ...(data.style ? [data.style] : []),
      "음악",
      "태교",
      "자장가",
      ...(prompt.split(/[\s,]+/).filter(word => word.length > 2 && !["and", "the", "for", "with", "style"].includes(word.toLowerCase())).slice(0, 3))
    ];
    
    // 가사 생성 (instrumental이 false인 경우만)
    let lyrics: string | undefined;
    if (!data.instrumental) {
      try {
        // 개선된 lyrics 생성 기능 사용
        lyrics = await generateLyrics(data.prompt);
      } catch (lyricsError) {
        console.error("가사 생성 중 오류가 발생했지만 계속 진행합니다:", lyricsError);
        // 가사 생성 실패해도 음악 생성은 계속 진행
      }
    }
    
    return {
      audioUrl,
      prompt: data.prompt,
      translatedPrompt,
      tags,
      instrumental: data.instrumental,
      lyrics
    };
  } catch (error) {
    console.error("음악 생성 중 오류 발생:", error);
    // 스택 트레이스도 로깅
    if (error instanceof Error && error.stack) {
      console.error("오류 스택:", error.stack);
    }
    throw new Error(`음악 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}