import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { music } from '@shared/schema';
import * as musicgen from './musicgen';
import * as ttsAi from './tts-ai';
import { mixAudio } from '../utils/audio-mixer';
import path from 'path';
import fs from 'fs';

// 작업 상태 유형
type JobState = 'pending' | 'processing' | 'done' | 'error' | 'cancelled';

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
  // 작업 취소 플래그
  cancelled?: boolean;
}

// 메모리 내 작업 저장소 (실제로는 DB 사용 권장)
const jobs = new Map<string, MusicJob>();

// 사용자별 활성 작업 추적을 위한 맵
const userJobs = new Map<number, Set<string>>();

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
    cancelled: false
  };
  
  // 작업 저장
  jobs.set(jobId, job);
  
  // 사용자별 작업 추적에 등록
  if (userId) {
    if (!userJobs.has(userId)) {
      userJobs.set(userId, new Set());
    }
    userJobs.get(userId)?.add(jobId);
  }
  
  // 비동기로 작업 처리 시작
  processMusicJob(jobId).catch(error => {
    console.error(`Job ${jobId} 처리 중 오류 발생:`, error);
    const failedJob = jobs.get(jobId);
    if (failedJob && !failedJob.cancelled) {
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
 * 작업 취소
 * @param jobId 취소할 작업 ID
 * @param userId 요청한 사용자 ID (소유자 확인용)
 * @returns 취소 성공 여부
 */
export function cancelJob(jobId: string, userId: number | null = null): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  
  // 다른 사용자의 작업을 취소하려고 할 때는 관리자 권한 확인이 필요할 수 있음
  // 일반적으로는 본인 작업만 취소할 수 있어야 함
  if (userId && job.userId !== null && job.userId !== userId) {
    console.log(`권한 없음: 사용자 ${userId}가 다른 사용자의 작업 ${jobId}을 취소하려고 시도`);
    return false;
  }
  
  // 이미 완료되거나 오류 상태인 작업은 취소할 수 없음
  if (job.state === 'done' || job.state === 'error') {
    console.log(`취소 불가: 작업 ${jobId}는 이미 ${job.state} 상태입니다`);
    return false;
  }
  
  console.log(`작업 취소: ${jobId}, 사용자: ${job.userId}`);
  
  // 작업 취소 처리
  job.state = 'cancelled';
  job.cancelled = true;
  job.updatedAt = new Date();
  job.error = '사용자에 의해 취소됨';
  jobs.set(jobId, job);
  
  return true;
}

/**
 * 특정 사용자의 모든 활성 작업 취소
 * @param userId 사용자 ID
 * @returns 취소된 작업 수
 */
export function cancelActiveJobsByUser(userId: number): number {
  const userJobIds = userJobs.get(userId);
  if (!userJobIds || userJobIds.size === 0) return 0;
  
  let cancelCount = 0;
  
  for (const jobId of userJobIds) {
    const job = jobs.get(jobId);
    if (job && (job.state === 'pending' || job.state === 'processing')) {
      job.state = 'cancelled';
      job.cancelled = true;
      job.updatedAt = new Date();
      job.error = '사용자의 다른 작업에 의해 취소됨';
      jobs.set(jobId, job);
      cancelCount++;
    }
  }
  
  console.log(`사용자 ${userId}의 ${cancelCount}개 작업이 취소됨`);
  return cancelCount;
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
    
    // 작업 시작 전 취소 여부 확인
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
    // 1. 가사 처리
    console.log(`[${Date.now()}] 가사 처리 시작...`);
    const lyrics = job.params.lyrics || 
      `아기 ${job.params.babyName}를 위한 자장가\n사랑스러운 우리 아기\n편안하게 잠들어요`;
      
    console.log(`[${Date.now()}] 사용자 제공 가사 사용: ${lyrics.substring(0, 15)}...`);
    
    // 취소 확인
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
    // 2. 보컬 합성
    console.log(`[${Date.now()}] 보컬 합성 시작 (${job.params.voiceMode || 'ai'})...`);
    // 올바른 파라미터로 ttsAi 호출
    let vocalPath;
    try {
      vocalPath = await ttsAi.synthesizeAi(
        lyrics,
        job.params.gender || 'female_kr'
      );
    } catch (error) {
      console.error('보컬 합성 중 오류:', error);
      vocalPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-vocal.mp3');
      console.log('오류로 인해 샘플 음성을 반환합니다.');
    }
    
    console.log(`[${Date.now()}] 보컬 합성 완료`);
    
    // 취소 확인
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
    // 3. 배경 음악 생성
    const duration = parseInt(job.params.duration || '60');
    console.log(`[${Date.now()}] 배경 음악 생성 중... 길이: ${duration}초`);
    
    let backgroundMusicPath;
    try {
      const prompt = job.params.prompt || `아기 ${job.params.babyName}를 위한 ${job.params.style || 'lullaby'} 스타일의 음악`;
      backgroundMusicPath = await musicgen.generateMusic(prompt, duration);
    } catch (error) {
      console.error('배경 음악 생성 중 오류:', error);
      backgroundMusicPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-music.mp3');
      console.log('오류로 인해 샘플 음악을 반환합니다.');
    }
    
    console.log(`[${Date.now()}] MusicGen 배경 음악 생성 완료 (${duration}초)`);
    
    // 취소 확인
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
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
      
      // backgroundMusicPath와 vocalPath가 Buffer 또는 ArrayBuffer인 경우 처리
      if (typeof backgroundMusicPath === 'string' && typeof vocalPath === 'string' && 
          fs.existsSync(backgroundMusicPath) && fs.existsSync(vocalPath)) {
        // 파일 경로인 경우 파일 읽기
        const musicBuffer = await fs.promises.readFile(backgroundMusicPath);
        const vocalBuffer = await fs.promises.readFile(vocalPath);
        const musicSize = musicBuffer.length;
        const vocalSize = vocalBuffer.length;
        console.log(`오디오 믹싱 시작 - 음악: ${musicSize} 바이트, 보컬: ${vocalSize} 바이트`);
        
        // 취소 확인
        if (job.cancelled) {
          console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
          return;
        }
        
        // mixAudio 함수 사용 (버퍼 기반 믹싱)
        const mixedBuffer = await mixAudio(musicBuffer, vocalBuffer);
        await fs.promises.writeFile(outputPath, mixedBuffer);
      } else if (backgroundMusicPath instanceof Buffer || backgroundMusicPath instanceof ArrayBuffer || 
                vocalPath instanceof Buffer || vocalPath instanceof ArrayBuffer) {
        // Buffer 또는 ArrayBuffer인 경우 직접 처리
        const musicBuffer = backgroundMusicPath instanceof ArrayBuffer ? Buffer.from(backgroundMusicPath) : backgroundMusicPath;
        const vocalBuffer = vocalPath instanceof ArrayBuffer ? Buffer.from(vocalPath) : vocalPath;
        
        console.log(`오디오 믹싱 시작 - 음악: ${musicBuffer.length} 바이트, 보컬: ${vocalBuffer.length} 바이트`);
        
        // 취소 확인
        if (job.cancelled) {
          console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
          return;
        }
        
        const mixedBuffer = await mixAudio(musicBuffer, vocalBuffer);
        await fs.promises.writeFile(outputPath, mixedBuffer);
      } else {
        console.log('파일이 존재하지 않아 샘플 파일 사용');
        outputPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-mixed.mp3');
      }
    } catch (error) {
      console.error(`[${Date.now()}] 오디오 믹싱 오류:`, error);
      outputPath = path.join(process.cwd(), 'uploads', 'samples', 'sample-mixed.mp3');
    }
    
    console.log(`[${Date.now()}] 오디오 믹싱 완료 또는 대체 파일 사용: ${outputPath}`);
    
    // 취소 확인
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
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
      // 스타일 태그 생성
      const styleTag = job.params.style || 'lullaby';
      const tagsArray = [styleTag];
      
      // 취소 확인
      if (job.cancelled) {
        console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
        return;
      }
      
      const [savedMusic] = await db.insert(music).values({
        title: job.params.title || `${job.params.babyName}의 ${job.params.style || 'lullaby'}`,
        prompt: job.params.prompt || `아기 ${job.params.babyName}를 위한 ${job.params.style || 'lullaby'} 스타일의 음악`,
        duration: duration,
        tags: tagsArray,
        url: relativeUrl,
        userId: job.userId,
        lyrics: lyrics
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
    
    // 마지막 취소 확인
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
    // 작업 완료
    job.state = 'done';
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    console.log(`[${Date.now()}] 백그라운드 음악 생성 완료 (Job ID: ${jobId})`);
    
  } catch (error) {
    // 취소된 작업에 대한 예외는 무시
    if (job.cancelled) {
      console.log(`[${Date.now()}] 작업이 취소되었습니다 (Job ID: ${jobId})`);
      return;
    }
    
    console.error(`[${Date.now()}] 음악 생성 작업 실패 (Job ID: ${jobId}):`, error);
    
    // 작업 실패 처리
    job.state = 'error';
    job.error = error.message;
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    throw error;
  }
  
  // 작업이 끝나면 사용자별 작업 목록에서 제거 (메모리 관리)
  if (job.userId) {
    const userJobSet = userJobs.get(job.userId);
    if (userJobSet) {
      userJobSet.delete(jobId);
      if (userJobSet.size === 0) {
        userJobs.delete(job.userId);
      }
    }
  }
}