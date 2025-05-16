/**
 * 가사 생성 API 라우트
 * OpenAI GPT를 사용하여 프롬프트 기반 가사 생성
 */
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../common/middleware/auth';
import { generateLyrics } from '../services/lyrics-generator';

const router = express.Router();

// 가사 생성 요청 검증을 위한 Zod 스키마
const lyricsGenerationSchema = z.object({
  prompt: z.string().min(3, "프롬프트는 최소 3자 이상이어야 합니다"),
  style: z.string().optional(),
  length: z.number().optional().default(4), // 기본적으로 4절(verse) 생성
  includeChorus: z.boolean().optional().default(true)
});

// 가사 생성 API 엔드포인트
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    // 입력값 검증
    const validationResult = lyricsGenerationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('가사 생성 요청 검증 실패:', validationResult.error);
      return res.status(400).json({
        error: '입력값 검증 실패',
        details: validationResult.error.format()
      });
    }
    
    // 검증된 데이터로 가사 생성 요청
    const requestData = validationResult.data;
    console.log('가사 생성 요청 시작:', requestData);
    
    // 가사 생성 서비스 호출
    const result = await generateLyrics(requestData);
    
    console.log('가사 생성 완료');
    
    // 결과 반환
    return res.status(200).json({
      success: true,
      lyrics: result
    });
  } catch (error) {
    console.error('가사 생성 중 오류 발생:', error);
    
    return res.status(500).json({
      error: '가사 생성 중 오류가 발생했습니다',
      message: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

export default router;