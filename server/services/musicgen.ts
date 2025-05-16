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
    
    // 샘플 음악 반환 (API 호출 없이 로컬 파일 사용)
    console.log('샘플 음악 파일 사용 (임시 대체)');
    return await getSampleMusic();
    
    // 나중에 API가 해결되면 아래 코드를 활성화
    /*
    // 사용자 입력에서 음악 스타일 정보 추출
    const musicStyle = style || 'lullaby';
    
    // 음악 생성 프롬프트 개선
    const enhancedPrompt = `Create a ${validDuration} second ${musicStyle} music for babies. Details: ${prompt}`;
    
    console.log(`Replicate API 호출 - 음악 생성 프롬프트: ${enhancedPrompt}`);
    
    // 더 안정적인 모델 사용
    const output = await replicate.run(
      "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
      {
        input: {
          prompt_a: enhancedPrompt,
          prompt_b: enhancedPrompt,
          alpha: 0.5,
          num_inference_steps: 50,
          seed_image_id: "vibes"
        }
      }
    );
    */
    
    // 결과 URL 확인
    if (!output || typeof output !== 'string') {
      throw new Error('음악 생성에 실패했습니다: 유효한 출력이 없습니다.');
    }
    
    console.log('MusicGen 음악 생성 완료, URL:', output);
    
    // 원격 URL에서 파일 다운로드
    const response = await fetch(output);
    if (!response.ok) {
      throw new Error(`음악 다운로드에 실패했습니다: ${response.status} ${response.statusText}`);
    }
    
    // 응답을 ArrayBuffer로 변환
    const buffer = await response.arrayBuffer();
    
    return buffer;
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