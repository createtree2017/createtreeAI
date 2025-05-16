/**
 * 가사 생성 API 라우트
 * OpenAI GPT를 사용하여 프롬프트 기반 가사 생성
 */
import { Router } from 'express';
import { z } from 'zod';
import { generateLyrics, formatLyrics, LyricsGenerationOptions } from '../services/lyrics-generator';

const router = Router();

// 가사 생성 요청 스키마
const lyricsGenerationSchema = z.object({
  prompt: z.string().min(3, '프롬프트는 최소 3자 이상이어야 합니다'),
  style: z.string().optional(),
  length: z.number().min(10).max(1000).optional().default(200),
  includeChorus: z.boolean().optional().default(true)
});

/**
 * @route POST /api/lyrics/generate
 * @desc 프롬프트 기반 가사 생성
 * @access Public
 */
router.post('/generate', async (req, res) => {
  try {
    // 요청 데이터 검증
    const validationResult = lyricsGenerationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: '유효하지 않은 요청 데이터입니다',
        errors: validationResult.error.format() 
      });
    }
    
    const options: LyricsGenerationOptions = validationResult.data;
    
    // 가사 생성
    const rawLyrics = await generateLyrics(options);
    
    // 가사 포맷팅 (섹션 태그 추가 등)
    const formattedLyrics = formatLyrics(rawLyrics);
    
    return res.status(200).json({
      success: true,
      lyrics: formattedLyrics
    });
    
  } catch (error: any) {
    console.error('가사 생성 오류:', error);
    return res.status(500).json({
      message: '가사 생성 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

export default router;