import { Request, Response, Router } from 'express';
import { db } from '../../db';
import { imageStyles, insertImageStyleSchema } from '@shared/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { isAdmin } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// 이미지 스타일 목록 조회 (모든 사용자 접근 가능)
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('이미지 스타일 목록 조회 요청 받음');
    const allStyles = await db.query.imageStyles.findMany({
      orderBy: [asc(imageStyles.order), desc(imageStyles.createdAt)]
    });
    
    console.log(`이미지 스타일 ${allStyles.length}개 조회 성공`);
    return res.json(allStyles);
  } catch (error) {
    console.error('이미지 스타일 목록 조회 오류:', error);
    return res.status(500).json({ error: '이미지 스타일 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 상세 조회 (모든 사용자 접근 가능)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const styleId = parseInt(id);
    
    console.log(`이미지 스타일 상세 조회 요청 - ID: ${styleId}`);
    
    if (isNaN(styleId)) {
      return res.status(400).json({ error: '유효하지 않은 스타일 ID입니다.' });
    }
    
    const style = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, styleId)
    });
    
    if (!style) {
      return res.status(404).json({ error: '해당 이미지 스타일을 찾을 수 없습니다.' });
    }
    
    console.log(`이미지 스타일 상세 조회 성공 - ID: ${styleId}, 이름: ${style.name}`);
    return res.json(style);
  } catch (error) {
    console.error('이미지 스타일 상세 조회 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 이미지 스타일 생성
router.post('/', isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('이미지 스타일 생성 요청 데이터:', JSON.stringify(req.body, null, 2));
    
    // 데이터 필드 검증
    if (!req.body.name || typeof req.body.name !== 'string') {
      return res.status(400).json({ error: '이름은 필수 항목입니다.' });
    }
    
    if (!req.body.description || typeof req.body.description !== 'string') {
      return res.status(400).json({ error: '설명은 필수 항목입니다.' });
    }
    
    if (!req.body.systemPrompt || typeof req.body.systemPrompt !== 'string') {
      return res.status(400).json({ error: '시스템 프롬프트는 필수 항목입니다.' });
    }
    
    // 최소 길이 검증
    if (req.body.name.length < 2) {
      return res.status(400).json({ error: '이름은 최소 2자 이상이어야 합니다.' });
    }
    
    if (req.body.description.length < 5) {
      return res.status(400).json({ error: '설명은 최소 5자 이상이어야 합니다.' });
    }
    
    if (req.body.systemPrompt.length < 10) {
      return res.status(400).json({ error: '시스템 프롬프트는 최소 10자 이상이어야 합니다.' });
    }
    
    // 유효성 검사를 직접 수행하지 않고 필요한 필드만 가져옴
    const styleData: any = {
      name: req.body.name,
      description: req.body.description,
      systemPrompt: req.body.systemPrompt,
      isActive: req.body.isActive !== false, // undefined인 경우 true로 기본값 설정
      order: typeof req.body.order === 'number' ? req.body.order : 0
    };
    
    // 현재 사용자 ID를 creator_id로 설정
    if (!req.user) {
      return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });
    }
    styleData.creatorId = req.user.id;
    
    // 생성 시각과 갱신 시각 설정
    const now = new Date();
    styleData.createdAt = now;
    styleData.updatedAt = now;
    
    const [newStyle] = await db.insert(imageStyles).values(styleData).returning();
    console.log('이미지 스타일 생성 성공:', newStyle);
    
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
    
    console.log(`이미지 스타일 복제 요청 - 원본 ID: ${styleId}`);
    
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
    
    console.log(`원본 스타일 조회 성공:`, {
      id: sourceStyle.id,
      name: sourceStyle.name,
      description: sourceStyle.description?.substring(0, 30) + '...',
      systemPromptLength: sourceStyle.systemPrompt?.length || 0
    });
    
    // 사용자 정보 확인
    if (!req.user) {
      return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });
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
    console.log('이미지 스타일 복제 성공:', { id: newStyle.id, name: newStyle.name });
    
    return res.status(201).json(newStyle);
  } catch (error) {
    console.error('이미지 스타일 복제 오류:', error);
    return res.status(500).json({ error: '이미지 스타일을 복제하는 중 오류가 발생했습니다.' });
  }
});

export default router;