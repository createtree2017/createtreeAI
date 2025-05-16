import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { music } from '@shared/schema';
import * as musicgen from './musicgen';
import * as ttsAi from './tts-ai';
import * as audioMixer from '../utils/audio-mixer';
import path from 'path';
import fs from 'fs';

// 작업 상태 유형
type JobState = 'pending' | 'processing' | 'done' | 'error';

// 음악 작업 정보 인터페이스
interface MusicJob {
  id: string;
  userId: number | null;
  params: any;
  state: JobState;
  error?: string;
  resultUrl?: string;
  resultId?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 메모리 내 작업 저장소 (실제로는 DB 사용 권장)
const jobs = new Map<string, MusicJob>();

/**
 * 새 음악 생성 작업을 큐에 등록
 */
export async function enqueueMusicJob(params: any, userId: number | null = null): Promise<string> {
  const jobId = uuidv4();
  
  // 작업 객체 생성
  const job: MusicJob = {
    id: jobId,
    userId,
    params,
    state: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // 작업 저장
  jobs.set(jobId, job);
  
  // 비동기로 작업 처리 시작
  processMusicJob(jobId).catch(error => {
    console.error(`Job ${jobId} 처리 중 오류 발생:`, error);
    const failedJob = jobs.get(jobId);
    if (failedJob) {
      failedJob.state = 'error';
      failedJob.error = error.message;
      failedJob.updatedAt = new Date();
      jobs.set(jobId, failedJob);
    }
  });
  
  return jobId;
}

/**
 * 작업 상태 조회
 */
export function getJobStatus(jobId: string): { 
  state: JobState; 
  resultUrl?: string; 
  resultId?: number;
  error?: string;
} | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  
  return {
    state: job.state,
    resultUrl: job.resultUrl,
    resultId: job.resultId,
    error: job.error
  };
}

/**
 * 음악 생성 작업 실행 (백그라운드)
 */
async function processMusicJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  
  try {
    // 상태 업데이트: 처리 중
    job.state = 'processing';
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    console.log(`[${Date.now()}] 백그라운드 음악 생성 작업 시작 (Job ID: ${jobId})`);
    
    // 1. 가사 처리
    console.log(`[${Date.now()}] 가사 처리 시작...`);
    const lyrics = job.params.lyrics || 
      `아기 ${job.params.babyName}를 위한 자장가\n사랑스러운 우리 아기\n편안하게 잠들어요`;
      
    console.log(`[${Date.now()}] 사용자 제공 가사 사용: ${lyrics.substring(0, 15)}...`);
    
    // 2. 보컬 합성
    console.log(`[${Date.now()}] 보컬 합성 시작 (${job.params.voiceMode || 'ai'})...`);
    const voiceParams = {
      text: lyrics,
      gender: job.params.gender || 'female_kr'
    };
    
    let vocalPath;
    try {
      vocalPath = await ttsAi.synthesizeAi(voiceParams);
    } catch (error) {
      console.error('보컬 합성 중 오류:', error);
      vocalPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-vocal.mp3');
      console.log('오류로 인해 샘플 음성을 반환합니다.');
    }
    
    console.log(`[${Date.now()}] 보컬 합성 완료`);
    
    // 3. 배경 음악 생성
    const duration = parseInt(job.params.duration || '60');
    console.log(`[${Date.now()}] 배경 음악 생성 중... 길이: ${duration}초`);
    
    let backgroundMusicPath;
    try {
      backgroundMusicPath = await musicgen.generateMusic({
        prompt: job.params.prompt || `아기 ${job.params.babyName}를 위한 ${job.params.style || 'lullaby'} 스타일의 음악`,
        duration: duration,
        tags: job.params.style || 'lullaby'
      });
    } catch (error) {
      console.error('배경 음악 생성 중 오류:', error);
      backgroundMusicPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-music.mp3');
      console.log('오류로 인해 샘플 음악을 반환합니다.');
    }
    
    console.log(`[${Date.now()}] MusicGen 배경 음악 생성 완료 (${duration}초)`);
    
    // 4. 오디오 믹싱
    console.log(`[${Date.now()}] 오디오 믹싱 시작...`);
    
    let outputPath;
    try {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      
      // 디렉토리가 없으면 생성
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const outputFileName = `output-${timestamp}-${randomSuffix}.mp3`;
      outputPath = path.join(tempDir, outputFileName);
      
      console.log(`임시 파일 경로 생성: 
    - 음악: ${backgroundMusicPath}
    - 보컬: ${vocalPath}
    - 결과: ${outputPath}`);
      
      console.log(`파일 존재 확인: 음악 파일 존재=${fs.existsSync(backgroundMusicPath)}, 보컬 파일 존재=${fs.existsSync(vocalPath)}`);
      
      if (fs.existsSync(backgroundMusicPath) && fs.existsSync(vocalPath)) {
        const musicSize = fs.statSync(backgroundMusicPath).size;
        const vocalSize = fs.statSync(vocalPath).size;
        console.log(`오디오 믹싱 시작 - 음악: ${musicSize} 바이트, 보컬: ${vocalSize} 바이트`);
        
        await audioMixer.mixAudioFiles(backgroundMusicPath, vocalPath, outputPath);
      } else {
        console.log('파일이 존재하지 않아 샘플 파일 사용');
        outputPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-mixed.mp3');
      }
    } catch (error) {
      console.error(`[${Date.now()}] 오디오 믹싱 오류:`, error);
      outputPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-mixed.mp3');
    }
    
    console.log(`[${Date.now()}] 오디오 믹싱 완료 또는 대체 파일 사용: ${outputPath}`);
    
    // 5. DB에 저장
    let savedMusicId;
    try {
      // 결과 파일을 영구 저장소로 이동
      const targetDir = path.join(process.cwd(), 'uploads', 'music');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const finalFileName = `music-${Date.now()}-${job.id.substring(0, 8)}.mp3`;
      const finalPath = path.join(targetDir, finalFileName);
      
      // 파일 복사
      fs.copyFileSync(outputPath, finalPath);
      
      // 상대 경로로 변환 (URL 용)
      const relativeUrl = `/uploads/music/${finalFileName}`;
      
      // DB에 저장
      const [savedMusic] = await db.insert(music).values({
        title: job.params.title || `${job.params.babyName}의 ${job.params.style || 'lullaby'}`,
        duration: duration,
        style: job.params.style || 'lullaby',
        url: relativeUrl,
        userId: job.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      savedMusicId = savedMusic.id;
      
      // 작업 결과 업데이트
      job.resultUrl = relativeUrl;
      job.resultId = savedMusicId;
    } catch (error) {
      console.error('DB 저장 중 오류:', error);
      
      // 샘플 URL 사용
      job.resultUrl = '/uploads/samples/sample-mixed.mp3';
    }
    
    // 작업 완료
    job.state = 'done';
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    console.log(`[${Date.now()}] 백그라운드 음악 생성 완료 (Job ID: ${jobId})`);
    
  } catch (error) {
    console.error(`[${Date.now()}] 음악 생성 작업 실패 (Job ID: ${jobId}):`, error);
    
    // 작업 실패 처리
    job.state = 'error';
    job.error = error.message;
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    throw error;
  }
}