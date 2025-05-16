/**
 * 음악 파일 전용 공개 라우트 
 * 이 라우트는 로그인 없이도 음악 파일에 접근할 수 있도록 합니다.
 */
import express from 'express';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @route GET /api/music-file/:filename
 * @desc 음악 파일을 스트리밍 방식으로 전송
 * @access Public
 */
router.get('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // 파일명 유효성 검사
    if (!filename || !filename.match(/^[a-zA-Z0-9_\-\.]+\.mp3$/)) {
      return res.status(400).json({ error: '유효하지 않은 파일명입니다.' });
    }

    // 파일 경로 (임시 폴더 / 영구 폴더)
    let filePath = '';
    
    // 템프 파일인 경우 (temp-music로 시작하는 파일)
    if (filename.startsWith('temp-music-')) {
      filePath = path.resolve(process.cwd(), 'uploads/temp', filename);
    } else {
      // 정규 음악 파일인 경우 (정규 음악 저장소에서 찾기)
      filePath = path.resolve(process.cwd(), 'uploads/music', filename);
    }
    
    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`파일 접근 오류: ${filePath}`, error);
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }
    
    // 파일 정보 가져오기
    const stat = await fs.stat(filePath);
    
    // 스트리밍을 위한 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'max-age=86400', // 24시간 캐싱
      'Access-Control-Allow-Origin': '*' // CORS 허용
    });
    
    // 파일 스트리밍
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('음악 파일 제공 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;