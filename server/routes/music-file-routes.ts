/**
 * 음악 파일 전용 공개 라우트 
 * 이 라우트는 로그인 없이도 음악 파일에 접근할 수 있도록 합니다.
 * 작업지시서 요구사항: Content-Type, Accept-Ranges 설정, 인증 우회
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @route GET /api/music-file/:filename
 * @desc 음악 파일을 스트리밍 방식으로 전송
 * @access Public
 */
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 파일명 유효성 검사 (영문, 숫자, 대시, 언더스코어, 점만 허용)
    if (!filename || !filename.match(/^[a-zA-Z0-9_\-\.]+\.mp3$/)) {
      console.error(`유효하지 않은 파일명 요청: ${filename}`);
      return res.status(400).json({ error: '유효하지 않은 파일명입니다.' });
    }

    // 파일 경로 결정
    let filePath = '';
    let fallbackPath = '';
    
    // 1. 기본 경로 설정
    if (filename.startsWith('temp-music-')) {
      // 임시 파일 경로
      filePath = path.resolve(process.cwd(), 'uploads/temp', filename);
    } else {
      // 정규 음악 파일 경로
      filePath = path.resolve(process.cwd(), 'uploads/music', filename);
    }
    
    // 2. 대체 파일 경로 (샘플 음악)
    fallbackPath = path.resolve(process.cwd(), 'static/samples/sample-music.mp3');
    
    console.log(`[음악 파일 요청] 파일명: ${filename}`);
    console.log(`[음악 파일 요청] 경로: ${filePath}`);
    console.log(`[음악 파일 요청] 대체 경로: ${fallbackPath}`);
    
    // 파일 존재 확인 (동기 방식) - 없으면 샘플 파일 반환
    if (!fs.existsSync(filePath)) {
      console.error(`[음악 파일 요청] ⚠️ 파일 없음: ${filePath}`);
      
      // 요청된 파일이 없는 경우 - 샘플 파일 사용 시도
      if (fs.existsSync(fallbackPath)) {
        console.log(`[음악 파일 요청] ℹ️ 샘플 파일 사용: ${fallbackPath}`);
        filePath = fallbackPath;
      } else {
        // 샘플 파일도 없는 경우 404 반환
        console.error(`[음악 파일 요청] ❌ 샘플 파일도 없음: ${fallbackPath}`);
        return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      }
    }
    
    // 파일 정보 가져오기
    const stat = fs.statSync(filePath);
    
    // Range 요청 처리 (부분 범위 요청 지원)
    const range = req.headers.range;
    
    if (range) {
      // Range 요청 처리 (예: 'bytes=0-1023')
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = (end - start) + 1;
      
      console.log(`Range 요청: ${start}-${end}/${stat.size}`);
      
      // 스트리밍 헤더 설정 (범위 응답)
      res.writeHead(206, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': chunkSize,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      
      // 범위 스트리밍
      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', (err) => {
        console.error(`스트림 오류: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: '파일 스트리밍 실패' });
        }
      });
      
      stream.pipe(res);
    } else {
      // 전체 파일 응답
      console.log(`전체 파일 전송: ${stat.size} 바이트`);
      
      // 스트리밍 헤더 설정
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      
      // 파일 스트리밍
      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        console.error(`스트림 오류: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: '파일 스트리밍 실패' });
        }
      });
      
      stream.pipe(res);
    }
  } catch (error) {
    console.error('음악 파일 제공 중 오류 발생:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
});

export default router;