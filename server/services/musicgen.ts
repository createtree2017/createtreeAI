/**
 * MusicGen 서비스
 * Replicate API의 MusicGen 모델을 사용하여 배경 음악을 생성
 */
import Replicate from 'replicate';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

// Replicate API 키 확인
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.');
}

// Replicate 클라이언트 초기화
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

/**
 * MusicGen 모델을 사용하여 배경 음악 생성
 * @param prompt 음악 생성을 위한 프롬프트 (스타일 설명)
 * @param duration 음악 길이(초), 60-240초 사이 값
 * @returns 생성된 음악의 Buffer 또는 ArrayBuffer
 */
export async function generateMusic(prompt: string, duration: number = 60): Promise<Buffer | ArrayBuffer> {
  try {
    console.log('MusicGen으로 음악 생성 시작:', prompt);
    
    // 공백 프롬프트 처리
    if (!prompt || prompt.trim() === '') {
      prompt = '편안한 피아노 멜로디와 잔잔한 오케스트라가 있는 자장가';
    }
    
    // Replicate API가 없는 경우 샘플 반환
    if (!replicate) {
      console.warn('Replicate API 토큰이 없어 샘플 음악을 반환합니다.');
      return getSampleMusic();
    }
    
    // MusicGen 모델 실행 - 더 안정적인 모델 사용
    // 받은 duration 파라미터를 사용(60~240초 사이)
    const validDuration = Math.min(Math.max(duration, 60), 240);
    console.log(`MusicGen 모델에 전달되는 음악 길이: ${validDuration}초`);
    
    // Replicate API가 정상 동작하는지 로그 출력
    console.log(`Replicate API 토큰 상태: ${process.env.REPLICATE_API_TOKEN ? '설정됨' : '미설정'}`);
    
    // 간단한 모델로 테스트
    try {
      // 음악 생성이 실패하는 경우를 위한 안전장치: 샘플 음악 반환
      if (process.env.USE_SAMPLE_MUSIC === 'true') {
        console.log('환경 변수에 의해 샘플 음악을 사용합니다.');
        return await getSampleMusic();
      }
      
      // 사용자 입력에서 음악 스타일 정보 추출
      const musicStyle = prompt.toLowerCase().includes('lullaby') ? 'lullaby' : 
                        prompt.toLowerCase().includes('classical') ? 'classical' : 'lullaby';
      
      // 음악 생성 프롬프트 개선
      const enhancedPrompt = `Create a ${validDuration} second ${musicStyle} music for babies. Details: ${prompt}`;
      
      console.log(`Replicate API 호출 - 음악 생성 프롬프트: ${enhancedPrompt}`);
      
      // 테스트용 - API 호출 시간 제한 설정
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API 호출 시간 초과')), 30000); // 30초 제한
      });
      
      // 음악 생성 API 호출 - 음악 생성 전용 모델 사용
      // 입력 파라미터 로깅
      const inputParams = {
        model: "melody",
        prompt: enhancedPrompt,
        duration: validDuration,
        output_format: "mp3",
        temperature: 1,
        top_k: 250,
        top_p: 0.99,
        classifier_free_guidance: 3
      };
      
      console.log('[Replicate API] 입력 파라미터:', JSON.stringify(inputParams, null, 2));
      console.log('[Replicate API] 호출 모델: metacomp/musicgen-v0.1:49a3ac32438e86f8e5016b8a4e44d9b8c6875f2e6898e4eb44132001445fa96e');
      
      // API 호출 시작 시간 기록
      const apiStartTime = Date.now();
      
      const apiPromise = replicate.run(
        "metacomp/musicgen-v0.1:49a3ac32438e86f8e5016b8a4e44d9b8c6875f2e6898e4eb44132001445fa96e",
        {
          input: inputParams
        }
      );
      
      // API 호출 또는 타임아웃 기다리기
      let output;
      try {
        output = await Promise.race([apiPromise, timeoutPromise]);
        console.log(`[Replicate API] 응답 시간: ${Date.now() - apiStartTime}ms`);
      } catch (error) {
        console.error('[Replicate API] 호출 실패:', error);
        console.error('[Replicate API] 에러 상세:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        throw error;
      }
      
      // 응답 상세 로깅 (작업지시서 요구사항)
      console.log('[Replicate API] 응답 전체:', JSON.stringify(output, null, 2));
      console.log('[Replicate API] 응답 타입:', typeof output);
      
      // 응답 형식 확인 및 URL 추출
      let audioUrl;
      if (typeof output === 'string') {
        // 문자열 URL 응답 (일부 모델)
        audioUrl = output;
        console.log('[Replicate API] 문자열 URL 응답:', audioUrl);
      } else if (output && typeof output === 'object') {
        // 객체 응답 검사 (metacomp/musicgen 모델)
        if (Array.isArray(output)) {
          // 배열인 경우 첫 번째 항목 사용
          audioUrl = output[0];
          console.log('[Replicate API] 배열 응답에서 첫 번째 항목 추출:', audioUrl);
        } else {
          // 객체인 경우 가능한 속성 확인
          // @ts-ignore - 객체 속성 동적 접근
          audioUrl = output.audio || output.output || output.url || Object.values(output)[0];
          console.log('[Replicate API] 객체 응답에서 오디오 URL 추출:', audioUrl);
        }
      }
      
      // URL을 얻지 못한 경우 (작업지시서 요구사항: 샘플 파일 반환)
      if (!audioUrl) {
        console.warn('[Replicate API] ⚠️ 오디오 URL 추출 실패, 샘플 파일 사용:');
        const samplePath = path.join(process.cwd(), 'static', 'samples', 'sample-music.mp3');
        console.log('[Replicate API] 샘플 파일 경로:', samplePath);
        return await getSampleMusic();
      }
      
      // 파일 다운로드
      console.log('[Replicate API] 최종 오디오 URL:', audioUrl);
      
      try {
        console.log('[음악 다운로드] 시작...');
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
          console.error(`[음악 다운로드] 실패: HTTP ${response.status} ${response.statusText}`);
          // 작업지시서 요구사항: API 또는 다운로드 실패 시 샘플 파일 반환
          return await getSampleMusic();
        }
        
        // 응답 헤더 로깅
        console.log('[음악 다운로드] 응답 헤더:', 
          Object.fromEntries([...response.headers.entries()]));
      
        // 응답을 Buffer로 변환
        const buffer = await response.arrayBuffer();
        const resultBuffer = Buffer.from(buffer);
        
        // 파일 크기 로깅
        console.log(`[음악 다운로드] 완료: ${resultBuffer.length} 바이트`);
        
        // 파일 크기가 너무 작으면 샘플 반환 (작업지시서 요구사항)
        if (resultBuffer.length < 10000) {
          console.warn(`[음악 다운로드] 파일 크기가 너무 작음(${resultBuffer.length} 바이트), 샘플 사용`);
          return await getSampleMusic();
        }
        
        return resultBuffer;
      } catch (downloadError) {
        console.error('[음악 다운로드] 오류:', downloadError);
        console.log('[음악 다운로드] 오류로 인해 샘플 파일 반환');
        // 작업지시서 요구사항: 오류 발생 시 샘플 파일 반환
        return await getSampleMusic();
      }
      
    } catch (apiError) {
      console.error('Replicate API 호출 실패:', apiError);
      console.log('API 오류로 인해 샘플 음악 반환');
      return await getSampleMusic();
    }
  } catch (error) {
    console.error('MusicGen 음악 생성 중 오류가 발생했습니다:', error);
    // 오류 발생 시 샘플 음악 반환
    console.warn('오류로 인해 샘플 음악을 반환합니다.');
    return getSampleMusic();
  }
}

/**
 * 샘플 음악 파일 반환 (API 실패 시 폴백용)
 * @returns 샘플 음악 Buffer
 */
async function getSampleMusic(): Promise<Buffer> {
  try {
    // 내장된 샘플 음악 파일 경로
    const samplePath = path.join(process.cwd(), 'static', 'samples', 'sample-music.mp3');
    return await fs.readFile(samplePath);
  } catch (error) {
    console.error('샘플 음악 파일 읽기 실패:', error);
    throw new Error('음악 생성 및 샘플 음악 로딩에 모두 실패했습니다.');
  }
}