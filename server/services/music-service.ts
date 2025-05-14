import Replicate from "replicate";
import { z } from "zod";
// OpenAI 관련 코드는 필요한 경우 추가할 예정

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
    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a translation assistant. Translate the Korean text into English accurately."
        },
        {
          role: "user",
          content: `Translate the following Korean text to English:\n\n${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return response.choices[0].message.content?.trim() || text;
  } catch (error) {
    console.error("번역 중 오류 발생:", error);
    return text; // 오류 발생 시 원본 텍스트 반환
  }
}

/**
 * OpenAI를 사용하여 가사 생성하기
 */
export async function generateLyrics(prompt: string): Promise<string> {
  try {
    // 한국어 프롬프트인 경우 영어로 번역
    const translatedPrompt = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(prompt) 
      ? await translateToEnglish(prompt)
      : prompt;

    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a talented songwriter specializing in lullabies and gentle songs for babies and expecting mothers. 
          Create beautiful, soothing lyrics that capture the essence of parental love and the beauty of new life.
          Keep the lyrics appropriate for the context, using gentle and reassuring language.
          The song should have a verse-chorus structure with 2-3 verses and a repeating chorus.
          Write the lyrics in both Korean and English, with the Korean version first.`
        },
        {
          role: "user",
          content: `I need lyrics for a song based on this concept: ${translatedPrompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    return response.choices[0].message.content?.trim() || "";
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
      prompt = translatedPrompt; // 번역된 프롬프트로 대체
    }
    
    // 스타일 키워드 추가
    if (data.style) {
      prompt = `${prompt}, style: ${data.style}`;
    }
    
    // Replicate API를 통한 음악 생성
    // MusicGen Melody 모델 사용 - 고품질 음악 생성
    const output = await replicate.run(
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
    
    // 출력 결과에서 오디오 URL 추출
    const audioUrl = output.audio as string;
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
      lyrics = await generateLyrics(data.prompt);
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