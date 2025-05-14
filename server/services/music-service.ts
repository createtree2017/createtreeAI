import Replicate from 'replicate';
import { OpenAI } from 'openai';
import { z } from 'zod';

// API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string,
});

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY as string 
});

// 스타일 태그 목록 (허용된 태그들)
export const ALLOWED_MUSIC_STYLES = [
  'nursery',
  'lullaby',
  'soft piano',
  'motherly',
  'gentle',
  'calm',
  'soothing',
  'classical',
  'orchestral',
  '자장가',
  '태교',
  '클래식',
  '피아노',
];

// 음악 생성 요청 검증 스키마
export const createSongSchema = z.object({
  prompt: z.string().min(3, "프롬프트는 최소 3자 이상이어야 합니다"),
  tags: z.array(z.string()).optional().default([]),
  lyrics: z.string().optional(),
  instrumental: z.boolean().optional().default(false),
});

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
      model: "gpt-4o", // 최신 GPT 모델 사용
      messages: [
        {
          role: "system",
          content: "You are a Korean to English translator. Translate the given Korean text to English. Keep the original meaning intact."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3, // 낮은 온도로 일관된 번역 결과
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error('번역 오류:', error);
    return text; // 오류 발생시 원본 텍스트 반환
  }
}

/**
 * OpenAI를 사용하여 가사 생성하기
 */
export async function generateLyrics(prompt: string): Promise<string> {
  try {
    const translatedPrompt = await translateToEnglish(prompt);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are a lyric writer specializing in lullabies and children's songs. " +
                   "Create short, gentle lyrics suitable for babies and young children. " +
                   "Keep the lyrics 4-8 lines, with a soothing, calm tone. " +
                   "The lyrics should be loving, positive, and simple."
        },
        {
          role: "user",
          content: `Write lyrics for a song based on this prompt: ${translatedPrompt}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error('가사 생성 오류:', error);
    throw new Error("가사를 생성하는데 실패했습니다");
  }
}

/**
 * Replicate API를 사용하여 음악 생성하기
 */
export async function generateMusic(data: CreateSongRequest): Promise<SongGenerationResult> {
  try {
    // 태그 검증 (보안을 위해 허용된 태그만 사용)
    const validatedTags = data.tags.filter(tag => 
      ALLOWED_MUSIC_STYLES.includes(tag) || 
      ALLOWED_MUSIC_STYLES.some(style => tag.toLowerCase().includes(style.toLowerCase()))
    );

    // 한국어 감지 후 번역 (간단한 감지 방식)
    const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
    let finalPrompt = data.prompt;
    let translatedPrompt;

    if (koreanRegex.test(data.prompt)) {
      translatedPrompt = await translateToEnglish(data.prompt);
      finalPrompt = translatedPrompt;
    }

    // 가사가 있고 한국어라면 번역
    let translatedLyrics;
    if (data.lyrics && koreanRegex.test(data.lyrics)) {
      translatedLyrics = await translateToEnglish(data.lyrics);
    }

    // 최종 프롬프트 구성
    let musicPrompt = finalPrompt;
    if (validatedTags.length > 0) {
      musicPrompt += `. Style: ${validatedTags.join(', ')}`;
    }
    
    if (data.instrumental) {
      musicPrompt += ". Instrumental only, no vocals.";
    } else if (translatedLyrics || data.lyrics) {
      musicPrompt += `. Lyrics: ${translatedLyrics || data.lyrics}`;
    }

    // Replicate API 호출
    // 여기서는 riffusion/riffusion 모델을 사용하나 다른 음악 생성 모델로 변경 가능
    const output = await replicate.run(
      "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
      {
        input: {
          prompt_a: musicPrompt,
          prompt_b: "",
          alpha: 0.5,
          num_inference_steps: 50
        }
      }
    );

    // 결과 처리 및 반환
    if (!output || !output.audio) {
      throw new Error("음악 생성 결과가 없습니다");
    }

    return {
      audioUrl: output.audio as string,
      prompt: data.prompt,
      translatedPrompt,
      tags: validatedTags,
      instrumental: !!data.instrumental,
      lyrics: data.lyrics
    };
  } catch (error) {
    console.error('음악 생성 오류:', error);
    throw new Error("음악 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}