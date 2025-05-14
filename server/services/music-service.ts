import Replicate from "replicate";
import { z } from "zod";
import { generateLyrics as generateLyricsFromService, translateText, GenerateLyricsRequest } from "./lyrics-service";

// Replicate API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
    // lyrics-service의 가사 생성 기능 사용
    return await generateLyricsFromService({
      prompt,
      genre: "lullaby",
      mood: "soothing",
      language: "korean"
    });
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
    let prompt = data.prompt;
    let translatedPrompt: string | undefined;
    
    // 한국어 프롬프트인 경우 영어로 번역 (Replicate 모델이 영어 프롬프트에 더 최적화되어 있음)
    if (data.translatePrompt && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(prompt)) {
      translatedPrompt = await translateToEnglish(prompt);
      console.log(`원본 프롬프트: ${prompt}`);
      console.log(`번역된 프롬프트: ${translatedPrompt}`);
      prompt = translatedPrompt || prompt; // 번역된 프롬프트로 대체, 실패 시 원본 유지
    }
    
    // 스타일 키워드 추가
    if (data.style) {
      prompt = `${prompt}, style: ${data.style}`;
    }
    
    // 오류 재시도 로직 추가 (3번 시도)
    let attempt = 1;
    let maxAttempts = 3;
    let output: any = null;
    let lastError: Error | null = null;
    
    while (attempt <= maxAttempts) {
      try {
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
        break; // 성공하면 반복 중단
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`음악 생성 시도 ${attempt}/${maxAttempts} 실패:`, lastError.message);
        
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
        // 개선된 lyrics-service를 사용하여 가사 생성
        const lyricsRequest: GenerateLyricsRequest = {
          prompt: data.prompt,
          genre: data.style || "lullaby",
          mood: "soothing",
          language: "korean"
        };
        lyrics = await generateLyricsFromService(lyricsRequest);
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
    throw new Error(`음악 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}