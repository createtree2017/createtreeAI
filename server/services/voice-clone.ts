/**
 * 사용자 음성 클론 서비스
 * 사용자가 제공한 음성 샘플을 기반으로 새로운 텍스트를 같은 목소리로 합성
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
    console.warn('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다. 음성 클론 기능이 제한됩니다.');
  }
} catch (error) {
  console.error('Replicate 클라이언트 초기화 중 오류가 발생했습니다:', error);
}

/**
 * 사용자 음성 클론 생성
 * @param sample 사용자의 음성 샘플 (Buffer 형태)
 * @param text 합성할 텍스트
 * @returns 생성된 오디오의 ArrayBuffer 또는 URL
 */
export async function cloneVoice(
  sample: Buffer,
  text: string
): Promise<ArrayBuffer | string> {
  // Replicate 클라이언트가 초기화되지 않은 경우
  if (!replicateClient) {
    console.warn('Replicate 클라이언트가 초기화되지 않았습니다. 기본 음성을 반환합니다.');
    return getSampleVoiceUrl();
  }

  if (!process.env.VOICE_CLONE_KEY) {
    console.warn('VOICE_CLONE_KEY 환경 변수가 설정되지 않았습니다. 음성 클론 API를 사용할 수 없습니다.');
    return getSampleVoiceUrl();
  }

  try {
    console.log(`음성 클론 시작 - 샘플 크기: ${sample.length} 바이트, 텍스트 길이: ${text.length}자`);

    // 음성 클론 API 호출
    // 참고: 실제 API 규격에 맞게 수정 필요
    const formData = new FormData();
    const sampleBlob = new Blob([sample], { type: 'audio/wav' });
    
    formData.append('audio_sample', sampleBlob);
    formData.append('text', text);

    const response = await fetch('https://api.clone-voice.io/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOICE_CLONE_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`음성 클론 API 오류: ${response.status} ${response.statusText}`);
    }

    // 응답 처리
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('음성 클론 생성 완료');
    
    return arrayBuffer;
  } catch (error) {
    console.error('음성 클론 중 오류가 발생했습니다:', error);
    
    // 대체 방법: Replicate의 voice cloning 모델 사용
    try {
      console.log('대안적인 방법으로 Replicate를 통한 음성 클론 시도');
      
      // 샘플 오디오를 base64로 인코딩
      const sampleBase64 = sample.toString('base64');
      
      // Replicate API를 통한 음성 클론 모델 호출
      const output: any = await replicateClient.run(
        'lucataco/xtts-v2', 
        { 
          input: { 
            text: text,
            audio_data: sampleBase64
          } 
        }
      );

      // 모델 응답에서 오디오 URL 추출
      const audioUrl = output?.audio || output?.[0];
      
      if (!audioUrl) {
        throw new Error('음성 클론 모델이 유효한 응답을 반환하지 않았습니다');
      }

      // 오디오 다운로드
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`음성 다운로드 실패: ${audioResponse.status}`);
      }
      
      return await audioResponse.arrayBuffer();
    } catch (fallbackError) {
      console.error('대체 음성 클론 방법도 실패했습니다:', fallbackError);
      return getSampleVoiceUrl();
    }
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
console.log(`음성 클론 서비스가 ${replicateClient && process.env.VOICE_CLONE_KEY ? '정상적으로' : '제한된 모드로'} 초기화되었습니다.`);