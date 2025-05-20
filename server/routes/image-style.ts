import { Request, Response, Router } from 'express';
import { db } from '../../db';
import { imageStyles, insertImageStyleSchema } from '@shared/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { isAdmin } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// 이미지 스타일 목록 조회
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const allStyles = await db.query.imageStyles.findMany({
      orderBy: [asc(imageStyles.order), desc(imageStyles.createdAt)]
    });
    
    return res.json(allStyles);
  } catch (error) {
    console.error('이미지 스타일 목록 조회 오류:', error);
    return res.status(500).json({ error: '이미지 스타일 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 상세 조회
router.get('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const styleId = parseInt(id);
    
    if (isNaN(styleId)) {
      return res.status(400).json({ error: '유효하지 않은 스타일 ID입니다.' });
    }
    
    const style = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, styleId)
    });
    
    if (!style) {
      return res.status(404).json({ error: '해당 이미지 스타일을 찾을 수 없습니다.' });
    }
    
    return res.json(style);
  } catch (error) {
    console.error('이미지 스타일 상세 조회 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 생성
router.post('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const validationResult = insertImageStyleSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: '입력 데이터가 유효하지 않습니다.',
        details: validationResult.error.format()
      });
    }
    
    const styleData = validationResult.data;
    
    // 현재 사용자 ID를 creator_id로 설정
    styleData.creatorId = req.user.id;
    
    // 생성 시각과 갱신 시각 설정
    const now = new Date();
    styleData.createdAt = now;
    styleData.updatedAt = now;
    
    const [newStyle] = await db.insert(imageStyles).values(styleData).returning();
    
    return res.status(201).json(newStyle);
  } catch (error) {
    console.error('이미지 스타일 생성 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 생성하는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 수정
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const styleId = parseInt(id);
    
    if (isNaN(styleId)) {
      return res.status(400).json({ error: '유효하지 않은 스타일 ID입니다.' });
    }
    
    // 기존 스타일 확인
    const existingStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, styleId)
    });
    
    if (!existingStyle) {
      return res.status(404).json({ error: '해당 이미지 스타일을 찾을 수 없습니다.' });
    }
    
    // 입력 데이터 검증
    const validationResult = insertImageStyleSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: '입력 데이터가 유효하지 않습니다.',
        details: validationResult.error.format()
      });
    }
    
    const updateData = validationResult.data;
    updateData.updatedAt = new Date();
    
    // 스타일 업데이트
    const [updatedStyle] = await db.update(imageStyles)
      .set(updateData)
      .where(eq(imageStyles.id, styleId))
      .returning();
    
    return res.json(updatedStyle);
  } catch (error) {
    console.error('이미지 스타일 수정 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 수정하는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 삭제
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const styleId = parseInt(id);
    
    if (isNaN(styleId)) {
      return res.status(400).json({ error: '유효하지 않은 스타일 ID입니다.' });
    }
    
    // 기존 스타일 확인
    const existingStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, styleId)
    });
    
    if (!existingStyle) {
      return res.status(404).json({ error: '해당 이미지 스타일을 찾을 수 없습니다.' });
    }
    
    // 스타일 삭제
    await db.delete(imageStyles).where(eq(imageStyles.id, styleId));
    
    return res.status(204).end();
  } catch (error) {
    console.error('이미지 스타일 삭제 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 삭제하는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 복제
router.post('/:id/clone', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const styleId = parseInt(id);
    
    if (isNaN(styleId)) {
      return res.status(400).json({ error: '유효하지 않은 스타일 ID입니다.' });
    }
    
    // 복제할 스타일 검색
    const sourceStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, styleId)
    });
    
    if (!sourceStyle) {
      return res.status(404).json({ error: '복제할 이미지 스타일을 찾을 수 없습니다.' });
    }
    
    // 복제 데이터 준비
    const cloneData = {
      name: `복제 - ${sourceStyle.name}`,
      description: sourceStyle.description,
      systemPrompt: sourceStyle.systemPrompt,
      isActive: true,
      creatorId: req.user.id,
      order: sourceStyle.order,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 새 스타일 생성
    const [newStyle] = await db.insert(imageStyles).values(cloneData).returning();
    
    return res.status(201).json(newStyle);
  } catch (error) {
    console.error('이미지 스타일 복제 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 복제하는 중 오류가 발생했습니다.' });
  }
});

export default router;