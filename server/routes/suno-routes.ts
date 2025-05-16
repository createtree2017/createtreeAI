/**
 * Suno AI 자동화 서비스 API 라우트
 */

import express from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { sunoService, SunoMusicGenerationOptions } from '../services/suno-service';
import { db } from '../../db';
// TODO: 실제 음악 테이블 스키마에 맞게 임포트 필요

// 업로드 디렉토리 설정
const uploadsDir = path.join(process.cwd(), 'uploads');
const tempDir = path.join(process.cwd(), 'uploads', 'temp');
const sunoDir = path.join(process.cwd(), 'uploads', 'suno');

// 디렉토리가 없으면 생성
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(sunoDir)) {
  fs.mkdirSync(sunoDir, { recursive: true });
}

// 음악 생성 요청 스키마
const sunoMusicGenerationSchema = z.object({
  prompt: z.string().min(5, "프롬프트는 최소 5자 이상이어야 합니다."),
  style: z.string().optional(),
  lyrics: z.string().optional(),
  vocalGender: z.enum(['male', 'female', 'none']).optional(),
  duration: z.enum(['60', '120', '180', '240']).optional(),
  title: z.string().optional(),
  language: z.enum(['english', 'korean', 'japanese', 'chinese', 'spanish']).optional(),
});

export function registerSunoRoutes(app: express.Express) {
  /**
   * Suno AI로 음악 생성 요청
   * POST /api/suno/create
   */
  app.post('/api/suno/create', async (req, res) => {
    try {
      // 요청 유효성 검증
      const validatedData = sunoMusicGenerationSchema.parse(req.body);
      
      // 사용자 정보 (로그인한 경우)
      const userId = req.user?.id;
      
      // 생성 작업 ID 할당
      const generationId = Date.now().toString();
      console.log(`[Suno API] 음악 생성 요청 시작: ID=${generationId}`);
      
      // 백그라운드 작업으로 음악 생성 시작
      generateMusicInBackground(validatedData, generationId, userId)
        .then(result => {
          console.log(`[Suno API] 음악 생성 완료: ID=${generationId}, 결과:`, result.success);
        })
        .catch(error => {
          console.error(`[Suno API] 음악 생성 실패: ID=${generationId}`, error);
        });
      
      // 즉시 작업 ID 반환 (비동기 작업)
      return res.status(202).json({
        success: true,
        message: "음악 생성이 시작되었습니다.",
        jobId: generationId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          errors: error.errors,
          message: "입력 데이터가 유효하지 않습니다."
        });
      }
      console.error("[Suno API] 오류:", error);
      return res.status(500).json({ 
        success: false, 
        message: "서버 오류가 발생했습니다." 
      });
    }
  });

  /**
   * 음악 생성 상태 확인
   * GET /api/suno/status/:jobId
   */
  app.get('/api/suno/status/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // 음악 생성 상태 확인 로직 (임시 파일이 존재하는지 확인)
      const tempFilePath = path.join(tempDir, `suno-status-${jobId}.json`);
      
      if (fs.existsSync(tempFilePath)) {
        const statusData = JSON.parse(fs.readFileSync(tempFilePath, 'utf-8'));
        return res.json(statusData);
      }
      
      // 파일 생성 여부 확인 (mp3 파일)
      const musicFilePath = path.join(sunoDir, `suno-${jobId}.mp3`);
      if (fs.existsSync(musicFilePath)) {
        return res.json({
          success: true,
          status: 'completed',
          audioUrl: `/uploads/suno/suno-${jobId}.mp3`,
          message: "음악 생성이 완료되었습니다."
        });
      }
      
      // 아직 상태 파일이 없는 경우 (진행 중)
      return res.json({
        success: true,
        status: 'processing',
        message: "음악 생성이 진행 중입니다."
      });
    } catch (error) {
      console.error("[Suno API] 상태 확인 오류:", error);
      return res.status(500).json({ 
        success: false, 
        message: "상태 확인 중 오류가 발생했습니다."
      });
    }
  });

  /**
   * 음악 목록 조회
   * GET /api/suno/list
   */
  app.get('/api/suno/list', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const userId = req.user?.id; // 인증된 사용자인 경우
      
      // TODO: 실제 DB 쿼리로 대체
      const mockResults = [
        {
          id: 1,
          title: "테스트 음악 1",
          prompt: "자장가 스타일의 편안한 음악",
          audioUrl: "/uploads/suno/sample1.mp3",
          lyrics: "잠자리에 들어요\n별이 빛나는 밤\n달빛 아래 꿈속으로",
          duration: 120,
          style: "lullaby",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "테스트 음악 2",
          prompt: "발랄한 케이팝 스타일",
          audioUrl: "/uploads/suno/sample2.mp3", 
          lyrics: "춤을 추며 노래해요\n밝은 하늘 아래서\n함께하는 즐거움",
          duration: 180,
          style: "kpop",
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      
      return res.json({
        success: true,
        data: mockResults,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: mockResults.length,
          totalPages: Math.ceil(mockResults.length / limit)
        }
      });
    } catch (error) {
      console.error("[Suno API] 목록 조회 오류:", error);
      return res.status(500).json({ 
        success: false, 
        message: "목록 조회 중 오류가 발생했습니다."
      });
    }
  });
}

/**
 * 백그라운드에서 음악 생성 작업 실행
 */
async function generateMusicInBackground(
  options: SunoMusicGenerationOptions, 
  jobId: string,
  userId?: number
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    // 상태 파일 생성 (진행 중)
    const statusFilePath = path.join(tempDir, `suno-status-${jobId}.json`);
    fs.writeFileSync(statusFilePath, JSON.stringify({
      success: true,
      status: 'processing',
      message: "음악 생성이 진행 중입니다.",
      progress: 0,
      updatedAt: new Date().toISOString()
    }));
    
    // Suno 서비스를 사용하여 음악 생성
    console.log(`[Suno Background] 음악 생성 시작: ID=${jobId}, 프롬프트="${options.prompt}"`);
    
    try {
      // Suno 서비스 초기화
      await sunoService.initialize();
      
      // 음악 생성
      const result = await sunoService.generateMusic(options);
      
      if (!result.success) {
        throw new Error(result.error || "음악 생성에 실패했습니다.");
      }
      
      // 성공한 경우 - 파일 이름 변경 (jobId로 표준화)
      const finalFileName = `suno-${jobId}.mp3`;
      const finalFilePath = path.join(sunoDir, finalFileName);
      
      if (result.localPath && fs.existsSync(result.localPath)) {
        // 파일 복사
        fs.copyFileSync(result.localPath, finalFilePath);
        console.log(`[Suno Background] 파일 복사 완료: ${result.localPath} → ${finalFilePath}`);
      }
      
      // 최종 URL
      const audioUrl = `/uploads/suno/${finalFileName}`;
      
      // DB에 저장 (TODO: 실제 DB 저장 코드로 대체)
      // await saveToDatabase({ ...result, audioUrl, userId, jobId });
      
      // 상태 파일 업데이트 (완료)
      fs.writeFileSync(statusFilePath, JSON.stringify({
        success: true,
        status: 'completed',
        audioUrl,
        title: result.title,
        lyrics: result.lyrics,
        duration: result.duration,
        coverImageUrl: result.coverImageUrl,
        message: "음악 생성이 완료되었습니다.",
        progress: 100,
        updatedAt: new Date().toISOString()
      }));
      
      console.log(`[Suno Background] 음악 생성 완료: ID=${jobId}, URL=${audioUrl}`);
      
      return { success: true, audioUrl };
    } finally {
      // 리소스 정리 (서비스 종료)
      await sunoService.shutdown();
    }
  } catch (error) {
    console.error(`[Suno Background] 음악 생성 오류: ID=${jobId}`, error);
    
    // 오류 상태 업데이트
    const statusFilePath = path.join(tempDir, `suno-status-${jobId}.json`);
    fs.writeFileSync(statusFilePath, JSON.stringify({
      success: false,
      status: 'failed',
      message: `음악 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      updatedAt: new Date().toISOString()
    }));
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// /**
//  * 음악 데이터를 DB에 저장
//  */
// async function saveToDatabase(data: {
//   audioUrl: string;
//   title?: string;
//   lyrics?: string;
//   duration?: number;
//   coverImageUrl?: string;
//   userId?: number;
//   jobId: string;
// }) {
//   // TODO: 실제 DB 저장 구현
//   console.log(`[Suno] DB 저장 (구현 필요): ${data.title} (${data.audioUrl})`);
// }