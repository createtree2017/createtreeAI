/**
 * 새로운 음악 생성 API 라우트
 * MusicGen + Bark 통합 서비스
 */
import express from 'express';
import { z } from 'zod';
import { createKoreanSong, MusicGenerationRequest } from '../services/music-generation';
import { authMiddleware } from '../common/middleware/auth';

const router = express.Router();

// 음악 생성 요청 검증을 위한 Zod 스키마
const musicGenerationSchema = z.object({
  prompt: z.string().min(3, "음악 설명은 최소 3자 이상이어야 합니다"),
  lyrics: z.string().min(10, "가사는 최소 10자 이상이어야 합니다"),
  voice: z.string().min(1, "목소리를 선택해주세요"),
  duration: z.number().min(30).max(240),
  styleTags: z.array(z.string()).optional(),
  translateToEnglish: z.boolean().default(true)
});

// 사용 가능한 목소리 목록 API 
router.get('/voices', (req, res) => {
  // 현재 지원되는 목소리 목록 반환
  const voices = [
    { id: 'female', name: '여성', description: '부드러운 여성 목소리' },
    { id: 'male', name: '남성', description: '차분한 남성 목소리' },
    { id: 'child', name: '아이', description: '밝고 귀여운 아이 목소리' }
  ];
  
  res.json({ voices });
});

// 음악 생성 API 엔드포인트
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    // 입력값 검증
    const validationResult = musicGenerationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('음악 생성 요청 검증 실패:', validationResult.error);
      return res.status(400).json({
        error: '입력값 검증 실패',
        details: validationResult.error.format()
      });
    }
    
    // 검증된 데이터로 음악 생성 요청
    const requestData: MusicGenerationRequest = validationResult.data;
    console.log('음악 생성 요청 시작:', requestData);
    
    // 음악 생성 서비스 호출
    const result = await createKoreanSong(requestData);
    
    console.log('음악 생성 완료');
    
    // 결과 반환
    return res.status(200).json({
      success: true,
      message: '음악이 성공적으로 생성되었습니다',
      audioUrl: result.publicUrl,
      audioPath: result.filePath,
      duration: requestData.duration
    });
  } catch (error) {
    console.error('음악 생성 중 오류 발생:', error);
    
    return res.status(500).json({
      error: '음악 생성 중 오류가 발생했습니다',
      message: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

export default router;