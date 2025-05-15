/**
 * 음악 생성을 위한 가사 생성 서비스
 * 
 * Gemini API를 사용하여 사용자 입력에 기반한 가사를 생성합니다.
 */

import { generateLyrics as geminiGenerateLyrics, generateMusicPrompt } from './gemini-lyrics-service';

/**
 * 아기 이름과 스타일을 기반으로 가사 생성
 */
export async function generateLyrics(babyName: string, style: string): Promise<{
  lyrics: string;
  englishLyrics?: string;
  musicPrompt?: string;
}> {
  try {
    console.log(`lyrics-service: "${babyName}" 이름과 "${style}" 스타일로 가사 생성 시작`);
    
    // Gemini API를 사용한 가사 생성
    const prompt = `아기 ${babyName}를 위한 ${style} 스타일의 자장가나 태교 음악`;
    
    const lyricsRequestData = {
      prompt,
      genre: style,
      mood: "편안하고 따뜻한",
      language: "korean",
      targetLength: 200
    };
    
    // 가사 생성
    const lyrics = await geminiGenerateLyrics(lyricsRequestData);
    console.log(`lyrics-service: 가사 생성 완료 (${lyrics.length}자)`);
    
    // 음악 생성 프롬프트 생성
    const musicPrompt = await generateMusicPrompt(prompt, lyrics, style);
    console.log(`lyrics-service: 음악 프롬프트 생성 완료 (${musicPrompt.length}자)`);
    
    return {
      lyrics,
      musicPrompt
    };
  } catch (error) {
    console.error("lyrics-service: 가사 생성 중 오류 발생", error);
    throw new Error(`가사 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}