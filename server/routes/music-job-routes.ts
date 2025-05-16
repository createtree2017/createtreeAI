import express from 'express';
import * as musicJobService from '../services/music-job-service';

const router = express.Router();

/**
 * 음악 생성 작업 시작 API
 * POST /api/music-jobs
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const jobId = await musicJobService.enqueueMusicJob(req.body, userId);
    // 상태 코드 200으로 변경 (클라이언트 호환성을 위해)
    res.status(200).json({ jobId });
  } catch (error) {
    console.error('음악 생성 작업 등록 실패:', error);
    res.status(500).json({ 
      error: '음악 생성 작업을 시작할 수 없습니다', 
      details: error.message 
    });
  }
});

/**
 * 작업 상태 확인 API
 * GET /api/music-jobs/:jobId/status
 */
router.get('/:jobId/status', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const status = musicJobService.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({ error: '해당 작업을 찾을 수 없습니다' });
    }
    
    res.json(status);
  } catch (error) {
    console.error('작업 상태 조회 실패:', error);
    res.status(500).json({ 
      error: '작업 상태를 조회할 수 없습니다', 
      details: error.message 
    });
  }
});

export default router;