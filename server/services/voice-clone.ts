/**
 * 사용자 음성 클론 서비스
 * 사용자가 제공한 음성 샘플을 기반으로 새로운 텍스트를 같은 목소리로 합성
 */
import Replicate from 'replicate';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';

// Replicate API 키 확인
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.');
}

// Replicate 클라이언트 초기화
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

/**
 * 사용자 음성 클론 생성
 * @param sample 사용자의 음성 샘플 (Buffer 형태)
 * @param text 합성할 텍스트
 * @returns 생성된 오디오의 ArrayBuffer 또는 URL
 */
export async function cloneVoice(
  sample: Buffer,
  text: string
): Promise<Buffer | ArrayBuffer> {
  try {
    console.log('음성 클론 시작:', { textLength: text.length, sampleSize: sample.length });
    
    // 텍스트가 비어있는 경우 처리
    if (!text || text.trim() === '') {
      text = '안녕하세요. 이 노래를 들어주셔서 감사합니다.';
    }
    
    // 텍스트가 너무 긴 경우 처리
    const MAX_LENGTH = 400;
    if (text.length > MAX_LENGTH) {
      console.warn(`텍스트가 너무 깁니다. ${text.length}자 -> ${MAX_LENGTH}자로 축소합니다.`);
      text = text.substring(0, MAX_LENGTH) + '...';
    }
    
    // Replicate API가 없는 경우 샘플 반환
    if (!replicate) {
      console.warn('Replicate API 토큰이 없어 샘플 음성을 반환합니다.');
      return getSampleVoiceUrl();
    }
    
    // 임시 오디오 파일 저장
    const tempDir = path.join(tmpdir(), `voice-clone-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const samplePath = path.join(tempDir, 'sample.wav');
    await fs.writeFile(samplePath, sample);
    
    // 샘플 파일을 Base64로 변환
    const sampleBase64 = sample.toString('base64');
    
    // 음성 클론 모델 실행 (Nurofy-RVC)
    const output = await replicate.run(
      "lucataco/nurofy-rvc:3b06544e6debecb5932f1ac60023a7ff711ae546a2b98fc8e9f40b0d68c42bf2",
      {
        input: {
          audio_base64: sampleBase64,
          text: text,
          language: "ko", // 한국어
          transpose: 0,    // 목소리 음높이 조절 (-12 ~ 12)
          seed: 42,
          version: "v2"    // RVC 모델 버전
        }
      }
    );
    
    // 결과 URL 확인
    if (!output || !output.audio || typeof output.audio !== 'string') {
      throw new Error('음성 클론에 실패했습니다: 유효한 출력이 없습니다.');
    }
    
    console.log('음성 클론 완료, URL:', output.audio);
    
    // 원격 URL에서 파일 다운로드
    const response = await fetch(output.audio);
    if (!response.ok) {
      throw new Error(`음성 다운로드에 실패했습니다: ${response.status} ${response.statusText}`);
    }
    
    // 응답을 ArrayBuffer로 변환
    const buffer = await response.arrayBuffer();
    
    // 임시 파일 정리
    try {
      await fs.unlink(samplePath);
      await fs.rmdir(tempDir);
    } catch (cleanupError) {
      console.warn('임시 파일 정리 중 오류:', cleanupError);
    }
    
    return buffer;
  } catch (error) {
    console.error('음성 클론 중 오류가 발생했습니다:', error);
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
    throw new Error('음성 클론 및 샘플 음성 로딩에 모두 실패했습니다.');
  }
}