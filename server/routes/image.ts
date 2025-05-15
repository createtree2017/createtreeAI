import { Router } from 'express';
import { storage } from '../storage';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// 이미지 목록 조회 API
router.get('/list', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const filterByUser = req.query.filterByUser !== 'false'; // 기본값은 true (사용자별 필터링)
    
    // 인증된 사용자인 경우 userId 설정
    const userId = req.isAuthenticated() ? req.user.id : null;
    
    const result = await storage.getPaginatedImageList(page, pageSize, filterByUser ? userId : null);
    res.json(result);
  } catch (error) {
    console.error('이미지 목록 조회 오류:', error);
    res.status(500).json({ error: '이미지 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 이미지 상세 정보 조회 API
router.get('/:id', async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: '유효하지 않은 이미지 ID입니다.' });
    }
    
    const image = await storage.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 이미지 메타데이터가 문자열이면 JSON으로 파싱
    let metadata = {};
    if (image.metadata && typeof image.metadata === 'string') {
      try {
        metadata = JSON.parse(image.metadata);
      } catch (err) {
        console.error('메타데이터 파싱 오류:', err);
      }
    } else if (image.metadata) {
      metadata = image.metadata;
    }
    
    // Ensure transformedUrl contains the complete URL
    const transformedUrl = image.transformedUrl.startsWith('http') 
      ? image.transformedUrl 
      : (image.transformedUrl.startsWith('/') 
          ? `${req.protocol}://${req.get('host')}${image.transformedUrl}` 
          : `${req.protocol}://${req.get('host')}/${image.transformedUrl}`);

    // 응답 객체 형식화
    const response = {
      id: image.id,
      title: image.title,
      description: '', // 빈 문자열로 기본 설정
      style: image.style,
      originalUrl: image.originalUrl,
      transformedUrl: transformedUrl,
      createdAt: image.createdAt,
      metadata
    };
    
    console.log('이미지 상세 정보 API 응답 (이미지 라우터):', {
      id: image.id,
      title: image.title,
      transformedUrl,
      originalUrl: image.originalUrl
    });
    
    res.json(response);
  } catch (error) {
    console.error('이미지 상세 정보 조회 오류:', error);
    res.status(500).json({ error: '이미지 상세 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 이미지 다운로드 API
router.get('/:id/download', async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ error: '유효하지 않은 이미지 ID입니다.' });
    }
    
    // 이미지 정보 조회
    const image = await storage.getImageById(imageId);
    
    if (!image) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 변환된 이미지 URL 확인
    if (!image.transformedUrl) {
      return res.status(404).json({ error: '이미지 URL이 유효하지 않습니다.' });
    }
    
    // 다운로드할 파일명 설정
    const filename = `image-${imageId}.jpg`;
    
    console.log(`[이미지 다운로드] ID: ${imageId}, URL: ${image.transformedUrl.substring(0, 50)}...`);
    
    // URL이 로컬 파일 경로인지 확인
    if (image.transformedUrl.startsWith('/') || image.transformedUrl.startsWith('./')) {
      // 로컬 파일 처리
      const filePath = path.resolve(process.cwd(), image.transformedUrl.replace(/^\//, ''));
      
      // 파일 존재 여부 확인
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '이미지 파일을 찾을 수 없습니다.' });
      }
      
      // Content-Type 및 Content-Disposition 헤더 설정
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // 파일 스트림 전송
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } 
    // URL이 외부 URL인 경우
    else if (image.transformedUrl.startsWith('http')) {
      try {
        // 외부 URL에서 이미지 가져오기
        const response = await fetch(image.transformedUrl);
        
        if (!response.ok) {
          return res.status(response.status).json({ 
            error: `외부 이미지 서버 오류: ${response.statusText}` 
          });
        }
        
        // 응답 헤더 설정
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // 이미지 데이터를 바로 응답으로 전달
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      } catch (error) {
        console.error('외부 이미지 다운로드 오류:', error);
        return res.status(500).json({ error: '이미지 다운로드 중 오류가 발생했습니다.' });
      }
    } else {
      return res.status(400).json({ error: '지원하지 않는 이미지 URL 형식입니다.' });
    }
  } catch (error) {
    console.error('이미지 다운로드 오류:', error);
    res.status(500).json({ error: '이미지 다운로드 중 오류가 발생했습니다.' });
  }
});

export default router;