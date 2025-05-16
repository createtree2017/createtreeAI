/**
 * AI 음성 합성 서비스 (TTS)
 * Bark TTS 모델을 사용하여 텍스트를 자연스러운 음성으로 변환
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
    console.warn('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다. TTS 기능이 제한됩니다.');
  }
} catch (error) {
  console.error('Replicate 클라이언트 초기화 중 오류가 발생했습니다:', error);
}

/**
 * 텍스트를 AI 음성으로 합성
 * @param lyrics 합성할 텍스트(가사)
 * @param gender 음성 성별 옵션 ('male_kr' 또는 'female_kr')
 * @returns 생성된 오디오의 ArrayBuffer 또는 URL
 */
export async function synthesizeAi(
  lyrics: string, 
  gender: 'male_kr' | 'female_kr' = 'female_kr'
): Promise<ArrayBuffer | string> {
  // Replicate 클라이언트가 초기화되지 않은 경우
  if (!replicateClient) {
    console.warn('Replicate 클라이언트가 초기화되지 않았습니다. 샘플 음성을 반환합니다.');
    return getSampleVoiceUrl();
  }

  try {
    console.log(`TTS 합성 시작 - 텍스트 길이: ${lyrics.length}자, 성별: ${gender}`);

    // Suno의 Bark 모델을 사용하여 TTS 생성
    const output: any = await replicateClient.run(
      'suno/bark', 
      { 
        input: { 
          text: lyrics,
          speaker_id: gender 
        } 
      }
    );

    // 모델 응답에서 오디오 URL 추출
    const audioUrl = output?.audio || output?.[0];
    
    if (!audioUrl) {
      console.error('Bark 모델이 유효한 오디오 URL을 반환하지 않았습니다:', output);
      return getSampleVoiceUrl();
    }

    console.log(`TTS 합성 완료 - URL: ${audioUrl}`);

    // 오디오 다운로드
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`음성 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;
    } catch (downloadError) {
      console.error('음성 다운로드 중 오류:', downloadError);
      // 다운로드 실패 시 URL 반환
      return audioUrl;
    }
  } catch (error) {
    console.error('TTS 합성 중 오류가 발생했습니다:', error);
    return getSampleVoiceUrl();
  }
}

/**
 * 샘플 음성 URL 반환 (API 실패 시 폴백용)
 * @returns 샘플 음성 URL
 */
function getSampleVoiceUrl(): string {
  // 기본 샘플 음성 URL
  return 'https://storage.googleapis.com/download.tensorflow.org/data/speech_commands_v0.01/yes.wav';
}

// 모듈 초기화 시 로그
console.log(`TTS 서비스가 ${replicateClient ? '정상적으로' : '제한된 모드로'} 초기화되었습니다.`);