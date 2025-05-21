import express from 'express';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { dreambookStyles } from '@shared/dreambook-styles';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 파일 업로드 설정
const upload = multer({
  dest: 'uploads/dreambook-styles/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// 여러 이미지 파일 업로드를 위한 필드 구성
const uploadFields = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'characterSample', maxCount: 1 }
]);

// 스타일 썸네일 저장 디렉토리 설정
const uploadDir = 'uploads/dreambook-styles/';
const staticDir = 'static/uploads/dreambook-styles/';

// 디렉토리 생성 확인
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// 태몽동화 스타일 전체 목록 조회
router.get('/', async (req, res) => {
  try {
    const styles = await db.query.dreambookStyles.findMany({
      orderBy: (styles, { asc }) => [asc(styles.id)],
    });

    res.json(styles);
  } catch (error) {
    console.error('태몽동화 스타일 목록 조회 오류:', error);
    res.status(500).json({ error: '태몽동화 스타일 목록을 가져오는데 실패했습니다.' });
  }
});

// 태몽동화 스타일 단일 조회
router.get('/:styleId', async (req, res) => {
  try {
    const { styleId } = req.params;

    const style = await db.query.dreambookStyles.findFirst({
      where: eq(dreambookStyles.styleId, styleId),
    });

    if (!style) {
      return res.status(404).json({ error: '해당 스타일을 찾을 수 없습니다.' });
    }

    res.json(style);
  } catch (error) {
    console.error('태몽동화 스타일 조회 오류:', error);
    res.status(500).json({ error: '태몽동화 스타일을 가져오는데 실패했습니다.' });
  }
});

// 태몽동화 스타일 추가 (관리자 전용)
router.post('/', isAdmin, uploadFields, async (req, res) => {
  try {
    // 관리자 권한 체크
    if (!req.user || req.user.memberType !== 'superadmin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    // 바디 데이터 및 파일 유효성 검사
    const { id, name, description, systemPrompt, characterPrompt } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!id || !name || !description || !systemPrompt) {
      return res.status(400).json({ error: '필수 입력 데이터가 누락되었습니다.' });
    }

    if (!files?.thumbnail || files.thumbnail.length === 0) {
      return res.status(400).json({ error: '썸네일 이미지는 필수입니다.' });
    }

    // 스타일 ID 중복 체크
    const existingStyle = await db.query.dreambookStyles.findFirst({
      where: eq(dreambookStyles.styleId, id),
    });

    if (existingStyle) {
      return res.status(400).json({ error: '이미 동일한 ID의 스타일이 존재합니다.' });
    }

    // 썸네일 이미지 저장 처리
    const thumbnailFile = files.thumbnail[0];
    const fileExt = path.extname(thumbnailFile.originalname);
    const fileName = `${id}-thumbnail${fileExt}`;
    const staticFilePath = path.join(staticDir, fileName);

    // 업로드된 파일을 static 디렉토리로 복사
    fs.copyFileSync(thumbnailFile.path, staticFilePath);
    
    // 업로드된 임시 파일 삭제
    fs.unlinkSync(thumbnailFile.path);

    // 썸네일 경로
    const thumbnailUrl = `/uploads/dreambook-styles/${fileName}`;

    // 캐릭터 샘플 이미지 처리 (선택적)
    let characterSampleUrl = null;
    if (files.characterSample && files.characterSample.length > 0) {
      const characterFile = files.characterSample[0];
      const characterExt = path.extname(characterFile.originalname);
      const characterFileName = `${id}-character-sample${characterExt}`;
      const characterFilePath = path.join(staticDir, characterFileName);

      // 업로드된 파일을 static 디렉토리로 복사
      fs.copyFileSync(characterFile.path, characterFilePath);
      
      // 업로드된 임시 파일 삭제
      fs.unlinkSync(characterFile.path);

      // 캐릭터 이미지 경로
      characterSampleUrl = `/uploads/dreambook-styles/${characterFileName}`;
    }

    // 데이터베이스에 스타일 추가
    const newStyle = {
      styleId: id,
      name,
      description,
      systemPrompt,
      thumbnailUrl,
      characterPrompt: characterPrompt || null,
      characterSampleUrl: characterSampleUrl,
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(dreambookStyles).values(newStyle).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('태몽동화 스타일 추가 오류:', error);
    res.status(500).json({ error: '태몽동화 스타일 추가에 실패했습니다.' });
  }
});

// 태몽동화 스타일 수정 (관리자 전용)
router.put('/:styleId', requireAuth, uploadFields, async (req, res) => {
  try {
    // 관리자 권한 체크
    if (!req.user || req.user.memberType !== 'superadmin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { styleId } = req.params;
    const { name, description, systemPrompt, characterPrompt } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

    if (!name || !description || !systemPrompt) {
      return res.status(400).json({ error: '필수 입력 데이터가 누락되었습니다.' });
    }

    // 기존 스타일 확인
    const existingStyle = await db.query.dreambookStyles.findFirst({
      where: eq(dreambookStyles.styleId, styleId),
    });

    if (!existingStyle) {
      return res.status(404).json({ error: '해당 스타일을 찾을 수 없습니다.' });
    }

    // 업데이트 데이터 준비
    const updateData: any = {
      name,
      description,
      systemPrompt,
      characterPrompt: characterPrompt || null,
      updatedAt: new Date(),
    };

    // 썸네일 이미지가 있는 경우 처리
    if (files.thumbnail && files.thumbnail.length > 0) {
      const thumbnailFile = files.thumbnail[0];
      const fileExt = path.extname(thumbnailFile.originalname);
      const fileName = `${styleId}-thumbnail${fileExt}`;
      const staticFilePath = path.join(staticDir, fileName);

      // 이전 파일이 있으면 삭제 시도
      if (
        existingStyle.thumbnailUrl &&
        existingStyle.thumbnailUrl.includes('/uploads/dreambook-styles/')
      ) {
        const oldFilePath = path.join(
          'static',
          existingStyle.thumbnailUrl
        );
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (err) {
          console.error('이전 썸네일 파일 삭제 실패:', err);
        }
      }

      // 새 파일 복사
      fs.copyFileSync(thumbnailFile.path, staticFilePath);
      fs.unlinkSync(thumbnailFile.path); // 임시 파일 삭제

      // 경로 업데이트
      updateData.thumbnailUrl = `/uploads/dreambook-styles/${fileName}`;
    }
    
    // 캐릭터 샘플 이미지가 있는 경우 처리
    if (files.characterSample && files.characterSample.length > 0) {
      const characterFile = files.characterSample[0];
      const characterExt = path.extname(characterFile.originalname);
      const characterFileName = `${styleId}-character-sample${characterExt}`;
      const characterFilePath = path.join(staticDir, characterFileName);

      // 이전 파일이 있으면 삭제 시도
      if (
        existingStyle.characterSampleUrl &&
        existingStyle.characterSampleUrl.includes('/uploads/dreambook-styles/')
      ) {
        const oldCharacterPath = path.join(
          'static',
          existingStyle.characterSampleUrl
        );
        try {
          if (fs.existsSync(oldCharacterPath)) {
            fs.unlinkSync(oldCharacterPath);
          }
        } catch (err) {
          console.error('이전 캐릭터 샘플 파일 삭제 실패:', err);
        }
      }

      // 새 파일 복사
      fs.copyFileSync(characterFile.path, characterFilePath);
      fs.unlinkSync(characterFile.path); // 임시 파일 삭제

      // 경로 업데이트
      updateData.characterSampleUrl = `/uploads/dreambook-styles/${characterFileName}`;
    }

    // 데이터베이스 업데이트
    const result = await db
      .update(dreambookStyles)
      .set(updateData)
      .where(eq(dreambookStyles.styleId, styleId))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('태몽동화 스타일 수정 오류:', error);
    res.status(500).json({ error: '태몽동화 스타일 수정에 실패했습니다.' });
  }
});

// 태몽동화 스타일 삭제 (관리자 전용)
router.delete('/:styleId', requireAuth, async (req, res) => {
  try {
    // 관리자 권한 체크
    if (!req.user || req.user.memberType !== 'superadmin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { styleId } = req.params;

    // 기존 스타일 확인
    const existingStyle = await db.query.dreambookStyles.findFirst({
      where: eq(dreambookStyles.styleId, styleId),
    });

    if (!existingStyle) {
      return res.status(404).json({ error: '해당 스타일을 찾을 수 없습니다.' });
    }

    // 썸네일 파일 삭제 처리
    if (
      existingStyle.thumbnailUrl &&
      existingStyle.thumbnailUrl.includes('/uploads/dreambook-styles/')
    ) {
      const filePath = path.join('static', existingStyle.thumbnailUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('썸네일 파일 삭제 실패:', err);
      }
    }
    
    // 캐릭터 샘플 이미지 파일 삭제 처리
    if (
      existingStyle.characterSampleUrl &&
      existingStyle.characterSampleUrl.includes('/uploads/dreambook-styles/')
    ) {
      const characterFilePath = path.join('static', existingStyle.characterSampleUrl);
      try {
        if (fs.existsSync(characterFilePath)) {
          fs.unlinkSync(characterFilePath);
        }
      } catch (err) {
        console.error('캐릭터 샘플 파일 삭제 실패:', err);
      }
    }

    // 데이터베이스에서 스타일 삭제
    await db
      .delete(dreambookStyles)
      .where(eq(dreambookStyles.styleId, styleId));

    res.json({ success: true, message: '스타일이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('태몽동화 스타일 삭제 오류:', error);
    res.status(500).json({ error: '태몽동화 스타일 삭제에 실패했습니다.' });
  }
});

export default router;