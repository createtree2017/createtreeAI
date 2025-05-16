import express from 'express';
import * as musicJobService from '../services/music-job-service';

const router = express.Router();

/**
 * 음악 생성 작업 시작 API
 * POST /api/music-jobs
 */
router.post('/', async (req, res) => {
  try {
    // 현재 사용자의 진행 중인 작업이 있으면 모두 취소
    const userId = req.user?.id || null;
    if (userId) {
      musicJobService.cancelActiveJobsByUser(userId);
    }
    
    // 새 작업 등록
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

/**
 * 작업 취소 API
 * POST /api/music-jobs/:jobId/cancel
 */
router.post('/:jobId/cancel', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user?.id || null;
    
    // 작업 취소 처리
    const success = musicJobService.cancelJob(jobId, userId);
    
    if (!success) {
      return res.status(404).json({ error: '해당 작업을 찾을 수 없거나 취소할 수 없습니다' });
    }
    
    res.status(200).json({ success: true, message: '작업이 취소되었습니다' });
  } catch (error) {
    console.error('작업 취소 실패:', error);
    res.status(500).json({
      error: '작업 취소 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 사용자의 모든 진행 중인 작업 취소 API
 * POST /api/music-jobs/cancel-all
 */
router.post('/user/cancel-all', (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }
    
    // 사용자의 모든 작업 취소
    const count = musicJobService.cancelActiveJobsByUser(userId);
    
    res.status(200).json({ 
      success: true, 
      message: `${count}개의 작업이 취소되었습니다` 
    });
  } catch (error) {
    console.error('작업 일괄 취소 실패:', error);
    res.status(500).json({
      error: '작업 취소 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

export default router;