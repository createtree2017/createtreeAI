/**
 * MusicGen 음악 생성 서비스
 * Facebook의 MusicGen 모델을 사용하여 텍스트 프롬프트 기반 음악 생성
 */
import Replicate from 'replicate';

// Replicate 클라이언트 설정
let replicateClient: Replicate | null = null;

try {
  if (process.env.REPLICATE_API_TOKEN) {
    replicateClient = new Replicate({ 
      auth: process.env.REPLICATE_API_TOKEN 
    });
    console.log('Replicate 클라이언트가 성공적으로 초기화되었습니다.');
  } else {
    console.warn('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다. 음악 생성 기능이 제한됩니다.');
  }
} catch (error) {
  console.error('Replicate 클라이언트 초기화 중 오류가 발생했습니다:', error);
}

/**
 * 텍스트 프롬프트 기반 음악 생성
 * @param prompt 음악 생성 프롬프트
 * @param duration 음악 길이(초)
 * @returns 생성된 음악의 ArrayBuffer 또는 URL
 */
export async function generateMusic(prompt: string, duration: number = 30): Promise<ArrayBuffer | string> {
  // Replicate 클라이언트가 초기화되지 않은 경우
  if (!replicateClient) {
    console.warn('Replicate 클라이언트가 초기화되지 않았습니다. 샘플 음악을 반환합니다.');
    return getSampleMusicUrl();
  }

  try {
    console.log(`음악 생성 시작 - 프롬프트: "${prompt}", 길이: ${duration}초`);

    // Facebook의 MusicGen 모델을 사용하여 음악 생성
    const output: any = await replicateClient.run(
      'facebook/musicgen-large', 
      { 
        input: { 
          prompt: prompt,
          duration: duration 
        } 
      }
    );

    // 모델 응답에서 음악 URL 추출
    const audioUrl = output?.audio || output?.[0];
    
    if (!audioUrl) {
      console.error('MusicGen 모델이 유효한 오디오 URL을 반환하지 않았습니다:', output);
      return getSampleMusicUrl();
    }

    console.log(`음악 생성 완료 - URL: ${audioUrl}`);

    // 오디오 다운로드
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`음악 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;
    } catch (downloadError) {
      console.error('음악 다운로드 중 오류:', downloadError);
      // 다운로드 실패 시 URL 반환
      return audioUrl;
    }
  } catch (error) {
    console.error('음악 생성 중 오류가 발생했습니다:', error);
    return getSampleMusicUrl();
  }
}

/**
 * 샘플 음악 URL 반환 (API 실패 시 폴백용)
 * @returns 샘플 음악 URL
 */
function getSampleMusicUrl(): string {
  // 기본 샘플 음악 URL
  return 'https://storage.googleapis.com/magentadata/datasets/maestro/v3.0.0/2018/MIDI-Unprocessed_Chamber3_MID--AUDIO_10_R3_2018_wav--1.wav';
}

// 모듈 초기화 시 로그
console.log(`MusicGen 서비스가 ${replicateClient ? '정상적으로' : '제한된 모드로'} 초기화되었습니다.`);