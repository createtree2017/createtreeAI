/**
 * AI 음성 합성 서비스 (TTS)
 * Bark TTS 모델을 사용하여 텍스트를 자연스러운 음성으로 변환
 */
import Replicate from 'replicate';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

// Replicate API 키 확인
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.');
}

// Replicate 클라이언트 초기화
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

/**
 * 텍스트를 AI 음성으로 합성
 * @param lyrics 합성할 텍스트(가사)
 * @param gender 음성 성별 옵션 ('male_kr' 또는 'female_kr')
 * @returns 생성된 오디오의 ArrayBuffer 또는 URL
 */
export async function synthesizeAi(
  lyrics: string,
  gender: 'male_kr' | 'female_kr' = 'female_kr'
): Promise<Buffer | ArrayBuffer> {
  try {
    console.log('Bark TTS 음성 합성 시작:', { gender, lyricsLength: lyrics.length });
    
    // 가사가 비어있는 경우 처리
    if (!lyrics || lyrics.trim() === '') {
      lyrics = '안녕하세요. 이 노래를 들어주셔서 감사합니다.';
    }
    
    // 가사가 너무 긴 경우 처리 (Bark 모델은 일정 길이 이상 처리 불가)
    const MAX_LENGTH = 400;
    if (lyrics.length > MAX_LENGTH) {
      console.warn(`가사가 너무 깁니다. ${lyrics.length}자 -> ${MAX_LENGTH}자로 축소합니다.`);
      lyrics = lyrics.substring(0, MAX_LENGTH) + '...';
    }
    
    // Replicate API가 없는 경우 샘플 반환
    if (!replicate) {
      console.warn('Replicate API 토큰이 없어 샘플 음성을 반환합니다.');
      return getSampleVoiceUrl();
    }
    
    // 한국어 여성 음성용 스피커 ID
    const femaleKrSpeakerId = 'v2/ko_female'
    
    // 한국어 남성 음성용 스피커 ID
    const maleKrSpeakerId = 'v2/ko_male'
    
    // 선택한 성별에 맞는 스피커 ID 사용
    const speakerId = gender === 'male_kr' ? maleKrSpeakerId : femaleKrSpeakerId;
    
    // Bark TTS 모델 실행
    const output = await replicate.run(
      "suno/bark:b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787",
      {
        input: {
          prompt: lyrics,
          speaker: speakerId,
          language: "ko", // 한국어
          audio_out_bitrate: "128k",
          temperature: 0.7,
          silent_beginning_in_sec: 0.1
        }
      }
    );
    
    // 결과 URL 확인
    if (!output || !output.audio_url || typeof output.audio_url !== 'string') {
      throw new Error('음성 합성에 실패했습니다: 유효한 출력이 없습니다.');
    }
    
    console.log('Bark TTS 음성 합성 완료, URL:', output.audio_url);
    
    // 원격 URL에서 파일 다운로드
    const response = await fetch(output.audio_url);
    if (!response.ok) {
      throw new Error(`음성 다운로드에 실패했습니다: ${response.status} ${response.statusText}`);
    }
    
    // 응답을 ArrayBuffer로 변환
    const buffer = await response.arrayBuffer();
    
    return buffer;
  } catch (error) {
    console.error('Bark TTS 음성 합성 중 오류가 발생했습니다:', error);
    // 오류 발생 시 샘플 반환
    console.warn('오류로 인해 샘플 음성을 반환합니다.');
    return getSampleVoiceUrl();
  }
}

/**
 * 샘플 음성 URL 반환 (API 실패 시 폴백용)
 * @returns 샘플 음성 URL
 */
async function getSampleVoiceUrl(): Promise<Buffer> {
  try {
    // 내장된 샘플 음성 파일 경로
    const samplePath = path.join(process.cwd(), 'static', 'samples', 'sample-voice.mp3');
    return await fs.readFile(samplePath);
  } catch (error) {
    console.error('샘플 음성 파일 읽기 실패:', error);
    throw new Error('음성 합성 및 샘플 음성 로딩에 모두 실패했습니다.');
  }
}