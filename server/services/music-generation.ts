/**
 * 새로운 음악 생성 서비스
 * MusicGen으로 배경음악 생성 + Bark로 보컬 TTS 생성 및 믹싱
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { translateText } from './gemini-lyrics-service';

// 유틸리티: 프로미스 기반 exec
const execPromise = promisify(exec);

// 기본 설정
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const VOICES_DIR = path.join(UPLOADS_DIR, 'voices');
const MUSIC_DIR = path.join(UPLOADS_DIR, 'music');
const MIXED_DIR = path.join(UPLOADS_DIR, 'mixed');

// 디렉토리 생성 함수
function ensureDirsExist() {
  [UPLOADS_DIR, VOICES_DIR, MUSIC_DIR, MIXED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 요청 인터페이스
export interface MusicGenerationRequest {
  prompt: string;         // 음악 생성 프롬프트 (또는 스타일)
  lyrics: string;         // 가사
  voice: string;          // 목소리 타입 (예: 'female', 'male', 'child')
  duration: number;       // 음악 길이 (초)
  styleTags?: string[];   // 스타일 태그 (선택)
  translateToEnglish?: boolean; // 영어로 번역 여부
}

/**
 * Bark API로 가사 TTS 생성
 * @param lyrics 가사
 * @param voice 목소리 타입
 * @returns 생성된 음성 파일 경로
 */
export async function generateVocalTTS(lyrics: string, voice: string): Promise<string> {
  console.log(`🎤 가사 TTS 생성 시작 (${lyrics.length}자, 목소리: ${voice})`);
  
  try {
    // Replicate Bark API 호출 
    const voicePreset = voice === 'female' ? 'v2/en_speaker_6' : 
                         voice === 'child' ? 'v2/en_speaker_9' : 'v2/en_speaker_0';
                         
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      throw new Error('REPLICATE_API_TOKEN이 설정되지 않았습니다.');
    }
    
    // 1. Bark API 호출
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify({
        version: "b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787", // bark 모델
        input: {
          text: lyrics,
          text_temp: 0.7,
          waveform_temp: 0.7,
          voice_preset: voicePreset,
          silent_beginning_length: 0,
          duration_secs: 3600  // 최대값 설정 
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Bark API 오류: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const predictionData: {
      id: string;
      urls: { get: string };
      status: string;
    } = await response.json() as any;
    console.log('🎤 Bark API 작업 시작됨, ID:', predictionData.id);
    
    // 2. 결과 확인을 위한 폴링 
    const getUrl = predictionData.urls.get;
    
    // 최대 20번, 3초 간격으로 폴링
    for (let i = 0; i < 20; i++) {
      console.log(`🎤 TTS 결과 확인 시도 ${i+1}/20...`);
      
      // 3초 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 상태 확인
      const statusResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`
        }
      });
      
      if (!statusResponse.ok) {
        console.error(`🎤 TTS 상태 확인 실패: ${statusResponse.status}`);
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log('🎤 TTS 현재 상태:', statusData.status);
      
      // 성공했으면 결과 반환
      if (statusData.status === 'succeeded' && statusData.output) {
        // 오디오 URL 다운로드 및 저장
        const audioUrl = statusData.output;
        console.log('🎤 TTS 생성 완료, URL:', audioUrl);
        
        // 파일명 생성 및 다운로드
        const timestamp = Date.now();
        const filePath = path.join(VOICES_DIR, `vocal_${timestamp}.wav`);
        
        // 오디오 파일 다운로드
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`🎤 TTS 파일 다운로드 실패: ${audioResponse.status}`);
        }
        
        const audioBuffer = await audioResponse.buffer();
        fs.writeFileSync(filePath, audioBuffer);
        
        console.log(`🎤 TTS 파일 저장 완료: ${filePath}`);
        return filePath;
      }
      
      // 오류가 발생했으면 예외 발생
      if (statusData.status === 'failed') {
        throw new Error(`🎤 TTS 생성 실패: ${statusData.error || '알 수 없는 오류'}`);
      }
    }
    
    throw new Error('🎤 TTS 생성 시간 초과');
  } catch (error) {
    console.error('🎤 TTS 생성 중 오류 발생:', error);
    throw error;
  }
}

/**
 * MusicGen API로 배경 음악 생성
 * @param prompt 음악 설명 프롬프트
 * @param styleTags 스타일 태그 목록
 * @param duration 길이 (초)
 * @returns 생성된 배경음악 파일 경로
 */
export async function generateInstrumental(prompt: string, styleTags: string[] = [], duration: number = 120): Promise<string> {
  console.log(`🎹 배경음악 생성 시작 (프롬프트: ${prompt}, 길이: ${duration}초)`);
  
  try {
    // 유효한 지속시간 확인 (MusicGen은 보통 30초 단위)
    const validatedDuration = Math.min(240, Math.max(30, duration));
    
    // 프롬프트 보강
    let enhancedPrompt = prompt;
    if (styleTags && styleTags.length > 0) {
      enhancedPrompt += ', ' + styleTags.join(', ');
    }
    enhancedPrompt += ', instrumental, high quality, clear, professional';
    
    // Replicate API 키 확인
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      throw new Error('REPLICATE_API_TOKEN이 설정되지 않았습니다.');
    }
    
    // 1. MusicGen API 호출 (Facebook의 MusicGen 모델)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify({
        version: "b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38", // MusicGen 모델
        input: {
          prompt: enhancedPrompt,
          duration: validatedDuration,
          model_version: "stereo-large",
          output_format: "wav",
          normalization_strategy: "peak",
          classifier_free_guidance: 10
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MusicGen API 오류: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const predictionData = await response.json();
    console.log('🎹 MusicGen API 작업 시작됨, ID:', predictionData.id);
    
    // 2. 결과 확인을 위한 폴링
    const getUrl = predictionData.urls.get;
    
    // 최대 20번, 3초 간격으로 폴링
    for (let i = 0; i < 20; i++) {
      console.log(`🎹 음악 결과 확인 시도 ${i+1}/20...`);
      
      // 3초 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 상태 확인
      const statusResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`
        }
      });
      
      if (!statusResponse.ok) {
        console.error(`🎹 음악 상태 확인 실패: ${statusResponse.status}`);
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log('🎹 음악 현재 상태:', statusData.status);
      
      // 성공했으면 결과 반환
      if (statusData.status === 'succeeded' && statusData.output) {
        // 오디오 URL 다운로드 및 저장
        const audioUrl = statusData.output;
        console.log('🎹 배경음악 생성 완료, URL:', audioUrl);
        
        // 파일명 생성 및 다운로드
        const timestamp = Date.now();
        const filePath = path.join(MUSIC_DIR, `instrumental_${timestamp}.wav`);
        
        // 오디오 파일 다운로드
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`🎹 배경음악 파일 다운로드 실패: ${audioResponse.status}`);
        }
        
        const audioBuffer = await audioResponse.buffer();
        fs.writeFileSync(filePath, audioBuffer);
        
        console.log(`🎹 배경음악 파일 저장 완료: ${filePath}`);
        return filePath;
      }
      
      // 오류가 발생했으면 예외 발생
      if (statusData.status === 'failed') {
        throw new Error(`🎹 배경음악 생성 실패: ${statusData.error || '알 수 없는 오류'}`);
      }
    }
    
    throw new Error('🎹 배경음악 생성 시간 초과');
  } catch (error) {
    console.error('🎹 배경음악 생성 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 보컬과 배경음악 믹싱
 * @param vocalPath 보컬 파일 경로
 * @param musicPath 배경음악 파일 경로
 * @returns 믹싱된 음악 파일 경로
 */
export async function mixTracks(vocalPath: string, musicPath: string): Promise<string> {
  console.log('🎚️ 트랙 믹싱 시작');
  console.log(`- 보컬 파일: ${vocalPath}`);
  console.log(`- 배경음악 파일: ${musicPath}`);
  
  try {
    ensureDirsExist();
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(vocalPath)) {
      throw new Error(`보컬 파일이 존재하지 않습니다: ${vocalPath}`);
    }
    if (!fs.existsSync(musicPath)) {
      throw new Error(`배경음악 파일이 존재하지 않습니다: ${musicPath}`);
    }
    
    // 출력 파일 경로 설정
    const timestamp = Date.now();
    const outputFilePath = path.join(MIXED_DIR, `mixed_${timestamp}.mp3`);
    
    // ffmpeg 명령 (보컬을 배경보다 약간 키우고 믹싱)
    const command = `ffmpeg -i "${musicPath}" -i "${vocalPath}" -filter_complex "[0:a]volume=0.7[a];[1:a]volume=1.2[b];[a][b]amix=inputs=2:duration=longest" -c:a libmp3lame -q:a 2 "${outputFilePath}"`;
    
    console.log('🎚️ ffmpeg 명령 실행:', command);
    
    // 명령 실행
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && !stderr.includes('time=')) {
      console.warn('🎚️ ffmpeg 경고:', stderr);
    }
    
    if (!fs.existsSync(outputFilePath)) {
      throw new Error('믹싱된 파일이 생성되지 않았습니다.');
    }
    
    console.log(`🎚️ 트랙 믹싱 완료: ${outputFilePath}`);
    
    // 파일 경로 반환
    return outputFilePath;
  } catch (error) {
    console.error('🎚️ 트랙 믹싱 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 한국어/영어 가사로 음악 생성 통합 함수
 * @param options 음악 생성 옵션
 * @returns 생성된 음악 파일 경로 및 공개 URL
 */
export async function createKoreanSong(options: MusicGenerationRequest): Promise<{
  filePath: string;
  publicUrl: string;
  translatedLyrics?: string;
}> {
  console.log('🎵 음악 생성 통합 프로세스 시작', options);
  ensureDirsExist();
  
  try {
    // 1. 필요하면 가사 번역
    let processedLyrics = options.lyrics;
    let translatedLyrics: string | undefined;
    
    // 한국어 가사인 경우 & 번역 요청 시 영어로 번역
    if (options.translateToEnglish) {
      console.log('🌐 한국어 가사 번역 시작');
      translatedLyrics = await translateText(options.lyrics, 'english');
      console.log('🌐 번역 완료:', translatedLyrics);
      processedLyrics = translatedLyrics;
    }
    
    // 2. 보컬 TTS 생성
    const vocalFilePath = await generateVocalTTS(processedLyrics, options.voice);
    
    // 3. 배경음악 생성 (동시에 처리 가능)
    const instrumentalFilePath = await generateInstrumental(
      options.prompt,
      options.styleTags,
      options.duration
    );
    
    // 4. 두 트랙 믹싱
    const mixedFilePath = await mixTracks(vocalFilePath, instrumentalFilePath);
    
    // 5. 공개 URL 변환
    const relativePath = path.relative(UPLOADS_DIR, mixedFilePath);
    const publicUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    // 6. 결과 반환
    return {
      filePath: mixedFilePath,
      publicUrl,
      translatedLyrics
    };
  } catch (error) {
    console.error('🎵 음악 생성 통합 프로세스 중 오류 발생:', error);
    throw error;
  }
}